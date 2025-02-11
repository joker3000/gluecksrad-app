const path = require('path');
const Database = require('better-sqlite3');

// **ACHTUNG**: Auf Vercel nur in /tmp/ möglich, wenn Du eine .db-Datei
// anlegen willst (sie ist NICHT dauerhaft). Lokal kannst Du gluecksrad.db nehmen.
const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'gluecksrad.db') // ephemeral
  : 'gluecksrad.db';                  // lokal persistent

const db = new Database(dbPath);

// Tabelle anlegen
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    spin1 INTEGER,
    spin2 INTEGER,
    spin3 INTEGER,
    total INTEGER DEFAULT 0
  );
`);

module.exports = db;
