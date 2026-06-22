const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./db');
const multer = require('multer');
const os = require('os');

const app = express();
const PORT = 3001;
const HOST = '0.0.0.0'; // Container nghe mọi IP; truy cập từ ngoài được kiểm soát bằng port-binding của docker-compose + lớp đăng nhập (middleware auth bên dưới).

const SESSION_SECRET = process.env.SESSION_SECRET || 'insecure-default-change-me';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function signToken(payloadObj) {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return payload + '.' + sig;
}

function verifyToken(tokenString) {
  if (typeof tokenString !== 'string') return null;
  const parts = tokenString.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  const sigBuf = Buffer.from(sig, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
  if (!data || typeof data.iat !== 'number') return null;
  if (Date.now() - data.iat > SESSION_TTL_MS) return null;
  return data;
}

function checkUsername(username) {
  const expected = process.env.ADMIN_USER || '';
  const a = Buffer.from(String(username == null ? '' : username));
  const b = Buffer.from(expected);
  // timingSafeEqual requires equal-length buffers
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function checkPassword(password) {
  const stored = process.env.ADMIN_PASSWORD_HASH || '';
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const derived = crypto.scryptSync(String(password == null ? '' : password), salt, expected.length);
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

// Brute-force protection for /api/login. Admin runs as a single process, so an
// in-memory Map keyed by IP is sufficient (no shared store / extra dependency).
// Hai chiều: per-IP + tổng thể (1 tài khoản admin) — tổng thể chặn kẻ đổi IP để né per-IP.
const LOGIN_MAX_FAILURES = 5;            // mỗi IP nguồn
const LOGIN_GLOBAL_MAX_FAILURES = 20;    // toàn bộ IP cộng lại
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginFailures = new Map();
let globalFailures = { count: 0, firstAt: 0 };

function getClientIp(req) {
  // Admin (port 3001) nhận kết nối TRỰC TIẾP qua LAN/Tailscale — KHÔNG nằm sau proxy tin cậy.
  // Không dùng X-Forwarded-For (client tự đặt được → né rate-limit). Dùng IP socket thật.
  return (req.socket && req.socket.remoteAddress) || req.ip || 'unknown';
}

function globalWindowActive(now) {
  return globalFailures.count > 0 && now >= globalFailures.firstAt && (now - globalFailures.firstAt) <= LOGIN_WINDOW_MS;
}

function isLoginBlocked(ip, now = Date.now()) {
  if (globalWindowActive(now) && globalFailures.count >= LOGIN_GLOBAL_MAX_FAILURES) return true;
  const entry = loginFailures.get(ip);
  if (!entry) return false;
  if (now - entry.firstAt > LOGIN_WINDOW_MS) {
    loginFailures.delete(ip);
    return false;
  }
  return entry.count >= LOGIN_MAX_FAILURES;
}

function recordLoginFailure(ip, now = Date.now()) {
  const entry = loginFailures.get(ip);
  if (!entry || now - entry.firstAt > LOGIN_WINDOW_MS) {
    loginFailures.set(ip, { count: 1, firstAt: now });
  } else {
    entry.count += 1;
  }
  if (!globalWindowActive(now)) globalFailures = { count: 1, firstAt: now };
  else globalFailures.count += 1;
}

function resetLoginFailures(ip) {
  loginFailures.delete(ip);
  globalFailures = { count: 0, firstAt: 0 };
}

function loginRetryAfterSeconds(ip, now = Date.now()) {
  let end = 0;
  const entry = loginFailures.get(ip);
  if (entry) end = entry.firstAt + LOGIN_WINDOW_MS;
  if (globalWindowActive(now) && globalFailures.count >= LOGIN_GLOBAL_MAX_FAILURES) {
    end = Math.max(end, globalFailures.firstAt + LOGIN_WINDOW_MS);
  }
  if (end === 0) return 0;
  return Math.max(1, Math.ceil((end - now) / 1000));
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx < 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

app.use(express.json());

// Health check (public — must stay reachable without auth)
app.get('/api/health', (req, res) => {
  res.json({ status: 'Admin Server OK' });
});

app.post('/api/login', (req, res) => {
  const ip = getClientIp(req);
  if (isLoginBlocked(ip)) {
    res.setHeader('Retry-After', String(loginRetryAfterSeconds(ip)));
    return res.status(429).json({ error: 'Quá nhiều lần thử, vui lòng đợi' });
  }
  const { username, password } = req.body || {};
  if (!checkUsername(username) || !checkPassword(password)) {
    recordLoginFailure(ip);
    return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
  }
  resetLoginFailures(ip);
  const token = signToken({ u: process.env.ADMIN_USER, iat: Date.now() });
  res.setHeader('Set-Cookie', `admin_session=${token}; HttpOnly; Path=/; Max-Age=28800; SameSite=Lax`);
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
  res.json({ ok: true });
});

const PUBLIC_PAGES = new Set(['/login.html']);
const PUBLIC_API = new Set(['/api/login', '/api/logout', '/api/health']);
const STATIC_ASSET = /\.(css|js|png|jpe?g|gif|svg|ico|woff2?|ttf|map)$/i;

app.use((req, res, next) => {
  const session = verifyToken(parseCookies(req.headers.cookie).admin_session);
  if (session) return next();

  const p = req.path;
  if (p.startsWith('/api/')) {
    if (PUBLIC_API.has(p)) return next();
    return res.status(401).json({ error: 'unauthorized' });
  }
  // Login page itself + shared static assets must load while unauthenticated,
  // otherwise the login screen breaks. Protected pages redirect to login.
  if (PUBLIC_PAGES.has(p) || STATIC_ASSET.test(p)) return next();
  return res.redirect('/login.html');
});

app.use(express.static(path.join(__dirname, '../public/admin')));

app.get('/api/stats', async (req, res) => {
  try {
    const totalUsers = await new Promise((resolve, reject) => {
      db.db.get('SELECT COUNT(DISTINCT user_id) as count FROM sessions', [], (err, row) => {
        if (err) reject(err); else resolve(row.count);
      });
    });
    
    const totalMessages = await new Promise((resolve, reject) => {
      db.db.get('SELECT COUNT(*) as count FROM messages', [], (err, row) => {
        if (err) reject(err); else resolve(row.count);
      });
    });

    res.json({
      totalUsers: totalUsers || 0,
      totalMessages: totalMessages || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/analytics/messages-by-day', async (req, res) => {
  try {
    const data = await new Promise((resolve, reject) => {
      const query = `
        SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') as day, COUNT(*) as count 
        FROM messages 
        GROUP BY day 
        ORDER BY day DESC 
        LIMIT 7
      `;
      db.db.all(query, [], (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    res.json(data.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages by day' });
  }
});

app.get('/api/analytics/topics', async (req, res) => {
  try {
    const data = await new Promise((resolve, reject) => {
      const query = `
        SELECT agent_state as topic, COUNT(*) as count 
        FROM sessions 
        GROUP BY agent_state
      `;
      db.db.all(query, [], (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

app.get('/api/health-details', async (req, res) => {
  try {
    const uptime = process.uptime();
    const memory = process.memoryUsage().rss;
    
    let dbOk = false;
    try {
      await new Promise((resolve, reject) => {
        db.db.get('SELECT 1', [], (err) => {
          if (err) reject(err); else resolve();
        });
      });
      dbOk = true;
    } catch (e) {
      dbOk = false;
    }

    let chromaOk = false;
    try {
      const chromaRes = await fetch('http://chromadb:8000/api/v1/heartbeat', { timeout: 2000 });
      if (chromaRes.ok) chromaOk = true;
    } catch (e) {
      chromaOk = false;
    }

    res.json({
      uptime,
      memory,
      dbStatus: dbOk ? 'OK' : 'Error',
      chromaStatus: chromaOk ? 'OK' : 'Error'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health details' });
  }
});

app.get('/api/feedback', (req, res) => {
  const csvPath = path.join(__dirname, '../data/feedback.csv');
  if (!fs.existsSync(csvPath)) {
    return res.json([]);
  }
  try {
    const data = fs.readFileSync(csvPath, 'utf8');
    const lines = data.trim().split('\n');
    const feedbackList = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('","');
      if (parts.length >= 3) {
        feedbackList.push({
          timestamp: parts[0].replace(/^"/, ''),
          senderId: parts[1],
          content: parts[2].replace(/"$/, '').replace(/""/g, '"')
        });
      }
    }
    res.json(feedbackList.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Failed to read feedback' });
  }
});

const formsDir = path.join(__dirname, '../data/forms');

if (!fs.existsSync(formsDir)) {
  fs.mkdirSync(formsDir, { recursive: true });
}

// Serve forms statically so they can be downloaded by the frontend
app.use('/forms', express.static(formsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, formsDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// List forms
app.get('/api/forms', (req, res) => {
  try {
    const files = fs.readdirSync(formsDir).filter(f => !f.startsWith('.'));
    const fileList = files.map(file => {
      const stats = fs.statSync(path.join(formsDir, file));
      return {
        name: file,
        size: stats.size,
        updatedAt: stats.mtime
      };
    });
    res.json(fileList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list forms' });
  }
});

// Upload form
app.post('/api/forms', upload.single('formFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ message: 'File uploaded successfully', file: req.file.originalname });
});

// Delete form
app.delete('/api/forms/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(formsDir, filename);
  
  // Security check to prevent directory traversal
  if (filePath.indexOf(formsDir) !== 0) {
    return res.status(403).json({ error: 'Invalid path' });
  }
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ message: 'File deleted successfully' });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// APM Endpoints
app.get('/api/system/metrics', (req, res) => {
  const cpu = os.loadavg()[0];
  const ram = (os.totalmem() - os.freemem()) / os.totalmem() * 100;
  res.json({ cpu: cpu, ram: ram });
});

app.get('/api/system/logs', (req, res) => {
  try {
    const logFile = path.join(__dirname, '../data/system.log');
    if (!fs.existsSync(logFile)) return res.json({ logs: ['[INFO] No logs found yet.'] });
    
    // Read the last 100 lines using pure JS
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.trim().split('\n').slice(-100);
    res.json({ logs: lines });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/system/security', (req, res) => {
  try {
    const logFile = path.join(__dirname, '../data/system.log');
    if (!fs.existsSync(logFile)) return res.json({ incidents: [] });
    
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.trim().split('\n');
    const incidents = lines.filter(line => line.includes('[HONEYPOT]') || line.includes('[Rate Limit]')).slice(-50);
    res.json({ incidents });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

const http = require('http');
app.get('/api/system/containers', (req, res) => {
  const options = {
    socketPath: '/var/run/docker.sock',
    path: '/v1.40/containers/json?all=true',
    method: 'GET'
  };
  const request = http.request(options, (response) => {
    let data = '';
    response.on('data', chunk => data += chunk);
    response.on('end', () => {
      try {
        const containers = JSON.parse(data);
        const simplified = containers.map(c => ({
          name: c.Names[0].replace('/', ''),
          state: c.State,
          status: c.Status,
          image: c.Image
        }));
        res.json({ containers: simplified });
      } catch(e) {
        res.status(500).json({ error: e.message });
      }
    });
  });
  request.on('error', (e) => {
    // Nếu không đọc được socket (chạy ở máy Dev không có Docker/Podman)
    res.json({ containers: [] });
  });
  request.end();
});


// Malware / security incident monitoring (DB-backed; protected by auth above)
app.get('/api/security/incidents', async (req, res) => {
  try {
    const parsed = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
    res.json({ incidents: await db.getSecurityIncidents(limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/security/summary', async (req, res) => {
  try {
    res.json(await db.getSecurityIncidentSummary());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`Internal Web Admin running on http://${HOST}:${PORT}`);
  });
}

module.exports = {
  app,
  signToken,
  verifyToken,
  getClientIp,
  isLoginBlocked,
  recordLoginFailure,
  resetLoginFailures,
  loginRetryAfterSeconds,
  LOGIN_MAX_FAILURES,
  LOGIN_GLOBAL_MAX_FAILURES,
  LOGIN_WINDOW_MS,
};
