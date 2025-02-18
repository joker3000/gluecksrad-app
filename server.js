const express = require("express");
const path = require("path");
const db = require("./db"); // Import Turso client

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 📌 Helper Functions (Rewritten for Turso)
async function getPlayerId(firstname, lastname) {
    const result = await db.execute(
        "SELECT id FROM players WHERE firstname=? AND lastname=? LIMIT 1",
        [firstname, lastname]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
}

async function createPlayer(firstname, lastname) {
    await db.execute(
        "INSERT INTO players (firstname, lastname) VALUES (?, ?)",
        [firstname, lastname]
    );

    return await getPlayerId(firstname, lastname); // Return the new player ID
}

async function getSpin(playerId, spinNumber) {
    const result = await db.execute(
        "SELECT * FROM spins WHERE player_id=? AND spin_number=?",
        [playerId, spinNumber]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
}

async function createSpin(playerId, spinNumber, distribution) {
    await db.execute(
        "INSERT INTO spins (player_id, spin_number, distribution) VALUES (?, ?, ?)",
        [playerId, spinNumber, JSON.stringify(distribution)]
    );
}

async function updateSpinResult(spinId, finalAngle, finalValue) {
    await db.execute(
        "UPDATE spins SET spin_angle=?, spin_value=? WHERE id=?",
        [finalAngle, finalValue, spinId]
    );
}

// 📌 Register Player or Retrieve Existing One
app.post("/api/register", async (req, res) => {
    const { firstname, lastname } = req.body;
    if (!firstname || !lastname) {
        return res.status(400).json({ error: "Vor- und Nachname erforderlich" });
    }

    try {
        let playerId = await getPlayerId(firstname, lastname);
        if (!playerId) {
            playerId = await createPlayer(firstname, lastname);
        }

        // Create spins if not exist
        for (let s = 1; s <= 3; s++) {
            const existing = await getSpin(playerId, s);
            if (!existing) {
                let base = [0, 0, 0, 0, 10, 10, 10, 25, 25, 50, 100, 200, 400, 600, 800, 1000];
                for (let i = base.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [base[i], base[j]] = [base[j], base[i]];
                }
                await createSpin(playerId, s, base);
            }
        }

        // Load total score
        const allSpinsResult = await db.execute("SELECT * FROM spins WHERE player_id=? ORDER BY spin_number", [playerId]);
        const allSpins = allSpinsResult.rows;

        let total = 0;
        const spinInfo = allSpins.map(sp => {
            const dist = JSON.parse(sp.distribution);
            const val = sp.spin_value ?? null;
            if (val !== null) total += val;
            return {
                spinNumber: sp.spin_number,
                distribution: dist,
                angle: sp.spin_angle,
                value: val
            };
        });

        res.json({ playerId, firstname, lastname, total, spins: spinInfo });

    } catch (error) {
        console.error("Error registering player:", error);
        res.status(500).json({ error: "Datenbankfehler" });
    }
});

// 📌 Process Spin Result
app.post("/api/spinResult", async (req, res) => {
    const { playerId, spinNumber, finalAngle } = req.body;
    if (!playerId || !spinNumber || finalAngle === undefined) {
        return res.status(400).json({ error: "Ungültige Parameter" });
    }

    try {
        const spin = await getSpin(playerId, spinNumber);
        if (!spin) {
            return res.status(404).json({ error: "Spin nicht gefunden" });
        }
        if (spin.spin_value !== null) {
            return res.status(400).json({ error: "Spin bereits abgeschlossen" });
        }

        const distribution = JSON.parse(spin.distribution);
        const segCount = distribution.length;
        const segAngle = 360 / segCount;

        let rawAngle = (finalAngle % 360 + 360) % 360;
        let idx = Math.floor(rawAngle / segAngle);
        if (idx >= segCount) idx = segCount - 1;

        const finalValue = distribution[idx];
        await updateSpinResult(spin.id, finalAngle, finalValue);

        // Calculate total score
        const allSpinsResult = await db.execute("SELECT * FROM spins WHERE player_id=?", [playerId]);
        const allSpins = allSpinsResult.rows;
        let total = 0;
        for (const s of allSpins) {
            if (s.spin_value !== null) total += s.spin_value;
        }

        res.json({ success: true, spinValue: finalValue, total });

    } catch (error) {
        console.error("Error processing spin:", error);
        res.status(500).json({ error: "Datenbankfehler" });
    }
});

// 📌 Admin Login
app.post("/api/admin/login", (req, res) => {
    const { user, pass } = req.body;
    if (user === "admin" && pass === "secret") {
        return res.json({ success: true });
    }
    return res.status(401).json({ error: "Falsche Zugangsdaten" });
});

// 📌 Get Players and Scores for Admin Panel
app.get("/api/admin/players", async (req, res) => {
    try {
        const playersResult = await db.execute("SELECT * FROM players");
        const players = playersResult.rows;

        let resultRows = await Promise.all(players.map(async p => {
            const spinsResult = await db.execute("SELECT * FROM spins WHERE player_id=?", [p.id]);
            const spins = spinsResult.rows;

            let total = 0;
            const spinValues = [null, null, null];
            for (const s of spins) {
                if (s.spin_value !== null) total += s.spin_value;
                spinValues[s.spin_number - 1] = s.spin_value;
            }

            return {
                firstname: p.firstname,
                lastname: p.lastname,
                spin1: spinValues[0],
                spin2: spinValues[1],
                spin3: spinValues[2],
                total
            };
        }));

        resultRows.sort((a, b) => b.total - a.total);
        res.json({ players: resultRows });

    } catch (error) {
        console.error("Error loading admin data:", error);
        res.status(500).json({ error: "Datenbankfehler" });
    }
});

// 📌 Fallback Route
app.use((req, res) => {
    res.status(404).send("Not found");
});

// 📌 Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});

module.exports = app;
