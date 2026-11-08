'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  const stage = document.getElementById('overlay-stage');
  const resize = () => { stage.style.transform = `scale(${Math.min(innerWidth / 1920, innerHeight / 1080)})`; };
  resize();
  addEventListener('resize', resize);
  document.getElementById('channel-label').textContent = (params.get('channel') || 'jikokun').toUpperCase();
  const video = document.getElementById('mascot-video');
  const showVideo = () => video.parentElement.classList.add('has-video');
  video.addEventListener('loadeddata', showVideo);
  if (video.readyState >= 2) showVideo();
  const clock = new Intl.DateTimeFormat('en-US', { timeZone:'America/El_Salvador', hour:'2-digit', minute:'2-digit', hour12:true });
  const updateClock = () => { document.getElementById('local-clock').textContent = clock.format(new Date()); };
  updateClock();
  setInterval(updateClock, 1000);
  const requested = Number(params.get('minutes') ?? 5);
  const minutes = Number.isFinite(requested) ? Math.min(180, Math.max(0, requested)) : 5;
  initCountdownTimer(Math.round(minutes * 60));
  initKickChat();
  initSpotifyController(params);
});
function initCountdownTimer(totalSeconds) {
  // Wall time avoids drift when OBS throttles a background source.
  const end = Date.now() + totalSeconds * 1000;
  const timer = document.getElementById('timer');
  let interval;
  function update() {
    const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    timer.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
    const percent = totalSeconds > 0 ? Math.round((1 - remaining / totalSeconds) * 100) : 100;
    document.getElementById('progress-fill').style.width = `${percent}%`;
    document.getElementById('countdown-progress').setAttribute('aria-valuenow', percent);
    document.getElementById('timer-percent').textContent = `${percent}%`;
    if (remaining === 0) {
      document.getElementById('countdown-label').textContent = 'TODO LISTO';
      document.getElementById('countdown-note').textContent = '¡Comenzamos en un momento!';
      clearInterval(interval);
    }
  }
  update();
  if (totalSeconds > 0) interval = setInterval(update, 250);
}
function initSpotifyController(params) {
  const url = new URL('../mini_widgets/widget_spotify.html', location.href);
  url.searchParams.set('embed', 'scene');
  url.searchParams.set('ws_port', params.get('port') || '4445');
  url.searchParams.set('user', params.get('user') || params.get('spotify_user') || localStorage.getItem('spotify_user') || 'jikokun2');
  for (const key of ['ip','token','refresh','control_mode','skip_mode']) {
    if (params.has(key)) url.searchParams.set(key, params.get(key));
  }
  document.getElementById('spotify-controller').src = url.href;
}
