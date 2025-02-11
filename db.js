const path = require('path');
const Database = require('better-sqlite3');

// Lokal vs. Vercel => /tmp = ephemeral
const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'gluecksrad.db')
  : 'gluecksrad.db';

const db = new Database(dbPath);

// players
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL
  );
`);

// spins
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
