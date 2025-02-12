const express = require('express');
const session = require('express-session');
const passport = require('./auth');
const db = require('./db');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session
app.use(session({
  secret: 'SUPER-SECRET-STRING',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// OIDC Routes
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

app.get('/auth/error', (req, res)=>{
  res.send('Login Error');
});

app.get('/auth/logout', (req, res)=>{
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
    if(!row) {
      db.prepare(`
        INSERT INTO players (oid, givenName, familyName, displayName, username)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        user.oid,
        user.givenName || '',
        user.familyName || '',
        user.displayName || '',
        user.username || ''
      );
      console.log("New user created:", user.oid);
    } else {
      // optional: update
      db.prepare(`
        UPDATE players
        SET givenName=?, familyName=?, displayName=?, username=?
        WHERE oid=?
      `).run(
        user.givenName || '',
        user.familyName || '',
        user.displayName || '',
        user.username || '',
        user.oid
      );
      console.log("User updated:", user.oid);
    }
  } catch(e) {
    console.error("DB error ensureDBUser:", e);
  }
}

// Auth
function ensureAuth(req, res, next){
  if(req.isAuthenticated()) return next();
  return res.redirect('/');
}

// Admin
function ensureAdmin(req, res, next){
  if(req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  return res.status(403).send('Forbidden - You are not admin');
}

// Serve static
app.use('/', express.static(path.join(__dirname, 'public')));

// Example spin route: 3 spins
app.post('/api/spin', ensureAuth, (req, res)=>{
  // find user in DB
  const row = db.prepare(`SELECT * FROM players WHERE oid=?`).get(req.user.oid);
  if(!row){
    return res.status(404).json({ error: 'User not found in DB' });
  }
  // If row.spin1 etc. => do logic to store spin2, spin3...
  // Just an example:
  // ...
  return res.json({ success:true, message:"Spin logic placeholder" });
});

// Admin route => /admin => loads admin.html
app.get('/admin', ensureAuth, ensureAdmin, (req,res)=>{
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Admin data route
app.get('/api/admin/players', ensureAuth, ensureAdmin, (req, res)=>{
  const players = db.prepare(`SELECT * FROM players`).all();
  res.json({ players });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>{
  console.log("Dart-Glücksrad listening on port", PORT);
});
