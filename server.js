const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper-Funktionen
function getPlayerId(fname, lname) {
  const row = db.prepare(`SELECT id FROM players WHERE firstname=? AND lastname=?`).get(fname, lname);
  if (row) return row.id;
  return null;
}
function createPlayer(fname, lname) {
  const info = db.prepare(`INSERT INTO players (firstname, lastname) VALUES (?, ?)`).run(fname, lname);
  return info.lastInsertRowid;
}
function getSpin(playerId, spinNumber) {
  return db.prepare(`
    SELECT * FROM spins
    WHERE player_id=? AND spin_number=?
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
//    - Sucht/erstellt Player
//    - Prüft, ob spin1, spin2, spin3 existieren, wenn nicht -> erstellt sie
//    - Gibt alle relevanten Daten zurück (inkl. spin_value)
app.post('/api/register', (req, res) => {
  const { firstname, lastname } = req.body;
  if (!firstname || !lastname) {
    return res.status(400).json({ error: 'Vor- und Nachname erforderlich' });
  }
  let playerId = getPlayerId(firstname, lastname);
  if (!playerId) {
    playerId = createPlayer(firstname, lastname);
  }

  // For up to 3 spins, create them if not present
  for (let s = 1; s <= 3; s++) {
    const existingSpin = getSpin(playerId, s);
    if (!existingSpin) {
      // Neue Zufallsverteilung
      const baseSegments = [
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

  // Wir geben alle Spin-Infos zurück (1..3)
  const allSpins = db.prepare(`
    SELECT * FROM spins
    WHERE player_id=?
    ORDER BY spin_number
  `).all(playerId);

  // Summiere den total
  let total = 0;
  let spinInfo = allSpins.map(sp => {
    const distribution = JSON.parse(sp.distribution);
    const val = sp.spin_value ?? null;
    if (val !== null) {
      total += val;
    }
    return {
      spinNumber: sp.spin_number,
      distribution,
      angle: sp.spin_angle,
      value: val
    };
  });

  // Rückgabe
  res.json({
    playerId,
    firstname,
    lastname,
    total,
    spins: spinInfo
  });
});

// 2) /api/spinResult => bekommt finalAngle (0..360) für Spin X
//    Server berechnet, welcher Wert bei 270° liegt => speichert + return
app.post('/api/spinResult', (req, res) => {
  const { playerId, spinNumber, finalAngle } = req.body;
  if (!playerId || !spinNumber || finalAngle === undefined) {
    return res.status(400).json({ error: 'Ungültige Parameter' });
  }

  const sp = getSpin(playerId, spinNumber);
  if (!sp) {
    return res.status(404).json({ error: 'Spin nicht gefunden' });
  }
  if (sp.spin_value !== null) {
    return res.status(400).json({ error: 'Spin bereits abgeschlossen' });
  }

  const distribution = JSON.parse(sp.distribution);
  const segCount = distribution.length; // 16
  const segAngle = 360 / segCount;

  // Die Position, die "links" zeigt, ist 270° in "Canvas-Logik".
  // Wir addieren also (finalAngle + 270), normalisieren in [0..360).
  let rawAngle = finalAngle + 270;
  rawAngle = (rawAngle % 360 + 360) % 360;

  // Index
  const idx = Math.floor(rawAngle / segAngle);
  const finalValue = distribution[idx];

  // In DB speichern
  updateSpinResult(sp.id, finalAngle, finalValue);

  // Neu berechnen, wie viel der Spieler hat
  const allSpins = db.prepare(`
    SELECT * FROM spins WHERE player_id=?
  `).all(sp.player_id);

  let total = 0;
  for (let s of allSpins) {
    if (s.spin_value !== null) {
      total += s.spin_value;
    }
  }

  res.json({
    success: true,
    spinValue: finalValue,
    total
  });
});

// 3) /api/admin/login => simpler Demo-Login
app.post('/api/admin/login', (req, res) => {
  const { user, pass } = req.body;
  if (user === 'admin' && pass === 'secret') {
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Falsche Zugangsdaten' });
});

// 4) /api/admin/players => Summierte Spielergebnisse
//    Summiere spin_value von spin1..3
app.get('/api/admin/players', (req, res) => {
  // Man könnte aufwändiger joinen; hier simpler approach
  const players = db.prepare(`SELECT * FROM players`).all();

  let resultRows = players.map(p => {
    const spins = db.prepare(`SELECT * FROM spins WHERE player_id=?`).all(p.id);
    let total = 0;
    let spinValues = [null, null, null]; // Index 0->spin1, 1->spin2, 2->spin3
    for (let s of spins) {
      if (s.spin_value !== null) {
        total += s.spin_value;
      }
      spinValues[s.spin_number - 1] = s.spin_value;
    }
    return {
      firstname: p.firstname,
      lastname: p.lastname,
      spin1: spinValues[0],
      spin2: spinValues[1],
      spin3: spinValues[2],
      total
    };
  });
  // Sortiere absteigend nach total
  resultRows.sort((a, b) => b.total - a.total);

  res.json({ players: resultRows });
});

// Fallback
app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
