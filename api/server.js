const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Spieler registrieren oder bestehenden Spieler laden
app.post("/api/register", (req, res) => {
    const { vorname, nachname } = req.body;

    db.get("SELECT * FROM spieler WHERE vorname = ? AND nachname = ?", [vorname, nachname], (err, row) => {
        if (row) {
            res.json(row); // Spieler existiert bereits
        } else {
            db.run("INSERT INTO spieler (vorname, nachname) VALUES (?, ?)", [vorname, nachname], function () {
                db.get("SELECT * FROM spieler WHERE id = ?", [this.lastID], (err, newRow) => {
                    res.json(newRow);
                });
            });
        }
    });
});

// Ergebnis speichern
app.post("/api/save-score", (req, res) => {
    const { id, run, score } = req.body;
    const column = `run${run}`;
    
    db.run(`UPDATE spieler SET ${column} = ?, total = COALESCE(run1,0) + COALESCE(run2,0) + COALESCE(run3,0) WHERE id = ?`,
        [score, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Score gespeichert!" });
        }
    );
});

// Alle Spieler & Scores abrufen
app.get("/api/scores", (req, res) => {
    db.all("SELECT * FROM spieler", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Starte den Server
app.listen(3000, () => console.log("Server läuft auf Port 3000"));
