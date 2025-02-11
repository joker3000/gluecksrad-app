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
let spins = [];  
let total = 0;
let currentSpinNumber = 1;

// Animation
let angle = 0;    // in Grad
let velocity = 0; // Grad/Frame
let spinning = false;
let stopping = false;

// Start der Animationsloop
function animate() {
  requestAnimationFrame(animate);
  if (spinning) {
    angle += velocity;
  }

  const radAngle = (angle * Math.PI) / 180;
  ctx.save();
  ctx.translate(200, 200);
  ctx.rotate(radAngle);
  ctx.translate(-200, -200);
  drawWheel();
  ctx.restore();
}
animate();

// Zeichnet das aktuelle Spin-Layout (distribution)
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

  const segCount = distribution.length;
  const segAngle = (2 * Math.PI) / segCount;
  ctx.clearRect(0,0,400,400);

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
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle='#000';
    ctx.fillText(String(distribution[i]), 100, 0);
    ctx.restore();
  }
}

// Farben (Demo)
function randomColor(i) {
  const base = ["red","blue","green","orange","purple","yellow","cyan","pink"];
  return base[i % base.length];
}

// /api/register
function registerPlayer() {
  const fname = firstnameInput.value.trim();
  const lname = lastnameInput.value.trim();
  if (!fname || !lname) {
    alert('Vor- und Nachname angeben!');
    return;
  }

  fetch('/api/register', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ firstname:fname, lastname:lname })
  })
    .then(r=>r.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
        return;
      }
      playerId = data.playerId;
      spins = data.spins;
      total = data.total;
      gameArea.style.display='block';
      initSpinUI();
    })
    .catch(err => {
      console.error(err);
      alert('Fehler /api/register');
    });
}

// Bestimmt den nächsten Spin oder zeigt, dass alle fertig sind
function initSpinUI() {
  let unfinished = spins.find(s => s.value===null);
  if (!unfinished) {
    // alle 3 fertig
    currentSpinNumber=4;
    updateSpinDisplay();
    infoText.textContent=`Alle 3 Spins fertig, Gesamt: ${total}`;
    wheelBtn.disabled=true;
    return;
  }
  currentSpinNumber = unfinished.spinNumber;
  updateSpinDisplay();
  angle=0;
  velocity=0;
  spinning=false;
  stopping=false;
  wheelBtn.disabled=false;
  wheelBtn.textContent='Start';
  infoText.textContent=`Spin ${currentSpinNumber} bereit`;
}

function updateSpinDisplay() {
  const s1= spins.find(s=>s.spinNumber===1);
  const s2= spins.find(s=>s.spinNumber===2);
  const s3= spins.find(s=>s.spinNumber===3);

  spin1Display.textContent = (s1 && s1.value!=null) ? s1.value : '-';
  spin2Display.textContent = (s2 && s2.value!=null) ? s2.value : '-';
  spin3Display.textContent = (s3 && s3.value!=null) ? s3.value : '-';
  totalPointsDisplay.textContent = total;
}

// Start spin
function startSpin() {
  if (spinning||stopping) return;
  spinning=true;
  velocity= Math.random()*3 + 3; // Grad/Frame
  infoText.textContent = `Spin ${currentSpinNumber} läuft...`;
}

// Stop spin => 3s Abbremsen => finalAngle => bounce => finalize
function stopSpin() {
  if (!spinning||stopping) return;
  stopping=true;
  wheelBtn.disabled=true;

  const initV = velocity;
  const steps = 60*3; // 3s
  let step=0;

  const slowInterval = setInterval(()=>{
    step++;
    velocity= initV*(1 - step/steps);
    if (step>=steps) {
      clearInterval(slowInterval);
      velocity=0;
      doBounce();
    }
  }, 1000/60);
}

// 3..7s => stopSpin()
function autoStopSpin() {
  if (!spinning||stopping) return;
  stopping=true;
  const delay = Math.random()*4000+3000;
  setTimeout(()=>{
    stopping=false;
    stopSpin();
  }, delay);
}

// 5° bounce => finalize
function doBounce() {
  stopping=true;
  const steps=30;
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
  }, 1000/60);
}

// finalAngle => /api/spinResult => server rechnet +180 => Wert
function finalizeSpin() {
  let finalAngle=(angle%360+360)%360;
  fetch('/api/spinResult',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      playerId,
      spinNumber: currentSpinNumber,
      finalAngle
    })
  })
    .then(r=>r.json())
    .then(data=>{
      if (data.error) {
        alert(data.error);
        return;
      }
      // spinValue, total
      const spinValue = data.spinValue;
      total = data.total;
      let sp = spins.find(s=>s.spinNumber===currentSpinNumber);
      if(sp) sp.value= spinValue;

      updateSpinDisplay();
      if (currentSpinNumber<3) {
        currentSpinNumber++;
        infoText.textContent=`Spin ${currentSpinNumber} bereit`;
        angle=0; velocity=0; spinning=false; stopping=false;
        wheelBtn.disabled=false;
        wheelBtn.textContent='Start';
      } else {
        infoText.textContent=`3. Spin fertig. Gesamt: ${total}`;
        wheelBtn.disabled=true;
      }
    })
    .catch(err=>{
      console.error(err);
      alert('Fehler /api/spinResult');
    });
}

// Klick => Spin 1/2 => toggle
//          Spin 3 => start + autoStop
function handleWheelBtn() {
  if (currentSpinNumber<3) {
    if(!spinning && !stopping) {
      startSpin();
      wheelBtn.textContent='Stop';
    } else if(spinning && !stopping) {
      stopSpin();
      wheelBtn.textContent='Start';
    }
  } else if(currentSpinNumber===3) {
    if(!spinning && !stopping) {
      startSpin();
      autoStopSpin();
      wheelBtn.disabled=true;
      wheelBtn.textContent='Spin 3 läuft...';
    }
  }
}

// Events
registerBtn.addEventListener('click', registerPlayer);
wheelBtn.addEventListener('click', handleWheelBtn);

// Erstes Leerzeichnen
ctx.clearRect(0,0,400,400);
