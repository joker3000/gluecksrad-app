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
    ctx.stroke();

    ctx.restore();
  }
}

/** Zeichnet dünne graue Linien an Segmentgrenzen */
function drawSegmentBoundaries(segCount) {
  const segAngle = (2*Math.PI)/segCount;
  ctx.save();
  ctx.translate(200,200);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  for(let i=0; i<segCount; i++){
    ctx.save();
    ctx.rotate(i*segAngle);
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(200,0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** Zufallsfarbe */
function randomColor(i) {
  const base = ["red","blue","green","orange","purple","yellow","cyan","pink"];
  return base[i % base.length];
}

/** Registrierung */
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
      spins = data.spins;
      total = data.total;
      gameArea.style.display='block';
      initSpinUI();
    })
    .catch(err=>{
      console.error(err);
      alert('Fehler /api/register');
    });
}

/** Spin/Index init */
function initSpinUI() {
  const unfinished = spins.find(s=>s.value===null);
  if(!unfinished) {
    currentSpinNumber=4;
    updateSpinDisplay();
    infoText.textContent=`Alle 3 Spins beendet, Gesamt: ${total}`;
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
  
  // Keine Markierung am Anfang
  markerIndex = null;
}

/** Anzeigen-Update */
function updateSpinDisplay() {
  const s1= spins.find(s=>s.spinNumber===1);
  const s2= spins.find(s=>s.spinNumber===2);
  const s3= spins.find(s=>s.spinNumber===3);

  spin1Display.textContent = s1 && s1.value!=null ? s1.value : '-';
  spin2Display.textContent = s2 && s2.value!=null ? s2.value : '-';
  spin3Display.textContent = s3 && s3.value!=null ? s3.value : '-';
  totalPointsDisplay.textContent = total;
}

/** Start Spin */
function startSpin() {
  if(spinning||stopping) return;
  spinning=true;
  velocity = Math.random()*3 +3; 
  infoText.textContent=`Spin ${currentSpinNumber} läuft...`;

  // Keinen Marker
  markerIndex=null;
}

/** Stop Spin => 3s => bounce => finalize */
function stopSpin() {
  if(!spinning||stopping) return;
  stopping=true;
  wheelBtn.disabled=true;

  const initV = velocity;
  const steps=60*3;
  let step=0;

  const slowInterval = setInterval(()=>{
    step++;
    velocity = initV*(1 - step/steps);
    if(step>=steps) {
      clearInterval(slowInterval);
      velocity=0;
      doBounce();
    }
  },1000/60);
}

/** Letzter Spin => autoStop in 3..7s */
function autoStopSpin() {
  if(!spinning||stopping) return;
  stopping=true;
  const randomDelay = Math.random()*4000+3000; 
  setTimeout(()=>{
    stopping=false;
    stopSpin();
  },randomDelay);
}

/** 5° bounce => finalize */
function doBounce() {
  stopping=true;
  const steps=30;
  let step=0;
  const bounceDeg=5;
  
  const bounceInt= setInterval(()=>{
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

/** finalize => finalAngle => /api/spinResult => roter Punkt */
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

      // In local array
      const spinObj = spins.find(s=>s.spinNumber===currentSpinNumber);
      if(spinObj) {
        spinObj.value = spinValue;
      }
      updateSpinDisplay();
      infoText.textContent=`Spin ${currentSpinNumber} Ergebnis: ${spinValue}. Gesamt: ${total}`;

      // Der Server hat finalAngle => index => spinValue
      // Wir können den Index nochmal selbst berechnen, um den marker zu platzieren
      const distribution = spinObj.distribution;
      const segCount = distribution.length;
      const segAngle = 360/segCount;
      let rawAngle = finalAngle;
      let idx = Math.floor(rawAngle / segAngle);
      if(idx>=segCount) idx = segCount-1;

      markerIndex = idx; // => roter Punkt in drawWheel()

      // 3 Sek warten
      if(currentSpinNumber<3) {
        setTimeout(()=>{
          currentSpinNumber++;
          angle=0; velocity=0; spinning=false; stopping=false;
          wheelBtn.disabled=false;
          wheelBtn.textContent='Start';
          infoText.textContent=`Spin ${currentSpinNumber} bereit`;

          // Falls Du den Marker entfernen willst -> markerIndex=null
        },3000);
      } else {
        setTimeout(()=>{
          infoText.textContent=`3. Spin fertig. Gesamt: ${total}`;
          wheelBtn.disabled=true;
        },3000);
      }
    })
    .catch(err=>{
      console.error(err);
      alert('Fehler bei /api/spinResult');
    });
}

/** Button-Klick => Spin 1/2 => man. Stop, Spin 3 => autoStop */
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
    if(!spinning && !stopping) {
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
