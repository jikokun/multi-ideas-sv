/* Señal de presentación: sólo lee reproducción, BPM y pulsos existentes. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const clock = () => performance.now();
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const state = { playing: false, bpm: null, energy: .3, origin: clock(), updated: 0, localUpdated: -Infinity, track: '', spotifyTrack: '', source: 'idle' };
  const features = new Map();
  let preview = null, stopped = false, socket, retry, pollTimer, tunaBusy = false, spotifyBusy = false;
  let lastBeat = -Infinity;
  let channel;

  function update(data = {}, source = 'spotify') {
    const local = source !== 'spotify';
    const track = data.item || data.track || data;
    if (!local && clock() - state.localUpdated < 8000) {
      // Tuna suele proporcionar el título sin BPM. Spotify puede completar el
      // tempo del mismo tema sin reemplazar el estado de reproducción local.
      if (data.item?.id && (state.track === data.item.id || state.track === data.item.name)) {
        state.spotifyTrack = data.item.id;
        if (Number.isFinite(data.progress_ms)) state.origin = clock() - data.progress_ms;
      }
      return;
    }
    const key = track.id || track.uri || track.title || track.name || data.song || '';
    if (key && state.track !== key) { state.track = key; state.spotifyTrack = ''; state.bpm = null; state.energy = .3; }
    const playing = data.is_playing ?? data.isPlaying ?? data.playing;
    const status = String(data.status || data.state || '').toLowerCase();
    if (typeof playing === 'boolean') state.playing = playing;
    else if (['paused', 'stopped', 'stop', 'pause'].includes(status)) state.playing = false;
    else if (['playing', 'play'].includes(status) || key) state.playing = true;
    const bpm = Number(track.tempo || track.bpm || data.tempo || data.bpm);
    if (bpm >= 40 && bpm <= 240) state.bpm = bpm;
    const energy = Number(track.energy ?? data.energy);
    if (Number.isFinite(energy)) state.energy = clamp(energy, 0, 1);
    else if (state.bpm) state.energy = clamp((state.bpm - 65) / 150, .15, .75);
    const progress = Number(data.progress_ms ?? track.progress_ms ?? (Number.isFinite(data.progress) ? data.progress * 1000 : NaN));
    if (Number.isFinite(progress) && progress >= 0) state.origin = clock() - progress;
    state.updated = clock(); state.source = source;
    if (local) state.localUpdated = clock();
  }
  function pause(source = 'spotify') { update({ is_playing: false }, source); }
  function rhythm(bpm, energy, trackId) {
    if (trackId && state.track && trackId !== state.track && trackId !== state.spotifyTrack) return;
    if (clock() - state.localUpdated < 8000 && state.bpm) return;
    const tempo = Number(bpm);
    if (tempo < 40 || tempo > 240 || !Number.isFinite(tempo)) return;
    state.bpm = tempo;
    state.energy = Number.isFinite(Number(energy)) ? clamp(Number(energy), 0, 1) : clamp((tempo - 65) / 150, .15, .75);
  }
  function beat() { lastBeat = clock(); state.origin = lastBeat; state.playing = true; state.updated = lastBeat; state.localUpdated = lastBeat; state.source = 'streamerbot'; }
  function ingest(message) {
    const event = message?.event || {};
    const data = message?.data || message?.body || message || {};
    const payload = data.custom || data;
    const type = String(event.type || payload.event || '').toLowerCase();
    const isMusic = event.source === 'Spotify' || type.includes('spotify') || data.track;
    const isCustomMusic = ['General', 'StreamerBot'].includes(event.source) && (payload.bpm || payload.tempo || payload.beat || payload.pulse || payload.is_playing !== undefined);
    if (!isMusic && !isCustomMusic) return;
    if (type.includes('paused') || type.includes('stopped')) pause('streamerbot');
    else update({ ...payload, ...(type.includes('started') ? { is_playing: true } : {}) }, 'streamerbot');
    if (payload.beat || payload.pulse) beat();
  }
  function tuna(data) {
    if (!data || typeof data !== 'object') return;
    if (data.title || data.song || data.status || data.is_playing !== undefined) update(data, 'tuna');
  }
  function sample(time = clock()) {
    const demo = preview && time < preview.until ? preview : null;
    const live = demo || state;
    const playing = !!live.playing && (!!demo || time - state.updated < 14000);
    const bpm = live.bpm;
    const energy = playing ? live.energy : 0;
    const phase = bpm ? ((time - live.origin) / (60000 / bpm)) % 1 : 0;
    const beatPulse = playing && bpm ? Math.pow((1 + Math.cos(phase * Math.PI * 2)) / 2, 9) : 0;
    const pulse = Math.max(beatPulse, playing ? Math.max(0, 1 - (time - lastBeat) / 220) : 0);
    const gustPeriod = bpm && playing ? 60000 / bpm * 8 : 9000;
    const swell = (1 + Math.sin((time - live.origin) / gustPeriod * Math.PI * 2)) / 2;
    return { playing, bpm, energy, pulse: clamp(pulse, 0, 1), wind: (playing ? 7 + energy * 22 : 4) * Math.sin(time / 11000) * (.35 + .65 * swell), speed: 1 + energy * .4 + pulse * .06, source: demo ? 'preview' : playing ? state.source : 'idle' };
  }
  async function getFeatures(data, token) {
    const id = data?.item?.id;
    if (!id || !token || state.bpm) return;
    if (!features.has(id)) {
      if (features.size >= 40) features.delete(features.keys().next().value);
      features.set(id, fetch(`https://api.spotify.com/v1/audio-features/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(4000) }).then(response => response.ok ? response.json() : null).catch(() => null));
    }
    const value = await features.get(id);
    if (value) rhythm(value.tempo, value.energy, id);
  }
  async function spotify() {
    if (spotifyBusy || (clock() - state.localUpdated < 8000 && state.bpm)) return;
    let token = params.get('token') || '';
    try { token ||= localStorage.getItem('spotify_access_token') || ''; } catch { /* Sin almacenamiento, todavía funcionan Tuna y Streamer.bot. */ }
    if (!token) return;
    spotifyBusy = true;
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(4000) });
      if (stopped) return;
      if (response.status === 204) pause();
      else if (response.ok) { const data = await response.json(); update(data); await getFeatures(data, token); }
    } catch { /* Una fuente local o el siguiente sondeo puede recuperar la señal. */ }
    finally { spotifyBusy = false; }
  }
  async function pollTuna() {
    if (tunaBusy) return;
    tunaBusy = true;
    const host = params.get('ip') || '127.0.0.1';
    const port = params.get('tunaport') || params.get('tuna') || '1608';
    try {
      const response = await fetch(`http://${host}:${port}/`, { cache: 'no-store', signal: AbortSignal.timeout(1200) });
      if (!stopped && response.ok) tuna(await response.json());
    } catch { /* Tuna es opcional; no hay reconexiones agresivas. */ }
    finally { tunaBusy = false; }
  }
  function connect() {
    if (stopped) return;
    try {
      socket = new WebSocket(`ws://${params.get('ip') || '127.0.0.1'}:${params.get('port') || '4445'}/`);
      socket.onopen = () => socket.send(JSON.stringify({ request: 'Subscribe', id: 'navidad-music', events: { Spotify: ['*'], General: ['Custom'], StreamerBot: ['Custom'] } }));
      socket.onmessage = event => { try { ingest(JSON.parse(event.data)); } catch { /* Ignora paquetes ajenos. */ } };
      socket.onclose = () => { if (!stopped) retry = setTimeout(connect, 5000); };
      socket.onerror = () => {};
    } catch { retry = setTimeout(connect, 5000); }
  }
  window.NavidadMusic = Object.freeze({ update, pause, rhythm, ingest, tuna, sample,
    preview(bpm, energy) { preview = { playing: true, bpm: clamp(Number(bpm) || 96, 40, 180), energy: clamp(Number(energy) || .3, 0, 1), origin: clock(), until: clock() + 12000 }; },
    clearPreview() { preview = null; }
  });
  function start() {
    const game = document.body.dataset.scene === 'juego';
    // Juego ya tiene los conectores del marco original. Chat/mimir comunican su
    // respuesta Spotify actual; inicio/juego tienen este respaldo de sólo lectura.
    if (!game) connect();
    const poll = () => {
      if (document.hidden || stopped) return;
      if (!game) pollTuna();
      if (game || document.body.dataset.scene === 'inicial') spotify();
    };
    poll(); pollTimer = setInterval(poll, 4000);
    try { channel = new BroadcastChannel('spotify_overlay_channel'); channel.onmessage = event => update(event.data || {}, 'broadcast'); } catch { /* Opcional en OBS. */ }
    document.addEventListener('visibilitychange', poll);
    addEventListener('pagehide', () => { stopped = true; clearTimeout(retry); clearInterval(pollTimer); socket?.close(); channel?.close(); document.removeEventListener('visibilitychange', poll); }, { once: true });
  }
  document.addEventListener('DOMContentLoaded', start, { once: true });
})();
