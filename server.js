const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// Statische Dateien aus /public
app.use(express.static(path.join(__dirname, 'public')));

// Hilfsfunktionen
function getPlayer(firstname, lastname) {
  return db
    .prepare('SELECT * FROM players WHERE firstname=? AND lastname=?')
    .get(firstname, lastname);
}

function createPlayer(firstname, lastname) {
  db.prepare(`
    INSERT INTO players (firstname, lastname, spin1, spin2, spin3, total)
    VALUES (?, ?, NULL, NULL, NULL, 0)
  `).run(firstname, lastname);
  return getPlayer(firstname, lastname);
}

function updatePlayer(player) {
  db.prepare(`
    UPDATE players
    SET spin1=@spin1, spin2=@spin2, spin3=@spin3, total=@total
    WHERE id=@id
  `).run(player);
}

// --- Routen --- //

// 1) Registrierung/Laden eines Spielers
app.post('/api/register', (req, res) => {
  const { firstname, lastname } = req.body;
  if (!firstname || !lastname) {
    return res.status(400).json({ error: 'Vor- und Nachname erforderlich.' });
  }
  let player = getPlayer(firstname, lastname);
  if (!player) {
    player = createPlayer(firstname, lastname);
  }
  res.json({ player });
});

// 2) Spin-Resultat speichern
app.post('/api/spin', (req, res) => {
  const { firstname, lastname, spinNumber, value } = req.body;
  if (!firstname || !lastname || !spinNumber || value === undefined) {
    return res.status(400).json({ error: 'Ungültige Parameter.' });
  }

  const player = getPlayer(firstname, lastname);
  if (!player) {
    return res.status(404).json({ error: 'Spieler nicht gefunden.' });
  }

  // Spezifisches Spin-Feld (spin1, spin2, spin3)
  const field = `spin${spinNumber}`;
  if (player[field] !== null) {
    return res.status(400).json({ error: `Spin ${spinNumber} bereits erfolgt.` });
  }

  player[field] = value;
  // Neue Gesamtpunkte
  const s1 = player.spin1 || 0;
  const s2 = player.spin2 || 0;
  const s3 = player.spin3 || 0;
  player.total = s1 + s2 + s3;

  updatePlayer(player);

  res.json({ success: true, player });
});

// 3) Admin-Login (Demo)
app.post('/api/admin/login', (req, res) => {
  const { user, pass } = req.body;
  if (user === 'admin' && pass === 'secret') {
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Falsche Zugangsdaten' });
});

// 4) Admin-Daten (Live-Abfrage)
app.get('/api/admin/players', (req, res) => {
  // In Realität würde man checken, ob Admin eingeloggt ist. Demo:
  const rows = db.prepare('SELECT * FROM players ORDER BY total DESC').all();
  res.json({ players: rows });
});

// Fallback
app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
