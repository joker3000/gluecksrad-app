const msal = require("@azure/msal-node");

const msalConfig = {
    auth: {
        clientId: process.env.AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
        clientSecret: process.env.AZURE_CLIENT_SECRET
    }
};

const pca = new msal.ConfidentialClientApplication(msalConfig);

function getAuthUrl() {
    return pca.getAuthCodeUrl({
        scopes: ["openid", "profile", "email"],
        redirectUri: process.env.REDIRECT_URI
    });
}

function logout(req, res) {
    req.session.destroy(() => {
        res.redirect("/");
    });
}

function ensureAuthenticated(req, res, next) {
    if (req.session.account) {
        return next();
    }
    res.redirect("/auth/login");
}

module.exports = { getAuthUrl, logout, ensureAuthenticated, pca };
