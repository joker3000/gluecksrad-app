const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Hilfsfunktionen
function getPlayerId(firstname, lastname) {
  const row = db
    .prepare(`SELECT id FROM players WHERE firstname=? AND lastname=?`)
    .get(firstname, lastname);
  return row ? row.id : null;
}

function createPlayer(firstname, lastname) {
  const info = db
    .prepare(`INSERT INTO players (firstname, lastname) VALUES (?, ?)`)
    .run(firstname, lastname);
  return info.lastInsertRowid;
}

function getSpin(playerId, spinNumber) {
  return db
    .prepare(`SELECT * FROM spins WHERE player_id=? AND spin_number=?`)
    .get(playerId, spinNumber);
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
  let playerId = getPlayerId(firstname, lastname);
  if (!playerId) {
    playerId = createPlayer(firstname, lastname);
  }

  // spin1..3 anlegen, falls nicht vorhanden
  for (let s = 1; s <= 3; s++) {
    const existing = getSpin(playerId, s);
    if (!existing) {
      // Zufällige Verteilung
      const baseSegments = [
        0, 0, 0, 0,
        10, 10, 10,
        25, 25,
        50, 100, 200, 400, 600, 800, 1000
      ];
      for (let i = baseSegments.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [baseSegments[i], baseSegments[j]] = [baseSegments[j], baseSegments[i]];
      }
      createSpin(playerId, s, baseSegments);
    }
  }

  // Alle Spins laden
  const allSpins = db
    .prepare(`SELECT * FROM spins WHERE player_id=? ORDER BY spin_number`)
    .all(playerId);

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
// Nimmt finalAngle (0..360) => index = floor(finalAngle / segAngle)
// => spin_value = distribution[index]
app.post('/api/spinResult', (req, res) => {
  const { playerId, spinNumber, finalAngle } = req.body;
  if (!playerId || !spinNumber || finalAngle === undefined) {
    return res.status(400).json({ error: 'Ungültige Parameter' });
  }

  const spin = getSpin(playerId, spinNumber);
  if (!spin) {
    return res.status(404).json({ error: 'Spin nicht gefunden.' });
  }
  if (spin.spin_value !== null) {
    return res.status(400).json({ error: 'Spin bereits abgeschlossen.' });
  }

  const distribution = JSON.parse(spin.distribution);
  const segCount = distribution.length; // 16
  const segAngle = 360 / segCount;

  let rawAngle = (finalAngle % 360 + 360) % 360;
  let idx = Math.floor(rawAngle / segAngle);
  if (idx >= segCount) idx = segCount - 1; // Sicherheitscheck

  const finalValue = distribution[idx];

  // DB-Update
  updateSpinResult(spin.id, finalAngle, finalValue);

  // total neu berechnen
  const allSpins = db
    .prepare(`SELECT * FROM spins WHERE player_id=?`)
    .all(playerId);

  let total = 0;
  for (const s of allSpins) {
    if (s.spin_value !== null) total += s.spin_value;
  }

  res.json({ success: true, spinValue: finalValue, total });
});

// 3) /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { user, pass } = req.body;
  if (user === 'admin' && pass === 'secret') {
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Falsche Zugangsdaten' });
});

// 4) /api/admin/players => sortiert nach total absteigend
app.get('/api/admin/players', (req, res) => {
  const players = db.prepare(`SELECT * FROM players`).all();
  let resultRows = players.map(p => {
    const spins = db.prepare(`SELECT * FROM spins WHERE player_id=?`).all(p.id);
    let total = 0;
    const spinValues = [null, null, null];
    for (let s of spins) {
      if (s.spin_value !== null) total += s.spin_value;
      spinValues[s.spin_number - 1] = s.spin_value;
    }
    return {
      firstname: p.firstname,
      lastname: p.lastname,
  
