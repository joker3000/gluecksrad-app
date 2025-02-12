const express = require("express");
const session = require("express-session");
const path = require("path");
const db = require("./db");
const { getAuthUrl, logout, ensureAuthenticated, pca } = require("./auth");

const app = express();
app.use(session({
    secret: "SUPER-SECRET-STRING",
    resave: false,
    saveUninitialized: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Statische Dateien aus `public/` bereitstellen
app.use(express.static(path.join(__dirname, "public")));

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
        const player = db.prepare(`SELECT * FROM players WHERE oid=?`).get(tokenResponse.account.oid);

        if (!player) {
            const wheelConfig = JSON.stringify([...SEGMENT_VALUES].sort(() => Math.random() - 0.5));
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

app.get("/api/admin", ensureAuthenticated, (req, res) => {
    if (req.session.account.username.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).send("Forbidden");
    }
    const players = db.prepare("SELECT * FROM players ORDER BY totalScore DESC").all();
    res.json({ players });
});

app.get("/auth/logout", logout);
module.exports = app;
