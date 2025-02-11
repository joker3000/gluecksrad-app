const adminUser = document.getElementById('adminUser');
const adminPass = document.getElementById('adminPass');
const adminLoginBtn = document.getElementById('adminLoginBtn');

const loginArea = document.getElementById('loginArea');
const dashboard = document.getElementById('dashboard');
const resultsTable = document.getElementById('resultsTable');

adminLoginBtn.addEventListener('click', () => {
  const user = adminUser.value.trim();
  const pass = adminPass.value.trim();

  fetch('/api/admin/login',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ user, pass })
  })
    .then(r=>{
      if(!r.ok) throw new Error('Login fehlgeschlagen');
      return r.json();
    })
    .then(data=>{
      if(data.success) {
        loginArea.style.display='none';
        dashboard.style.display='block';
        loadPlayers();
        setInterval(loadPlayers, 5000);
      }
    })
    .catch(err=>{
      alert(err.message);
    });
});

function loadPlayers(){
  fetch('/api/admin/players')
    .then(r=>r.json())
    .then(data=>{
      resultsTable.innerHTML='';
      data.players.forEach(p=>{
        const tr = document.createElement('tr');
        tr.innerHTML=`
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
