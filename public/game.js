// HTML-Referenzen
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

// Daten vom Server
let playerId = null;
let spins = [];  // Array mit { spinNumber, distribution, angle, value }
let total = 0;
let currentSpinNumber = 1; // 1..3

// Animation
let angle = 0;       // Aktueller Winkel in Grad
let velocity = 0;    // Grad pro Frame
let spinning = false;
let stopping = false; // In Abbremsphase?

// Start der Animationsloop
function animate() {
  requestAnimationFrame(animate);
  if (spinning) {
    angle += velocity;
  }

  // Drehen in Bogenmaß umrechnen
  const radAngle = angle * Math.PI / 180;

  ctx.save();
  ctx.translate(200, 200);
  ctx.rotate(radAngle);
  ctx.translate(-200, -200);
  drawWheel();
  ctx.restore();
}
animate();

// Zeichnet das Rad basierend auf currentSpinNumber
function drawWheel() {
  // Finde den Spin, den wir aktuell darstellen
  const spinObj = spins.find(s => s.spinNumber === currentSpinNumber);
  if (!spinObj) {
    // Falls wir (noch) keinen Spin haben
    ctx.clearRect(0, 0, 400, 400);
    return;
  }
  const distribution = spinObj.distribution;
  if (!distribution) {
    ctx.clearRect(0, 0, 400, 400);
    return;
  }

  const segCount = distribution.length; // 16
  const segAngle = 2 * Math.PI / segCount;

  ctx.clearRect(0, 0, 400, 400);

  for (let i = 0; i < segCount; i++) {
    ctx.beginPath();
    ctx.moveTo(200, 200);
    ctx.arc(200, 200, 200, i * segAngle, (i + 1) * segAngle);
    ctx.fillStyle = randomColor(i); // optional, Du kannst auch feste Farben definieren
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.save();
    ctx.translate(200, 200);
    ctx.rotate(i * segAngle + segAngle / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(String(distribution[i]), 100, 0);
    ctx.restore();
  }
}

// Optional: Farben der Segmente
function randomColor(i) {
  // Du kannst hier was Dynamisches machen, z. B. aus einem Farbbereich
  // oder einfach i % 2 ? 'yellow' : 'green'
  const base = ["red","blue","green","orange","purple","yellow","cyan","pink"];
  return base[i % base.length];
}

// Registrieren / Fortsetzen
function registerPlayer() {
  const firstname = firstnameInput.value.trim();
  const lastname = lastnameInput.value.trim();
  if (!firstname || !lastname) {
    alert('Bitte Vor- und Nachnamen eingeben');
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
      playerId = data.playerId;
      spins = data.spins;    // array von {spinNumber, distribution, angle, value}
      total = data.total;
      gameArea.style.display = 'block';
      initSpinUI();
    })
    .catch(err => {
      console.error(err);
      alert('Fehler /api/register');
    });
}

// Setzt currentSpinNumber, zeigt UI
function initSpinUI() {
  // Finde ersten unfertigen Spin (value=null)
  let unfinishedSpin = spins.find(s => s.value === null);
  if (!unfinishedSpin) {
    // alle 3 fertig
    currentSpinNumber = 4;
    updateSpinDisplay();
    infoText.textContent = `Alle 3 Spins fertig, Gesamt: ${total}`;
    wheelBtn.disabled = true;
    return;
  }
  currentSpinNumber = unfinishedSpin.spinNumber;

  updateSpinDisplay();
  infoText.textContent = `Spin ${currentSpinNumber} bereit`;
  wheelBtn.disabled = false;
  wheelBtn.textContent = 'Start';

  // Winkel = 0
  angle = 0;
  velocity = 0;
  spinning = false;
  stopping = false;
}

