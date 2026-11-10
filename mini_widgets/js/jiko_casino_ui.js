(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const demo = params.has('preview') || params.has('test') || params.get('demo') === '1';
  const names = ['ruleta', 'tragamonedas'];
  const $ = id => document.getElementById(id);
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^@/, '').trim().toLowerCase();
  const defaults = {
    theme: 'vegas', inactivity: 30, always: false, scale: 0.9, sound: true, volume: 0.75,
    host: '127.0.0.1', port: 4445, rouletteDuration: 4.8, rouletteReturn: 3.5,
    rouletteTable: false, slotDuration: 8, slotTable: false, slotTitle: 'CASINO DE JIKO',
    weights: { lose: 62, small: 23, medium: 11, big: 4, full: 2 }
  };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('jiko_casino_config_v1') || '{}') || {}; } catch (_) {}
  const config = { ...defaults, ...saved, weights: { ...defaults.weights, ...saved.weights } };
  if (params.has('always_visible') || params.has('visible')) config.always = true;
  if (params.get('mode') === 'auto') config.always = false;
  config.host = params.get('host') || config.host;
  config.port = Number(params.get('port') || params.get('wsport') || params.get('sbport')) || config.port;
  const urlInactivity = Number(params.get('inactividad') || params.get('timeout'));
  if (urlInactivity >= 5 && urlInactivity <= 300) config.inactivity = urlInactivity;
  let backingDB;
  let calculateLevel = () => ({ rangoTitulo: 'Cachorro', insigniaEmoji: '🐾', nivel: 1 });
  let readyGames;
  const gamesReady = new Promise(resolve => { readyGames = resolve; });
  const writes = new Map();
  const demoUsers = new Map();
  let controller;
  let socket;
  let reconnectTimer;
  let socketGeneration = 0;
  let portIndex = 0;
  let databaseOnline = demo;

  function status(text) { $('casino-status').textContent = text; }
  function report(error) {
    console.error('[Casino]', error);
    status('Error de conexión: ' + (error.message || error));
  }
  function demoUser(user) {
    const key = norm(user);
    if (!demoUsers.has(key)) demoUsers.set(key, {
      displayName: key, jikopuntos: key === 'jikokun' ? 99999 : 1500,
      avatar: new URL('../imagenes/iconos_generales/multiideassv_ico.webp', location.href).href
    });
    return demoUsers.get(key);
  }
  const dbReady = (async () => {
    if (demo) {
      backingDB = {
        getUser: async user => ({ ...demoUser(user) }),
        addJikopuntos: async (user, amount) => {
          const account = demoUser(user);
          if (account.jikopuntos + amount < 0) throw new Error('Saldo insuficiente');
          account.jikopuntos += amount;
          return account.jikopuntos;
        },
        actualizarUsuario: async () => {}
      };
      status('SIMULACIÓN · puntos de prueba');
      return;
    }
    const mod = await import('./stream_firebase.js');
    backingDB = mod.StreamDB;
    calculateLevel = mod.calcularNivelUsuario || calculateLevel;
    await backingDB.init();
    databaseOnline = true;
    window.StreamDB = backingDB;
    status('Jikopuntos conectado · esperando chat');
    backingDB.onKickChatMessage(message => {
      if (message && message.mensaje) controller.command(message.mensaje, message.usuario, 'kick-cloud', message.id || message.message_id);
    });
    backingDB.startKickStreamMonitor();
  })();
  dbReady.catch(report);

  const database = {
    async getUser(user) {
      await dbReady;
      await writes.get(norm(user));
      return backingDB.getUser(user, true);
    },
    addJikopuntos(user, amount, reason) {
      const key = norm(user);
      const task = Promise.resolve(writes.get(key)).catch(() => {}).then(async () => {
        await dbReady;
        return backingDB.addJikopuntos(key, amount, reason);
      });
      writes.set(key, task);
      task.catch(report).finally(() => { if (writes.get(key) === task) writes.delete(key); });
      return task;
    },
    async actualizarUsuario(user, fields) { await dbReady; return backingDB.actualizarUsuario(user, fields); }
  };

  // Preview sessions have an isolated quota and never take the live ecosystem lock.
  const demoQuota = new Map();
  const sync = demo ? null : window.JikoWidgetSync;
  controller = new window.CasinoController({
    sync, ready: Promise.all([gamesReady, dbReady]), onChange: render, onError: report
  });
  function consumeSpin(user) {
    if (!demo) return window.JikoWidgetSync.consumeCasinoSpin(user);
    const now = Date.now();
    const history = (demoQuota.get(norm(user)) || []).filter(time => now - time < 900000);
    if (history.length >= 20) return { allowed: false };
    history.push(now);
    demoQuota.set(norm(user), history);
    return { allowed: true };
  }

  window.JikoCasino = {
    controller, database, config, demo,
    level: user => calculateLevel(user),
    command: (text, user, source, id) => controller.command(text, user, source, id),
    resumeSpin(name, options) {
      // The incoming chat command was already deduplicated before entering the spin buffer.
      return controller.serialize(async () => {
        const user = norm(options.sender);
        if (controller.context.get(user) !== name || controller.games.get(name)?.owner !== user) return;
        await controller.route('!girar' + (options.params?.length ? ' ' + options.params.join(' ') : ''), user);
      });
    },
    openSettings,
    createSync(name) {
      return {
        isBusy: (_, user) => controller.isBusy(name, user),
        acquire: (_, user) => controller.acquire(name, user),
        release: () => controller.release(name),
        enqueue: item => controller.enqueue(name, item.sender, (item.command || (name === 'ruleta' ? '!ruleta' : '!slot')) + (item.params?.length ? ' ' + item.params.join(' ') : '')),
        getQueue: () => controller.snapshot().flatMap(game => game.queue),
        onQueueChange: callback => controller.queueListeners.add(callback),
        onExecute: () => {},
        consumeCasinoSpin: consumeSpin
      };
    },
    register(name, adapter) {
      const close = adapter.close;
      adapter.close = async () => {
        const user = controller.games.get(name)?.owner;
        close();
        await writes.get(user);
      };
      controller.register(name, adapter);
      prepareGame(name, adapter);
      applyConfig();
      if (controller.games.size === 2) readyGames();
    }
  };

  function prepareGame(name, adapter) {
    const doc = adapter.win.document;
    const style = doc.createElement('style');
    style.textContent = `
      #settings-modal, #settings-backdrop, #test-dock, #ruleta-queue-pill,
      .resize-corner, .resize-handle, #btn-quick-refill { display: none !important; }
      #roulette-widget, #slot-wrapper { transform-origin: top left !important; }
      #roulette-widget.is-visible, #slot-wrapper.is-visible { transform: scale(var(--casino-scale, .9)) !important; }
      #roulette-widget.is-hidden, #slot-wrapper.is-hidden { transform: translateY(40px) scale(var(--casino-scale, .9)) !important; }
      #roulette-widget:not(.is-visible), #slot-wrapper:not(.is-visible) { pointer-events: none !important; }
    `;
    doc.head.appendChild(style);
    adapter.table.classList.add('hidden');
    adapter.table.style.display = 'none';
    const routeSpin = () => {
      const user = controller.games.get(name)?.owner;
      if (user) controller.command(name === 'tragamonedas' ? '!girar ' + adapter.state.bet : '!girar', user);
    };
    doc.addEventListener('click', event => {
      if (event.target.closest('#btn-open-settings, .gear-quick-btn')) {
        event.stopImmediatePropagation(); openSettings();
      } else if (event.target.closest('#btn-spin, #spin-main-btn')) {
        event.stopImmediatePropagation(); routeSpin();
      } else if (event.target.closest('.bet-zone, .num-cell') && !controller.games.get(name)?.owner) {
        event.stopImmediatePropagation();
      } else if (event.target.closest('#btn-toggle-sound')) {
        event.stopImmediatePropagation(); config.sound = !config.sound; saveConfig();
      } else if (!event.target.closest('#roulette-widget, #slot-wrapper, #paytable-floating, #payout-board-wrapper')) {
        event.stopImmediatePropagation(); $('casino-dock').hidden = !$('casino-dock').hidden;
      }
    }, true);
    doc.addEventListener('mousedown', event => {
      // Position and scale are managed together so game panels cannot overlap.
      if (!event.target.closest('button, input, .bet-zone, .num-cell, .casino-chip, .exact-header')) event.stopImmediatePropagation();
    }, true);
    doc.addEventListener('dblclick', event => {
      event.stopImmediatePropagation();
      if (!event.target.closest('#roulette-widget, #slot-wrapper, #paytable-floating, #payout-board-wrapper')) openSettings();
    }, true);
    doc.addEventListener('keydown', event => {
      if (event.target.closest('input, textarea, select')) return;
      event.stopImmediatePropagation();
      if (event.code === 'Space') { event.preventDefault(); routeSpin(); }
      else handleKey(event);
    }, true);
    adapter.state.autoRefill = false;
    adapter.state.autoSpin = false;
    // Child postMessage handlers remain available for the standalone widgets only.
    adapter.win.addEventListener('message', event => event.stopImmediatePropagation(), true);
  }

  function applyConfig() {
    for (const [name, { adapter }] of controller.games) {
      const state = adapter.state;
      state.tiempoInactividad = Number(config.inactivity);
      adapter.sound(config.sound, Number(config.volume));
      // Fixed display does not keep a player's turn alive after inactivity.
      state.alwaysVisible = false;
      if (name === 'ruleta') {
        adapter.root.dataset.theme = config.theme;
        state.spinDuration = Number(config.rouletteDuration);
        state.returnDelay = Number(config.rouletteReturn);
        state.autoShowPaytable = config.rouletteTable;
      } else {
        const doc = adapter.win.document;
        for (const id of ['slot-cabinet', 'payout-floating-card']) {
          const el = doc.getElementById(id);
          el.classList.remove('theme-vegas', 'theme-cyber', 'theme-glass', 'theme-crimson');
          el.classList.add('theme-' + config.theme);
        }
        doc.getElementById('ui-machine-title').textContent = config.slotTitle;
        state.tiempoAparicion = Number(config.slotDuration);
        state.weights = { ...config.weights };
        state.boardAutoShowOnSpin = config.slotTable;
      }
    }
    render(controller.snapshot());
  }

  function render(games) {
    const active = games.filter(game => game.owner).sort((a, b) => a.order - b.order);
    for (const game of games) {
      const adapter = controller.games.get(game.name).adapter;
      const pane = $('pane-' + game.name);
      const index = active.findIndex(item => item.name === game.name);
      // If fixed display has no active sessions, ruleta is right and slots left.
      const right = index >= 0 ? index === 0 : active.length ? false : game.name === 'ruleta';
      pane.style.left = (right ? 960 : 0) + 'px';
      const visible = !!game.owner || config.always || game.visible;
      pane.dataset.visible = String(visible);
      const scale = Math.min(1, Math.max(0.55, Number(config.scale) || 0.9));
      const root = adapter.root;
      const width = game.name === 'ruleta' ? 560 : 470;
      const height = root.offsetHeight || (game.name === 'ruleta' ? 665 : 750);
      const x = right ? 960 - 32 - width * scale : 32;
      const y = Math.max(24, 1080 - 32 - height * scale);
      root.style.setProperty('--casino-scale', scale);
      root.style.left = x + 'px';
      root.style.top = y + 'px';
      if (config.always && !game.owner && !game.visible) {
        // Visual preview only; never call show(), which cancels the inactivity timer.
        root.classList.add('is-visible'); root.classList.remove('is-hidden'); root.style.display = 'block';
      } else if (!game.owner && !game.visible && !config.always) {
        root.classList.remove('is-visible'); root.classList.add('is-hidden');
      }
      const table = adapter.table;
      table.style.left = (right ? Math.max(16, x - table.offsetWidth * 0.72 - 22) : x + width * scale + 22) + 'px';
      table.style.top = Math.max(24, y + 30) + 'px';
      table.style.transformOrigin = 'top left';
      table.style.transform = 'scale(.72)';
      if (!game.owner && !config.always) table.style.display = 'none';
      else table.style.removeProperty('display');
      const queue = $('queue-' + game.name);
      queue.hidden = !game.queue.length;
      queue.style.top = Math.max(16, y - 52) + 'px';
      queue.style.left = right ? 'auto' : '32px';
      queue.style.right = right ? '32px' : 'auto';
      queue.textContent = (game.name === 'ruleta' ? '🎡 Ruleta' : '🎰 Slot') + ' · En espera: ' + game.queue.map(item => '@' + item.sender).join(' · ');
    }
    $('turn-status').textContent = games.map(game => (game.name === 'ruleta' ? 'Ruleta: ' : 'Tragamonedas: ') + (game.owner ? '@' + game.owner + (game.spinning ? ' · girando' : '') : 'disponible') + (game.queue.length ? ' · ' + game.queue.length + ' en cola' : '')).join('\n');
  }

  function saveConfig() {
    localStorage.setItem('jiko_casino_config_v1', JSON.stringify(config));
    applyConfig();
    fillControls();
  }
  function fillControls() {
    for (const el of document.querySelectorAll('[data-config]')) {
      const value = config[el.dataset.config];
      if (el.type === 'checkbox') el.checked = !!value;
      else el.value = String(value);
    }
    for (const el of document.querySelectorAll('[data-weight]')) el.value = config.weights[el.dataset.weight];
  }
  function openSettings() { if (!$('casino-settings').open) $('casino-settings').showModal(); }
  function handleKey(event) {
    if (event.target.closest?.('input, textarea, select')) return;
    if (/^[cs]$/i.test(event.key)) openSettings();
    if (/^t$/i.test(event.key)) $('casino-dock').hidden = !$('casino-dock').hidden;
    if (event.key === 'Escape') $('casino-settings').close();
  }

  function parseStreamerBot(message) {
    const event = message.event || {};
    const type = String((typeof event === 'string' ? event : event.type || event.name) || message.method || message.type || '').toLowerCase();
    const raw = message.data || message.body || message;
    const data = raw.data || raw;
    const messageObj = data.message && typeof data.message === 'object' ? data.message : {};
    let sender = data.user || data.sender || messageObj.user || messageObj.sender || data.userName || data.username;
    let text = data.messageText || (typeof data.message === 'string' ? data.message : '') || data.text || data.content || messageObj.message || messageObj.text || messageObj.content;
    let source = 'streamerbot';
    if (type === 'custom') { text = data.command || data.action || data.cmd || (typeof data === 'string' ? data : ''); source += '-custom'; }
    if (type.includes('triggered')) {
      text = typeof data.command === 'string' ? data.command : data.command?.name || data.commandName;
      if (text && !text.startsWith('!')) text = '!' + text;
      const args = data.input0 || data.rawInput || data.arguments;
      if (typeof args === 'string' && args.trim()) text += ' ' + args.trim();
      source += '-command';
    }
    const login = norm(typeof sender === 'object' && sender ? sender.username || sender.login || sender.userName || sender.user_name || sender.name || sender.displayName : sender);
    if (['botrix', 'lobito_mensajero', 'kickbot', 'nightbot', 'streamelements', 'streamlabs', 'jikobot', 'creepingbot', 'wizebot'].includes(login)) return;
    if (typeof text === 'string') return controller.command(text, sender, source, messageObj.id || messageObj.messageId || data.messageId || data.id);
  }
  window.JikoCasino.handleStreamerBotMessage = parseStreamerBot;

  function connectStreamerBot() {
    if (demo) return;
    const generation = ++socketGeneration;
    clearTimeout(reconnectTimer);
    if (socket) { socket.onclose = null; socket.close(); }
    const ports = [...new Set([Number(config.port), 4445, 8080, 7474, 4455])];
    const port = ports[portIndex % ports.length];
    const retry = () => {
      if (generation !== socketGeneration) return;
      portIndex++;
      status((databaseOnline ? 'JP conectado · ' : '') + 'Buscando Streamer.bot…');
      reconnectTimer = setTimeout(connectStreamerBot, 2500);
    };
    try {
      socket = new WebSocket('ws://' + config.host + ':' + port + '/');
      socket.onopen = () => {
        if (generation !== socketGeneration) return;
        status('Streamer.bot :' + port + (databaseOnline ? ' · JP conectado' : ' · conectando JP'));
        socket.send(JSON.stringify({ request: 'Subscribe', id: 'jiko-casino-sub', events: {
          General: ['Custom'], Command: ['Triggered'], Kick: ['ChatMessage', 'Message'], Twitch: ['ChatMessage'], YouTube: ['Message']
        } }));
      };
      socket.onmessage = event => { try { parseStreamerBot(JSON.parse(event.data)); } catch (error) { report(error); } };
      socket.onerror = () => {};
      socket.onclose = retry;
    } catch (_) { retry(); }
  }

  document.addEventListener('keydown', handleKey);
  document.addEventListener('dblclick', event => { if (event.target === document.body || event.target === $('casino-stage')) openSettings(); });
  document.addEventListener('click', event => {
    if (event.target === document.body || event.target === $('casino-stage')) $('casino-dock').hidden = !$('casino-dock').hidden;
  });
  $('open-settings').onclick = openSettings;
  $('close-settings').onclick = () => $('casino-settings').close();
  $('hide-dock').onclick = () => { $('casino-dock').hidden = true; };
  $('casino-settings').addEventListener('click', event => { if (event.target === $('casino-settings')) $('casino-settings').close(); });
  for (const button of document.querySelectorAll('[data-tab]')) button.onclick = () => {
    for (const tab of document.querySelectorAll('[data-tab]')) tab.classList.toggle('active', tab === button);
    for (const panel of document.querySelectorAll('[data-panel]')) panel.hidden = panel.dataset.panel !== button.dataset.tab;
  };
  for (const el of document.querySelectorAll('[data-config], [data-weight]')) el.addEventListener('change', () => {
    if (el.type === 'number' || el.type === 'range') {
      if (!el.checkValidity() || !Number.isFinite(Number(el.value))) { fillControls(); return; }
    }
    if (el.dataset.weight) config.weights[el.dataset.weight] = Number(el.value);
    else {
      let value = el.type === 'checkbox' ? el.checked : el.type === 'number' || el.type === 'range' ? Number(el.value) : el.value;
      if (el.dataset.config === 'always') value = el.value === 'true';
      config[el.dataset.config] = value;
    }
    saveConfig();
  });
  for (const button of document.querySelectorAll('[data-close-game]')) button.onclick = () => controller.serialize(() => controller.close(button.dataset.closeGame));
  $('reconnect').onclick = () => { portIndex = 0; connectStreamerBot(); };
  $('copy-casino-url').onclick = async () => {
    const url = new URL(location.href);
    url.search = ''; url.hash = '';
    url.searchParams.set('overlay', 'true');
    url.searchParams.set('host', config.host);
    url.searchParams.set('port', config.port);
    url.searchParams.set('inactividad', config.inactivity);
    if (config.always) url.searchParams.set('always_visible', '1');
    else url.searchParams.set('mode', 'auto');
    try {
      await navigator.clipboard.writeText(url.href);
      $('copy-casino-url').textContent = '✓ Enlace copiado';
      setTimeout(() => { $('copy-casino-url').textContent = 'Copiar enlace único para OBS'; }, 2000);
    } catch (error) { report(error); }
  };
  const sendTest = text => controller.command(text, $('test-user').value || 'espectador_demo', 'simulator');
  $('send-command').onclick = () => sendTest($('test-command').value);
  $('test-command').onkeydown = event => { if (event.key === 'Enter') sendTest(event.target.value); };
  for (const button of document.querySelectorAll('[data-command]')) button.onclick = () => sendTest(button.dataset.command);
  $('demo-both').hidden = !demo;
  $('demo-both').onclick = async () => {
    await controller.command('!ruleta', 'espectador_demo', 'simulator');
    await controller.command('!slot', 'lobito', 'simulator');
  };
  $('test-mode-description').textContent = demo
    ? 'Simulación aislada: las apuestas usan puntos de prueba. Puedes probar ambos juegos y sus colas.'
    : 'Estos controles usan los jikopuntos del usuario indicado. Para ensayar sin afectar saldos, abre casino.html?preview=true.';
  window.despacharTextoChat = (user, text, source, id) => controller.command(text, user, source, id);
  window.ejecutarComandoCasino = (text, user) => controller.command(text, user);
  window.abrirConfiguracion = openSettings;
  window.addEventListener('message', event => {
    if (event.source !== parent || event.origin !== location.origin) return;
    const data = event.data || {};
    if (data.type === 'COMMAND') controller.command(data.command, data.sender || 'espectador_demo', 'laboratorio', data.id);
    if (data.type === 'SETTINGS') openSettings();
    if (data.type === 'HIDE') controller.serialize(async () => {
      config.always = false; saveConfig();
      for (const name of names) await controller.close(name);
    });
    if (data.type === 'TOGGLE_VIS') { config.always = !config.always; saveConfig(); }
    if (data.type === 'DEMO_BOTH' && demo) $('demo-both').click();
  });

  function resize() {
    const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
    $('casino-stage').style.transform = 'scale(' + scale + ')';
    $('casino-stage').style.left = (innerWidth - 1920 * scale) / 2 + 'px';
    $('casino-stage').style.top = (innerHeight - 1080 * scale) / 2 + 'px';
    render(controller.snapshot());
  }
  window.addEventListener('resize', resize);
  fillControls();
  resize();
  for (const name of names) $('game-' + name).src = './' + name + '.html?embedded=casino';
  gamesReady.then(() => { applyConfig(); resize(); });
  let ticking = false;
  setInterval(() => {
    if (ticking || !databaseOnline || controller.games.size !== 2) return;
    ticking = true;
    controller.tick().finally(() => { ticking = false; });
  }, 400);
  if (demo) $('casino-dock').hidden = false;
  connectStreamerBot();
})();
