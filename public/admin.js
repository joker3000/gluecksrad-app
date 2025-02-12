// admin.js
function loadPlayers(){
  fetch('/api/admin/players')
    .then(r=>{
      if(!r.ok) throw new Error("Not admin or not logged in");
      return r.json();
    })
    .then(data=>{
      const results = data.players;
      const tbl = document.getElementById('results');
      tbl.innerHTML='';
      results.forEach(p=>{
        const tr = document.createElement('tr');
        tr.innerHTML=`
          <td>${p.oid}</td>
          <td>${p.givenName}</td>
          <td>${p.familyName}</td>
          <td>${p.displayName}</td>
          <td>${p.username}</td>
          <td>${p.totalScore}</td>
        `;
        tbl.appendChild(tr);
      });
    })
    .catch(err=>console.error(err));
}
setInterval(loadPlayers, 5000);
loadPlayers();
