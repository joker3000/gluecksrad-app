// Hier die Logik des Glücksrads: 3 Spins, Start/Stop-Verhalten etc.

// --- UI-Elemente
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

// --- SPIELZUSTAND (Beispielwerte)
let currentSpin = 1;
let playerData = {
  firstname: '',
  lastname: '',
  spin1: null,
  spin2: null,
  spin3: null,
  total: 0
};

// --- GLÜCKSRAD-EINSTELLUNGEN
const SEGMENT_VALUES = [
  0, 0, 0, 0,
  10, 10, 10,
  25, 25,
  50, 100, 200, 400, 600, 800, 1000
];

// Zufällig mischen (einmalig)
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

// --- DREH-Variablen
let angle = 0;       // aktueller Winkel in rad
let velocity = 0;    // wie schnell sich das Rad dreht
let spinning = false; // ob das Rad in Bewegung ist
let stopping = false; // ob wir uns gerade im "Abbrems-Modus" befinden (z.B. 3s Verzögerung)

// Zeichnet das Glücksrad
function drawWheel() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < SEGMENT_VALUES.length; i++) {
    ctx.beginPath();
    ctx.moveTo(200, 200);
    ctx.arc(200, 200, 200, i * segmentAngle, (i + 1) * segmentAngle);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.stroke();

    // Segment-Beschriftung
    ctx.save();
    ctx.translate(200, 200);
    ctx.rotate(i * segmentAngle + segmentAngle / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(`${SEGMENT_VALUES[i]}`, 100, 0);
    ctx.restore();
  }
}

// Ermittelt, welches Segment "links" (Pointer-Seite) trifft
// Canvas-0° zeigt nach rechts, also "links" = angle + PI
function getCurrentSegmentIndex(a) {
  let rawAngle = a + Math.PI; // "links"
  // Normalisieren in [0..2π)
  rawAngle = (rawAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const idx = Math.floor(rawAngle / segmentAngle);
  return idx;
}

// Animationsloop
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
animate(); // startet sofort

// Startet einen Spin (Spin 1 oder 2 => Klick = Start, nochmal Klick = Stop)
// Spin 3 => Klick = Start, Autostopp nach 3-7 Sek
function startSpin() {
  if (spinning || stopping) return; // Schon in Bewegung
  spinning = true;
  velocity = Math.random() * 0.3 + 0.3; // Startgeschwindigkeit
  infoText.textContent = `Spin ${currentSpin} läuft...`;
}

// Stoppt (Spin 1 oder 2) => Abbremsen in 3s
function stopSpin() {
  if (!spinning || stopping) return;
  stopping = true;  // wir sind im Abbrems-Modus
  wheelBtn.disabled = true; // kein erneuter Klick

  const initialV = velocity;
  const steps = 60 * 3; // 3 Sekunden ~ 60fps
  let step = 0;

  const slowInterval = setInterval(() => {
    step++;
    velocity = initialV * (1 - step / steps);
    if (step >= steps) {
      clearInterval(slowInterval);
      velocity = 0;
      spinning = false;
      stopping = false;
      finalizeSpin();
    }
  }, 1000 / 60);
}

// Letzter Spin => Automatischer Stop nach 3-7s
function autoStop() {
  if (!spinning || stopping) return;
  stopping = true;
  infoText.textContent = `Spin 3 läuft... (Auto-Stop folgt)`;
  
  const randomDelay = Math.random() * 4000 + 3000; // 3-7 Sek
  setTimeout(() => {
    stopSpin(); // ruft denselben 3s-Stop wie oben auf
  }, randomDelay);
}

// Wird aufgerufen, wenn der Spin endet => ermittelt Segment & Punkte
function finalizeSpin() {
  const idx = getCurrentSegmentIndex(angle);
  const value = SEGMENT_VALUES[idx];

  // "Speichern" in unserem playerData
  if (currentSpin === 1) {
    playerData.spin1 = value;
  } else if (currentSpin === 2) {
    playerData.spin2 = value;
  } else if (currentSpin === 3) {
    playerData.spin3 = value;
  }

  // Total berechnen
  playerData.total = [playerData.spin1, playerData.spin2, playerData.spin3]
    .filter(x => x !== null)
    .reduce((a, b) => a + b, 0);

  showUserSpins();

  // Hier würdest Du nun per fetch() an Deinen Server schicken:
  // saveSpinResult(currentSpin, value);

  if (currentSpin < 3) {
    currentSpin++;
    infoText.textContent = `Spin ${currentSpin} bereit.`;
    wheelBtn.disabled = false;
  } else {
    infoText.textContent = `Alle 3 Spins beendet. Gesamt: ${playerData.total} Punkte.`;
    wheelBtn.disabled = true;
  }
}

// Updatet die Anzeige der User-Spins
function showUserSpins() {
  spin1Display.textContent = playerData.spin1 === null ? '-' : playerData.spin1;
  spin2Display.textContent = playerData.spin2 === null ? '-' : playerData.spin2;
  spin3Display.textContent = playerData.spin3 === null ? '-' : playerData.spin3;
  totalPointsDisplay.textContent = playerData.total;
}

// Klick auf „Spielen / Fortsetzen“
function registerPlayer() {
  const firstname = firstnameInput.value.trim();
  const lastname = lastnameInput.value.trim();
  if (!firstname || !lastname) {
    alert('Bitte Vor- und Nachnamen eingeben!');
    return;
  }

  playerData.firstname = firstname;
  playerData.lastname = lastname;
  // Hier würdest Du per fetch() /api/register den Spieler laden/erstellen

  // Angenommen wir bekommen vom Server:
  // playerData = { firstname, lastname, spin1, spin2, spin3, total }

  // Hier nur Demo:
  playerData.spin1 = null;
  playerData.spin2 = null;
  playerData.spin3 = null;
  playerData.total = 0;

  currentSpin = 1;
  showUserSpins();

  infoText.textContent = `Bereit für Spin ${currentSpin}`;
  wheelBtn.disabled = false;
  gameArea.style.display = 'block';
}

// Klick auf „Start / Stop“ => je nach Spin
function handleWheelClick() {
  if (currentSpin < 3) {
    // Spin 1 oder 2 -> toggeln
    // - Falls nicht dreht, startSpin()
    // - Falls dreht, stopSpin()
    if (!spinning && !stopping) {
      startSpin();
      wheelBtn.textContent = 'Stop';
    } else {
      stopSpin();
      wheelBtn.textContent = 'Start';
    }
  } else if (currentSpin === 3) {
    // Letzter Spin => Start und autostop
    if (!spinning && !stopping) {
      startSpin();
      wheelBtn.disabled = true; // kein manuelles Stop
      autoStop();
    }
  }
}

// Events
registerBtn.addEventListener('click', registerPlayer);
wheelBtn.addEventListener('click', handleWheelClick);

// Initialer Wheel-Draw
drawWheel();
