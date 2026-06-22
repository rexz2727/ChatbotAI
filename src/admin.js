const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const multer = require('multer');

const app = express();
const PORT = 3001;
const HOST = '127.0.0.1'; // Strictly bind to localhost for internal use only

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public/admin')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Admin Server OK' });
});

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

app.listen(PORT, HOST, () => {
  console.log(`Internal Web Admin running on http://${HOST}:${PORT}`);
});
