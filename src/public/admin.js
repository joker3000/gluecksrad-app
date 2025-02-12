function loadPlayers(){
  fetch('/api/admin/players')
    .then(r=>{
      if(!r.ok) throw new Error('Not admin or not logged in');
      return r.json();
    })
    .then(data=>{
      const tbl = document.getElementById('resultsTable');
      tbl.innerHTML='';
      data.players.forEach(p=>{
        const tr = document.createElement('tr');
        tr.innerHTML=`
          <td>${p.oid}</td>
          <td>${p.givenName}</td>
          <td>${p.familyName}</td>
          <td>${p.displayName}</td>
          <td>${p.username}</td>
          <td>${p.totalScore||0}</td>
          <td>${p.spin1||''}</td>
          <td>${p.spin2||''}</td>
          <td>${p.spin3||''}</td>
        `;
        tbl.appendChild(tr);
      });
    })
    .catch(e=> console.error('Admin load error', e));
}

setInterval(loadPlayers, 5000);
loadPlayers();
