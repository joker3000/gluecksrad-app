const msal = require("@azure/msal-node");

// MSAL Konfiguration
const msalConfig = {
    auth: {
        clientId: process.env.AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
        clientSecret: process.env.AZURE_CLIENT_SECRET
    },
    system: {
        loggerOptions: { loggerCallback: () => {} }
    }
};

// MSAL Client für Authentifizierung
const pca = new msal.ConfidentialClientApplication(msalConfig);

// Auth-URL generieren (OAuth2 Authorization Code Flow)
function getAuthUrl() {
    return pca.getAuthCodeUrl({
        scopes: ["openid", "profile", "email"],
        redirectUri: process.env.REDIRECT_URI
    });
}

// Logout
function logout(req, res) {
    req.session.destroy(() => {
        res.redirect("/");
    });
}

// Middleware: Prüft, ob User eingeloggt ist
function ensureAuthenticated(req, res, next) {
    if (req.session.account) {
        return next();
    }
    res.redirect("/auth/login");
}

module.exports = { getAuthUrl, logout, ensureAuthenticated, pca };
