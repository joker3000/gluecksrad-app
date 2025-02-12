console.log("game.js loaded");

// Elemente abrufen
const spinBtn = document.getElementById("spinBtn");
const infoText = document.getElementById("infoText");
const spinResults = document.getElementById("spinResults");
const result1 = document.getElementById("result1");
const result2 = document.getElementById("result2");
const result3 = document.getElementById("result3");
const totalScoreElement = document.getElementById("totalScore");

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

let wheelConfig = []; // Speichert die zufällige Anordnung der Glücksrad-Zahlen
let angle = 0;
let velocity = 0;
let spinning = false;
let stopping = false;
let markerIndex = null;
let currentSpin = 1;
let totalScore = 0;
let spinScores = [null, null, null];

// Glücksrad-Zahlen vom Server abrufen
function fetchWheelConfig() {
  fetch("/api/wheel-config")
    .then(response => response.json())
    .then(data => {
      wheelConfig = data.wheelConfig;
      console.log("Rad-Konfiguration:", wheelConfig);
      drawWheel();
    })
    .catch(error => console.error("Fehler beim Laden des Rades:", error));
}

// Glücksrad zeichnen
function drawWheel() {
  ctx.clearRect(0, 0, 400, 400);
  const segCount = wheelConfig.length;
  const segAngle = 2 * Math.PI / segCount;

  for (let i = 0; i < segCount; i++) {
    ctx.beginPath();
    ctx.moveTo(200, 200);
    ctx.arc(200, 200, 200, i * segAngle, (i + 1) * segAngle);
    ctx.fillStyle = randomColor(i);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.translate(200, 200);
    ctx.rotate(i * segAngle + segAngle / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.fillText(String(wheelConfig[i]), 130, 0);
    ctx.restore();
  }

  if (markerIndex !== null) {
    ctx.save();
    ctx.translate(200, 200);
    ctx.rotate(markerIndex * segAngle + segAngle / 2);
    ctx.beginPath();
    ctx.arc(130, 0, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.stroke();
    ctx.restore();
  }
}

// Zufällige Farben für Segmente
function randomColor(i) {
  const colors = ["red", "blue", "green", "orange", "purple", "yellow", "cyan", "pink"];
  return colors[i % colors.length];
}

// Spin starten
function startSpin() {
  if (spinning || stopping) return;
  spinning = true;
  velocity = Math.random() * 3 + 3;
  infoText.textContent = `Spin ${currentSpin} läuft...`;
  markerIndex = null;
  spinBtn.textContent = "Stop";
}

// Spin stoppen
function stopSpin() {
  if (!spinning || stopping) return;
  stopping = true;
  spinBtn.disabled = true;
  const initVelocity = velocity;
  const steps = 60 * 3;
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

// Back-Bounce für realistisches Stoppen (-5°)
function doBounce() {
  stopping = true;
  const steps = 30;
  let step = 0;
  const bounceAngle = 5;

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

// Finales Ergebnis berechnen
function finalizeSpin() {
  let finalAngle = (angle % 360 + 360) % 360;
  const segCount = wheelConfig.length;
  const segAngle = 360 / segCount;
  let idx = Math.floor(finalAngle / segAngle);
  if (idx >= segCount) idx = segCount - 1;
  markerIndex = idx;

  const spinValue = wheelConfig[idx];
  spinScores[currentSpin - 1] = spinValue;
  totalScore = spinScores.reduce((a, b) => a + (b || 0), 0);
  updateSpinResults();

  infoText.textContent = `Spin ${currentSpin} Ergebnis: ${spinValue}.`;

  if (currentSpin < 3) {
    setTimeout(() => {
      currentSpin++;
      angle = 0;
      velocity = 0;
      spinning = false;
      stopping = false;
      spinBtn.disabled = false;
      spinBtn.textContent = "Start";
      infoText.textContent = `Spin ${currentSpin} bereit`;
      markerIndex = null;
    }, 3000);
  } else {
    setTimeout(() => {
      infoText.textContent = `Spiel beendet. Deine Gesamtpunkte: ${totalScore}`;
      spinBtn.textContent = "Logout";
      spinBtn.removeEventListener("click", handleSpin);
      spinBtn.addEventListener("click", () => {
        location.href = "/auth/logout";
      });
    }, 3000);
  }
}

// Spin-Button-Logik
function handleSpin() {
  if (currentSpin < 3) {
    if (!spinning && !stopping) {
      startSpin();
      spinBtn.textContent = "Stop";
    } else if (spinning && !stopping) {
      stopSpin();
      spinBtn.disabled = true;
    }
  } else if (currentSpin === 3) {
    if (!spinning && !stopping) {
      startSpin();
      spinBtn.disabled = true;
      spinBtn.textContent = "Stoppt automatisch";
      setTimeout(() => {
        stopSpin();
      }, Math.random() * 4000 + 3000);
    }
  }
}

spinBtn.addEventListener("click", handleSpin);

// Spin-Ergebnisse anzeigen
function updateSpinResults() {
  result1.textContent = spinScores[0] !== null ? spinScores[0] : "-";
  result2.textContent = spinScores[1] !== null ? spinScores[1] : "-";
  result3.textContent = spinScores[2] !== null ? spinScores[2] : "-";
  totalScoreElement.textContent = totalScore;
}

fetchWheelConfig();
