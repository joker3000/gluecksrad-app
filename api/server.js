const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Sicherstellen, dass die Datenbank im richtigen Verzeichnis erstellt wird
const dbPath = process.env.NODE_ENV === "production" ? "/tmp/database.sqlite" : "database.sqlite";
console.log("Verwendeter Datenbankpfad:", dbPath);

app.use(cors({ origin: "https://glueckrad-app.vercel.app" }));app.use(express.json());
app.use(express.static("public"));

// Prüfen, ob die Datei existiert, wenn nicht, dann neu erstellen
if (!fs.existsSync(dbPath)) {
    console.log("Erstelle neue SQLite-Datenbank...");
    fs.writeFileSync(dbPath, "");
}

// Datenbank initialisieren
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Fehler beim Öffnen der Datenbank:", err.message);
    } else {
        console.log("Erfolgreich mit SQLite verbunden.");
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                run1 INTEGER DEFAULT 0,
                run2 INTEGER DEFAULT 0,
                run3 INTEGER DEFAULT 0,
                total INTEGER DEFAULT 0
            )
        `);
    }
});

// Registrierung eines neuen Benutzers oder Fortsetzung, falls er existiert
app.post("/register", (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Name ist erforderlich" });
    }

    db.get("SELECT * FROM users WHERE name = ?", [name], (err, row) => {
        if (err) {
            console.error("Fehler bei der Benutzersuche:", err.message);
            return res.status(500).json({ error: "Fehler bei der Registrierung" });
        }

        if (row) {
            return res.json({ message: "Willkommen zurück!", user: row });
        } else {
            db.run(
                "INSERT INTO users (name, run1, run2, run3, total) VALUES (?, 0, 0, 0, 0)",
                [name],
                function (err) {
                    if (err) {
                        console.error("Fehler bei der Registrierung:", err.message);
                        return res.status(500).json({ error: "Fehler beim Speichern" });
                    }
                    res.json({ message: "Registrierung erfolgreich!", user: { id: this.lastID, name, run1: 0, run2: 0, run3: 0, total: 0 } });
                }
            );
        }
    });
});

// Speichert das Ergebnis eines Drehvorgangs
app.post("/save-score", (req, res) => {
    const { name, run, score } = req.body;

    if (!name || !run || score === undefined) {
        return res.status(400).json({ error: "Ungültige Daten" });
    }

    const column = `run${run}`;
    const updateQuery = `UPDATE users SET ${column} = ?, total = run1 + run2 + run3 WHERE name = ?`;

    db.run(updateQuery, [score, name], function (err) {
        if (err) {
            console.error("Fehler beim Speichern der Punkte:", err.message);
            return res.status(500).json({ error: "Fehler beim Speichern der Punktzahl" });
        }
        res.json({ message: `Dreh ${run} gespeichert!`, score });
    });
});

// Holt alle Benutzer für das Admin-Panel
app.get("/admin-data", (req, res) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) {
            console.error("Fehler beim Abrufen der Daten:", err.message);
            return res.status(500).json({ error: "Fehler beim Laden der Daten" });
        }
        res.json(rows);
    });
});

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
