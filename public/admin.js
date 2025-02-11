const adminUser = document.getElementById('adminUser');
const adminPass = document.getElementById('adminPass');
// Den Button-Click-Listener entfernen wir – stattdessen
//   ruft das Form-Submit => adminLogin() auf.

// Dashboard
const loginArea = document.getElementById('adminForm');  // <form>
const dashboard = document.getElementById('dashboard');
const resultsTable = document.getElementById('resultsTable');

// Wir definieren die Funktion adminLogin()
function adminLogin() {
  const user = adminUser.value.trim();
  const pass = adminPass.value.trim();

  fetch('/api/admin/login', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ user, pass })
  })
    .then(r => {
      if(!r.ok) throw new Error('Login fehlgeschlagen');
      return r.json();
    })
    .then(data => {
      if(data.success) {
        loginArea.style.display='none';
        dashboard.style.display='block';
        loadPlayers();
        // Alle 5s
        setInterval(loadPlayers, 5000);
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
      resultsTable.innerHTML='';
      data.players.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML= `
          <td>${p.firstname}</td>
          <td>${p.lastname}</td>
          <td>${p.spin1===null?'':p.spin1}</td>
          <td>${p.spin2===null?'':p.spin2}</td>
          <td>${p.spin3===null?'':p.spin3}</td>
          <td><strong>${p.total}</strong></td>
        `;
        resultsTable.appendChild(tr);
      });
    })
    .catch(err=>console.error(err));
}
