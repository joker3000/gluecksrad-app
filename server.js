const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// Statische Dateien aus dem public-Verzeichnis
app.use(express.static(path.join(__dirname, 'public')));

// Hilfsfunktionen
function getPlayerId(firstname, lastname) {
  const row = db.prepare(`
    SELECT id FROM players WHERE firstname=? AND lastname=? LIMIT 1
  `).get(firstname, lastname);
  return row ? row.id : null;
}
function createPlayer(firstname, lastname) {
  const info = db.prepare(`
    INSERT INTO players (firstname, lastname) VALUES (?, ?)
  `).run(firstname, lastname);
  return info.lastInsertRowid;
}
function getSpin(playerId, spinNumber) {
  return db.prepare(`
    SELECT * FROM spins WHERE player_id=? AND spin_number=?
  `).get(playerId, spinNumber);
}
function createSpin(playerId, spinNumber, distribution) {
  db.prepare(`
    INSERT INTO spins (player_id, spin_number, distribution)
    VALUES (?, ?, ?)
  `).run(playerId, spinNumber, JSON.stringify(distribution));
}
function updateSpinResult(spinId, finalAngle, finalValue) {
  db.prepare(`
    UPDATE spins
    SET spin_angle = ?, spin_value = ?
    WHERE id = ?
  `).run(finalAngle, finalValue, spinId);
}

// 1) /api/register
app.post('/api/register', (req, res) => {
  const { firstname, lastname } = req.body;
  if (!firstname || !lastname) {
    return res.status(400).json({ error: 'Vor- und Nachname erforderlich' });
  }

  // Player anlegen oder holen
  let playerId = getPlayerId(firstname, lastname);
  if (!playerId) {
    playerId = createPlayer(firstname, lastname);
  }

  // spin1..3 anlegen, falls nicht vorhanden
  for (let s = 1; s <= 3; s++) {
    const existing = getSpin(playerId, s);
    if (!existing) {
      // Zufällige Verteilung (16 Felder)
      let baseSegments = [
        0,0,0,0,
        10,10,10,
        25,25,
        50,100,200,400,600,800,1000
      ];
      // Fisher-Yates-Shuffle
      for (let i = baseSegments.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [baseSegments[i], baseSegments[j]] = [baseSegments[j], baseSegments[i]];
      }
      createSpin(playerId, s, baseSegments);
    }
  }

  // Alle Spins laden
  const allSpins = db.prepare(`
    SELECT * FROM spins
    WHERE player_id=? ORDER BY spin_number
  `).all(playerId);

  let total = 0;
  const spinInfo = allSpins.map(sp => {
    const dist = JSON.parse(sp.distribution);
    const val = sp.spin_value ?? null;
    if (val !== null) total += val;
    return {
      spinNumber: sp.spin_number,
      distribution: dist,
      angle: sp.spin_angle,
      value: val
    };
  });

  res.json({
    playerId,
    firstname,
    lastname,
    total,
    spins: spinInfo
  });
});

// 2) /api/spinResult
//    finalAngle => index => finalValue => update DB
app.post('/api/spinResult', (req, res) => {
  const { playerId, spinNumber, finalAngle } = req.body;
  if (!playerId || !spinNumber || finalAngle === undefined) {
    return res.status(400).json({ error: 'Ungültige Parameter.' });
  }

  const spin = getSpin(playerId, spinNumber);
  if (!spin) {
    return res.status(404).json({ error: 'Spin nicht gefunden.' });
  }
  if (spin.spin_value !== null) {
    return res.status(400).json({ error: 'Spin bereits abgeschlossen.' });
  }

  const distribution 
