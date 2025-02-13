console.log("game.js loaded");

// Elemente abrufen
const spinBtn = document.getElementById("spinBtn");
const infoText = document.getElementById("infoText");
const result1 = document.getElementById("result1");
const result2 = document.getElementById("result2");
const result3 = document.getElementById("result3");
const totalScoreElement = document.getElementById("totalScore");
const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

let wheelConfig = [];
let angle = 0;
let velocity = 0;
let spinning = false;
let stopping = false;
let markerIndex = null;
let currentSpin = 1;
let totalScore = 0;
let spinScores = [null, null, null];

// ✅ API: Rad-Daten laden
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

// ✅ Das Rad wird animiert (Drehung sichtbar)
function animateWheel() {
    if (spinning) {
        angle += velocity;
        velocity *= 0.98;
        if (velocity < 0.02) {
            velocity = 0;
            spinning = false;
            doBackBounce();
        }
    }
    drawWheel();
    requestAnimationFrame(animateWheel);
}

// ✅ Rad zeichnen
function drawWheel() {
    ctx.clearRect(0, 0, 400, 400);
    const segCount = wheelConfig.length;
    const segAngle = (2 * Math.PI) / segCount;

    ctx.save();
    ctx.translate(200, 200);
    ctx.rotate(angle);

    for (let i = 0; i < segCount; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 200, i * segAngle, (i + 1) * segAngle);
        ctx.fillStyle = randomColor(i);
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.rotate(i * segAngle + segAngle / 2);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#000";
        ctx.fillText(String(wheelConfig[i]), 130, 0);
        ctx.restore();
    }

    ctx.restore();

    // ✅ Roter Punkt für Endwert setzen
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

// ✅ Zufällige Farben
function randomColor(i) {
    const colors = ["red", "blue", "green", "orange", "purple", "yellow", "cyan", "pink"];
    return colors[i % colors.length];
}

// ✅ Spin starten (Spin 1-3)
function startSpin() {
    if (spinning || stopping) return;
    spinning = true;
    velocity = Math.random() * 4 + 3;
    infoText.textContent = `Spin ${currentSpin} läuft...`;
    spinBtn.textContent = "Stop";
    spinBtn.disabled = false;

    // ✅ Falls Spin 3, Auto-Stop aktivieren
    if (currentSpin === 3) {
        spinBtn.textContent = "Letzter Spin (Auto-Stop)";
        spinBtn.disabled = true; 
        setTimeout(stopSpin, Math.random() * 4000 + 3000);
    }

    markerIndex = null;
}

// ✅ Spin stoppen (nur für Spin 1 & 2 manuell)
function stopSpin() {
    if (!spinning || stopping) return;
    stopping = true;
    const slowDown = setInterval(() => {
        velocity *= 0.95;
        if (velocity < 0.05) {
            clearInterval(slowDown);
            velocity = 0;
            spinning = false;
            doBackBounce();
        }
    }, 1000 / 60);
}

// ✅ Back-Bounce (-5° Rückfedern nach Stillstand)
function doBackBounce() {
    stopping = true;
    const steps = 30;
    let step = 0;
    const bounceAngle = 5;

    const bounce = setInterval(() => {
        step++;
        angle -= bounceAngle / steps;
        if (step >= steps) {
            clearInterval(bounce);
            finalizeSpin();
        }
    }, 1000 / 60);
}

// ✅ Berechnung des finalen Wertes nach dem Back-Bounce
function finalizeSpin() {
    const segmentAngle = (2 * Math.PI) / wheelConfig.length;
    let index = Math.floor(((angle % (2 * Math.PI)) / segmentAngle) % wheelConfig.length);
    let result = wheelConfig[index];

    markerIndex = index;
    spinScores[currentSpin - 1] = result;

    totalScore = spinScores.reduce((a, b) => a + (b || 0), 0);
    updateSpinResults();

    infoText.textContent = `Spin ${currentSpin}: ${result}`;
    currentSpin++;

    // ✅ Falls Spiel zu Ende ist
    if (currentSpin > 3) {
        spinBtn.textContent = "Spiel beendet";
        spinBtn.disabled = true;
    } else {
        spinBtn.textContent = "Erneut Drehen";
        spinBtn.disabled = false;
    }
}

// ✅ Spin-Ergebnisse anzeigen
function updateSpinResults() {
    result1.textContent = spinScores[0] !== null ? spinScores[0] : "-";
    result2.textContent = spinScores[1] !== null ? spinScores[1] : "-";
    result3.textContent = spinScores[2] !== null ? spinScores[2] : "-";
    totalScoreElement.textContent = totalScore;
}

// ✅ Event-Listener
spinBtn.addEventListener("click", () => {
    if (!spinning && !stopping) {
        startSpin();
    } else if (spinning && !stopping) {
        stopSpin();
    }
});

// ✅ Starte Animation & lade Rad-Daten
fetchWheelConfig();
animateWheel();
