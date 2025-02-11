const path = require('path');
const Database = require('better-sqlite3');

// Lokal vs. Vercel
const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'gluecksrad.db')
  : 'gluecksrad.db';

const db = new Database(dbPath);

// Wir speichern pro Spin auch die Verteilung (z. B. als JSON), plus "spinAngle" (Endwinkel in Grad).
// - spinAngle = null, bis der Spin abgeschlossen ist.
// - spinValue = das Ergebnis
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstname TEXT NOT NULL,
    lastname  TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS spins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    spin_number INTEGER NOT NULL,       -- 1,2,3
    distribution TEXT NOT NULL,         -- JSON-Array der 16 Segmente
    spin_angle REAL,                    -- finaler Winkel in Grad
    spin_value INTEGER,                 -- das Ergebnis
    FOREIGN KEY(player_id) REFERENCES players(id)
  );
`);

module.exports = db;
