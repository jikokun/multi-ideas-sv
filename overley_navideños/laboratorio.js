(() => {
  'use strict';
  const scenes = {
    inicial: { title: 'Estamos por empezar', file: 'escena_inicial_integrada.html' },
    chat: { title: 'Modo chat', file: 'modochat_integrado.html' },
    juego: { title: 'Modo juego', file: 'modojuego_integrado.html' },
    mimir: { title: 'Modo mimir', file: 'modomimir_integrado.html' }
  };
  const form = document.getElementById('scene-settings');
  const frame = document.getElementById('scene-preview');
  const status = document.getElementById('preview-status');
  const params = new URLSearchParams(location.search);
  let selected = scenes[params.get('scene')] ? params.get('scene') : 'inicial';
  let loaded = false;
  let ready = false;
  const testButtons = ['test-chat', 'test-tree', 'reset-tree', 'test-ticker', 'test-music-slow', 'test-music-fast'].map(id => document.getElementById(id));
  function syncPreviewControls() {
    const game = selected === 'juego';
    for (const button of testButtons) {
      button.hidden = game ? ['test-chat', 'test-tree', 'reset-tree'].includes(button.id) : button.id === 'test-ticker';
      button.disabled = !ready || button.hidden;
    }
    form.elements.namedItem('tree').closest('label').hidden = game;
    document.querySelector('.preview-note').textContent = game
      ? 'Cámara en su posición original, con nieve sobre el nombre. La tira de apoyos aparece 1 minuto y se oculta 15 minutos. Sin chat ni reproductor en pantalla.'
      : 'El árbol se decora con el chat. Las ventiscas y las luces siguen la señal musical; la nieve acumulada permanece en la base. Haz clic en el árbol para alternar sus luces.';
  }
  for (const key of ['snow', 'lights', 'ip', 'port', 'minutes', 'user']) {
    if (params.has(key)) {
      const field = form.elements.namedItem(key);
      if (field.tagName !== 'SELECT' || [...field.options].some(option => option.value === params.get(key))) field.value = params.get(key);
    }
  }
  for (const key of ['tree', 'motion']) form.elements.namedItem(key).checked = params.get(key) !== 'off';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) form.elements.namedItem('motion').checked = false;
  // Conserva parámetros adicionales del usuario, sin almacenarlos ni registrarlos.
  const connection = new URLSearchParams(params);
  connection.delete('scene');
  function readConnection() {
    for (const key of ['ip', 'port', 'minutes', 'user']) connection.set(key, form.elements.namedItem(key).value.trim());
  }
  function settings() {
    return { snow: form.elements.namedItem('snow').value, lights: form.elements.namedItem('lights').value, tree: form.elements.namedItem('tree').checked, motion: form.elements.namedItem('motion').checked };
  }
  function sceneUrl(scene) {
    const url = new URL(scenes[scene].file, location.href);
    url.search = connection.toString();
    for (const [key, value] of Object.entries(settings())) url.searchParams.set(key, typeof value === 'boolean' ? value ? 'on' : 'off' : value);
    return url.href;
  }
  function syncLinks() {
    document.getElementById('obs-url').value = sceneUrl(selected);
    document.querySelectorAll('[data-open]').forEach(link => { link.href = sceneUrl(link.dataset.open); });
  }
  function send(type, extra = {}) { if (ready) frame.contentWindow.postMessage({ type, ...extra }, location.origin); }
  function loadPreview() {
    ready = false; loaded = true;
    syncPreviewControls();
    document.getElementById('preview-cover').hidden = true;
    document.getElementById('pause-preview').disabled = false;
    document.getElementById('preview-screen').classList.toggle('is-game', selected === 'juego');
    status.textContent = 'Cargando escena…';
    frame.src = sceneUrl(selected);
  }
  function selectScene(scene, load) {
    selected = scene;
    document.querySelectorAll('.scene-card').forEach(card => card.classList.toggle('selected', card.dataset.scene === scene));
    document.getElementById('preview-title').textContent = scenes[scene].title;
    syncPreviewControls();
    syncLinks();
    if (load) loadPreview();
  }
  readConnection();
  selectScene(selected, false);
  document.querySelectorAll('[data-preview]').forEach(button => button.addEventListener('click', () => {
    selectScene(button.dataset.preview, true);
    document.getElementById('preview-title').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }));
  document.getElementById('load-preview').addEventListener('click', loadPreview);
  document.getElementById('pause-preview').addEventListener('click', () => {
    loaded = false; ready = false; frame.src = 'about:blank';
    document.getElementById('preview-cover').hidden = false;
    document.getElementById('pause-preview').disabled = true;
    syncPreviewControls();
    status.textContent = 'Vista previa en pausa';
  });
  addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== 'NAVIDAD_READY' || event.data.scene !== selected || !loaded) return;
    ready = true;
    status.textContent = 'Vista previa lista';
    syncPreviewControls();
    send('NAVIDAD_SETTINGS', { settings: settings() });
  });
  for (const key of ['snow', 'lights', 'tree', 'motion']) form.elements.namedItem(key).addEventListener('change', () => {
    syncLinks(); send('NAVIDAD_SETTINGS', { settings: settings() });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    readConnection(); syncLinks();
    if (loaded) loadPreview();
    document.getElementById('feedback').textContent = 'Configuración aplicada a los enlaces de las cuatro escenas.';
  });
  document.getElementById('test-chat').addEventListener('click', () => send('NAVIDAD_TEST_CHAT'));
  document.getElementById('test-tree').addEventListener('click', () => send('NAVIDAD_TEST_TREE'));
  document.getElementById('reset-tree').addEventListener('click', () => send('NAVIDAD_RESET_TREE'));
  document.getElementById('test-ticker').addEventListener('click', () => send('NAVIDAD_TEST_TICKER'));
  for (const [id, bpm, energy] of [['test-music-slow', 76, .2], ['test-music-fast', 148, .75]]) {
    document.getElementById(id).addEventListener('click', () => {
      send('NAVIDAD_TEST_MUSIC', { bpm, energy });
      document.getElementById('feedback').textContent = 'Simulación musical durante 12 segundos, sólo en esta vista previa. Después vuelve la señal del directo.';
    });
  }
  document.getElementById('copy-url').addEventListener('click', async () => {
    const field = document.getElementById('obs-url');
    try {
      await navigator.clipboard.writeText(field.value);
      document.getElementById('feedback').textContent = 'Enlace copiado. Pégalo en la fuente Navegador de OBS.';
    } catch {
      field.focus(); field.select();
      document.getElementById('feedback').textContent = 'El enlace está seleccionado. Cópialo con Ctrl+C.';
    }
  });
})();
