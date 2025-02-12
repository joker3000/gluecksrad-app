function loadPlayers() {
  fetch("/api/admin")
    .then(response => response.json())
    .then(data => {
      const resultsTable = document.getElementById("results");
      resultsTable.innerHTML = "";
      data.players.forEach((player, index) => {
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
          <td><strong>${player.totalScore || 0}</strong></td>
        `;
        resultsTable.appendChild(row);
      });
    })
    .catch(error => console.error("Fehler beim Laden:", error));
}
setInterval(loadPlayers, 5000);
loadPlayers();
