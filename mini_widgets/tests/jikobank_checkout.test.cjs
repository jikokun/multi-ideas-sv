const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const bankHtml = fs.readFileSync(path.join(__dirname, '../jikobank.html'), 'utf8');
const storeHtml = fs.readFileSync(path.join(__dirname, '../tiendita.html'), 'utf8');
const bankCode = bankHtml.slice(bankHtml.indexOf('    async function procesarComando('), bankHtml.indexOf('    function conectarStreamerBot()'));

function setup(lock = null, db = null) {
  const shown = [], queued = [], released = [], timers = [];
  const sync = {
    getActiveLock: () => lock,
    isBusy: () => !!lock,
    acquire(widget, user) { lock = { widget, user }; },
    release(widget) { if (lock?.widget === widget) { released.push(widget); lock = null; } },
    enqueue(item) { queued.push(item); }
  };
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    window: { JikoWidgetSync: sync, StreamDB: db },
    norm: s => String(s || '').replace(/^@/, '').trim().toLowerCase(),
    atmVisible: false, loanEnEspera: null,
    elAtm: { classList: { contains: () => false } },
    elTerminal: { classList: { contains: () => false } },
    activarCajero: data => shown.push(data), actualizarBadgeColaVisual() {},
    mockDB: {}, DURACION_CONSULTA_MS: 7500,
    setTimeout(fn) { timers.push(fn); return timers.length; },
    fmt: String
  });
  vm.runInContext(bankCode, context);
  return { context, sync, shown, queued, released, timers };
}

function realDb(overrides = {}) {
  return {
    resolverUsuarioReal: user => user,
    solicitarPrestamo: async () => { throw new Error('Unexpected loan'); },
    obtenerDatosCajero: async user => ({ displayName: user, saldoActual: 4500, deudaTotal: 200, saldoReal: 4300 }),
    pagarPrestamo: async () => { throw new Error('No hay deuda'); },
    ...overrides
  };
}

test('!pagar del comprador no abre ni encola el cajero durante tienda, entrega y apertura', async () => {
  let payments = 0;
  for (const widget of ['tienda', 'tarjetero']) {
    const h = setup({ widget, user: 'ana' }, realDb({ pagarPrestamo: async () => { payments++; } }));
    // Dos entradas del mismo chat: Streamer.bot y Pusher/Firebase.
    for (let i = 0; i < 2; i++) await h.context.procesarComando({ comando: '!pagar', sender: '@Ana' });
    assert.equal(h.queued.length, 0);
    assert.equal(h.shown.length, 0);
    assert.equal(h.sync.getActiveLock().widget, widget);
  }
  assert.equal(payments, 0);
});

test('!comprar y !listo tampoco son comandos bancarios', async () => {
  const h = setup({ widget: 'tienda', user: 'ana' }, realDb());
  for (const comando of ['!comprar', '!listo']) await h.context.procesarComando({ comando, sender: 'ana' });
  assert.equal(h.queued.length, 0);
  assert.equal(h.shown.length, 0);
});

test('las consultas y pagos bancarios explícitos siguen esperando su turno', async () => {
  const h = setup({ widget: 'tienda', user: 'ana' }, realDb());
  for (const request of [
    { comando: '!saldo', sender: 'ana' },
    { comando: '!pagarprestamo', sender: 'ana' },
    { comando: '!pagar', sender: 'ana', params: ['100'] },
    { comando: '!pagar', sender: 'bea' }
  ]) await h.context.procesarComando(request);
  assert.equal(h.queued.length, 4);
  assert.equal(h.shown.length, 0);
});

test('!pagar fuera de la tienda sigue abonando al préstamo con datos reales', async () => {
  let payments = 0;
  const h = setup(null, realDb({
    pagarPrestamo: async () => { payments++; return { saldoRestante: 4000, deudaRestante: 100, montoPagado: 500 }; },
    getUser: async () => ({ displayName: 'Ana', jikopuntos: 4000 })
  }));
  await h.context.procesarComando({ comando: '!pagar', sender: 'ana' });
  assert.equal(payments, 1);
  assert.equal(h.shown.length, 1);
  assert.equal(h.shown[0].saldo, 4000);
  assert.equal(h.shown[0].saldoReal, 3900);
});

