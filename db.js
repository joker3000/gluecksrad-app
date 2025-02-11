const Database = require('better-sqlite3');

// Datenbank anlegen (Datei: gluecksrad.db – in Vercel allerdings ephemer)
const db = new Database('gluecksrad.db');

// Tabellen anlegen (wenn nicht existieren)
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
