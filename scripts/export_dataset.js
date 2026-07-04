const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/database.db');
const EXPORT_DIR = path.join(__dirname, '../data/exports');
const EXPORT_FILE = path.join(EXPORT_DIR, 'dataset.csv');

if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
    process.exit(1);
  }
});

function sanitizePII(text) {
  if (!text) return text;
  
  let sanitized = text;
  // Anonymize phone numbers (0xxxxxxxxx or +84xxxxxxxxx) -> 10 or 11 digits
  sanitized = sanitized.replace(/(0|\+84)[35789]\d{8}\b/g, '[HIDDEN_PHONE]');
  // Anonymize CCCD (12 digits)
  sanitized = sanitized.replace(/\b\d{12}\b/g, '[HIDDEN_CCCD]');
  
  return sanitized;
}

db.all(`SELECT user_id, role, content, created_at FROM messages ORDER BY created_at ASC`, (err, rows) => {
  if (err) {
    console.error('Error querying messages:', err.message);
    db.close();
    process.exit(1);
  }

  const writeStream = fs.createWriteStream(EXPORT_FILE, { encoding: 'utf8' });
  // CSV Header
  writeStream.write('"user_id","role","content","created_at"\n');

  for (const row of rows) {
    const userId = row.user_id;
    const role = row.role;
    // Escape double quotes and sanitize PII
    let content = sanitizePII(row.content) || '';
    content = content.replace(/"/g, '""');
    
    // Convert timestamp to ISO string for readability if needed, but we keep raw format or both
    const createdAt = row.created_at;

    writeStream.write(`"${userId}","${role}","${content}","${createdAt}"\n`);
  }

  writeStream.end();
  
  writeStream.on('finish', () => {
    console.log(`Dataset exported successfully to ${EXPORT_FILE}`);
    console.log(`Exported ${rows.length} records.`);
    db.close();
  });
});
