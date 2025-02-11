const path = require('path');
const Database = require('better-sqlite3');

// Lokal vs. Vercel => /tmp/gluecksrad.db ist auf Vercel NICHT dauerhaft
const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'gluecksrad.db')
  : 'gluecksrad.db';

const db = new Database(dbPath);

// players-Tabelle
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstname TEXT NOT NULL,
    lastname  TEXT NOT NULL
  );
`);

// spins-Tabelle: Jeder Spieler bekommt bis zu 3 Zeilen (spin_number=1..3).
// Die Verteilung der 16 Segmente als JSON.
// spin_angle und spin_value werden später gefüllt, wenn Spin fertig ist.
db.exec(`
  CREATE TABLE IF NOT EXISTS spins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    spin_number INTEGER NOT NULL,
    distribution TEXT NOT NULL,
    spin_angle REAL,
    spin_value INTEGER,
    FOREIGN KEY(player_id) REFERENCES players(id)
  );
`);

module.exports = db;
