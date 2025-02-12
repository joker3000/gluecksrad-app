// game.js
console.log("game.js loaded");

// Glücksrad-Elemente
const spinBtn = document.getElementById('spinBtn');
const infoText = document.getElementById('infoText');
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');

// Glücksrad-Segmente (16 Stück)
const SEGMENT_VALUES = [
  0, 0, 0, 0,
  10, 10, 10,
  25, 25,
  50, 100, 200, 400, 600, 800, 1000
];

let angle = 0;  // Winkel für das Rad
let velocity = 0; // Drehgeschwindigkeit
let spinning = false;
let stopping = false;
let markerIndex = null;
let currentSpin = 1;

// Animationsloop für das Rad
function animate() {
  requestAnimationFrame(animate);
  if (spinning) angle += velocity;

  ctx.save();
  ctx.translate(200, 200);
  ctx.rotate(angle * Math.PI / 180);
  ctx.translate(-200, -200);
  drawWheel();
  ctx.restore();
}
animate();

// Zeichne das Glücksrad
function drawWheel() {
  ctx.clearRect(0, 0, 400, 400);

  const segCount = SEGMENT_VALUES.length;
  const segAngle = 2 * Math.PI / segCount;
  ctx.font = 'bold 20px sans-serif';

  for (let i = 0; i < segCount; i++) {
    ctx.beginPath();
    ctx.moveTo(200, 200);
    ctx.arc(200, 200, 200, i * segAngle, (i + 1) * segAngle);
    ctx.fillStyle = randomColor(i);
    ctx.fill();
    ctx.stroke();

    // Text anzeigen
    ctx.save();
    ctx.translate(200, 200);
    ctx.rotate(i * segAngle + segAngle / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(String(SEGMENT_VALUES[i]), 130, 0);
    ctx.restore();
  }

  // Roter Marker (zeigt Endposition an)
  if (markerIndex !== null) {
    ctx.save();
    ctx.translate(200, 200);
    ctx.rotate(markerIndex * segAngle + segAngle / 2);
    ctx.beginPath();
    ctx.arc(130, 0, 10, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'black';
    ctx.stroke();
    ctx.restore();
  }
}

// Zufällige Farben für Segmente
function randomColor(i) {
  const colors = ["red", "blue", "green", "orange", "purple", "yellow", "cyan", "pink"];
  return colors[i % colors.length];
}

// **Startet den Spin**
function startSpin() {
  if (spinning || stopping) return;
  spinning = true;
  velocity = Math.random() * 3 + 3; // Drehgeschwindigkeit zufällig zwischen 3° und 6° pro Frame
  infoText.textContent = `Spin ${currentSpin} läuft...`;
  markerIndex = null;
}

// **Stoppt den Spin**
function stopSpin() {
  if (!spinning || stopping) return;
  stopping = true;
  spinBtn.disabled = true;
  const initVelocity = velocity;
  const steps = 60 * 3; // Langsam in 3 Sekunden stoppen
  let step = 0;

  const slowDown = setInterval(() => {
    step++;
    velocity = initVelocity * (1 - step / steps);
    if (step >= steps) {
      clearInterval(slowDown);
      velocity = 0;
      doBounce();
    }
  }, 1000 / 60);
}

// **Back-Bounce (-5°), um realistisch zu stoppen**
function doBounce() {
  stopping = true;
  const steps = 30;
  let step = 0;
  const bounceAngle = 5; // Kleiner Rücksprung

  const bounce = setInterval(() => {
    step++;
    angle -= bounceAngle / steps;
    if (step >= steps) {
      clearInterval(bounce);
      spinning = false;
      stopping = false;
      finalizeSpin();
    }
  }, 1000 / 60);
}

// **Ermittelt den finalen Wert nach Stopp**
function finalizeSpin() {
  let finalAngle = (angle % 360 + 360) % 360;
  const segCount = SEGMENT_VALUES.length;
  const segAngle = 360 / segCount;
  let idx = Math.floor(finalAngle / segAngle);
  if (idx >= segCount) idx = segCount - 1;
  markerIndex = idx;

  const spinValue = SEGMENT_VALUES[idx];
  infoText.textContent = `Spin ${currentSpin} Ergebnis: ${spinValue}.`;

  // Falls ein API-Call nötig ist, hier einfügen
  // fetch('/api/spin', { method: 'POST' })

  if (currentSpin < 3) {
    setTimeout(() => {
      currentSpin++;
      angle = 0;
      velocity = 0;
      spinning = false;
      stopping = false;
      spinBtn.disabled = false;
      spinBtn.textContent = 'Start';
      infoText.textContent = `Spin ${currentSpin} bereit`;
      markerIndex = null;
    }, 3000);
  } else {
    setTimeout(() => {
      infoText.textContent = `3. Spin fertig. Gesamtpunkte könnten summiert werden.`;
      spinBtn.disabled = false;
      spinBtn.textContent = "Fertig / Logout";
      spinBtn.removeEventListener('click', handleSpin);
      spinBtn.addEventListener('click', () => {
        location.href = '/auth/logout';
      });
    }, 3000);
  }
}

// **Button-Klick logik**
function handleSpin() {
  if (currentSpin < 3) {
    if (!spinning && !stopping) {
      startSpin();
      spinBtn.textContent = 'Stop';
    } else if (spinning && !stopping) {
      stopSpin();
      spinBtn.textContent = 'Start';
    }
  } else if (currentSpin === 3) {
    if (!spinning && !stopping) {
      startSpin();
      spinBtn.disabled = true;
      spinBtn.textContent = 'Spin 3 läuft...';
      setTimeout(() => {
        stopSpin();
      }, Math.random() * 4000 + 3000); // 3-7s zufälliger Auto-Stopp
    }
  }
}

// Event-Listener für den Button
spinBtn.addEventListener('click', handleSpin);

// **Initialisierung**
infoText.textContent = `Spin ${currentSpin} bereit`;
spinBtn.disabled = false;
spinBtn.textContent = 'Start';
