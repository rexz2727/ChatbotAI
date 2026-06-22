const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = 3001;
const HOST = '127.0.0.1'; // Strictly bind to localhost for internal use only

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public/admin')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Admin Server OK' });
});

app.listen(PORT, HOST, () => {
  console.log(`Internal Web Admin running on http://${HOST}:${PORT}`);
});
