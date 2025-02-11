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
        if (!data.id) {
            alert("Fehler beim Registrieren!");
            return;
        }
        playerId = data.id;
        document.getElementById("game").style.display = "block";
    })
    .catch(err => alert("Server nicht erreichbar!"));
}
