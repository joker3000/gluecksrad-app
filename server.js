const express = require('express');
const session = require('express-session');
const passport = require('./auth');
const db = require('./db');
const path = require('path');

// Because Vercel's serverless environment has ephemeral or no built-in session store?
// We'll do a MemoryStore for demonstration.
const MemoryStore = require('memorystore')(session);

const app = express();

// For serverless on Vercel, we might need to hack around "once" usage, but let's keep it simple
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: 'SUPER-SECRET-STRING',
  resave: false,
  saveUninitialized: false,
  store: new MemoryStore({ checkPeriod: 86400000 }) // 24h
}));

app.use(passport.initialize());
app.use(passport.session());

// OIDC
app.get('/auth/login',
  passport.authenticate('azure_ad_openidconnect', { failureRedirect: '/auth/error' })
);
app.get('/auth/callback',
  passport.authenticate('azure_ad_openidconnect', { failureRedirect: '/auth/error' }),
  (req, res) => {
    ensureDBUser(req.user);
    // redirect to /game.html or wherever
    res.redirect('/game.html');
  }
);
app.get('/auth/error', (req, res) => {
  res.send('Microsoft login error');
});
app.get('/auth/logout', (req, res) => {
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
      // optional update
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

// Middlewares
function ensureAuth(req, res, next){
  if(req.isAuthenticated()) return next();
  res.redirect('/');
}
function ensureAdmin(req, res, next){
  if(req.isAuthenticated() && req.user.isAdmin) return next();
  res.status(403).send('Forbidden - Not Admin');
}

// Example spin route
app.get('/api/spin', ensureAuth, (req, res)=>{
  // ephemeral DB usage or logic
  res.json({ success:true, user: req.user });
});

// Admin
app.get('/admin', ensureAuth, ensureAdmin, (req,res)=>{
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/api/admin/players', ensureAuth, ensureAdmin, (req,res)=>{
  const players = db.prepare(`SELECT * FROM players`).all();
  res.json({ players });
});

// Serve static from public
app.use('/', express.static(path.join(__dirname, 'public')));

// We export the app for vercel
module.exports = app;
