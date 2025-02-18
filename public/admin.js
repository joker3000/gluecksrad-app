// admin.js
const adminUser = document.getElementById('adminUser');
const adminPass = document.getElementById('adminPass');
const dashboard = document.getElementById('dashboard');
const resultsTable = document.getElementById('resultsTable');
const loginArea = document.getElementById('adminForm');

function adminLogin() {
  const user = adminUser.value.trim();
  const pass = adminPass.value.trim();

  fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, pass })
  })
    .then(r => {
      if (!r.ok) throw new Error('Login fehlgeschlagen');
      return r.json();
    })
    .then(data => {
      if (data.success) {
        loginArea.style.display = 'none';
        dashboard.style.display = 'block';
        loadPlayers();
        setInterval(loadPlayers, 2500);
      }
    })
    .catch(err => {
      alert(err.message);
    });
}

function loadPlayers() {
  fetch('/api/admin/players')
    .then(r => r.json())
    .then(data => {
      resultsTable.innerHTML = '';
      data.players.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.firstname}</td>
          <td>${p.lastname}</td>
          <td>${p.spin1 === null ? '' : p.spin1}</td>
          <td>${p.spin2 === null ? '' : p.spin2}</td>
          <td>${p.spin3 === null ? '' : p.spin3}</td>
          <td><strong>${p.total}</strong></td>
          <td>
            <button class="delete-btn" onclick="confirmDelete(${p.id}, '${p.firstname}', '${p.lastname}')">X</button>
          </td>
        `;
        resultsTable.appendChild(tr);
      });
    })
    .catch(err => console.error(err));
}

function confirmDelete(playerId, firstname, lastname) {
  const confirmation = confirm(`Bist du sicher, dass du ${firstname} ${lastname} löschen möchtest?`);
  if (confirmation) {
    deletePlayer(playerId);
  }
}

function deletePlayer(playerId) {
  fetch(`/api/admin/delete/${playerId}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(data => {
      alert(data.message);
      loadPlayers(); // Refresh player list after deletion
    })
    .catch(err => console.error(err));
}
