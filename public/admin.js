function loadPlayers() {
  fetch("/api/admin")
    .then((response) => {
      if (!response.ok) throw new Error("Nicht autorisiert oder nicht eingeloggt.");
      return response.json();
    })
    .then((data) => {
      const resultsTable = document.getElementById("results");
      resultsTable.innerHTML = "";

      // Beispiel für Dummy-Daten (falls Backend keine Daten zurückgibt)
      const players = [
        { oid: "123", givenName: "Max", familyName: "Muster", displayName: "Max Muster", spin1: 50, spin2: 100, spin3: 200, total: 350 },
        { oid: "456", givenName: "Erika", familyName: "Müller", displayName: "Erika Müller", spin1: 200, spin2: 400, spin3: 600, total: 1200 }
      ];

      // Spieler nach Gesamt-Score (Total) sortieren (höchster zuerst)
      players.sort((a, b) => b.total - a.total);

      players.forEach((player, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${player.oid}</td>
          <td>${player.givenName}</td>
          <td>${player.familyName}</td>
          <td>${player.displayName}</td>
          <td>${player.spin1 || "-"}</td>
          <td>${player.spin2 || "-"}</td>
          <td>${player.spin3 || "-"}</td>
          <td><strong>${player.total || 0}</strong></td>
        `;
        resultsTable.appendChild(row);
      });
    })
    .catch((error) => console.error("Fehler beim Laden der Spieler:", error));
}

// Automatische Aktualisierung alle 5 Sekunden
setInterval(loadPlayers, 5000);
loadPlayers();
