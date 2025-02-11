const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- HILFSFUNKTIONEN --- //

// Liefert den Datensatz eines Spielers oder null, falls nicht gefunden.
function getPlayer(firstname, lastname) {
  const stmt = db.prepare(`
    SELECT * FROM players
    WHERE firstname = ? AND lastname = ?
    LIMIT 1
  `);
  return stmt.get(firstname, lastname) || null;
}

// Legt einen neuen Spieler an und gibt das Objekt zurück
function createPlayer(firstname, lastname) {
  const stmt = db.prepare(`
    INSERT INTO players (firstname, lastname, spin1, spin2, spin3, total)
    VALUES (?, ?, NULL, NULL, NULL, 0)
  `);
  const info = stmt.run(firstname, lastname);
  return getPlayer(firstname, lastname);
}

// Speichert die Spins / total in der DB
function updatePlayerSpins(player) {
  const stmt = db.prepare(`
    UPDATE players
    SET spin1 = @spin1, spin2 = @spin2, spin3 = @spin3, total = @total
    WHERE id = @id
  `);
  stmt.run(player);
}

// --- ROUTEN --- //

// 1) Spiel-Route: Wird durch das statische public/index.html abgedeckt.
//    Wir haben hier nur API-Routen für AJAX-Fetch.

// [POST] /api/register => Legt Spieler an oder gibt vorhandenen zurück
app.post('/api/register', (req, res) => {
  const { firstname, lastname } = req.body;
  if (!firstname || !lastname) {
    return res.status(400).json({ error: 'Vorname und Nachname erforderlich.' });
  }

  // Prüfen, ob Spieler existiert
  let player = getPlayer(firstname, lastname);
  if (!player) {
    // Neu anlegen
    player = createPlayer(firstname, lastname);
  }
  res.json({ player });
});

// [POST] /api/spin => Speichert das Ergebnis eines Drehs
app.post('/api/spin', (req, res) => {
  const { firstname, lastname, spinNumber, value } = req.body;
  // spinNumber in [1..3], value = erreichte Punkte
  if (!firstname || !lastname || !spinNumber || !value) {
    return res.status(400).json({ error: 'Ungültige Parameter' });
  }

  const player = getPlayer(firstname, lastname);
  if (!player) {
    return res.status(404).json({ error: 'Spieler nicht gefunden.' });
  }

  // Falls der Spieler den Spin bereits hatte, abbrechen?
  // Oder überschreiben? Hier überschreiben wir NICHT,
  // wenn spinX schon belegt ist.
  const spinField = `spin${spinNumber}`;
  if (player[spinField] !== null) {
    return res.status(400).json({ error: 'Spin schon erfolgt.' });
  }

  // Spieler aktualisieren
  player[spinField] = value;
  // Gesamt neu berechnen
  const sum = [player.spin1, player.spin2, player.spin3]
    .map(x => x || 0)
    .reduce((a, b) => a + b, 0);
  player.total = sum;

  updatePlayerSpins(player);
  res.json({ success: true, player });
});

// 2) Admin-Route: /admin => public/admin.html (statisch),
//    wir brauchen eine API für die Live-Daten.

// [POST] /api/admin/login => simpler Login-Check
app.post('/api/admin/login', (req, res) => {
  const { user, pass } = req.body;
  // Achtung: Hardcode-Demo -> In Produktion: Env-Variablen oder DB
  if (user === 'admin' && pass === 'secret') {
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Falsche Zugangsdaten' });
});

// [GET] /api/admin/players => Listet alle Spieler + Ergebnisse
app.get('/api/admin/players', (req, res) => {
  // In einer echten App würde man natürlich prüfen, ob "eingeloggt" (Session/Cookie)
  // Hier aber nur Demo
  const rows = db.prepare(`SELECT * FROM players ORDER BY total DESC`).all();
  res.json({ players: rows });
});

// Alle anderen Routen -> 404
app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
