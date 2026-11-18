const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('las suscripciones se cierran al salir y se recuperan una sola vez desde la caché de navegación', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../firebase-config.js'), 'utf8');
  const start = source.indexOf('export function subscribeWhilePageOpen');
  const end = source.indexOf('// Exportar módulos', start);
  const window = new EventTarget();
  const subscribeWhilePageOpen = vm.runInNewContext(source.slice(start, end).replace('export ', '') + '\nsubscribeWhilePageOpen;', { window });
  let opened = 0;
  let closed = 0;
  const dispose = subscribeWhilePageOpen(() => { opened++; return () => { closed++; }; });
  const restore = () => window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));

  window.dispatchEvent(new Event('pagehide'));
  assert.deepEqual([opened, closed], [1, 1]);
  restore();
  restore();
  assert.deepEqual([opened, closed], [2, 1]);
  dispose();
  restore();
  assert.deepEqual([opened, closed], [2, 2]);
});

function element() {
  const el = { className: '', dataset: {}, style: {}, textContent: '', replaceChildren() {}, removeAttribute() {}, appendChild() {} };
  el.classList = {
    contains: c => el.className.split(/\s+/).includes(c),
    add: (...cs) => { el.className = [...new Set([...el.className.split(/\s+/), ...cs])].join(' '); },
    remove: (...cs) => { el.className = el.className.split(/\s+/).filter(c => !cs.includes(c)).join(' '); }
  };
  return el;
}

for (const integrated of [false, true]) {
  test(`${integrated ? 'tiendita' : 'perfil'}: actualizaciones no repiten entrada ni aplazan la cola`, async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', integrated ? 'tiendita.html' : 'widget_perfil.html'), 'utf8');
    const start = html.indexOf('  const perfilImagePreloadCache');
    const end = html.indexOf(integrated ? '  window.mostrarCardPerfilTiendita =' : '  /* ═══════════ WEBSOCKET', start);
    const nodes = new Map();
    const get = id => { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); };
    const root = get(integrated ? 'perfil-card-wrap' : 'card-root');
    const timers = new Map();
    const watchedProfiles = new Set();
    const queued = [];
    let now = 0, id = 0, locks = 0, releases = 0;
    const data = u => ({ ...u, displayName: u.displayName || u.username, avatar: '', nivel: 1, pts: 100, asistencias: 0, xpTotal: 1, xpEnNivel: 1, xpParaSubir: 100, xpPct: 1, rangoTitulo: 'Cachorro', roleTag: 'SEGUIDOR', consumerTitle: '', consumerBadge: '', earnedTitles: [], themeClass: 'theme-silver', themeLabel: '', useTestDesign: true });
    const context = vm.createContext({
      console, Map, Promise, isAdminPreview: false, cardHideTimer: null, cardPerfilTimer: null,
      DURATION_SEC: 12, PERFIL_DURATION_SEC: 10, $cardPerfil: root, $menu: element(),
      document: { getElementById: get, createElement: element },
      window: {
        JikoWidgetSync: { acquire() { locks++; }, release() { releases++; }, enqueue(item) { queued.push(item); } },
        StreamDB: { async getUser(username) { return { username }; } },
        escucharUsuarioStream(username) {
          watchedProfiles.add(username);
          return () => watchedProfiles.delete(username);
        }
      },
      setTimeout(fn, ms) { timers.set(++id, { fn, at: now + ms }); return id; },
      clearTimeout(key) { timers.delete(key); },
      norm: s => String(s).toLowerCase(), normalizarAvatarKickUrlLocal: s => s,
      avatarMemCache: {}, avatarCache: {}, calcularDatosTarjeta: data, calcularDatosPerfilTiendita: data,
      obtenerAvatarKick: async () => null, obtenerAvatarDeKick: async () => null,
      playSciFiSound() {}, playSciFiPerfilSound() {}, initAudio() {}
    });
    vm.runInContext(html.slice(start, end) + `\nglobalThis.show = ${integrated ? 'mostrarCardPerfilTiendita' : 'mostrarTarjetaPerfil'}; globalThis.hide = ${integrated ? 'ocultarCardPerfilTiendita' : 'ocultarTarjetaPerfil'};`, context);
    async function advance(ms) {
      const until = now + ms;
      while (true) {
        const next = [...timers].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at; timers.delete(next[0]); next[1].fn(); await Promise.resolve();
      }
      now = until;
    }
    const alice = { username: 'alice', displayName: 'Alice Visible' };
    await context.show(alice);
    assert.equal(root.dataset.username, 'alice');
    assert.equal(watchedProfiles.size, 0);
    const initialLocks = locks;
    const initialTimer = [...timers.keys()];
    await context.show({ username: 'bob' });
    assert.equal(queued[0].target, 'bob');
    for (let i = 0; i < 4; i++) {
      await advance(1000);
      await context.show(alice, { isLiveUpdate: true, silent: true });
      assert.ok(root.classList.contains('visible'));
      assert.equal(locks, initialLocks);
      assert.deepEqual([...timers.keys()], initialTimer);
    }
    await advance((integrated ? 10000 : 12000) - now);
    assert.ok(root.classList.contains('saliendo'));
    await context.show(alice, { isLiveUpdate: true });
    context.hide(); // Una segunda salida no crea otro callback.
    assert.equal(timers.size, 1);
    await advance(750);
    assert.equal(root.style.display, 'none');
    assert.equal(releases, 1);
    await context.show(alice, { isLiveUpdate: true });
    assert.equal(root.style.display, 'none');
    await context.show(queued.shift().target);
    assert.equal(root.dataset.username, 'bob');
    assert.deepEqual([...watchedProfiles], ['bob']);
    await advance(1000);
    assert.ok(root.classList.contains('visible'));
    assert.equal(releases, 1);
    // Una precarga iniciada en vivo no puede resucitar la tarjeta después de salir.
    let finishPreload;
    context.pendingPreload = new Promise(resolve => { finishPreload = resolve; });
    vm.runInContext('precargarImagenPerfil = () => pendingPreload;', context);
    const pendingUpdate = context.show({ username: 'bob', fondoTarjetaUrl: 'art.png' }, { isLiveUpdate: true });
    context.hide();
    assert.equal(watchedProfiles.size, 0);
    await advance(750);
    finishPreload('art.png');
    await pendingUpdate;
    assert.equal(root.style.display, 'none');
    assert.equal(root.classList.contains('visible'), false);
    assert.equal(releases, 2);
  });
}

test('la cola conserva el destinatario y la metadata de !perfil', () => {
  const storage = new Map();
  const context = vm.createContext({ console: { log() {}, warn() {} }, setTimeout() {}, clearTimeout() {},
    localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/jiko_widget_sync.js'), 'utf8'), context);
  const sync = context.JikoWidgetSync;
  sync.enqueue({ widget: 'perfil', sender: 'alice', target: 'bob', command: '!perfil', meta: { esVip: true } });
  sync.enqueue({ widget: 'perfil', sender: 'alice', target: 'bob', command: '!perfil' });
  assert.equal(sync.getQueue().length, 1);
  const item = sync.getQueue()[0];
  assert.equal(item.target, 'bob');
  assert.equal(item.meta.esVip, true);
});
