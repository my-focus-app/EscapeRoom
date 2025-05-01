let endTime = null;
// Récupère une fois le timeLeft au lancement
fetch('/api/status')
  .then(r => r.json())
  .then(d => {
    if (d.timeLeft != null) {
      endTime = Date.now() + d.timeLeft;
      document.getElementById('global-timer').textContent = formatTime(d.timeLeft);
      setInterval(updateGlobalTimer, 1000);
    }
  });

function updateGlobalTimer(){
  const diff = endTime - Date.now();
  if (diff <= 0) {
    document.getElementById('global-timer').textContent = '⏱ Temps écoulé';
    return;
  }
  document.getElementById('global-timer').textContent = '⏳ ' + formatTime(diff);
}

function formatTime(ms){
  const m = Math.floor(ms/60000).toString().padStart(2,'0');
  const s = Math.floor((ms%60000)/1000).toString().padStart(2,'0');
  return `${m}:${s}`;
}