// Aktualisiere die Anzeigen (Spin1..3, total)
function updateSpinDisplay() {
  let spin1 = spins.find(s => s.spinNumber===1);
  let spin2 = spins.find(s => s.spinNumber===2);
  let spin3 = spins.find(s => s.spinNumber===3);

  spin1Display.textContent = (spin1 && spin1.value!=null) ? spin1.value : '-';
  spin2Display.textContent = (spin2 && spin2.value!=null) ? spin2.value : '-';
  spin3Display.textContent = (spin3 && spin3.value!=null) ? spin3.value : '-';
  totalPointsDisplay.textContent = total;
}

// START
function startSpin() {
  if (spinning || stopping) return;
  spinning = true;
  velocity = Math.random() * 3 + 3; // Grad/Frame => ~ 60-180 deg/sec
  infoText.textContent = `Spin ${currentSpinNumber} läuft...`;
}

// STOP => 3s Abbremsen => finalAngle => bounce => /api/spinResult
function stopSpin() {
  if (!spinning || stopping) return;
  stopping = true;
  wheelBtn.disabled = true;

  const initialV = velocity;
  const steps = 60 * 3; // 3s
  let step = 0;

  const slowInterval = setInterval(() => {
    step++;
    velocity = initialV * (1 - step/steps);
    if (step >= steps) {
      clearInterval(slowInterval);
      velocity = 0;
      doBounce();
    }
  }, 1000/60);
}

// 3..7s warten => dann stopSpin()
function autoStopSpin() {
  if (!spinning || stopping) return;
  stopping = true;
  const delay = Math.random()*4000 + 3000; // 3..7s

  setTimeout(() => {
    stopping = false; // wir erlauben den Stopp
    stopSpin();
  }, delay);
}

// 5° Bounce => finalizeSpin
function doBounce() {
  stopping = true;
  const steps = 30; // ~0.5s
  let step = 0;
  const bounceDeg = 5; // Grad

  const bounceInt = setInterval(() => {
    step++;
    angle -= bounceDeg/steps;
    if (step>=steps) {
      clearInterval(bounceInt);
      spinning = false;
      stopping = false;
      finalizeSpin();
    }
  }, 1000/60);
}

// Ruft /api/spinResult auf => serverseitige Bestimmung
function finalizeSpin() {
  // "finalAngle" = angle % 360 in [0..360)
  let finalAngle = (angle % 360 + 360) % 360;

  fetch('/api/spinResult', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId,
      spinNumber: currentSpinNumber,
      finalAngle
    })
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
        return;
      }
      // spinValue, total
      const spinValue = data.spinValue;
      total = data.total;

      // Speichere in spins
      let spinObj = spins.find(s => s.spinNumber===currentSpinNumber);
      if (spinObj) {
        spinObj.value = spinValue;
      }
      updateSpinDisplay();

      if (currentSpinNumber<3) {
        currentSpinNumber++;
        infoText.textContent = `Spin ${currentSpinNumber} bereit`;
        wheelBtn.disabled = false;
        wheelBtn.textContent = 'Start';
        angle = 0;
        velocity=0;
        spinning=false;
        stopping=false;
      } else {
        // alle 3 fertig
        infoText.textContent = `3. Spin fertig. Gesamt: ${total}`;
        wheelBtn.disabled = true;
      }
    })
    .catch(err => {
      console.error(err);
      alert('Fehler /api/spinResult');
    });
}

// Klick-Handler
function handleWheelBtn() {
  if (currentSpinNumber<3) {
    // Spin 1/2 => Toggle Start/Stop
    if (!spinning && !stopping) {
      startSpin();
      wheelBtn.textContent = 'Stop';
    } else if (spinning && !stopping) {
      stopSpin();
      wheelBtn.textContent = 'Start';
    }
  } else if (currentSpinNumber===3) {
    // Letzter Spin => Start + autoStop
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
wheelBtn.addEventListener('click', handleWheelBtn);

// Erstmal leeres Rad zeichnen
function initEmptyWheel() {
  ctx.clearRect(0,0,400,400);
}
initEmptyWheel();
