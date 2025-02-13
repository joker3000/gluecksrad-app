console.log("game.js loaded");

// Glücksrad-Elemente
const spinBtn = document.getElementById("spinBtn");
const infoText = document.getElementById("infoText");
const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

let wheelConfig = []; // Glücksrad-Zahlen
let angle = 0;
let velocity = 0;
let spinning = false;
let stopping = false;
let markerIndex = null; // Speichert den Index des Endwerts

// ✅ Das Rad wird animiert & aktualisiert sich kontinuierlich
function animateWheel() {
    if (spinning) {
        angle += velocity;
        velocity *= 0.99; // Verlangsamung des Spins
        if (velocity < 0.01) {
            velocity = 0;
            spinning = false;
            doBackBounce(); // ✅ Back-Bounce nach Stillstand
        }
    }
    drawWheel();
    requestAnimationFrame(animateWheel);
}

// ✅ Rad-Zeichnen mit aktueller Konfiguration & Markierung
function drawWheel() {
    ctx.clearRect(0, 0, 400, 400);
    const segCount = wheelConfig.length;
    const segAngle = (2 * Math.PI) / segCount;

    for (let i = 0; i < segCount; i++) {
        ctx.beginPath();
        ctx.moveTo(200, 200);
        ctx.arc(200, 200, 200, i * segAngle, (i + 1) * segAngle);
        ctx.fillStyle = randomColor(i);
        ctx.fill();
        ctx.stroke();

        // Nummern auf das Rad setzen
        ctx.save();
        ctx.translate(200, 200);
        ctx.rotate(i * segAngle + segAngle / 2);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#000";
        ctx.fillText(String(wheelConfig[i]), 130, 0);
        ctx.restore();
    }

    // ✅ Roten Punkt auf den Endwert setzen
    if (markerIndex !== null) {
        ctx.save();
        ctx.translate(200, 200);
        ctx.rotate(markerIndex * segAngle + segAngle / 2);
        ctx.beginPath();
        ctx.arc(130, 0, 10, 0, 2 * Math.PI); // Roter Punkt hinter der Zahl
        ctx.fillStyle = "red";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "black";
        ctx.stroke();
        ctx.restore();
    }
}

// ✅ Zufällige Farben für Segmente
function randomColor(i) {
    const colors = ["red", "blue", "green", "orange", "purple", "yellow", "cyan", "pink"];
    return colors[i % colors.length];
}

// ✅ API: Rad-Konfiguration abrufen
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

// ✅ Spin-Start-Logik mit zufälliger Geschwindigkeit
function startSpin() {
    if (spinning || stopping) return;
    spinning = true;
    velocity = Math.random() * 3 + 3; // Zufällige Geschwindigkeit
    infoText.textContent = "Dreht...";
    spinBtn.textContent = "Stop";
    markerIndex = null; // Lösche Markierung vor Spin
}

// ✅ Spin-Stopp-Logik mit realistischem Abbremsen
function stopSpin() {
    if (!spinning || stopping) return;
    stopping = true;
    const slowDownSteps = 60 * 3; // 3 Sekunden Verzögerung
    let step = 0;

    const slowDown = setInterval(() => {
        step++;
        velocity *= 0.95;
        if (velocity < 0.05) {
            clearInterval(slowDown);
            velocity = 0;
            spinning = false;
            doBackBounce(); // ✅ Führe Back-Bounce aus
        }
    }, 1000 / 60);
}

// ✅ Back-Bounce (-5° Rückfedern nach Stillstand)
function doBackBounce() {
    stopping = true;
    const steps = 30;
    let step = 0;
    const bounceAngle = 5; // Rücksprung um 5°

    const bounce = setInterval(() => {
        step++;
        angle -= bounceAngle / steps;
        if (step >= steps) {
            clearInterval(bounce);
            finalizeSpin(); // ✅ Endgültiges Ergebnis nach Bounce bestimmen
        }
    }, 1000 / 60);
}

// ✅ Berechnung des finalen Wertes nach dem Back-Bounce
function finalizeSpin() {
    const segmentAngle = (2 * Math.PI) / wheelConfig.length;
    let index = Math.floor(((angle % (2 * Math.PI)) / segmentAngle) % wheelConfig.length);
    let result = wheelConfig[index];

    // ✅ Speichere die Markierung für den Endwert
    markerIndex = index;

    infoText.textContent = `Ergebnis: ${result}`;
    spinBtn.textContent = "Erneut Drehen";
    spinning = false;
    stopping = false;

    // ✅ Speichert den Spin beim Server (falls notwendig)
    saveSpinResult(result);
}

// ✅ Spin-Ergebnis speichern (an den Server senden)
function saveSpinResult(score) {
    fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spinNumber: 1, score }) // Der Spin-Zähler müsste mitgeführt werden
    })
    .then(response => response.json())
    .then(data => console.log("Ergebnis gespeichert:", data))
    .catch(error => console.error("Fehler beim Speichern des Spins:", error));
}

// ✅ Event-Listener für Spin-Button
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
