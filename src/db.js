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

module.exports = {
  db,
  getSession,
  setSession,
  saveMessage,
  getConversationHistory,
  isMessageProcessed,
  markMessageProcessed
};
