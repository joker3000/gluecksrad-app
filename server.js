const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// Statische Files aus dem public-Ordner
app.use(express.static(path.join(__dirname, 'public')));

// DB-Hilfsfunktionen
function getPlayer(fname, lname) {
  return db
    .prepare('SELECT * FROM players WHERE firstname=? AND lastname=?')
    .get(fname, lname);
}
function createPlayer(fname, lname) {
  db.prepare(`
    INSERT INTO players (firstname, lastname, spin1, spin2, spin3, total)
    VALUES (?, ?, NULL, NULL, NULL, 0)
  `).run(fname, lname);
  return getPlayer(fname, lname);
}
function updatePlayer(p) {
  db.prepare(`
    UPDATE players
    SET spin1=@spin1, spin2=@spin2, spin3=@spin3, total=@total
    WHERE id=@id
  `).run(p);
}

// --- API-Routen ---

// 1) Player registrieren oder laden
app.post('/api/register', (req, res) => {
  const { firstname, lastname } = req.body;
  if (!firstname || !lastname) {
    return res.status(400).json({ error: 'Vor- und Nachname erforderlich' });
  }
  let player = getPlayer(firstname, lastname);
  if (!player) {
    player = createPlayer(firstname, lastname);
  }
  return res.json({ player });
});

// 2) Spin speichern
app.post('/api/spin', (req, res) => {
  const { firstname, lastname, spinNumber, value } = req.body;
  if (!firstname || !lastname || !spinNumber || value === undefined) {
    return res.status(400).json({ error: 'Ungültige Parameter' });
  }
  const p = getPlayer(firstname, lastname);
  if (!p) return res.status(404).json({ error: 'Spieler nicht gefunden' });

  // Feld spin1, spin2, spin3
  const field = `spin${spinNumber}`;
  if (p[field] !== null) {
    return res.status(400).json({ error: `Spin ${spinNumber} bereits erfolgt` });
  }

  p[field] = value;
  // Gesamt neu berechnen
  const s1 = p.spin1 || 0;
  const s2 = p.spin2 || 0;
  const s3 = p.spin3 || 0;
  p.total = s1 + s2 + s3;

  updatePlayer(p);
  return res.json({ success: true, player: p });
});

// 3) Admin-Login (einfach)
app.post('/api/admin/login', (req, res) => {
  const { user, pass } = req.body;
  if (user === 'admin' && pass === 'secret') {
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Falsche Zugangsdaten' });
});

// 4) Admin-Liste aller Spieler (sortiert nach total DESC)
app.get('/api/admin/players', (req, res) => {
  const rows = db.prepare('SELECT * FROM players ORDER BY total DESC').all();
  return res.json({ players: rows });
});

// Fallback
app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
