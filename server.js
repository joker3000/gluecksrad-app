const express = require("express");
const session = require("express-session");
const path = require("path");
const knex = require("./knex"); // ✅ Knex.js für Sessions
const KnexSessionStore = require("connect-session-knex")(session);
const db = require("./db");
const { getAuthUrl, logout, ensureAuthenticated, pca } = require("./auth");

const app = express();

// ✅ Stabiler Session-Store mit Knex.js & SQLite für Vercel
const store = new KnexSessionStore({
    knex: knex,
    tablename: "sessions"
});

app.use(session({
    secret: "SUPER-SECRET-STRING",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 } // 24h Session
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ Middleware für API-Authentifizierung
function ensureAuthenticatedAPI(req, res, next) {
    if (!req.session.account) {
        return res.status(401).json({ error: "Nicht eingeloggt", redirect: "/auth/login" });
    }
    next();
}

// ✅ Microsoft Login
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

        if (!tokenResponse.account || !tokenResponse.account.oid) {
            console.error("❌ Fehler: Microsoft hat keine OID geliefert!");
            return res.status(500).send("Fehler: OID fehlt im Microsoft-Konto.");
        }

        const oid = tokenResponse.account.oid;
        const givenName = tokenResponse.account.givenName || "Unbekannt";
        const familyName = tokenResponse.account.familyName || "Unbekannt";
        const displayName = tokenResponse.account.displayName || `${givenName} ${familyName}`;
        const username = tokenResponse.account.username || `user_${oid}`;

        console.log(`✅ Login erfolgreich: ${displayName} (${username})`);

        req.session.account = {
            oid,
            givenName,
            familyName,
            displayName,
            username
        };

        let player = db.prepare("SELECT * FROM players WHERE oid=?").get(oid);
        if (!player) {
            console.log(`ℹ️ Neuer Spieler: ${displayName}`);

            const wheelConfig = JSON.stringify([...Array(16).keys()].map(i => i * 50).sort(() => Math.random() - 0.5));

            db.prepare(`
                INSERT INTO players (oid, givenName, familyName, displayName, username, wheelConfig)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                oid,
                givenName,
                familyName,
                displayName,
                username,
                wheelConfig
            );
        }
        res.redirect("/game.html");
    } catch (err) {
        console.error("❌ Auth-Callback Fehler:", err);
        res.status(500).send("Fehler beim Auth-Callback.");
    }
});

app.get("/auth/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

// ✅ Admin-Panel API
app.get("/api/admin", ensureAuthenticatedAPI, (req, res) => {
    if (req.session.account.username.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({ error: "Forbidden" });
    }
    const players = db.prepare("SELECT * FROM players ORDER BY totalScore DESC").all();
    res.json({ players });
});

// ✅ `/api/wheel-config`-Route sicherstellen
app.get("/api/wheel-config", ensureAuthenticatedAPI, (req, res) => {
    const player = db.prepare("SELECT * FROM players WHERE oid=?").get(req.session.account.oid);
    if (!player) {
        return res.status(404).json({ error: "Spieler nicht gefunden" });
    }
    res.json({ wheelConfig: JSON.parse(player.wheelConfig) });
});

// ✅ Spiel-API (Punkte speichern)
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
