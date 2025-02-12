const express = require("express");
const session = require("express-session");
const path = require("path");
const { getAuthUrl, logout, ensureAuthenticated, pca } = require("./auth");

const app = express();

// Session-Middleware für Express
app.use(session({
    secret: "SUPER-SECRET-STRING",
    resave: false,
    saveUninitialized: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Root-Route => Zeigt `index.html`
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Login-Route → Weiterleitung zu Microsoft
app.get("/auth/login", async (req, res) => {
    try {
        const authUrl = await getAuthUrl();
        res.redirect(authUrl);
    } catch (err) {
        console.error("Login-Fehler:", err);
        res.status(500).send("Fehler beim Login.");
    }
});

// Auth-Callback von Microsoft
app.get("/auth/callback", async (req, res) => {
    try {
        const tokenResponse = await pca.acquireTokenByCode({
            code: req.query.code,
            scopes: ["openid", "profile", "email"],
            redirectUri: process.env.REDIRECT_URI
        });

        req.session.account = tokenResponse.account;
        res.redirect("/game.html");
    } catch (err) {
        console.error("Callback-Fehler:", err);
        res.status(500).send("Fehler beim Auth-Callback.");
    }
});

// Logout
app.get("/auth/logout", logout);

// API-Route: Muss eingeloggt sein
app.get("/api/spin", ensureAuthenticated, (req, res) => {
    res.json({ success: true, user: req.session.account });
});

// Statische Dateien bereitstellen (z. B. `game.html`, `style.css`)
app.use("/", express.static(path.join(__dirname, "public")));

// Server für Vercel exportieren
module.exports = app;
