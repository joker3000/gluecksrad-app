const wheelBtn = document.getElementById('wheelBtn');
const infoText = document.getElementById('infoText');
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');

// 16 Segmente
const SEGMENT_VALUES = [
  0,0,0,0,
  10,10,10,
  25,25,
  50,100,200,400,600,800,1000
];
let angle = 0;
let velocity = 0;
let spinning = false;
let stopping = false;
let markerIndex = null;
let currentSpin = 1;

function animate() {
  requestAnimationFrame(animate);
  if(spinning) angle += velocity;

  ctx.save();
  ctx.translate(200,200);
  ctx.rotate(angle*Math.PI/180);
  ctx.translate(-200,-200);
  drawWheel();
  ctx.restore();
}
animate();

function drawWheel() {
  ctx.clearRect(0,0,400,400);

  const segCount = SEGMENT_VALUES.length;
  const segAngle = 2*Math.PI / segCount;
  ctx.font = 'bold 20px sans-serif';

  for(let i=0; i<segCount; i++){
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
    ctx.fillText(String(SEGMENT_VALUES[i]), 130,0);
    ctx.restore();
  }

  // Roter Marker
  if(markerIndex!==null){
    ctx.save();
    ctx.translate(200,200);
    ctx.rotate(markerIndex*segAngle + segAngle/2);
    ctx.beginPath();
    ctx.arc(130,0,10,0,2*Math.PI);
    ctx.fillStyle='red';
    ctx.fill();
    ctx.lineWidth=2;
    ctx.strokeStyle='black';
    ctx.stroke();
    ctx.restore();
  }
}

function randomColor(i){
  const base=["red","blue","green","orange","purple","yellow","cyan","pink"];
  return base[i % base.length];
}

function startSpin() {
  if(spinning||stopping) return;
  spinning=true;
  velocity= Math.random()*3 +3; // grad/frame
  infoText.textContent=`Spin ${currentSpin} läuft...`;
  markerIndex=null;
}

function stopSpin() {
  if(!spinning||stopping) return;
  stopping=true;
  wheelBtn.disabled=true;
  const initV= velocity;
  const steps=60*3; //3s
  let step=0;

  const slowInt= setInterval(()=>{
    step++;
    velocity= initV*(1- step/steps);
    if(step>=steps){
      clearInterval(slowInt);
      velocity=0;
      doBounce();
    }
  },1000/60);
}

function doBounce() {
  stopping=true;
  const steps=30;
  let step=0;
  const bounceDeg=5;

  const bounceInt= setInterval(()=>{
    step++;
    angle-= bounceDeg/steps;
    if(step>=steps){
      clearInterval(bounceInt);
      spinning=false;
      stopping=false;
      finalizeSpin();
    }
  },1000/60);
}

function finalizeSpin() {
  let finalAngle= (angle%360+360)%360;
  // Bestimme segment index
  const segCount= SEGMENT_VALUES.length;
  const segAngle= 360/ segCount;
  let idx= Math.floor(finalAngle/ segAngle);
  if(idx>=segCount) idx= segCount-1;
  markerIndex= idx;

  const spinValue= SEGMENT_VALUES[idx];
  infoText.textContent=`Spin ${currentSpin} Ergebnis: ${spinValue}.`;

  // optional: fetch('/api/spin', {method:'POST'}) => store in DB

  if(currentSpin<3){
    // Spin 1/2 => 3s warten => next spin
    setTimeout(()=>{
      currentSpin++;
      angle=0; velocity=0; spinning=false; stopping=false;
      wheelBtn.disabled=false;
      wheelBtn.textContent='Start';
      infoText.textContent=`Spin ${currentSpin} bereit`;
      markerIndex=null;
    },3000);
  } else {
    // Spin 3 => final => 3s warten => "Fertig / Logout"
    setTimeout(()=>{
      infoText.textContent=`3. Spin fertig. Gesamt? -> man könnte summieren.`;
      wheelBtn.disabled=false;
      wheelBtn.textContent="Fertig / Logout";
      wheelBtn.removeEventListener('click', handleWheel);
      wheelBtn.addEventListener('click', ()=>{
        location.href='/auth/logout';
      });
    },3000);
  }
}

function handleWheel() {
  if(currentSpin<3){
    if(!spinning && !stopping){
      startSpin();
      wheelBtn.textContent='Stop';
    } else if(spinning && !stopping){
      stopSpin();
      wheelBtn.textContent='Start';
    }
  } else if(currentSpin===3){
    if(!spinning && !stopping){
      startSpin();
      wheelBtn.disabled=true;
      wheelBtn.textContent='Spin 3 läuft...';
      // autoStop in 3..7s
      setTimeout(()=>{
        stopSpin();
      }, Math.random()*4000+3000);
    }
  }
}

wheelBtn.addEventListener('click', handleWheel);

// init
infoText.textContent=`Spin ${currentSpin} bereit`;
wheelBtn.disabled=false;
wheelBtn.textContent='Start';
