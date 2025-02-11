const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./gluecksrad.db");

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS spieler (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vorname TEXT NOT NULL,
        nachname TEXT NOT NULL,
        run1 INTEGER DEFAULT NULL,
        run2 INTEGER DEFAULT NULL,
        run3 INTEGER DEFAULT NULL,
        total INTEGER DEFAULT 0
    )`);
});

module.exports = db;
