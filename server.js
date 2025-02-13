const express = require("express");
const session = require("express-session");
const path = require("path");
const axios = require("axios");
const KnexSessionStore = require("connect-session-knex")(session);
const knex = require("./knex");
const db = require("./db");
const msal = require("@azure/msal-node");

// ✅ Sicherstellen, dass CLIENT_SECRET gesetzt ist
if (!process.env.CLIENT_SECRET) {
    console.error("❌ Fehler: CLIENT_SECRET ist nicht gesetzt!");
    process.exit(1);
}

// ✅ MSAL-Konfiguration mit Client Secret
const msalConfig = {
    auth: {
        clientId: process.env.CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
        clientSecret: process.env.CLIENT_SECRET
    },
    system: {
        telemetry: {
            disabled: true // ✅ Microsoft-Telemetrie deaktivieren
        }
    }
};
const pca = new msal.ConfidentialClientApplication(msalConfig);

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

// ✅ Microsoft Login
app.get("/auth/login", async (req, res) => {
    try {
        const authUrl = await pca.getAuthCodeUrl({
            scopes: ["User.Read", "openid", "profile", "email", "offline_access"],
            redirectUri: process.env.REDIRECT_URI
        });
        console.log("🔄 Redirecting to Microsoft Login:", authUrl);
        res.redirect(authUrl);
    } catch (err) {
        console.error("❌ Login-Fehler:", err);
        res.status(500).send("Fehler beim Login.");
    }
});

// ✅ Fix für Auth-Callback mit stabiler Fehlerbehandlung
app.get("/auth/callback", async (req, res) => {
    try {
        console.log("📢 Auth Callback aufgerufen mit Code:", req.query.code);

        if (!req.query.code) {
            console.error("❌ Fehler: Kein Code von Microsoft erhalten!");
            return res.status(400).send("Fehler: Kein Auth-Code empfangen.");
        }

        console.log("🔍 Versuche, Access-Token von Microsoft zu erhalten...");
        let tokenResponse;
        try {
            tokenResponse = await pca.acquireTokenByCode({
                code: req.query.code,
                scopes: ["User.Read", "openid", "profile", "email", "offline_access"],
                redirectUri: process.env.REDIRECT_URI
            });
        } catch (tokenErr) {
            console.error("❌ Fehler beim Abrufen des Access-Tokens:", tokenErr);
            return res.redirect("/auth/login");
        }

        if (!tokenResponse || !tokenResponse.accessToken) {
            console.error("❌ Kein Access-Token erhalten!");
            return res.status(500).send("Fehler: Kein Access-Token von Microsoft.");
        }

        console.log("✅ Access-Token erhalten!");

        let graphResponse;
        try {
            graphResponse = await axios.get("https://graph.microsoft.com/v1.0/me", {
                headers: { Authorization: `Bearer ${tokenResponse.accessToken}` }
            });
        } catch (graphErr) {
            console.error("❌ Fehler beim Abrufen der Microsoft-Benutzerdaten:", graphErr);
            return res.status(500).send("Fehler: Microsoft Graph API konnte nicht erreicht werden.");
        }

        if (!graphResponse || !graphResponse.data) {
            console.error("❌ Fehler: Keine Benutzerdaten von Microsoft erhalten!");
            return res.status(500).send("Fehler: Keine Benutzerdaten von Microsoft.");
        }

        const user = graphResponse.data;
        console.log("✅ Benutzerinformationen erhalten:", user);

        req.session.account = {
            id: user.id,
            displayName: user.displayName || "Unbekannt",
            mail: user.mail || "Keine Mail vorhanden",
            userPrincipalName: user.userPrincipalName,
            givenName: user.givenName || "Unbekannt",
            surname: user.surname || "Unbekannt"
        };

        console.log("✅ Session erfolgreich gespeichert:", req.session.account);

        let player = db.prepare("SELECT * FROM players WHERE id=?").get(user.id);
        if (!player) {
            const wheelConfig = JSON.stringify([...Array(16).keys()].map(i => i * 50).sort(() => Math.random() - 0.5));

            db.prepare(`
                INSERT INTO players (id, displayName, mail, userPrincipalName, givenName, surname, wheelConfig)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                user.id,
                user.displayName,
                user.mail,
                user.userPrincipalName,
                user.givenName,
                user.surname,
                wheelConfig
            );

            console.log("✅ Neuer Benutzer in der DB gespeichert.");
        }

        res.redirect("/game.html");

    } catch (err) {
        console.error("❌ Auth-Callback Fehler:", err);
        res.status(500).send("Fehler beim Auth-Callback.");
    }
});

// ✅ Logout-Route
app.get("/auth/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

// ✅ API für das Glücksrad
app.get("/api/wheel-config", ensureAuthenticated, (req, res) => {
    const player = db.prepare("SELECT * FROM players WHERE id=?").get(req.session.account.id);
    if (!player) {
        return res.status(404).json({ error: "Spieler nicht gefunden" });
    }
    res.json({ wheelConfig: JSON.parse(player.wheelConfig) });
});

// ✅ API für Admin-Bereich
app.get("/api/admin", ensureAuthenticated, async (req, res) => {
    if (!req.session.account || req.session.account.mail !== process.env.ADMIN_EMAIL) {
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

// ✅ Statische Dateien bereitstellen (Vercel-kompatibel)
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/game.html", (req, res) => res.sendFile(path.join(__dirname, "public", "game.html")));
app.get("/admin.html", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

module.exports = app;
