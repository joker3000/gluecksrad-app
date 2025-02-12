const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'database', 'gluecksrad.db');
const db = new Database(dbPath);

// players table
db.exec(`
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oid TEXT UNIQUE,
  givenName TEXT,
  familyName TEXT,
  displayName TEXT,
  username TEXT,
  isAdmin BOOLEAN DEFAULT 0,
  totalScore INTEGER DEFAULT 0,
  spin1 INTEGER,
  spin2 INTEGER,
  spin3 INTEGER
);
`);

module.exports = db;
