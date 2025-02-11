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

let playerId = null;
let spins = [];
let total = 0;
let currentSpinNumber = 1;

let angle = 0;       // 0° => rechts
let velocity=0;     
let spinning=false;
let stopping=false;

// Marker => roter Punkt => index des finalen Segments
let markerIndex = null;

function animate() {
  requestAnimationFrame(animate);
  if(spinning) {
    angle += velocity;
  }
  ctx.save();
  ctx.translate(200,200);
  ctx.rotate(angle*Math.PI/180);
  ctx.translate(-200,-200);
  drawWheel();
  ctx.restore();
}
animate();

function drawWheel() {
  const spinObj = spins.find(s => s.spinNumber===currentSpinNumber);
  if(!spinObj) {
    ctx.clearRect(0,0,400,400);
    return;
  }
  const distribution = spinObj.distribution;
  if(!distribution) {
    ctx.clearRect(0,0,400,400);
    return;
  }
  const segCount= distribution.length;
  const segAngle= 2*Math.PI/segCount;

  ctx.clearRect(0,0,400,400);

  // Rad
  ctx.font="bold 20px sans-serif";
  for(let i=0; i<segCount; i++){
    ctx.beginPath();
    ctx.moveTo(200,200);
    ctx.arc(200,200,200, i*segAngle, (i+1)*segAngle);
    ctx.fillStyle= randomColor(i);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.save();
    ctx.translate(200,200);
    ctx.rotate(i*segAngle + segAngle/2);
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillStyle='#000';
    ctx.fillText(String(distribution[i]),130,0);
    ctx.restore();
  }

  // Grenzen
  drawSegmentBoundaries(segCount);

  // Roter Punkt, wenn markerIndex != null
  if(markerIndex!==null && markerIndex<segCount) {
    ctx.save();
    ctx.translate(200,200);
    ctx.rotate(markerIndex*segAngle + segAngle/2);
    ctx.beginPath();
    ctx.arc(130, 0, 10, 0, 2*Math.PI);
    ctx.fillStyle='red';
    ctx.fill();
    ctx.lineWidth=2;
    ctx.strokeStyle='black';
    ctx.stroke();
    ctx.restore();
  }
}

function drawSegmentBoundaries(segCount){
  const segAngle= 2*Math.PI/segCount;
  ctx.save();
  ctx.translate(200,200);
  ctx.strokeStyle='rgba(0,0,0,0.3)';
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

function randomColor(i){
  const base= ["red","blue","green","orange","purple","yellow","cyan","pink"];
  return base[i % base.length];
}

// registerPlayer() => /api/register
function registerPlayer(){
  const fname= firstnameInput.value.trim();
  const lname= lastnameInput.value.trim();
  if(!fname||!lname){
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
      if(data.error){
        alert(data.error);
        return;
      }
      playerId= data.playerId;
      spins= data.spins;
      total= data.total;
      gameArea.style.display='block';
      initSpinUI();
    })
    .catch(err=>{
      console.error(err);
      alert('Fehler bei /api/register');
    });
}

function initSpinUI(){
  const unfinished= spins.find(s=> s.value===null);
  if(!unfinished){
    currentSpinNumber=4;
    updateSpinDisplay();
    infoText.textContent=`Alle 3 Spins beendet, Gesamt: ${total}`;
    wheelBtn.disabled=true;
    return;
  }
  currentSpinNumber=unfinished.spinNumber;
  updateSpinDisplay();
  angle=0; velocity=0; spinning=false; stopping=false;
  wheelBtn.disabled=false;
  wheelBtn.textContent='Start';
  infoText.textContent=`Spin ${currentSpinNumber} bereit`;

  // Kein Marker
  markerIndex=null;
}

function updateSpinDisplay(){
  const s1= spins.find(s=>s.spinNumber===1);
  const s2= spins.find(s=>s.spinNumber===2);
  const s3= spins.find(s=>s.spinNumber===3);

  spin1Display.textContent= s1 && s1.value!=null ? s1.value : '-';
  spin2Display.textContent= s2 && s2.value!=null ? s2.value : '-';
  spin3Display.textContent= s3 && s3.value!=null ? s3.value : '-';
  totalPointsDisplay.textContent= total;
}

// Start
function startSpin(){
  if(spinning||stopping) return;
  spinning=true;
  velocity= Math.random()*3 +3; // grad/frame
  infoText.textContent=`Spin ${currentSpinNumber} läuft...`;
  markerIndex=null;
}

// Stop => 3s => bounce => finalize
function stopSpin(){
  if(!spinning||stopping) return;
  stopping=true;
  wheelBtn.disabled=true;

  const initV= velocity;
  const steps=60*3;
  let step=0;

  const slowInt= setInterval(()=>{
    step++;
    velocity= initV*(1 - step/steps);
    if(step>=steps){
      clearInterval(slowInt);
      velocity=0;
      doBounce();
    }
  },1000/60);
}

// Letzter Spin => autoStop
function autoStopSpin(){
  if(!spinning||stopping) return;
  stopping=true;
  const randomDelay= Math.random()*4000+3000;
  setTimeout(()=>{
    stopping=false;
    stopSpin();
  },randomDelay);
}

// 5° bounce
function doBounce(){
  stopping=true;
  const steps=30;
  let step=0;
  const bounceDeg=5;

  const bounceInt= setInterval(()=>{
    step++;
    angle-= bounceDeg/ steps;
    if(step>=steps){
      clearInterval(bounceInt);
      spinning=false;
      stopping=false;
      finalizeSpin();
    }
  },1000/60);
}

function finalizeSpin(){
  let finalAngle= (angle%360+360)%360;

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
      if(data.error){
        alert(data.error);
        return;
      }
      const spinValue= data.spinValue;
      total= data.total;
      const spinObj= spins.find(s=>s.spinNumber===currentSpinNumber);
      if(spinObj){
        spinObj.value= spinValue;
      }
      updateSpinDisplay();
      infoText.textContent= `Spin ${currentSpinNumber} Ergebnis: ${spinValue}. Gesamt: ${total}`;

      // marker
      const distribution= spinObj.distribution;
      const segCount= distribution.length;
      const segAngle= 360/segCount;
      let idx= Math.floor(finalAngle/ segAngle);
      if(idx>=segCount) idx= segCount-1;
      markerIndex= idx;

      // 3 Sek warten
      if(currentSpinNumber<3){
        setTimeout(()=>{
          currentSpinNumber++;
          angle=0; velocity=0; spinning=false; stopping=false;
          wheelBtn.disabled=false;
          wheelBtn.textContent='Start';
          infoText.textContent=`Spin ${currentSpinNumber} bereit`;
          // => Marker weg vor neuem Spin
          markerIndex=null;
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

// Klick
function handleWheelButton(){
  if(currentSpinNumber<3){
    if(!spinning && !stopping){
      startSpin();
      wheelBtn.textContent='Stop';
    } else if(spinning && !stopping){
      stopSpin();
      wheelBtn.textContent='Start';
    }
  } else if(currentSpinNumber===3){
    if(!spinning && !stopping){
      startSpin();
      autoStopSpin();
      wheelBtn.disabled=true;
      wheelBtn.textContent='Spin 3 läuft...';
    }
  }
}

// Exporte
// => 'registerPlayer' muss auf Enter/Cick getriggert werden aus dem HTML
// => 'handleWheelButton' ist click auf wheelBtn

// In index.html z.B.:
// document.getElementById('registerForm').addEventListener('submit', e=>{
//   e.preventDefault();
//   registerPlayer();
// });

ctx.clearRect(0,0,400,400);
