// game.js

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

// SERVER-/SPIEL-Zustand
let playerId = null;
let spins = [];   // { spinNumber, distribution, angle, value } ...
let total = 0;
let currentSpinNumber = 1;

// ANIMATION
let angle = 0;        // Aktueller Winkel in Grad
let velocity = 0;     // grad/frame
let spinning = false;
let stopping = false;

// 5°-Bounce & Differenzwinkel
// -- wir merken uns den Winkel bei "StartSpin"
let debugStartAngle = 0; // Winkel zum Start dieses Spins

// Loop
function animate() {
  requestAnimationFrame(animate);
  if (spinning) {
    angle += velocity;
  }

  // Zeichnen
  ctx.save();
  ctx.translate(200,200);
  let radAngle = angle * Math.PI / 180;
  ctx.rotate(radAngle);
  ctx.translate(-200,-200);
  drawWheel();
  ctx.restore();
}
animate();

// Zeichnet das aktuelle Spin-Rad
function drawWheel() {
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

  const segCount = distribution.length; // z.B. 16
  const segAngle = 2*Math.PI / segCount;

  ctx.clearRect(0,0,400,400);
  ctx.font = "bold 20px sans-serif";

  // Rad zeichnen
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
}

// Zufallsfarben
function randomColor(i) {
  const base = ["red","blue","green","orange","purple","yellow","cyan","pink"];
  return base[i % base.length];
}

// Registrierung
function registerPlayer() {
  const fname = firstnameInput.value.trim();
  const lname = lastnameInput.value.trim();
  if (!fname || !lname) {
    alert('Bitte Vor- und Nachnamen eingeben!');
    return;
  }

  fetch('/api/register',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ firstname: fname, lastname: lname })
  })
    .then(r=>r.json())
    .then(data=>{
      if (data.error) {
        alert(data.error);
        return;
      }
      playerId = data.playerId;
      spins = data.spins; 
      total = data.total;
      gameArea.style.display = 'block';
      initSpinUI();
    })
    .catch(err=>{
      console.error(err);
      alert('Fehler /api/register');
    });
}

function initSpinUI() {
  let unfinished = spins.find(s => s.value === null);
  if (!unfinished) {
    currentSpinNumber = 4;
    updateSpinDisplay();
    infoText.textContent = `Alle 3 Spins beendet, Gesamt: ${total}`;
    wheelBtn.disabled = true;
    return;
  }

  currentSpinNumber = unfinished.spinNumber;
  updateSpinDisplay();
  angle = 0;
  velocity = 0;
  spinning = false;
  stopping = false;
  wheelBtn.disabled = false;
  wheelBtn.textContent = 'Start';
  infoText.textContent = `Spin ${currentSpinNumber} bereit`;
}

function updateSpinDisplay() {
  const s1 = spins.find(s=>s.spinNumber===1);
  const s2 = spins.find(s=>s.spinNumber===2);
  const s3 = spins.find(s=>s.spinNumber===3);

  spin1Display.textContent = (s1 && s1.value!=null) ? s1.value : '-';
  spin2Display.textContent = (s2 && s2.value!=null) ? s2.value : '-';
  spin3Display.textContent = (s3 && s3.value!=null) ? s3.value : '-';
  totalPointsDisplay.textContent = total;
}

// Spin starten
function startSpin() {
  if (spinning || stopping) return;
  spinning = true;
  velocity = Math.random() * 3 + 3; // grad/frame
  infoText.textContent = `Spin ${currentSpinNumber} läuft...`;

  // Merke dir den Winkel zum Spin-Start (normalisiert)
  debugStartAngle = (angle % 360 + 360) % 360;
}

// Spin manuell stoppen => 3s Abbremsen => bounce => finalize
function stopSpin() {
  if (!spinning || stopping) return;
  stopping = true;
  wheelBtn.disabled = true;

  const initV = velocity;
  const steps = 60 * 3; // 3s
  let step=0;

  const slowInterval = setInterval(()=>{
    step++;
    velocity = initV*(1 - step/steps);
    if (step>=steps) {
      clearInterval(slowInterval);
      velocity=0;
      doBounce();
    }
  },1000/60);
}

