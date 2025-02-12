const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join('/tmp', 'gluecksrad.db'); // Ephemeral Speicher auf Vercel
const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oid TEXT UNIQUE,
  givenName TEXT,
  familyName TEXT,
  displayName TEXT,
  username TEXT,
  totalScore INTEGER DEFAULT 0,
  spin1 INTEGER,
  spin2 INTEGER,
  spin3 INTEGER,
  wheelConfig TEXT
);
`);

module.exports = db;
