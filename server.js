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

// ✅ Fix für Auth-Callback
app.get("/auth/callback", async (req, res) => {
    try {
        console.log("📢 Auth Callback aufgerufen mit Code:", req.query.code);

        if (!req.query.code) {
            console.error("❌ Fehler: Kein Code von Microsoft erhalten!");
            return res.status(400).send("Fehler: Kein Auth-Code empfangen.");
        }

        // 🔹 Authentifizierung bei Microsoft mit dem erhaltenen Code
        const tokenResponse = await pca.acquireTokenByCode({
            code: req.query.code,
            scopes: ["User.Read"],
            redirectUri: process.env.REDIRECT_URI
        });

        if (!tokenResponse || !tokenResponse.accessToken) {
            console.error("❌ Fehler: Kein Access-Token erhalten!");
            return res.status(500).send("Fehler: Kein Access-Token.");
        }

        console.log("✅ Access-Token erhalten!");

        // 🔹 Microsoft Graph API aufrufen, um Benutzerinformationen zu erhalten
        const graphResponse = await axios.get("https://graph.microsoft.com/v1.0/me", {
            headers: { Authorization: `Bearer ${tokenResponse.accessToken}` }
        });

        if (!graphResponse || !graphResponse.data) {
            console.error("❌ Fehler: Keine Benutzerdaten von Microsoft erhalten!");
            return res.status(500).send("Fehler: Keine Benutzerdaten von Microsoft.");
        }

        const user = graphResponse.data;
        console.log("✅ Benutzerinformationen erhalten:", user);

        // 🔹 Session speichern
        req.session.account = {
            id: user.id,
            displayName: user.displayName || "Unbekannt",
            mail: user.mail || "Keine Mail vorhanden",
            userPrincipalName: user.userPrincipalName,
            givenName: user.givenName || "Unbekannt",
            surname: user.surname || "Unbekannt"
        };

        console.log("✅ Session erfolgreich gespeichert:", req.session.account);

        // 🔹 Benutzer in die Datenbank eintragen, falls noch nicht vorhanden
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

        // 🔹 Weiterleitung zum Spiel
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

// ✅ Statische Dateien bereitstellen (Vercel-kompatibel)
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/game.html", (req, res) => res.sendFile(path.join(__dirname, "public", "game.html")));
app.get("/admin.html", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

module.exports = app;
