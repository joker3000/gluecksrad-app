let playerId;
let spins = 0;
let angle = 0;
let velocity = 0;
let spinning = false;

function registerPlayer() {
    const vorname = document.getElementById("vorname").value;
    const nachname = document.getElementById("nachname").value;

    fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vorname, nachname })
    })
    .then(res => res.json())
    .then(data => {
        playerId = data.id;
        document.getElementById("game").style.display = "block";
    });
}

function startSpin() {
    if (spins >= 3) return;
    spinning = true;
    velocity = Math.random() * 0.2 + 0.2;
    document.getElementById("stop").disabled = false;
}

function stopSpin() {
    if (!spinning) return;
    spinning = false;
    velocity *= 0.98;
    setTimeout(() => {
        const score = calculateScore();
        saveScore(score);
    }, 3000);
}

function calculateScore() {
    const scores = [0, 0, 0, 0, 10, 10, 10, 25, 25, 50, 100, 200, 400, 600, 800, 1000];
    return scores[Math.floor(Math.random() * scores.length)];
}

function saveScore(score) {
    fetch("/api/save-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: playerId, run: spins + 1, score })
    })
    .then(() => {
        spins++;
        document.getElementById("score").innerText = `Punkte: ${score}`;
    });
}
