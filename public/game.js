// UI-Elemente
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

// Spielzustand
let player = null;
let currentSpin = 1; // 1..3

// SEGMENTE
const SEGMENT_VALUES = [
  0, 0, 0, 0,
  10, 10, 10,
  25, 25,
  50, 100, 200, 400, 600, 800, 1000
];

// Eimalig zufällig mischen
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
shuffle(SEGMENT_VALUES);

const segmentAngle = (2 * Math.PI) / SEGMENT_VALUES.length;
const colors = ["#f66", "#6f6", "#66f", "#fa0", "#0af", "#a0f", "#ff6", "#6ff"];

// Drehvariablen
let angle = 0;       // aktueller Winkel
let velocity = 0;    // Geschw. (rad/frame)
let spinning = false;
let stopping = false; // sind wir in einer Stopp/Abbrems-Phase?

// Zeichnet das Rad
function drawWheel() {
  ctx.clearRect(0, 0, 400, 400);

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
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(`${SEGMENT_VALUES[i]}`, 100, 0);
    ctx.restore();
  }
}

// Ermittelt das Segment, das nach links (angle+π) zeigt
function getSegmentIndex(a) {
  let raw = a + Math.PI; // "links"
  raw = (raw % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  return Math.floor(raw / segmentAngle);
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

// 5°-Bounce (zurück) => dann finalize
function doBounceAndFinalize() {
  stopping = true;
  const steps = 30; // ~ 0.5 Sek
  const bounceAngle = (5 * Math.PI) / 180; // 5° in rad
  let step = 0;

  const bounceInterval = setInterval(() => {
    // Wir drehen uns minimal "gegen die bisherige Richtung" => angle -= ...
    angle -= bounceAngle / steps;
    step++;
    if (step >= steps) {
      clearInterval(bounceInterval);
      spinning = false;
      stopping = false;
      finalizeSpin();
    }
  }, 1000 / 60);
}

// Wird aufgerufen, wenn das Rad (nach 3s Abbremsen) auf velocity=0 kommt
function handleStopComplete() {
  velocity = 0;
  doBounceAndFinalize();
}

// Erst wenn der Bounce vorbei ist, ermitteln wir das Segment
function finalizeSpin() {
  const idx = getSegmentIndex(angle);
  const points = SEGMENT_VALUES[idx];

  // Spin-Wert lokal eintragen
  if (currentSpin === 1) player.spin1 = points;
  if (currentSpin === 2) player.spin2 = points;
  if (currentSpin === 3) player.spin3 = points;

  const s1 = player.spin1 || 0;
  const s2 = player.spin2 || 0;
  const s3 = player.spin3 || 0;
  player.total = s1 + s2 + s3;

  // Auf Server speichern
  saveSpinResult(currentSpin, points)
    .then(() => {
      showPlayerSpins();

      // Nächster Spin oder Ende
      if (currentSpin < 3) {
        currentSpin++;
        infoText.textContent = `Spin ${currentSpin} bereit`;
        wheelBtn.disabled = false;
      } else {
        infoText.textContent = `Alle 3 Spins beendet. Gesamt: ${player.total} Punkte.`;
        wheelBtn.disabled = true;
      }
    })
    .catch(err => {
      console.error(err);
    });
}

// Spin starten (Spin 1/2 => manuell, Spin 3 => autoStop)
function startSpin() {
  if (spinning || stopping) return;
  spinning = true;
  velocity = Math.random() * 0.3 + 0.3;
  infoText.textContent = `Spin ${currentSpin} läuft...`;
}

// Spin manuell stoppen => 3s Abbremsen => handleStopComplete => Bounce => finalize
function stopSpin() {
  if (!spinning || stopping) return;
  stopping = true;
  wheelBtn.disabled = true;

  const initialV = velocity;
  const steps = 60 * 3; // 3s
  let step = 0;

  const slowInterval = setInterval(() => {
    step++;
    velocity = initialV * (1 - step / steps);
    if (step >= steps) {
      clearInterval(slowInterval);
      handleStopComplete();
    }
  }, 1000 / 60);
}

// Spin 3: Autostopp nach 3-7s
function autoStopSpin() {
  if (!spinning || stopping) return;
  stopping = true;
  const randomDelay = Math.random() * 4000 + 3000; // 3..7 Sek

  setTimeout(() => {
    stopSpin();
  }, randomDelay);
}

// Klick auf Start/Stop
function handleWheelBtnClick() {
  if (!player) return;

  if (currentSpin < 3) {
    // Spin 1/2 => Klick toggelt Start/Stop
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
    // Spin 3 => nur Start, dann Autostopp
    if (!spinning && !stopping) {
      startSpin();
      autoStopSpin();
      wheelBtn.disabled = true; 
      wheelBtn.textContent = 'Spin 3 läuft...';
    }
  }
}

// Registrieren / Weiterspielen
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
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
        return;
      }
      player = data.player;
      initFromPlayerData();
      gameArea.style.display = 'block';
    })
    .catch(err => {
      console.error(err);
      alert('Fehler bei der Registrierung');
    });
}

// Lädt den Zustand aus player => zeigt UI
function initFromPlayerData() {
  const { spin1, spin2, spin3, total } = player;
  spin1Display.textContent = spin1 === null ? '-' : spin1;
  spin2Display.textContent = spin2 === null ? '-' : spin2;
  spin3Display.textContent = spin3 === null ? '-' : spin3;
  totalPointsDisplay.textContent = total || 0;

  // Nächsten Spin bestimmen
  if (spin1 === null) {
    currentSpin = 1;
  } else if (spin2 === null) {
    currentSpin = 2;
  } else if (spin3 === null) {
    currentSpin = 3;
  } else {
    // Alle 3 fertig
    currentSpin = 4; 
    infoText.textContent = `Alle 3 Spins erledigt, Gesamt: ${total}`;
    wheelBtn.disabled = true;
    return;
  }
  infoText.textContent = `Spin ${currentSpin} bereit`;
  wheelBtn.disabled = false;
  wheelBtn.textContent = 'Start';
}

// Zeigt nur das neueste (lokale) player-Feld an
function showPlayerSpins() {
  spin1Display.textContent = player.spin1 === null ? '-' : player.spin1;
  spin2Display.textContent = player.spin2 === null ? '-' : player.spin2;
  spin3Display.textContent = player.spin3 === null ? '-' : player.spin3;
  totalPointsDisplay.textContent = player.total;
}

// Speichert Spin in DB
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
  }).then(r => r.json());
}

// Events
registerBtn.addEventListener('click', registerPlayer);
wheelBtn.addEventListener('click', handleWheelBtnClick);

// Initiales Zeichnen
drawWheel();
