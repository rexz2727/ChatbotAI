const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), 'data', 'database.db');

// Ensure parent directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to SQLite database:', err);
  }
});

// WAL mode: safe for multiple pm2 cluster workers writing concurrently
db.run('PRAGMA journal_mode=WAL');
db.run('PRAGMA synchronous=NORMAL');

// Initialize the sessions, messages, and processed_messages tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      user_id TEXT PRIMARY KEY,
      agent_state TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating sessions table:', err);
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating messages table:', err);
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS processed_messages (
      mid TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating processed_messages table:', err);
      return;
    }
    // Cleanup records older than 24 hours on startup
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    db.run('DELETE FROM processed_messages WHERE created_at < ?', [cutoff], (cleanErr) => {
      if (cleanErr) {
        console.error('Error cleaning up processed_messages:', cleanErr);
      }
    });
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS response_cache (
      cache_key TEXT PRIMARY KEY,
      response_text TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating response_cache table:', err);
      return;
    }
    // Cleanup records older than 6 hours on startup
    const cutoffCache = Date.now() - 6 * 60 * 60 * 1000;
    db.run('DELETE FROM response_cache WHERE timestamp < ?', [cutoffCache]);
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      user_id TEXT PRIMARY KEY,
      msg_count INTEGER NOT NULL,
      window_start INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS message_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      message_text TEXT,
      payload TEXT,
      created_at INTEGER NOT NULL,
      status TEXT DEFAULT 'pending'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS security_incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      platform TEXT,
      sender_id TEXT,
      sha256 TEXT,
      verdict TEXT,
      engines INTEGER,
      action TEXT
    )
  `);
});

/**
 * Retrieves the session for a given user.
 * @param {string} userId - The unique identifier of the user.
 * @returns {Promise<{user_id: string, agent_state: string, updated_at: number}|null>}
 */
const getSession = (userId) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT user_id, agent_state, updated_at FROM sessions WHERE user_id = ?';
    db.get(query, [userId], (err, row) => {
      if (err) {
        console.error(`Error in getSession for user ${userId}:`, err);
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
};

/**
 * Sets or updates the session state for a given user.
 * @param {string} userId - The unique identifier of the user.
 * @param {string} state - The current active agent state.
 * @returns {Promise<{user_id: string, agent_state: string, updated_at: number}>}
 */
const setSession = (userId, state) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO sessions (user_id, agent_state, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        agent_state = excluded.agent_state,
        updated_at = excluded.updated_at
    `;
    const updatedAt = Date.now();
    db.run(query, [userId, state, updatedAt], (err) => {
      if (err) {
        console.error(`Error in setSession for user ${userId}:`, err);
        reject(err);
      } else {
        resolve({ user_id: userId, agent_state: state, updated_at: updatedAt });
      }
    });
  });
};

/**
 * Saves a message to the conversation history.
 * @param {string} userId - The user ID.
 * @param {string} role - 'user' or 'bot'.
 * @param {string} content - The message content.
 * @returns {Promise<number>} - The ID of the inserted message.
 */
const saveMessage = (userId, role, content) => {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO messages (user_id, role, content, created_at) VALUES (?, ?, ?, ?)`;
    const createdAt = Date.now();
    db.run(query, [userId, role, content, createdAt], function (err) {
      if (err) {
        console.error(`Error saving message for user ${userId}:`, err);
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
};

/**
 * Retrieves the recent conversation history for a user.
 * @param {string} userId - The user ID.
 * @param {number} limit - Number of recent messages to retrieve (default 10).
 * @returns {Promise<Array<{role: string, content: string}>>}
 */
const getConversationHistory = (userId, limit = 10) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT role, content FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`;
    db.all(query, [userId, limit], (err, rows) => {
      if (err) {
        console.error(`Error getting history for user ${userId}:`, err);
        reject(err);
      } else {
        // Reverse rows so they are in chronological order
        resolve(rows.reverse());
      }
    });
  });
};

/**
 * Checks whether a Facebook message mid has already been processed.
 * @param {string} mid - The message ID from Facebook.
 * @returns {Promise<boolean>}
 */
const isMessageProcessed = (mid) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT 1 FROM processed_messages WHERE mid = ?', [mid], (err, row) => {
      if (err) {
        console.error(`Error in isMessageProcessed for mid ${mid}:`, err);
        reject(err);
      } else {
        resolve(!!row);
      }
    });
  });
};

/**
 * Marks a Facebook message mid as processed.
 * @param {string} mid - The message ID from Facebook.
 * @returns {Promise<void>}
 */
