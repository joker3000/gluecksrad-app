const adminUserInput = document.getElementById('adminUser');
const adminPassInput = document.getElementById('adminPass');
const adminLoginBtn = document.getElementById('adminLoginBtn');

const loginArea = document.getElementById('loginArea');
const dashboard = document.getElementById('dashboard');
const resultsTable = document.getElementById('resultsTable');

adminLoginBtn.addEventListener('click', () => {
  const user = adminUserInput.value.trim();
  const pass = adminPassInput.value.trim();

  fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, pass })
  })
    .then(res => {
      if (!res.ok) {
        throw new Error('Login fehlgeschlagen');
      }
      return res.json();
    })
    .then(data => {
      if (data.success) {
        loginArea.style.display = 'none';
        dashboard.style.display = 'block';
        loadPlayers();
      }
    })
    .catch(err => {
      alert(err.message);
    });
});

function loadPlayers() {
  fetch('/api/admin/players')
    .then(res => res.json())
    .then(data => {
      resultsTable.innerHTML = '';
      data.players.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${p.firstname}</td>
          <td>${p.lastname}</td>
          <td>${p.spin1 ?? ''}</td>
          <td>${p.spin2 ?? ''}</td>
          <td>${p.spin3 ?? ''}</td>
          <td><strong>${p.total ?? 0}</strong></td>
        `;
        resultsTable.appendChild(row);
      });
    })
    .catch(err => {
      console.error(err);
      resultsTable.innerHTML = '<tr><td colspan="6">Fehler beim Laden</td></tr>';
    });
}
