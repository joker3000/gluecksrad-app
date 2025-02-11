// HTML-Elemente
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

// GESAMTZUSTAND
let playerId = null;
let spins = [];    // [{spinNumber,distribution,angle,value},...]
let total = 0;
let currentSpinNumber = 1; // 1..3

// ANIMATION
let angle = 0;       // Winkel in Grad => 0° = rechts
let velocity = 0;    // grad/frame
let spinning = false;
let stopping = false;

// Start Loop
function animate() {
  requestAnimationFrame(animate);
  if (spinning) {
    angle += velocity;
  }

  const radAngle = angle * Math.PI / 180;
  ctx.save();
  ctx.translate(200,200);
  ctx.rotate(radAngle);
  ctx.translate(-200,-200);
  drawWheel();
  ctx.restore();
}
animate();

// Zeichnet das Wheel basierend auf currentSpinNumber
function drawWheel() {
  const spinObj = spins.find(s => s.spinNumber===currentSpinNumber);
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
  const segAngle = 2*Math.PI/segCount;

  ctx.clearRect(0,0,400,400);
  // z.B. Schrift
  ctx.font = 'bold 20px sans-serif';

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
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillStyle='#000';
    // z.B. 130
    ctx.fillText(String(distribution[i]),130,0);
    ctx.restore();
  }
}

// Zufällige Farben oder feste
function randomColor(i) {
  const colors = ["red","blue","green","orange","purple","yellow","cyan","pink"];
  return colors[i % colors.length];
}

// Registriert / holt Player
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
      if(data.error) {
        alert(data.error);
        return;
      }
      playerId = data.playerId;
      spins = data.spins;  // array
      total = data.total;
      gameArea.style.display='block';
      initSpinUI();
    })
    .catch(err=>{
      console.error(err);
      alert('Fehler bei /api/register');
    });
}

// Bestimmt aktuellen Spin, zeigt UI
function initSpinUI() {
  let unfinished = spins.find(s=>s.value===null);
  if(!unfinished) {
    // alle 3 fertig
    currentSpinNumber=4;
    updateSpinDisplay();
    infoText.textContent=`Alle 3 Spins beendet, Gesamt: ${total}`;
    wheelBtn.disabled=true;
    return;
  }

  currentSpinNumber = unfinished.spinNumber;
  updateSpinDisplay();
  angle=0; velocity=0; spinning=false; stopping=false;
  wheelBtn.disabled=false;
  wheelBtn.textContent='Start';
  infoText.textContent=`Spin ${currentSpinNumber} bereit`;
}

function updateSpinDisplay() {
  const s1 = spins.find(s=>s.spinNumber===1);
  const s2 = spins.find(s=>s.spinNumber===2);
  const s3 = spins.find(s=>s.spinNumber===3);

  spin1Display.textContent = s1 && s1.value!=null ? s1.value : '-';
  spin2Display.textContent = s2 && s2.value!=null ? s2.value : '-';
  spin3Display.textContent = s3 && s3.value!=null ? s3.value : '-';
  totalPointsDisplay.textContent = total;
}

// START spin
function startSpin() {
  if(spinning||stopping) return;
  spinning=true;
  velocity= Math.random()*3 +3; // grad/frame
  infoText.textContent=`Spin ${currentSpinNumber} läuft...`;
}

// STOP => 3s Abbremsen => doBounce => finalize
function stopSpin() {
  if(!spinning||stopping) return;
  stopping=true;
  wheelBtn.disabled=true;

  const initV=velocity;
  const steps=60*3; // 3s
  let step=0;

  const slowInterval = setInterval(()=>{
    step++;
    velocity= initV*(1 - step/steps);
    if(step>=steps) {
      clearInterval(slowInterval);
      velocity=0;
      doBounce();
    }
  },1000/60);
}

// Autostopp (3..7s)
function autoStopSpin() {
  if(!spinning||stopping) return;
  stopping=true;
  const randomDelay = Math.random()*4000+3000; // 3..7s
  setTimeout(()=>{
    stopping=false;
    stopSpin();
  }, randomDelay);
}

// 5° bounce => finalize
function doBounce() {
  stopping=true;
  const steps=30; // 0.5s
  let step=0;
  const bounceDeg=5; // minus 5

  const bounceInt = setInterval(()=>{
    step++;
    angle -= bounceDeg/steps;
    if(step>=steps) {
      clearInterval(bounceInt);
      spinning=false;
      stopping=false;
      finalizeSpin();
    }
  },1000/60);
}

// finalize => /api/spinResult => server
function finalizeSpin() {
  let finalAngle = (angle%360+360)%360;

  fetch('/api/spinResult',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      playerId,
      spinNumber: currentSpinNumber,
      finalAngle
    })
  })
    .then(r=>r.json())
    .then(data=>{
      if(data.error) {
        alert(data.error);
        return;
      }
      const spinValue = data.spinValue;
      total = data.total;
      let sp = spins.find(s=>s.spinNumber===currentSpinNumber);
      if(sp) sp.value = spinValue;

      updateSpinDisplay();
      infoText.textContent=`Spin ${currentSpinNumber} Ergebnis: ${spinValue}. Gesamt: ${total}`;

      if(currentSpinNumber<3) {
        // 2s warten, dann nächster Spin
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

// Handle Start/Stop-Klick
function handleWheelButton() {
  if(currentSpinNumber<3) {
    if(!spinning && !stopping) {
      startSpin();
      wheelBtn.textContent='Stop';
    } else if(spinning && !stopping) {
      stopSpin();
      wheelBtn.textContent='Start';
    }
  } else if(currentSpinNumber===3) {
    // Letzter Spin => start + autoStop
    if(!spinning && !stopping) {
      startSpin();
      autoStopSpin();
      wheelBtn.disabled=true;
      wheelBtn.textContent='Spin 3 läuft...';
    }
  }
}

// Event-Listener
registerBtn.addEventListener('click', registerPlayer);
wheelBtn.addEventListener('click', handleWheelButton);

// Erstes leeres Zeichnen
ctx.clearRect(0,0,400,400);