const markMessageProcessed = (mid) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR IGNORE INTO processed_messages (mid, created_at) VALUES (?, ?)',
      [mid, Date.now()],
      (err) => {
        if (err) {
          console.error(`Error in markMessageProcessed for mid ${mid}:`, err);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
};

/**
 * Retrieves a cached response by key
 */
const getCachedResponse = (key) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT response_text, timestamp FROM response_cache WHERE cache_key = ?', [key], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
      if (Date.now() - row.timestamp > CACHE_TTL_MS) {
        db.run('DELETE FROM response_cache WHERE cache_key = ?', [key]);
        return resolve(null);
      }
      resolve(row.response_text);
    });
  });
};

/**
 * Saves a cached response
 */
const setCachedResponse = (key, text) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR REPLACE INTO response_cache (cache_key, response_text, timestamp) VALUES (?, ?, ?)',
      [key, text, Date.now()],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

const checkRateLimit = (userId) => {
  return new Promise((resolve, reject) => {
    const WINDOW_MS = 60000; // 1 minute
    const MAX_MSGS = 15;
    const now = Date.now();
    
    db.get('SELECT msg_count, window_start FROM rate_limits WHERE user_id = ?', [userId], (err, row) => {
      if (err) return reject(err);
      if (!row || now - row.window_start > WINDOW_MS) {
        db.run('INSERT OR REPLACE INTO rate_limits (user_id, msg_count, window_start) VALUES (?, 1, ?)', [userId, now]);
        return resolve(true);
      }
      if (row.msg_count >= MAX_MSGS) {
        return resolve(false);
      }
      db.run('UPDATE rate_limits SET msg_count = msg_count + 1 WHERE user_id = ?', [userId]);
      resolve(true);
    });
  });
};

const enqueueMessage = (platform, senderId, messageText, payload) => {
  return new Promise((resolve, reject) => {
    const query = 'INSERT INTO message_queue (platform, sender_id, message_text, payload, created_at) VALUES (?, ?, ?, ?, ?)';
    db.run(query, [platform, senderId, messageText, payload, Date.now()], function(err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });
};

const dequeueMessage = () => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM message_queue WHERE status = ? ORDER BY created_at ASC LIMIT 1', ['pending'], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      db.run('UPDATE message_queue SET status = ? WHERE id = ?', ['processing', row.id], (updateErr) => {
        if (updateErr) return reject(updateErr);
        resolve(row);
      });
    });
  });
};

const completeMessage = (id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM message_queue WHERE id = ?', [id], (err) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
};

/**
 * Records a security incident from attachment scanning.
 * @param {{platform: string, senderId: string, sha256: string, verdict: string, engines: number, action: string}} incident
 * @returns {Promise<number>} - The ID of the inserted row.
 */
const recordSecurityIncident = ({ platform, senderId, sha256, verdict, engines, action }) => {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO security_incidents (ts, platform, sender_id, sha256, verdict, engines, action) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(query, [Date.now(), platform, senderId, sha256, verdict, engines, action], function (err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });
};

/**
 * Retrieves recent security incidents, newest first.
 * @param {number} limit - Max rows to return (default 50).
 * @returns {Promise<Array>}
 */
const getSecurityIncidents = (limit = 50) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM security_incidents ORDER BY ts DESC LIMIT ?', [limit], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

/**
 * Aggregates security incidents into a summary count by verdict category.
 * @returns {Promise<{scanned: number, malicious: number, suspicious: number, safe: number, error: number}>}
 */
const getSecurityIncidentSummary = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        COUNT(*) AS scanned,
        SUM(CASE WHEN verdict = 'malicious' THEN 1 ELSE 0 END) AS malicious,
        SUM(CASE WHEN verdict IN ('unknown', 'oversize') THEN 1 ELSE 0 END) AS suspicious,
        SUM(CASE WHEN verdict = 'safe' THEN 1 ELSE 0 END) AS safe,
        SUM(CASE WHEN verdict = 'error' THEN 1 ELSE 0 END) AS error
      FROM security_incidents
    `;
    db.get(query, [], (err, row) => {
      if (err) return reject(err);
      resolve({
        scanned: row.scanned || 0,
        malicious: row.malicious || 0,
        suspicious: row.suspicious || 0,
        safe: row.safe || 0,
        error: row.error || 0
      });
    });
  });
};

module.exports = {
  db,
  getSession,
  setSession,
  saveMessage,
  getConversationHistory,
  isMessageProcessed,
  markMessageProcessed,
  getCachedResponse,
  setCachedResponse,
  checkRateLimit,
  enqueueMessage,
  dequeueMessage,
  completeMessage,
  recordSecurityIncident,
  getSecurityIncidents,
  getSecurityIncidentSummary
};
