// HTML-Elemente
const firstnameInput = document.getElementById('firstname');
const lastnameInput = document.getElementById('lastname');
const registerBtn = document.getElementById('registerBtn');

const gameArea = document.getElementById('gameArea');
const infoText = document.getElementById('infoText');
const wheelBtn = document.getElementById('wheelBtn');

const spin1Display = document.getElementById('spin1');
const spin2Display = document.getElementById('spin2');
const spin3Display = document.getElementById('spin3');
const totalPointsDisplay = document.getElementById('totalPoints');

const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');

// Spieler-Daten (wird vom Server geladen)
let player = null;
let currentSpin = 1;

// Glücksrad
const SEGMENT_VALUES = [
  0, 0, 0, 0,
  10, 10, 10,
  25, 25,
  50, 100, 200, 400, 600, 800, 1000
];

// Einmalig mischen
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
shuffle(SEGMENT_VALUES);

const segmentAngle = (2 * Math.PI) / SEGMENT_VALUES.length;
const colors = ["#f66", "#6f6", "#66f", "#fa0", "#0af", "#a0f", "#ff6", "#6ff"];

// Drehvariablen
let angle = 0;      // rad
let velocity = 0;   // wie schnell sich das Rad dreht
let spinning = false;
let stopping = false; // ob wir gerade im „Abbremsmodus“ sind

