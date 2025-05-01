let endTime = null;
const socket = io(); 

// 1. Premier chargement de toutes les données
socket.on('initialProgress', progressList => {
  renderTable(progressList);
});

// 2. Une nouvelle équipe rejoint
socket.on('newTeam', team => {
  addRowToTable(team);
});

socket.on('teamProgress', ({ team, posten }) => {
  fetchProgress();
  showToast(`✅ ${team} a terminé ${posten}`);
});

// 3. Le jeu est lancé
socket.on('gameStarted', info => {
  document.getElementById('launchStatus').textContent = "🎉 Jeu lancé !";
  syncGameTime();
});

// 4. Le jeu est réinitialisé
socket.on('gameReset', () => {
  location.reload();
});

function syncGameTime() {
  fetch('/api/status')
    .then(res => res.json())
    .then(data => {
      if (data.timeLeft !== null) {
        endTime = Date.now() + data.timeLeft;
      }
    });
}

function updateCountdown() {
  if (!endTime) return;

  const now = Date.now();
  const diff = endTime - now;

  if (diff <= 0) {
    document.getElementById('countdown').textContent = "⏱ Temps écoulé";
    return;
  }

  const min = Math.floor(diff / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  document.getElementById('countdown').textContent = `⏳ Temps restant : ${min}m ${sec}s`;
}

setInterval(updateCountdown, 1000);
setInterval(syncGameTime, 3000);

fetch('/admin/api/isAdmin')
  .then(res => res.json())
  .then(data => {
    if (data.isAdmin) {
      syncGameTime();
      fetchProgress();
      setInterval(fetchProgress, 5000);
    } else {
      fetchProgress();
      setInterval(fetchProgress, 5000);
    }
  });

  function renderTable(progressList) {
    const tbody = document.querySelector('#progressTable tbody');
    tbody.innerHTML = '';
    Object.entries(progressList).forEach(([teamName, progress]) => {
      addRowToTable(progress);
    });
  }
  
  function addRowToTable(progress) {
    const tbody = document.querySelector('#progressTable tbody');
    const tr = document.createElement('tr');
  
    const tdAvatar = document.createElement('td');
    tdAvatar.innerHTML = `<img src="${progress.avatar || '/avatars/default.png'}" style="width:40px; height:40px; border-radius:50%;">`;
    tr.appendChild(tdAvatar);
  
    const tdUser = document.createElement('td');
    tdUser.textContent = progress.name;
    tr.appendChild(tdUser);
  
    const count = ['posten1', 'posten2', 'posten3'].filter(p => progress[p]).length;
    const tdProgress = document.createElement('td');
    tdProgress.innerHTML = `<progress value="${count}" max="3"></progress> ${Math.round((count / 3) * 100)}%`;
    tr.appendChild(tdProgress);
  
    for (let i = 1; i <= 3; i++) {
      const td = document.createElement('td');
      const key = `posten${i}`;
      td.textContent = progress[key] ? '✅' : '❌';
      td.className = progress[key] ? 'done' : 'not-done';
      tr.appendChild(td);
    }
  
    tbody.appendChild(tr);
  }

function fetchProgress() {
  fetch('/admin/api/progress')
      .then(res => {
        if (!res.ok) {
          window.location.href = '/admin/login';
          throw new Error('Non autorisé');
        }
        return res.json();
      })
      .then(data => {
      const tbody = document.querySelector('#progressTable tbody');
      tbody.innerHTML = '';

      const teams = Object.entries(data);
      teams.sort(([, a], [, b]) => {
        const count = obj => ['posten1', 'posten2', 'posten3'].filter(k => obj[k]).length;
        return count(b) - count(a);
      });

      teams.forEach(([teamName, progress]) => {
        const tr = document.createElement('tr');

        const tdAvatar = document.createElement('td');
        tdAvatar.innerHTML = `<img src="${progress.avatar || '/avatars/default.png'}" style="width:40px; height:40px; border-radius:50%;">`;
        tr.appendChild(tdAvatar);

        const tdUser = document.createElement('td');
        tdUser.textContent = progress.name || teamName;
        tr.appendChild(tdUser);

        const count = ['posten1', 'posten2', 'posten3'].filter(p => progress[p]).length;
        const tdProgress = document.createElement('td');
        tdProgress.innerHTML = `<progress value="${count}" max="3"></progress> ${Math.round((count / 3) * 100)}%`;
        tr.appendChild(tdProgress);

        for (let i = 1; i <= 3; i++) {
          const td = document.createElement('td');
          const key = `posten${i}`;
          td.textContent = progress[key] ? '✅' : '❌';
          td.className = progress[key] ? 'done' : 'not-done';
          tr.appendChild(td);
        }

        tbody.appendChild(tr);
      });
    });
}

document.getElementById('startGameBtn').onclick = () => {
  fetch('/admin/start', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        document.getElementById('startGameBtn').disabled = true;
        document.getElementById('launchStatus').textContent = "🎉 Jeu lancé !";
      }
      syncGameTime();
    });
};

document.getElementById('resetGameBtn').onclick = () => {
    if (!confirm("Tu es sûr de vouloir tout réinitialiser ?")) return;
    fetch('/admin/reset', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("🔁 Le jeu a été réinitialisé.");
          location.reload();
        }
      });
  };

  function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = '#333';
    toast.style.color = '#fff';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '1.1rem';
    toast.style.zIndex = 1000;
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease';
  
    document.body.appendChild(toast);
    requestAnimationFrame(() => (toast.style.opacity = '1'));
  
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 500);
    }, 3000);
  }