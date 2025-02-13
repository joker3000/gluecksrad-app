const express = require("express");
const session = require("express-session");
const path = require("path");
const axios = require("axios");
const KnexSessionStore = require("connect-session-knex")(session);
const knex = require("./knex");
const db = require("./db");
const { getAuthUrl, logout, ensureAuthenticated, pca } = require("./auth");

const app = express();

const store = new KnexSessionStore({
    knex: knex,
    tablename: "sessions",
    createTable: true,
    clearInterval: 60000
});

app.use(session({
    secret: "SUPER-SECRET-STRING",
    resave: true,
    saveUninitialized: true,
    store: store,
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ Statische Dateien bereitstellen (Fix für 404)
app.use(express.static(path.join(__dirname, "public")));

// ✅ Microsoft Login
app.get("/auth/login", async (req, res) => {
    try {
        const authUrl = await getAuthUrl();
        console.log("🔄 Redirecting to Microsoft Login:", authUrl);
        res.redirect(authUrl);
    } catch (err) {
        console.error("❌ Login-Fehler:", err);
        res.status(500).send("Fehler beim Login.");
    }
});

app.get("/auth/callback", async (req, res) => {
    try {
        const tokenResponse = await pca.acquireTokenByCode({
            code: req.query.code,
            scopes: ["User.Read"],
            redirectUri: process.env.REDIRECT_URI
        });

        const accessToken = tokenResponse.accessToken;
        const graphResponse = await axios.get("https://graph.microsoft.com/v1.0/me", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const user = graphResponse.data;
        const userId = user.id;

        req.session.account = {
            id: userId,
            displayName: user.displayName,
            mail: user.mail || "Keine Mail vorhanden",
            userPrincipalName: user.userPrincipalName,
            givenName: user.givenName || "Unbekannt",
            surname: user.surname || "Unbekannt"
        };

        console.log(`✅ Erfolgreich eingeloggt als ${user.displayName} (${user.mail})`);

        let player = db.prepare("SELECT * FROM players WHERE id=?").get(userId);
        if (!player) {
            const wheelConfig = JSON.stringify([...Array(16).keys()].map(i => i * 50).sort(() => Math.random() - 0.5));

            db.prepare(`
                INSERT INTO players (id, displayName, mail, userPrincipalName, givenName, surname, wheelConfig)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                userId,
                user.displayName,
                user.mail,
                user.userPrincipalName,
                user.givenName,
                user.surname,
                wheelConfig
            );
        }

        console.log("✅ Session gespeichert:", req.session.account);
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

// ✅ API für das Glücksrad
app.get("/api/wheel-config", ensureAuthenticated, (req, res) => {
    console.log("📢 /api/wheel-config Session:", req.session.account);
    if (!req.session.account) {
        return res.status(401).json({ error: "Nicht eingeloggt" });
    }

    const player = db.prepare("SELECT * FROM players WHERE id=?").get(req.session.account.id);
    if (!player) {
        return res.status(404).json({ error: "Spieler nicht gefunden" });
    }
    res.json({ wheelConfig: JSON.parse(player.wheelConfig) });
});

// ✅ API für Admin-Bereich mit Session-Debugging
app.get("/api/admin", ensureAuthenticated, async (req, res) => {
    console.log("📢 /api/admin Session:", req.session.account);
    if (!req.session.account || req.session.account.mail !== process.env.ADMIN_EMAIL) {
        console.log("🚫 Zugriff verweigert für", req.session.account ? req.session.account.mail : "Unbekannter Nutzer");
        return res.status(403).json({ error: "Nicht autorisiert" });
    }

    try {
        const players = await knex("players").orderBy("totalScore", "desc");
        res.json({ players });
    } catch (error) {
        console.error("❌ Admin-Fehler:", error);
        res.status(500).json({ error: "Fehler beim Abrufen der Admin-Daten" });
    }
});

// ✅ Fallback für unbekannte Routen (404 Fix)
app.use((req, res) => {
    res.status(404).send("404 - Seite nicht gefunden");
});

module.exports = app;
