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

/** SPIELZUSTAND */
let playerId = null;
let spins = [];       // array { spinNumber, distribution, angle, value }
let total = 0;
let currentSpinNumber = 1;

/** ANIMATION */
let angle = 0;        // Grad => 0°= rechts
let velocity = 0;     // grad/frame
let spinning = false;
let stopping = false;

/** MARKER: roter Punkt im finalen Segment. 
    Wir speichern den Index des Segments, das den finalen Wert hat. */
let markerIndex = null; // null => kein Marker, sonst 0..(segCount-1)

// Zeichenschleife
function animate() {
  requestAnimationFrame(animate);

  if (spinning) {
    angle += velocity;
  }

  ctx.save();
  ctx.translate(200,200);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.translate(-200,-200);

  drawWheel();
  ctx.restore();
}
animate();

/** Zeichnet das Rad, Hilfslinien & ggf. den roten Punkt */
function drawWheel() {
  // passender Spin
  const spinObj = spins.find(s => s.spinNumber === currentSpinNumber);
  if (!spinObj) {
    ctx.clearRect(0,0,400,400);
    return;
  }

  const distribution = spinObj.distribution;
  if (!distribution) {
    ctx.clearRect(0,0,400,400);
    return;
  }
  const segCount = distribution.length; // 16
  const segAngle = 2*Math.PI / segCount;

  ctx.clearRect(0,0,400,400);

  // 1) Glücksrad
  ctx.font = "bold 20px sans-serif";
  for (let i=0; i<segCount; i++) {
    ctx.beginPath();
    ctx.moveTo(200,200);
    ctx.arc(200,200,200, i*segAngle, (i+1)*segAngle);
    ctx.fillStyle = randomColor(i);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.save();
    ctx.translate(200,200);
    ctx.rotate(i*segAngle + segAngle/2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.fillText(String(distribution[i]), 130, 0);
    ctx.restore();
  }

  // 2) Segmentgrenzen (graue Linien) zur Orientierung
  drawSegmentBoundaries(segCount);

  // 3) Roter Marker: 
  //    nur wenn markerIndex != null => wir zeichnen einen Kreis hinter dem Wert
  if (markerIndex !== null && markerIndex < segCount) {
    ctx.save();
    ctx.translate(200,200);
    // rotiere zum Segmentmittelpunkt
    ctx.rotate(markerIndex * segAngle + segAngle/2);

    // Roter Kreis, radius=10, an x=130
    ctx.beginPath();
    ctx.arc(130, 0, 10, 0, 2*Math.PI);
    // Schwarze Kontur, rotes Füllung
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.stroke()
