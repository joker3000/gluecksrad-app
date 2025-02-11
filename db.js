const path = require('path');
const Database = require('better-sqlite3');

// Auf Vercel kann nur im /tmp-Verzeichnis geschrieben werden.
// Achtung: Daten sind nicht dauerhaft, da /tmp ephemer ist.
const dbPath = path.join('/tmp', 'gluecksrad.db');

const db = new Database(dbPath);

// Tabellen anlegen (wenn nicht vorhanden)
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