function drawWheel() {
  ctx.clearRect(0, 0, 400, 400);

  // 16 Segmente zeichnen
  for (let i = 0; i < SEGMENT_VALUES.length; i++) {
    ctx.beginPath();
    ctx.moveTo(200, 200);
    ctx.arc(200, 200, 200, i * segmentAngle, (i + 1) * segmentAngle);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.save();
    ctx.translate(200, 200);
    ctx.rotate(i * segmentAngle + segmentAngle / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.fillText(`${SEGMENT_VALUES[i]}`, 100, 0);
    ctx.restore();
  }
}

// Ermittelt den Index, auf den der linke Zeiger zeigt.
// Canvas-0° = nach rechts, also linke Seite = angle + π.
function getSegmentIndex(a) {
  let raw = a + Math.PI;
  // Normalisieren [0..2π)
  raw = (raw % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  return Math.floor(raw / segmentAngle) % SEGMENT_VALUES.length;
}

// Animationsschleife
function animate() {
  requestAnimationFrame(animate);
  if (spinning) {
    angle += velocity;
  }
  ctx.save();
  ctx.translate(200, 200);
  ctx.rotate(angle);
  ctx.translate(-200, -200);
  drawWheel();
  ctx.restore();
}
animate();

// 5° Bounce in die Gegenrichtung, dann finalisieren
function doBounceAndFinalize() {
  stopping = true;
  const steps = 30; // ~0.5 Sek
  const bounceDeg = 5 * Math.PI / 180; // 5°
  let step = 0;
  const bounceInterval = setInterval(() => {
    // Wir drehen uns minimal zurück => wir gehen "gegen" die aktuelle Drehrichtung (angenommen: clockwise)
    angle -= bounceDeg / steps;
    step++;
    if (step >= steps) {
      clearInterval(bounceInterval);
      spinning = false;
      stopping = false;
      finalizeSpin();
    }
  }, 1000 / 60);
}

// Wenn das Rad zum absoluten Stillstand kommt, rufen wir doBounceAndFinalize()
// => am Ende davon finalizeSpin()
function handleStopComplete() {
  // velocity = 0
  doBounceAndFinalize();
}

function finalizeSpin() {
  const idx = getSegmentIndex(angle);
  const points = SEGMENT_VALUES[idx];

  // SpinX eintragen
  if (currentSpin === 1) player.spin1 = points;
  if (currentSpin === 2) player.spin2 = points;
  if (currentSpin === 3) player.spin3 = points;

  const s1 = player.spin1 || 0;
  const s2 = player.spin2 || 0;
  const s3 = player.spin3 || 0;
  player.total = s1 + s2 + s3;

  // Speichern via API
  saveSpinResult(currentSpin, points)
    .then(() => {
      showPlayerSpins();

      if (currentSpin < 3) {
        currentSpin++;
        infoText.textContent = `Spin ${currentSpin} bereit`;
        wheelBtn.disabled = false;
      } else {
        infoText.textContent = `Alle 3 Spins fertig. Gesamt: ${player.total} Punkte.`;
        wheelBtn.disabled = true;
      }
    })
    .catch((err) => {
      console.error(err);
    });
}

// 1 & 2 => manueller Stop. 3 => Autostop
function startSpin() {
  if (spinning || stopping) return;
  spinning = true;
  velocity = Math.random() * 0.3 + 0.3;
  infoText.textContent = `Spin ${currentSpin} läuft...`;
}

function stopSpin() {
  if (!spinning || stopping) return;
  stopping = true;
  wheelBtn.disabled = true;

  // 3s Abbremsphase
  const initialV = velocity;
  const steps = 60 * 3;
  let step = 0;

  const slowInterval = setInterval(() => {
    step++;
    velocity = initialV * (1 - step / steps);
    if (step >= steps) {
      clearInterval(slowInterval);
      velocity = 0;
      handleStopComplete();
    }
  }, 1000 / 60);
}

function autoStopSpin() {
  if (!spinning || stopping) return;
  stopping = true;
  infoText.textContent = `Spin 3 läuft... (Autostopp)`;

  const randomDelay = Math.random() * 4000 + 3000; // 3..7s
  setTimeout(() => {
    stopSpin();
  }, randomDelay);
}

// Zeigt aktuelle (lokale) Playerdaten an
function showPlayerSpins() {
  spin1Display.textContent = player.spin1 === null ? '-' : player.spin1;
  spin2Display.textContent = player.spin2 === null ? '-' : player.spin2;
  spin3Display.textContent = player.spin3 === null ? '-' : player.spin3;
  totalPointsDisplay.textContent = player.total || 0;

  // Wer schon 3 Spins hat, kann nicht mehr spielen
  if (player.spin1 !== null && player.spin2 !== null && player.spin3 !== null) {
    wheelBtn.disabled = true;
    infoText.textContent = `Du hast bereits 3 Spins gemacht: ${player.total} Punkte.`;
  } else {
    // Bestimmen, welcher Spin als nächstes frei ist
    if (player.spin1 === null) currentSpin = 1;
    else if (player.spin2 === null) currentSpin = 2;
    else currentSpin = 3;
    infoText.textContent = `Spin ${currentSpin} bereit`;
    wheelBtn.disabled = false;
  }
}

// Register ruft /api/register auf
function registerPlayer() {
  const firstname = firstnameInput.value.trim();
  const lastname = lastnameInput.value.trim();
  if (!firstname || !lastname) {
    alert('Bitte Vor- und Nachnamen eingeben!');
    return;
  }

  fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstname, lastname })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
        return;
      }
      player = data.player; // vom Server
      showPlayerSpins();
      gameArea.style.display = 'block';
    })
    .catch(err => {
      console.error(err);
      alert('Fehler bei der Registrierung');
    });
}

// Speichert die Punkte per /api/spin
function saveSpinResult(spinNumber, value) {
  return fetch('/api/spin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstname: player.firstname,
      lastname: player.lastname,
      spinNumber,
      value
    })
  }).then(res => res.json());
}

// Klick-Handler für Start/Stop
function handleWheelButton() {
  if (!player) return;
  if (currentSpin === 1 || currentSpin === 2) {
    // Toggle Start/Stop
    if (!spinning && !stopping) {
      // Start
      startSpin();
      wheelBtn.textContent = 'Stop';
    } else if (spinning && !stopping) {
      // Stop
      stopSpin();
      wheelBtn.textContent = 'Start';
    }
  } else if (currentSpin === 3) {
    // Letzter Spin => Autostop
    if (!spinning && !stopping) {
      startSpin();
      autoStopSpin();
      wheelBtn.disabled = true; 
      wheelBtn.textContent = 'Spin 3 läuft...';
    }
  }
}

// Events
registerBtn.addEventListener('click', registerPlayer);
wheelBtn.addEventListener('click', handleWheelButton);

// Erstes Draw
drawWheel();
