// Ausschnitt aus game.js – alle relevanten Änderungen

// ... Deine bisherigen Variablen & Setup ...

// Zeichnet das aktuelle Spin-Layout
function drawWheel() {
  const spinObj = spins.find(s => s.spinNumber === currentSpinNumber);
  if (!spinObj) {
    ctx.clearRect(0, 0, 400, 400);
    return;
  }
  const distribution = spinObj.distribution || [];
  const segCount = distribution.length; // 16
  const segAngle = (2 * Math.PI) / segCount;

  ctx.clearRect(0, 0, 400, 400);

  // Größere Schrift, fetter
  ctx.font = "bold 20px sans-serif";

  for (let i = 0; i < segCount; i++) {
    ctx.beginPath();
    ctx.moveTo(200, 200);
    ctx.arc(200, 200, 200, i * segAngle, (i + 1) * segAngle);
    ctx.fillStyle = randomColor(i);
    ctx.fill();
    ctx.stroke();

    // Text "näher am Kreisrand"
    ctx.save();
    ctx.translate(200, 200);
    ctx.rotate(i * segAngle + segAngle / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    // z. B. bei Radius ~ (200 - 70) = 130
    ctx.fillText(String(distribution[i]), 130, 0);
    ctx.restore();
  }
}

// 5° Bounce => Dann finalizeSpin
function doBounce() {
  stopping = true;
  const steps = 30; // ~0.5 s
  let step = 0;
  const bounceDeg = 5; // wir ziehen am Ende 5° ab

  const bounceInt = setInterval(() => {
    step++;
    angle -= bounceDeg / steps; 
    if (step >= steps) {
      clearInterval(bounceInt);
      spinning = false;
      stopping = false;
      finalizeSpin();
    }
  }, 1000 / 60);
}

// finalizeSpin => wir berechnen finalAngle
// Dann 2s warten, bevor wir den nächsten Spin erlauben
function finalizeSpin() {
  let finalAngle = (angle % 360 + 360) % 360;

  // Sende an /api/spinResult
  fetch('/api/spinResult', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({
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
      infoText.textContent = `Spin ${currentSpinNumber} Ergebnis: ${spinValue}. Total: ${total}`;

      if (currentSpinNumber < 3) {
        // 2s warten, dann nächster Spin
        setTimeout(() => {
          currentSpinNumber++;
          angle = 0;
          velocity = 0;
          spinning = false;
          stopping = false;
          wheelBtn.disabled = false;
          wheelBtn.textContent = 'Start';
          infoText.textContent = `Spin ${currentSpinNumber} bereit.`;
        }, 2000); // 2s Pause
      } else {
        // Alle 3 fertig
        setTimeout(() => {
          infoText.textContent = `3. Spin fertig. Gesamt: ${total}`;
          wheelBtn.disabled = true;
        }, 2000);
      }
    })
    .catch(err=>{
      console.error(err);
      alert('Fehler /api/spinResult');
    });
}
