const path = require('path');
const Database = require('better-sqlite3');

// Falls Du lokal testest, kannst Du "gluecksrad.db" im Projektordner nutzen.
// Auf Vercel solltest Du "/tmp/gluecksrad.db" verwenden – aber dort ist sie nicht dauerhaft.
// Wir wählen je nach Umgebungsvariable:
const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'gluecksrad.db')
  : 'gluecksrad.db';

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
