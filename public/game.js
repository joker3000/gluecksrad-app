console.log("game.js loaded");

const spinBtn = document.getElementById("spinBtn");
const infoText = document.getElementById("infoText");
const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

let wheelConfig = [];
let angle = 0;
let velocity = 0;
let spinning = false;
let markerIndex = null;

function fetchWheelConfig() {
    fetch("/api/wheel-config")
        .then(response => response.json())
        .then(data => {
            if (!data.wheelConfig) {
                console.warn("⚠️ Wheel-Konfiguration fehlt!");
                return;
            }
            wheelConfig = data.wheelConfig;
            drawWheel();
        })
        .catch(error => console.error("❌ Fehler beim Laden des Rades:", error));
}

function drawWheel() {
    if (!wheelConfig.length) return;
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
        ctx.fillStyle = ["red", "blue", "green", "yellow"][i % 4];
        ctx.fill();
        ctx.stroke();
    }

    ctx.restore();
}

function startSpin() {
    if (spinning) return;
    spinning = true;
    velocity = Math.random() * 3 + 3;
    spinBtn.textContent = "Stop";
    spinBtn.disabled = false;
}

function stopSpin() {
    spinning = false;
    velocity = 0;
    spinBtn.textContent = "Spin beendet";
    setTimeout(() => spinBtn.textContent = "Neuer Spin", 2000);
}

function animateWheel() {
    if (spinning) {
        angle += velocity;
        velocity *= 0.98;
        if (velocity < 0.02) {
            spinning = false;
            stopSpin();
        }
    }
    drawWheel();
    requestAnimationFrame(animateWheel);
}

spinBtn.addEventListener("click", startSpin);
fetchWheelConfig();
animateWheel();