test('errores, datos ausentes y desconexión nunca muestran saldos de prueba en vivo', async () => {
  for (const db of [null, realDb({ obtenerDatosCajero: async () => null }), realDb({ obtenerDatosCajero: async () => { throw new Error('Sin conexión'); } })]) {
    const h = setup(null, db);
    await h.context.procesarComando({ comando: '!saldo', sender: 'ana' });
    assert.equal(h.shown.length, 0);
    assert.equal(Object.keys(h.context.mockDB).length, 0);
  }
  const h = setup(null, realDb());
  await h.context.procesarComando({ comando: '!pagar', sender: 'ana' });
  assert.equal(h.shown.length, 0);
});

test('una consulta que agota el tiempo tampoco activa el simulador', async () => {
  const h = setup(null, realDb({ obtenerDatosCajero: () => new Promise(() => {}) }));
  const pending = h.context.procesarComando({ comando: '!saldo', sender: 'ana' });
  h.timers.shift()();
  await pending;
  assert.equal(h.shown.length, 0);
});

test('una consulta fallida desde la cola libera su turno de cajero', async () => {
  const h = setup({ widget: 'cajero', user: 'ana' }, realDb({ obtenerDatosCajero: async () => null }));
  await h.context.procesarComando({ comando: '!saldo', sender: 'ana', fromQueue: true });
  assert.equal(h.shown.length, 0);
  assert.deepEqual(h.released, ['cajero']);
});

test('las consultas válidas muestran Firebase y el simulador explícito no modifica Firebase', async () => {
  let reads = 0;
  const h = setup(null, realDb({ obtenerDatosCajero: async user => { reads++; return { displayName: user, saldoActual: 4500, deudaTotal: 0, saldoReal: 4500 }; } }));
  await h.context.procesarComando({ comando: '!saldo', sender: 'ana' });
  assert.equal(h.shown[0].saldo, 4500);
  const start = bankHtml.indexOf('    window.simularComando = function(');
  vm.runInContext(bankHtml.slice(start, bankHtml.indexOf('    window.simularComandoConDeuda', start)), h.context);
  await h.context.window.simularComando('!saldo', 'demo');
  assert.equal(reads, 1);
  assert.equal(h.shown[1].saldo, 1200);
});

test('la compra de sobres conserva el turno al cerrar la tienda y excluye !pagar tardíos', async () => {
  const h = setup({ widget: 'tienda', user: 'ana' }, realDb());
  let purchases = 0, closed = 0;
  Object.assign(h.context, {
    isPreview: false, usuarioActual: 'Ana', ordenActual: [{ key: 'sobre' }],
    btnPagar: {}, $confirmBox: { setAttribute() {}, removeAttribute() {} },
    cdRaf: null, cancelAnimationFrame() {}, animarPuntos() {}, playSfx() {}, toast() {},
    document: { getElementById: () => ({}) },
    $menu: { classList: { contains: () => closed === 0 } },
    ocultarMenu() { closed++; h.sync.release('tienda'); }, reanudarCd() {}
  });
  h.context.parent = h.context.window;
  h.context.window.JikoTcgCloud = {
    ready: true, id: () => 'compra_ana',
    async purchase(user) {
      purchases++;
      assert.equal(user, 'Ana');
      await h.context.procesarComando({ comando: '!pagar', sender: 'ana' });
      return { user: 'ana', nuevoSaldo: 4500, costoTotal: 1500, packs: [[1, 2, 3]] };
    }
  };
  const start = storeHtml.indexOf('  let pagoTcgPendiente = false;');
  const end = storeHtml.indexOf('  function parsearItemYCantidad', start);
  vm.runInContext(storeHtml.slice(start, end), h.context);
  await h.context.procesarPagoOrden();
  assert.equal(purchases, 1);
  assert.equal(closed, 1);
  assert.deepEqual(h.sync.getActiveLock(), { widget: 'tarjetero', user: 'ana' });
  assert.deepEqual(h.released, []);
  await h.context.procesarComando({ comando: '!pagar', sender: 'ana' });
  assert.equal(h.queued.length, 0);
  assert.equal(h.shown.length, 0);
});
