// HTML-Elemente referenzieren
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

// Segment-Werte (16 Stück) => fest
const SEGMENT_VALUES = [
  0, 0, 0, 0,
  10, 10, 10,
  25, 25,
  50, 100, 200, 400, 600, 800, 1000
];

// Shuffle-Funktion, um einmal zufällig zu mischen
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
shuffle(SEGMENT_VALUES); // Mische nur einmal global

const segmentAngle = (2 * Math.PI) / SEGMENT_VALUES.length;
const colors = ["#f66", "#6f6", "#66f", "#fa0", "#0af", "#a0f", "#ff6", "#6ff"];

// Dreh-Variablen
let angle = 0;         // aktueller Winkel
let velocity = 0;      // wie schnell sich das Rad dreht
let spinning = false;  // ob wir gerade drehen
let currentSpin = 1;   // welcher Spin ist dran? (1, 2 oder 3)
let userPlayer = null; // Datenbank-Objekt des Spielers

// Zeichnet das Glücksrad
function drawWheel() {
  ctx.clearRect(0, 0, 400, 400);

  // Mittelpunkt (200,200), Radius 200
  for (let i = 0; i < SEGMENT_VALUES.length; i++) {
    ctx.beginPath();
    ctx.moveTo(200, 200);
    ctx.arc(
      200, 200,
      200,
      i * segmentAngle,
      (i + 1) * segmentAngle
    );
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.stroke();

    // Text in die Mitte des Segments
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

// Bestimmt den Index des Segments, das links (wo der pointer ist) liegt.
// Da Canvas-0° standardmäßig nach rechts zeigt, ist "links" = 180° in Canvas-Koordinaten.
// Also "links" = angle + π
function getCurrentSegmentIndex(a) {
  // Wir verschieben den Betrachtungswinkel um +π (180°)
  let rawAngle = a + Math.PI;
  // in [0..2π) normalisieren
  rawAngle = (rawAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

  // Index
  const idx = Math.floor(rawAngle / segmentAngle);
  return idx % SEGMENT_VALUES.length;
}

// Animations-Loop
function animate() {
  if (spinning) {
    angle += velocity;
    // Abbremsung
    velocity *= 0.995;

    // Niemals ewig minimal drehen
    if (velocity < 0.002) {
      spinning = false;
      finalizeSpin();
    }
  }

  // Rad zeichnen
  ctx.save();
  ctx.translate(200, 200);
  ctx.rotate(angle);
  ctx.translate(-200, -200);
  drawWheel();
  ctx.restore();

  requestAnimationFrame(animate);
}

// Wird aufgerufen, sobald das Rad zum Stillstand kommt
// oder wir "Stop" geklickt haben (dann leiten wir das Bremsen ein).
function finalizeSpin() {
  // Ermitteltes Segment
  const idx = getCurrentSegmentIndex(angle);
  const value = SEGMENT_VALUES[idx];

  // Spin in DB speichern
  saveSpinResult(currentSpin, value)
    .then(() => {
      // Info aktualisieren
      userPlayer[`spin${currentSpin}`] = value;
      userPlayer.total += value;

      showUserSpins(); // UI refresh

      currentSpin++;
      if (currentSpin > 3) {
        infoText.textContent = `Spiel beendet! Du hast insgesamt ${userPlayer.total} Punkte.`;
        wheelBtn.disabled = true;
      } else {
        // Nächster Spin – Button wieder aktiv
        wheelBtn.disabled = false;
      }
    })
    .catch(err => {
      console.error(err);
    });
}

// Stop-Logik (on second click):
function doStop() {
  if (!spinning) return;
  spinning = false;

  // Wir leiten jetzt ein "langsames" Abbremsen ein (3 Sek bis 0)
  const initialV = velocity;
  const steps = 60 * 3; // 3 Sekunden bei ~60fps
  let step = 0;

  const slowInterval = setInterval(() => {
    step++;
    velocity = initialV * (1 - step / steps);
    if (step >= steps) {
      clearInterval(slowInterval);
    }
  }, 1000 / 60);
}

// Start-Click => Starten oder Stoppen (je nach Spin #)
function wheelButtonClick() {
  // Spin 1,2 => wir toggeln start/stop
  if (currentSpin < 3) {
    if (!spinning) {
      // Start
      spinning = true;
      velocity = Math.random() * 0.3 + 0.3;
      wheelBtn.textContent = 'Klick zum Stoppen';
    } else {
      // Stop
      wheelBtn.disabled = true;
      wheelBtn.textContent = 'Stoppe...';
      doStop();
    }
  } else {
    // Spin 3 => Autostop nach 3-7 Sek
    spinning = true;
    velocity = Math.random() * 0.3 + 0.3;
    wheelBtn.disabled = true;
    wheelBtn.textContent = 'Letzter Spin läuft...';

    // zufällig 3-7s -> dann doStop
    const randomDelay = (Math.random() * 4 + 3) * 1000;
    setTimeout(() => {
      doStop();
    }, randomDelay);
  }
}

// Zeigt die aktuellen Spins in der UI
function showUserSpins() {
  spin1Display.textContent = userPlayer.spin1 ?? '-';
  spin2Display.textContent = userPlayer.spin2 ?? '-';
  spin3Display.textContent = userPlayer.spin3 ?? '-';
  totalPointsDisplay.textContent = userPlayer.total ?? '0';

  // Falls der Benutzer schon 3 Spins hat, kein weiterer Start
  if (
    userPlayer.spin1 !== null &&
    userPlayer.spin2 !== null &&
    userPlayer.spin3 !== null
  ) {
    currentSpin = 4; // "voll"
    infoText.textContent = `Du hast bereits alle 3 Drehs gespielt. Gesamt: ${userPlayer.total} Punkte.`;
    wheelBtn.disabled = true;
  } else {
    // Bestimmen, welcher Spin als nächstes dran ist:
    if (userPlayer.spin1 === null) currentSpin = 1;
    else if (userPlayer.spin2 === null) currentSpin = 2;
    else currentSpin = 3;

    infoText.textContent = `Spin ${currentSpin} von 3. Klicke aufs Rad.`;
    wheelBtn.disabled = false;
    wheelBtn.textContent = 'Klick zum Starten';
    if (currentSpin === 3 && userPlayer.spin3 === null) {
      wheelBtn.textContent = 'Letzter Spin (autostop)';
    }
  }
}

// Registriert (bzw. lädt) den Spieler in der DB
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
      userPlayer = data.player;
      // UI umschalten
      gameArea.style.display = 'block';
      showUserSpins();
    })
    .catch(err => {
      console.error(err);
      alert('Fehler bei der Registrierung!');
    });
}

// Speichert das Ergebnis eines Drehs in der DB
function saveSpinResult(spinNumber, value) {
  const firstname = userPlayer.firstname;
  const lastname = userPlayer.lastname;
  return fetch('/api/spin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstname, lastname, spinNumber, value })
  }).then(res => res.json());
}

// Event-Listener
registerBtn.addEventListener('click', registerPlayer);
wheelBtn.addEventListener('click', wheelButtonClick);

// Start der Animationsschleife
drawWheel();
animate();