// Spin 3 => autostopp
function autoStopSpin() {
  if (!spinning || stopping) return;
  stopping=true;
  const randomDelay = Math.random()*4000+3000; // 3..7s
  setTimeout(()=>{
    stopping=false;
    stopSpin();
  }, randomDelay);
}

// 5° Bounce
function doBounce() {
  stopping=true;
  const steps=30; // 0.5s
  let step=0;
  const bounceDeg=5;

  const bounceInt = setInterval(()=>{
    step++;
    angle -= bounceDeg/steps; 
    if (step>=steps) {
      clearInterval(bounceInt);
      spinning=false;
      stopping=false;
      finalizeSpin();
    }
  },1000/60);
}

// finalize => rechne differenz
function finalizeSpin() {
  let finalAngle = (angle % 360 + 360) % 360;
  // (Endwinkel - Startwinkel - 90°) mod 360
  let diff = finalAngle - debugStartAngle - 90;
  diff = (diff % 360 + 360) % 360;

  // distribution + segAngle
  const spinObj = spins.find(s => s.spinNumber===currentSpinNumber);
  const distribution = spinObj.distribution;
  const segCount = distribution.length;
  const segAngle = 360 / segCount;

  let idx = Math.floor(diff / segAngle);
  if (idx>=segCount) idx = segCount-1;

  let spinValue = distribution[idx];

  // => an Server senden (z.B. /api/spinResult):
  //   Wir senden spinNumber + spinValue, oder finalAngle, ...
  //   Hier: Senden wir finalAngle oder difference? 
  //   Du kannst Dir aussuchen. Wir machen mal finalAngle:
  fetch('/api/spinResult',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      playerId,
      spinNumber: currentSpinNumber,
      finalAngle, 
      // => Falls der Server-Teil indexen soll, 
      //    muss er die selbe Logik haben
      // => oder wir schicken spinValue direkt:
      spinValue
    })
  })
    .then(r=>r.json())
    .then(data=>{
      if(data.error) {
        alert(data.error);
        return;
      }
      // Der Server könnte spinValue + total zurückgeben
      // Falls der Server-Layer selbst indexen möchte, 
      //   kannst Du den finalAngle weglassen
      //   und lediglich spinValue = distribution[idx] schicken.
      const updatedValue = data.spinValue || spinValue;
      total = data.total;

      // Im spins-Array local updaten
      spinObj.value = updatedValue;
      updateSpinDisplay();
      infoText.textContent = `Spin ${currentSpinNumber} Ergebnis: ${updatedValue}. Gesamt: ${total}`;

      // Falls noch Spin übrig => 2s warten
      if (currentSpinNumber<3) {
        setTimeout(()=>{
          currentSpinNumber++;
          angle=0; velocity=0; spinning=false; stopping=false;
          wheelBtn.disabled=false;
          wheelBtn.textContent='Start';
          infoText.textContent=`Spin ${currentSpinNumber} bereit`;
        },2000);
      } else {
        setTimeout(()=>{
          infoText.textContent=`3. Spin fertig. Gesamt: ${total}`;
          wheelBtn.disabled=true;
        },2000);
      }
    })
    .catch(err=>{
      console.error(err);
      alert('Fehler bei /api/spinResult');
    });
}

/** Klick-Handler */
function handleWheelButton() {
  if (currentSpinNumber<3) {
    // Spin 1/2 => manueller Stop
    if (!spinning && !stopping) {
      startSpin();
      wheelBtn.textContent='Stop';
    } else if (spinning && !stopping) {
      stopSpin();
      wheelBtn.textContent='Start';
    }
  } else if (currentSpinNumber===3) {
    // Letzter Spin => autoStop
    if (!spinning && !stopping) {
      startSpin();
      autoStopSpin();
      wheelBtn.disabled=true;
      wheelBtn.textContent='Spin 3 läuft...';
    }
  }
}

/** Events */
registerBtn.addEventListener('click', registerPlayer);
wheelBtn.addEventListener('click', handleWheelButton);

// init
ctx.clearRect(0,0,400,400);
