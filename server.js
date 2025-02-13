const express = require("express");
const session = require("express-session");
const path = require("path");
const axios = require("axios");
const KnexSessionStore = require("connect-session-knex")(session);
const knex = require("./knex");
const db = require("./db");
const msal = require("@azure/msal-node");

if (!process.env.CLIENT_ID || !process.env.TENANT_ID || !process.env.CLIENT_SECRET) {
    console.error("❌ FEHLER: CLIENT_ID, TENANT_ID oder CLIENT_SECRET fehlt!");
    process.exit(1);
}

const msalConfig = {
    auth: {
        clientId: process.env.CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
        clientSecret: process.env.CLIENT_SECRET
    },
    system: { telemetry: { disabled: true } }
};
const pca = new msal.ConfidentialClientApplication(msalConfig);

const app = express();
const store = new KnexSessionStore({ knex: knex, tablename: "sessions", createTable: true, clearInterval: 60000 });

app.use(session({
    secret: "SUPER-SECRET-STRING",
    resave: true,
    saveUninitialized: true,
    store: store,
    cookie: { secure: false, httpOnly: true, sameSite: "lax", maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

function ensureAuthenticated(req, res, next) {
    if (!req.session.account) return res.status(401).json({ error: "Nicht eingeloggt" });
    next();
}

// ✅ Microsoft Login
app.get("/auth/login", async (req, res) => {
    try {
        const authUrl = await pca.getAuthCodeUrl({ scopes: ["User.Read", "openid", "profile", "email", "offline_access"], redirectUri: process.env.REDIRECT_URI });
        res.redirect(authUrl);
    } catch (err) {
        res.status(500).send("Fehler beim Login.");
    }
});

// ✅ Microsoft Auth Callback
app.get("/auth/callback", async (req, res) => {
    try {
        let tokenResponse = await pca.acquireTokenByCode({ code: req.query.code, scopes: ["User.Read", "openid", "profile", "email", "offline_access"], redirectUri: process.env.REDIRECT_URI });

        let graphResponse = await axios.get("https://graph.microsoft.com/v1.0/me", { headers: { Authorization: `Bearer ${tokenResponse.accessToken}` } });

        const user = graphResponse.data;
        req.session.account = {
            id: user.id, displayName: user.displayName || "Unbekannt",
            mail: user.mail || "Keine Mail vorhanden",
            userPrincipalName: user.userPrincipalName, givenName: user.givenName || "Unbekannt",
            surname: user.surname || "Unbekannt"
        };

        res.redirect("/game.html");
    } catch (err) {
        res.status(500).send("Fehler beim Auth-Callback.");
    }
});

// ✅ API für Glücksrad
app.get("/api/wheel-config", ensureAuthenticated, (req, res) => {
    const player = db.prepare("SELECT * FROM players WHERE id=?").get(req.session.account.id);
    if (!player) return res.status(404).json({ error: "Spieler nicht gefunden" });
    res.json({ wheelConfig: JSON.parse(player.wheelConfig) });
});

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/game.html", (req, res) => res.sendFile(path.join(__dirname, "public", "game.html")));
app.get("/admin.html", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

module.exports = app;
