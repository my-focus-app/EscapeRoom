const socket = io();
const tbody = document.querySelector('#progressTable tbody');

function fetchProgress() {
  fetch('/admin/api/progress')
    .then(res => res.json())
    .then(teams => {
      tbody.innerHTML = '';
      teams.forEach(addRowToTable);
    });
}

function addRowToTable(team) {
  const tr = document.createElement('tr');

  const tdAvatar = document.createElement('td');
  const img = document.createElement('img');
  img.className = 'avatar';
  img.src = team.avatar || '/avatars/default.png';
  tdAvatar.appendChild(img);
  tr.appendChild(tdAvatar);

  const tdName = document.createElement('td');
  tdName.textContent = team.name;
  tr.appendChild(tdName);

  const tdDelete = document.createElement('td');
  const delBtn = document.createElement('button');
  delBtn.textContent = '🗑';
  delBtn.onclick = () => {
    if (confirm(`Supprimer l’équipe "${team.name}" ?`)) {
      fetch(`/admin/api/progress/${team.name}`, { method: 'DELETE' })
        .then(() => fetchProgress());
    }
  };
  tdDelete.appendChild(delBtn);
  tr.appendChild(tdDelete);

  tbody.appendChild(tr);
}

// Réagit aux nouveaux teams connectés
socket.on('newTeam', fetchProgress);
socket.on('teamProgress', fetchProgress);

// Boutons
document.getElementById('startGameBtn').onclick = () => {
  fetch('/admin/start', { method: 'POST' }).then(fetchProgress);
};
document.getElementById('resetGameBtn').onclick = () => {
  if (confirm('Tout réinitialiser ?')) {
    fetch('/admin/reset', { method: 'POST' }).then(fetchProgress);
  }
};

// Lancer au chargement
fetchProgress();