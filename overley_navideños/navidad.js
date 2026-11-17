/* Efectos compartidos. La señal musical de sólo lectura está en musica.js. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const NS = 'http://www.w3.org/2000/svg';
  const assetDirectory = new URL('.', document.currentScript.src);

  function init() {
    const stage = document.getElementById('overlay-stage');
    if (!stage) return;
    const mode = document.body.dataset.scene;
    if (mode === 'chat' || mode === 'mimir') stage.append(createBaubles(mode));
    const decor = document.createElement('div');
    decor.className = 'navidad-decor';
    decor.innerHTML = `<canvas class="navidad-snow" width="1920" height="1080" aria-hidden="true"></canvas>
      <div class="navidad-lights" aria-hidden="true"></div>
      ${mode === 'juego' ? '<canvas class="navidad-game-snow-corners" width="1920" height="112" aria-hidden="true"></canvas>' : `<canvas class="navidad-snowbank" width="1920" height="112" aria-hidden="true"></canvas><div class="navidad-greenery left" aria-hidden="true"></div><div class="navidad-greenery right" aria-hidden="true"></div><div class="navidad-ribbon">${{ inicial: 'NAVIDAD CON LA MANADA', chat: 'CHARLAMOS EN FAMILIA', mimir: 'DULCES SUEÑOS, MANADA' }[mode]}</div>`}`;
    const lights = decor.querySelector('.navidad-lights');
    for (let i = 0; i < 44; i++) {
      const light = document.createElement('span');
      light.className = 'navidad-bulb';
      light.style.setProperty('--delay', `${-(i % 7) * .57}s`);
      lights.append(light);
    }
    stage.append(decor);
    const snowbank = decor.querySelector('.navidad-snowbank');
    if (snowbank) window.NavidadSnowbank?.render(snowbank);
    const snowCorners = decor.querySelector('.navidad-game-snow-corners');
    if (snowCorners) window.NavidadSnowbank?.renderCorners(snowCorners);
    const tree = createTree();
    if (mode === 'juego') {
      const camera = document.getElementById('camWrapper');
      const baubles = document.createElement('div');
      baubles.className = 'navidad-game-baubles';
      baubles.setAttribute('aria-hidden', 'true');
      for (const [color, x, y, size, corner = ''] of [
        ['gold', -12, -18, 34], ['red', 14, -5, 28], ['green', 45, -14, 19],
        ['gold', 0, 0, 29, 'corner-right-gold'], ['red', 0, 0, 22, 'corner-right-red']
      ]) {
        const ball = createBauble(color, x, y, size);
        if (corner) ball.classList.add(corner);
        baubles.append(ball);
      }
      camera?.append(baubles, tree);
    } else decor.append(tree);
    let ornaments = 0;
    let celebrationTimer;
    let treeLights = params.get('treeLights') !== 'off';
    let requestedMotion = params.get('motion') !== 'off';
    const settings = {
      snow: ['off', 'light', 'normal'].includes(params.get('snow')) ? params.get('snow') : 'normal',
      lights: ['off', 'steady', 'twinkle'].includes(params.get('lights')) ? params.get('lights') : 'twinkle',
      tree: params.get('tree') !== 'off',
      motion: params.get('motion') !== 'off' && !reducedMotion.matches
    };
    const snow = createSnow(decor.querySelector('canvas'), mode, settings, lights);

    function applySettings(next) {
      if (['off', 'light', 'normal'].includes(next.snow)) settings.snow = next.snow;
      if (['off', 'steady', 'twinkle'].includes(next.lights)) settings.lights = next.lights;
      if (typeof next.tree === 'boolean') settings.tree = next.tree;
      if (typeof next.motion === 'boolean') requestedMotion = next.motion;
      settings.motion = requestedMotion && !reducedMotion.matches;
      document.body.classList.toggle('navidad-snow-off', settings.snow === 'off');
      document.body.classList.toggle('navidad-lights-off', settings.lights === 'off');
      document.body.classList.toggle('navidad-lights-steady', settings.lights === 'steady');
      document.body.classList.toggle('navidad-tree-hidden', !settings.tree);
      document.body.classList.toggle('navidad-static', !settings.motion);
      document.body.classList.toggle('navidad-tree-lights-off', !treeLights);
      tree?.setAttribute('aria-pressed', String(treeLights));
      tree?.setAttribute('aria-label', `${treeLights ? 'Apagar' : 'Encender'} las luces del árbol de Navidad`);
      snow.restart();
    }

    function celebrate(count = 1) {
      if (!tree || !settings.tree) return;
      if (mode === 'juego') {
        // En juego sólo se ilumina la estrella; no se añaden nodos ni destellos al marco.
        tree.classList.add('is-celebrating');
        clearTimeout(celebrationTimer);
        celebrationTimer = setTimeout(() => tree.classList.remove('is-celebrating'), 1100);
        return;
      }
      tree.classList.remove('is-celebrating');
      // Reinicia la estrella incluso si llegan varios mensajes durante su animación.
      void tree.offsetWidth;
      tree.classList.add('is-celebrating');
      clearTimeout(celebrationTimer);
      celebrationTimer = setTimeout(() => tree.classList.remove('is-celebrating'), 1100);
      const additions = Math.min(24 - ornaments, Math.max(1, Math.floor(Number(count) || 1)));
      for (let n = 0; n < additions; n++) {
        const index = ornaments++;
        const row = Math.floor(index / 6);
        const col = index % 6;
        const spread = 34 + row * 17;
        const ornament = document.createElementNS(NS, 'circle');
        ornament.setAttribute('cx', String(140 - spread + col * spread * 2 / 5));
        ornament.setAttribute('cy', String(126 + row * 49 + Math.sin(col * 1.8) * 7));
        ornament.setAttribute('r', '5');
        ornament.setAttribute('fill', index % 2 ? '#e5bf72' : '#e75d65');
        ornament.setAttribute('class', 'tree-ornament');
        tree.querySelector('.tree-ornaments').append(ornament);
      }
      tree.dataset.ornaments = String(ornaments);
      tree.querySelectorAll('.tree-gift').forEach((gift, i) => gift.classList.toggle('is-waiting', ornaments < (i + 1) * 4));
    }

    tree?.addEventListener('click', () => { treeLights = !treeLights; applySettings({}); });
    const chat = document.getElementById('chat-container');
    const observer = new MutationObserver(records => {
      const count = records.reduce((total, record) => total + [...record.addedNodes].filter(node => node.nodeType === 1 && node.matches('.glass-message, .live-message, .chat-activity')).length, 0);
      if (count) celebrate(count);
    });
    if (chat) observer.observe(chat, { childList: true });
    const gameChat = mode === 'juego' ? window.NavidadGameChat?.createHandler(celebrate, { filterCommands: params.get('filterCommands') !== 'false' }) : null;
    const onMessage = event => {
      if (event.origin !== location.origin || event.source !== window.parent || window.parent === window) return;
      if (event.data?.type === 'NAVIDAD_SETTINGS') applySettings(event.data.settings || {});
      if (event.data?.type === 'NAVIDAD_TEST_TREE') celebrate();
      if (event.data?.type === 'NAVIDAD_TEST_CHAT') {
        if (gameChat) gameChat({ event: { source: 'Kick', type: 'ChatMessage' }, data: { user: { username: 'ManadaNavideña' }, message: '¡Feliz Navidad, manada!' } });
        else window.simularMensajeKick?.('¡Feliz Navidad, manada! 🎄', 'ManadaNavideña');
      }
      if (event.data?.type === 'NAVIDAD_TEST_MUSIC') window.NavidadMusic?.preview(event.data.bpm, event.data.energy);
      if (event.data?.type === 'NAVIDAD_RESET_TREE' && tree) {
        ornaments = 0;
        clearTimeout(celebrationTimer);
        tree.classList.remove('is-celebrating');
        tree.dataset.ornaments = '0';
        tree.querySelector('.tree-ornaments').replaceChildren();
        tree.querySelectorAll('.tree-gift').forEach(gift => gift.classList.add('is-waiting'));
      }
    };
    addEventListener('message', onMessage);
    const onMotionChange = () => applySettings({});
    reducedMotion.addEventListener('change', onMotionChange);
    applySettings({});
    themeSpotify();
    window.navidadOverlay = Object.freeze({ celebrate, onChatEvent: gameChat, setSettings: applySettings, getSettings: () => ({ ...settings }) });
    if (window.parent !== window) window.parent.postMessage({ type: 'NAVIDAD_READY', scene: mode }, location.origin);
    addEventListener('pagehide', () => {
      observer.disconnect();
      snow.stop();
      clearTimeout(celebrationTimer);
      removeEventListener('message', onMessage);
      reducedMotion.removeEventListener('change', onMotionChange);
    }, { once: true });
  }

  function createBaubles(mode) {
    const layer = document.createElement('div');
    layer.className = 'navidad-baubles';
    layer.setAttribute('aria-hidden', 'true');
    // Se reservan los márgenes: no invaden cámara, mensajes ni despedida.
    const pieces = mode === 'chat' ? [
      ['gold', 660, 57, 80], ['red', 855, 42, 94], ['green', 1040, 78, 60],
      ['red', -84, 470, 128], ['gold', 1867, 590, 114],
      ['red', 180, 1006, 58, -18, true], ['green', 251, 1018, 42, 12, true]
    ] : [
      ['gold', 1318, 94, 104], ['red', 1488, 140, 72], ['green', 1590, 202, 50],
      ['red', -85, 380, 140], ['gold', -38, 662, 74], ['green', 1404, 741, 92],
      ['red', 180, 982, 82, -16, true], ['gold', 278, 1006, 62, 20, true]
    ];
    for (const [color, x, y, size, tilt = 0, resting = false] of pieces) {
      layer.append(createBauble(color, x, y, size, tilt, resting));
    }
    return layer;
  }

  function createBauble(color, x, y, size, tilt = 0, resting = false) {
    const ball = document.createElement('div');
    ball.className = `navidad-bauble bauble-${color}${resting ? ' is-resting' : ''}`;
    for (const [name, value] of Object.entries({ x, y, size, drop: Math.max(0, y - size * .2) })) ball.style.setProperty(`--orb-${name}`, `${value}px`);
    ball.style.setProperty('--orb-tilt', `${tilt}deg`);
    ball.innerHTML = '<span class="bauble-cord"></span><span class="bauble-loop"></span><span class="bauble-shell"><span class="bauble-reflection"></span><span class="bauble-rim"></span></span><span class="bauble-cap"></span>';
    return ball;
  }

  function createTree() {
    const tree = document.createElement('button');
    tree.type = 'button';
    tree.className = 'navidad-tree';
    tree.dataset.ornaments = '0';
    tree.innerHTML = `<svg viewBox="0 0 280 360" aria-hidden="true">
      <defs><linearGradient id="pine-gradient" x1="0" y1="0" x2="1" y2=".3"><stop stop-color="#174d36"/><stop offset=".48" stop-color="#34704b"/><stop offset="1" stop-color="#0e392b"/></linearGradient></defs>
      <ellipse cx="140" cy="341" rx="122" ry="12" fill="#e5bf7215"/>
      <path d="M130 280h20v54h-20z" fill="#78512f"/>
      <path d="M140 45 79 138h27L52 215h34L19 305q121 20 242 0l-67-90h34l-54-77h27z" fill="url(#pine-gradient)" stroke="#618753" stroke-width="1.5"/>
      <path d="m87 137 53-84 53 84m-130 77 37-53m80 0 37 53M31 303l49-68m120 0 49 68" fill="none" stroke="#e4e6c5" stroke-opacity=".65" stroke-width="5" stroke-linecap="round"/>
      <path d="M94 134q45 26 91 5m-108 67q64 37 128 2M46 287q95 39 188-1" fill="none" stroke="#d4b263" stroke-width="2.5"/>
      <path class="tree-star" d="m140 3 7 14 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill="#f4d486"/>
      <g class="tree-ornaments"></g><g class="tree-lights"></g>
      <g class="tree-gift is-waiting"><rect x="31" y="314" width="52" height="33" rx="3" fill="#b83242"/><path d="M57 314v33m-26-23h52" stroke="#e5bf72" stroke-width="5"/><path d="M57 314q-25-23-20-4l20 4q25-23 20-4z" fill="none" stroke="#e5bf72" stroke-width="3"/></g>
      <g class="tree-gift is-waiting"><rect x="185" y="310" width="60" height="37" rx="3" fill="#d2ad60"/><path d="M215 310v37m-30-25h60" stroke="#963244" stroke-width="6"/></g>
      <g class="tree-gift is-waiting"><rect x="92" y="324" width="46" height="26" rx="2" fill="#235d43"/><path d="M115 324v26m-23-17h46" stroke="#e5bf72" stroke-width="4"/></g>
      </svg><span class="navidad-tree-caption">EL ÁRBOL DE LA MANADA</span>`;
    for (const [i, [x, y]] of [[110, 142], [145, 150], [177, 145], [86, 211], [122, 222], [160, 225], [195, 214], [58, 292], [97, 304], [140, 309], [182, 304], [222, 291]].entries()) {
      const light = document.createElementNS(NS, 'circle');
      light.setAttribute('cx', String(x)); light.setAttribute('cy', String(y));
      light.setAttribute('r', '3.5'); light.setAttribute('fill', i % 3 ? '#ffdb91' : '#ef6874');
      light.setAttribute('class', 'tree-light'); light.style.setProperty('--delay', `${-i * .4}s`);
      tree.querySelector('.tree-lights').append(light);
    }
    return tree;
  }

  function createSnow(canvas, mode, settings, lights) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return { restart() {}, stop() {} };
    const bulbs = [...lights.children];
    const lightClock = window.NavidadLights?.createClock();
    const flakes = Array.from({ length: 95 }, () => ({ x: Math.random() * 1920, y: Math.random() * 1080, r: .8 + Math.random() * 2.5, speed: 13 + Math.random() * 20, phase: Math.random() * 6.28 }));
    const powder = Array.from({ length: 12 }, () => ({ x: Math.random() * 1920, phase: Math.random() * 6.28 }));
    let request = 0, last = 0;
    function draw(time, still = false) {
      if (!still && last && time - last < 32) { request = requestAnimationFrame(draw); return; }
      const dt = last ? Math.min((time - last) / 1000, .08) : 0;
      last = time;
      const music = window.NavidadMusic?.sample(time) || { pulse: 0, wind: 4, speed: 1, energy: 0, source: 'idle' };
      const pulse = settings.motion && settings.lights === 'twinkle' ? music.pulse : 0;
      lights.style.setProperty('--music-pulse', (pulse * (mode === 'juego' ? .35 : 1)).toFixed(3));
      const clock = lightClock?.sample({ time, music, enabled: settings.motion && settings.lights === 'twinkle' });
      if (clock) {
        lights.dataset.clockMode = clock.mode;
        lights.dataset.clockRate = clock.rate.toFixed(3);
      }
      const sequence = window.NavidadLights?.sample({ time: clock?.time ?? time, count: bulbs.length, music, motion: settings.motion, setting: settings.lights, game: mode === 'juego' });
      if (sequence) {
        lights.dataset.pattern = sequence.pattern;
        sequence.levels.forEach((level, index) => bulbs[index].style.setProperty('--bulb-level', level.toFixed(3)));
      }
      canvas.dataset.musicSource = music.source;
      canvas.dataset.wind = music.wind.toFixed(2);
      canvas.dataset.fallSpeed = music.speed.toFixed(2);
      ctx.clearRect(0, 0, 1920, 1080);
      const count = mode === 'juego' || settings.snow === 'off' ? 0 : settings.snow === 'light' ? 34 : flakes.length;
      ctx.save();
      for (let i = 0; i < count; i++) {
        const flake = flakes[i];
        if (!still) { flake.y += flake.speed * music.speed * dt; flake.x += (music.wind + Math.sin(time / 3000 + flake.phase) * 3) * dt; }
        if (flake.y > 1085) { flake.y = -5; flake.x = Math.random() * 1920; }
        if (flake.x > 1925) flake.x = -5;
        if (flake.x < -5) flake.x = 1925;
        ctx.globalAlpha = .25 + flake.r / 7;
        ctx.fillStyle = '#fff7e5'; ctx.beginPath(); ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2); ctx.fill();
      }
      if (count) {
        // Sólo doce motas de polvo en la base: la ventisca nunca añade densidad.
        for (const mote of powder) {
          if (!still) mote.x = (mote.x + music.wind * dt * 1.4 + 1920) % 1920;
          const lift = (1 + Math.sin(time / 1700 + mote.phase)) / 2;
          ctx.globalAlpha = .12 + music.energy * .15;
          ctx.beginPath(); ctx.arc(mote.x, 1050 - lift * (5 + Math.abs(music.wind) * .6), 1.2, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
      if (settings.motion && !document.hidden) request = requestAnimationFrame(draw);
    }
    const stop = () => { cancelAnimationFrame(request); request = 0; last = 0; };
    const restart = () => { stop(); draw(performance.now(), !settings.motion); };
    const onVisibility = () => document.hidden ? stop() : restart();
    document.addEventListener('visibilitychange', onVisibility);
    return { restart, stop() { stop(); document.removeEventListener('visibilitychange', onVisibility); } };
  }

  function themeSpotify() {
    const frame = document.getElementById('spotify-controller');
    if (!frame) return;
    const apply = () => {
      try {
        if (!frame.contentDocument?.getElementById('player-card')) return;
        if (frame.contentDocument.getElementById('navidad-spotify-theme')) return;
        const css = frame.contentDocument.createElement('link');
        css.id = 'navidad-spotify-theme'; css.rel = 'stylesheet';
        css.href = new URL('spotify-navidad.css', assetDirectory).href;
        frame.contentDocument.head.append(css);
      } catch { /* El visualizador sigue funcionando si cambia a un origen externo. */ }
    };
    frame.addEventListener('load', apply);
    apply();
  }

  // Espera también cuando este script diferido se ejecuta en estado "interactive".
  // Así la vista previa no anuncia que está lista antes de cargar sus conectores.
  document.readyState === 'complete' ? init() : document.addEventListener('DOMContentLoaded', init, { once: true });
})();
