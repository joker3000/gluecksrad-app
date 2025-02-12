const express = require("express");
const session = require("express-session");
const path = require("path");
const db = require("./db");
const { getAuthUrl, logout, ensureAuthenticated, pca } = require("./auth");

const app = express();

// ✅ Session-Management für Authentifizierung & API-Calls
app.use(session({
    secret: "SUPER-SECRET-STRING",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Für HTTPS setzen auf `true`
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ Middleware für API-Authentifizierung
function ensureAuthenticatedAPI(req, res, next) {
    if (!req.session.account) {
        return res.status(401).json({ error: "Nicht eingeloggt" });
    }
    next();
}

// ✅ Auth-Routen für Microsoft Login
app.get("/auth/login", async (req, res) => {
    try {
        const authUrl = await getAuthUrl();
        res.redirect(authUrl);
    } catch (err) {
        console.error("Login-Fehler:", err);
        res.status(500).send("Fehler beim Login.");
    }
});

app.get("/auth/callback", async (req, res) => {
    try {
        const tokenResponse = await pca.acquireTokenByCode({
            code: req.query.code,
            scopes: ["openid", "profile", "email"],
            redirectUri: process.env.REDIRECT_URI
        });

        req.session.account = tokenResponse.account;

        // Prüfen, ob Spieler bereits existiert
        let player = db.prepare("SELECT * FROM players WHERE oid=?").get(tokenResponse.account.oid);
        if (!player) {
            // Zufällige Rad-Konfiguration für neuen Spieler speichern
            const wheelConfig = JSON.stringify([...Array(16).keys()].map(i => i * 50).sort(() => Math.random() - 0.5));

            db.prepare(`
                INSERT INTO players (oid, givenName, familyName, displayName, username, wheelConfig)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                tokenResponse.account.oid,
                tokenResponse.account.givenName || "",
                tokenResponse.account.familyName || "",
                tokenResponse.account.displayName || "",
                tokenResponse.account.username || "",
                wheelConfig
            );
        }
        res.redirect("/game.html");
    } catch (err) {
        console.error("Callback-Fehler:", err);
        res.status(500).send("Fehler beim Auth-Callback.");
    }
});

app.get("/auth/logout", logout);

// ✅ Admin-Panel API (Live-Spieler-Daten)
app.get("/api/admin", ensureAuthenticatedAPI, (req, res) => {
    if (req.session.account.username.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({ error: "Forbidden" });
    }
    const players = db.prepare("SELECT * FROM players ORDER BY totalScore DESC").all();
    res.json({ players });
});

// ✅ FIX: Route für Glücksrad-Konfiguration pro Spieler
app.get("/api/wheel-config", ensureAuthenticatedAPI, (req, res) => {
    const player = db.prepare("SELECT * FROM players WHERE oid=?").get(req.session.account.oid);
    if (!player) {
        return res.status(404).json({ error: "Spieler nicht gefunden" });
    }
    res.json({ wheelConfig: JSON.parse(player.wheelConfig) });
});

// ✅ Spielergebnisse speichern
app.post("/api/spin", ensureAuthenticatedAPI, (req, res) => {
    const { spinNumber, score } = req.body;
    if (!spinNumber || score === undefined) {
        return res.status(400).json({ error: "Ungültige Daten" });
    }

    const player = db.prepare("SELECT * FROM players WHERE oid=?").get(req.session.account.oid);
    if (!player) {
        return res.status(404).json({ error: "Spieler nicht gefunden" });
    }

    const spinField = `spin${spinNumber}`;
    db.prepare(`UPDATE players SET ${spinField} = ?, totalScore = totalScore + ? WHERE oid = ?`)
        .run(score, score, req.session.account.oid);

    res.json({ success: true, totalScore: player.totalScore + score });
});

// ✅ Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, "public")));

// ✅ Sicherstellen, dass HTML-Seiten abrufbar sind
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/game.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "game.html"));
});

app.get("/admin.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

module.exports = app;
