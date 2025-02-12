const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join('/tmp', 'gluecksrad.db'); 
// Vercel ephemeral - disappears on cold start

const db = new Database(dbPath);

// minimal table
db.exec(`
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oid TEXT UNIQUE,
  givenName TEXT,
  familyName TEXT,
  displayName TEXT,
  username TEXT,
  totalScore INTEGER DEFAULT 0
);
`);

module.exports = db;
