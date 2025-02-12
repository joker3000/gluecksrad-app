const fs = require('fs');
const https = require('https');
const express = require('express');
const session = require('express-session');
const passport = require('./auth');
const db = require('./db');
const path = require('path');

const DOMAIN = process.env.DOMAIN_NAME;
const KEY_PATH = `/acme-data/${DOMAIN}.key`;
const CERT_PATH = `/acme-data/${DOMAIN}.cer`;

const privateKey = fs.readFileSync(KEY_PATH, 'utf8');
const certificate = fs.readFileSync(CERT_PATH, 'utf8');

const app = express();

// minimal session
app.use(session({
  secret: 'SUPER-SECRET-STRING',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// OIDC routes
app.get('/auth/login',
  passport.authenticate('azure_ad_openidconnect', { failureRedirect: '/auth/error' })
);
app.get('/auth/callback',
  passport.authenticate('azure_ad_openidconnect', { failureRedirect: '/auth/error' }),
  (req, res) => {
    ensureDBUser(req.user);
    res.redirect('/game.html');
  }
);
app.get('/auth/error', (req,res)=>{ res.send('Login Error'); });
app.get('/auth/logout', (req,res)=>{
  req.logout(()=>{
    req.session.destroy(()=>{
      res.redirect('/');
    });
  });
});

// ensure user in DB
function ensureDBUser(user) {
  try {
    const row = db.prepare(`SELECT * FROM players WHERE oid=?`).get(user.oid);
    if(!row){
      db.prepare(`
        INSERT INTO players (oid, givenName, familyName, displayName, username)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        user.oid,
        user.givenName||'',
        user.familyName||'',
        user.displayName||'',
        user.username||''
      );
      console.log("New user created:", user.oid);
    } else {
      db.prepare(`
        UPDATE players
        SET givenName=?, familyName=?, displayName=?, username=?
        WHERE oid=?
      `).run(
        user.givenName||'',
        user.familyName||'',
        user.displayName||'',
        user.username||'',
        user.oid
      );
      console.log("User updated:", user.oid);
    }
  } catch(e) {
    console.error("DB error ensureDBUser:", e);
  }
}

function ensureAuth(req, res, next){
  if(req.isAuthenticated()) return next();
  res.redirect('/');
}
function ensureAdmin(req, res, next){
  if(req.isAuthenticated() && req.user.isAdmin) return next();
  return res.status(403).send('Forbidden - You are not admin');
}

// static
app.use('/', express.static(path.join(__dirname, 'public')));

app.get('/api/spin', ensureAuth, (req,res)=>{
  // do spin logic
  res.json({ success:true, user: req.user });
});

// admin route
app.get('/admin', ensureAuth, ensureAdmin, (req,res)=>{
  res.sendFile(path.join(__dirname,'public','admin.html'));
});
app.get('/api/admin/players', ensureAuth, ensureAdmin, (req,res)=>{
  const players = db.prepare(`SELECT * FROM players`).all();
  res.json({ players });
});

// create HTTPS server
const options = {
  key: privateKey,
  cert: certificate
};
const PORT = 443;
https.createServer(options, app).listen(PORT, ()=>{
  console.log(`Glücksrad app listening on HTTPS port ${PORT}`);
});
