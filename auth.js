const passport = require("passport");
const { OIDCStrategy } = require("passport-azure-ad");

const tenantID = process.env.AZURE_TENANT_ID;
const clientID = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const redirectURI = process.env.REDIRECT_URI || "https://dgr.edui.ch/auth/callback";
const adminEmail = process.env.ADMIN_EMAIL || "";

const authorityHost = "https://login.microsoftonline.com";

// Passport session
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

const oidcStrategy = new OIDCStrategy({
    identityMetadata: `${authorityHost}/${tenantID}/v2.0/.well-known/openid-configuration`,
    clientID,
    responseType: "code",
    responseMode: "query",
    redirectUrl: redirectURI,
    clientSecret,
    scope: ["openid", "profile", "email"]
  },
  (iss, sub, profile, accessToken, refreshToken, params, done) => {
    if (!profile.oid) {
      return done(new Error("No OID in profile"), null);
    }
    const email = profile._json?.preferred_username || "";
    const isAdmin = (email.toLowerCase() === adminEmail.toLowerCase());

    const user = {
      oid: profile.oid,
      displayName: profile.displayName,
      givenName: profile.name?.givenName,
      familyName: profile.name?.familyName,
      username: email,
      isAdmin
    };
    return done(null, user);
  }
);

passport.use(oidcStrategy);

module.exports = passport;
