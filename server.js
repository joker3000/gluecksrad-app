const express = require("express");
const session = require("express-session");
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
        res.redirect("/game.html"); // Nach Login zum Spiel
    } catch (err) {
        console.error("Callback-Fehler:", err);
        res.status(500).send("Fehler beim Auth-Callback.");
    }
});

// Logout
app.get("/auth/logout", logout);

// Geschützte Route → Nur eingeloggt zugänglich
app.get("/api/spin", ensureAuthenticated, (req, res) => {
    res.json({ success: true, user: req.session.account });
});

// Admin-Check anhand `ADMIN_EMAIL`
app.get("/api/admin", ensureAuthenticated, (req, res) => {
    const userEmail = req.session.account?.username || "";
    if (userEmail.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).send("Forbidden");
    }
    res.json({ success: true, message: "Admin-Dashboard" });
});

// Statische Dateien bereitstellen
app.use("/", express.static("public"));

// Server für Vercel exportieren
module.exports = app;
