const express = require("express");
const sqlite3 = require("sqlite3");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Korrektur: SQLite-Datenbank in `/tmp` speichern (weil Vercel nur dort Schreibzugriff erlaubt)
const dbPath = "/tmp/database.sqlite";
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Fehler beim Öffnen der SQLite-Datenbank:", err.message);
    } else {
        console.log("Verbindung zur SQLite-Datenbank erfolgreich!");
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                run1 INTEGER,
                run2 INTEGER,
                run3 INTEGER,
                total INTEGER
            )
        `);
    }
});

app.use(express.json());
app.use(cors());
app.use(express.static("public")); // Statische Dateien aus `public` bereitstellen

// 📌 Registrierung & Laden eines Spielers
app.post("/api/register", (req, res) => {
    const { name } = req.body;

    db.get("SELECT * FROM users WHERE name = ?", [name], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Datenbankfehler" });
        }
        if (row) {
            return res.json({ message: "Willkommen zurück!", user: row });
        }

        db.run("INSERT INTO users (name, run1, run2, run3, total) VALUES (?, 0, 0, 0, 0)", [name], function (err) {
            if (err) {
                return res.status(500).json({ error: "Fehler beim Speichern" });
            }
            res.json({ message: "Registrierung erfolgreich!", user: { id: this.lastID, name, run1: 0, run2: 0, run3: 0, total: 0 } });
        });
    });
});

// 📌 Speichert die Punktzahl eines Drehversuchs
app.post("/api/saveScore", (req, res) => {
    const { name, run, score } = req.body;

    if (run < 1 || run > 3) {
        return res.status(400).json({ error: "Ungültiger Run" });
    }

    db.run(`UPDATE users SET run${run} = ?, total = run1 + run2 + run3 WHERE name = ?`, [score, name], function (err) {
        if (err) {
            return res.status(500).json({ error: "Fehler beim Speichern" });
        }
        res.json({ message: `Run ${run} gespeichert!` });
    });
});

// 📌 Alle Spielergebnisse abrufen (Admin)
app.get("/api/scores", (req, res) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Fehler beim Laden der Daten" });
        }
        res.json(rows);
    });
});

// 📌 Statische Datei für Admin-Bereich bereitstellen
app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// ✅ Vercel-Kompatibilität: Exportiere das `app`-Objekt
module.exports = app;
