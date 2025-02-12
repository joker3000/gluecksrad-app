const express = require("express");
const session = require("express-session");
const path = require("path");
const { getAuthUrl, logout, ensureAuthenticated, pca } = require("./auth");

const app = express();

app.use(session({
    secret: "SUPER-SECRET-STRING",
    resave: false,
    saveUninitialized: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Sicherstellen, dass statische Dateien geladen werden
app.use(express.static(path.join(__dirname, "public"))); // Standard-Pfad
app.use("/public", express.static(path.join(__dirname, "public"))); // Fix für Pfade

// Root-Route explizit definieren
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

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
        res.redirect("/game.html");
    } catch (err) {
        console.error("Callback-Fehler:", err);
        res.status(500).send("Fehler beim Auth-Callback.");
    }
});

app.get("/auth/logout", logout);

// API-Route: Nur eingeloggte Nutzer dürfen spielen
app.get("/api/spin", ensureAuthenticated, (req, res) => {
    res.json({ success: true, user: req.session.account });
});

// Admin-Route mit Schutz
app.get("/api/admin", ensureAuthenticated, (req, res) => {
    const userEmail = req.session.account?.username || "";
    if (userEmail.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).send("Forbidden");
    }
    res.json({ success: true, message: "Admin-Dashboard" });
});

module.exports = app;
