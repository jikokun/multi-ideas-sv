const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Points = require('../js/jiko_points_engine.js');
const RewardQueue = require('../js/jiko_reward_queue.js');

const copy = value => value === undefined ? null : structuredClone(value);
function database(users = {}) {
  let data = { stream: { usuarios: copy(users), banco: { prestamos: {} }, transmisiones_stats: { isLive: true, streamActivoId: 'live_1' }, transmisiones: { live_1: {} } } };
  let tail = Promise.resolve(), sequence = 0;
  const db = { now: 1000000, fail: null, reads: [], subscriptions: [], transactions: [] };
  db.read = location => copy(location.split('/').filter(Boolean).reduce((value, key) => value?.[key], data));
  db.write = (location, value) => {
    const keys = location.split('/').filter(Boolean);
    let parent = data;
    for (const key of keys.slice(0, -1)) parent = parent[key] ||= {};
    parent[keys.at(-1)] = copy(value);
  };
  db.snapshot = (value, key = null) => ({ val: () => copy(value), exists: () => value !== null && value !== undefined,
    key, size: Object.keys(value || {}).length,
    forEach(fn) { for (const [child, item] of Object.entries(value || {})) fn(db.snapshot(item, child)); } });
  const readQuery = location => {
    if (typeof location === 'string') return db.read(location);
    let rows = Object.entries(db.read(location.path) || {});
    const value = ([key, item]) => location.field ? item[location.field] : key;
    rows.sort((a, b) => value(a) < value(b) ? -1 : Number(value(a) > value(b)));
    if (location.from !== undefined) rows = rows.filter(row => value(row) >= location.from);
    if (location.to !== undefined) rows = rows.filter(row => value(row) <= location.to);
    if (location.equal !== undefined) rows = rows.filter(row => value(row) === location.equal);
    if (location.first) rows = rows.slice(0, location.first);
    if (location.last) rows = rows.slice(-location.last);
    return Object.fromEntries(rows);
  };
  db.api = {
    ref: (_, location = '') => location,
    query: (path, ...constraints) => Object.assign({ path }, ...constraints),
    orderByChild: field => ({ field }),
    orderByKey: () => ({}),
    startAt: from => ({ from }),
    endAt: to => ({ to }),
    equalTo: equal => ({ equal }),
    limitToFirst: first => ({ first }),
    limitToLast: last => ({ last }),
    push: location => ({ key: 'op_' + ++sequence, location }),
    get: async location => {
      db.reads.push(location);
      return db.snapshot(readQuery(location));
    },
    onValue(location, callback) {
      const subscription = { location, closed: false };
      db.subscriptions.push(subscription);
      callback(db.snapshot(readQuery(location)));
      return () => { subscription.closed = true; };
    },
    set: async (location, value) => db.write(location, value),
    update: async (location, fields) => {
      for (const [field, value] of Object.entries(fields)) db.write([location, field].filter(Boolean).join('/'), value);
    },
    runTransaction(location, callback) {
      db.transactions.push(location);
      const task = tail.then(() => {
        if (db.fail?.(location)) throw new Error('Fallo de conexión simulado');
        // Firebase puede ejecutar el callback varias veces; solo persiste el último intento.
        callback(db.read(location));
        const next = callback(db.read(location));
        if (next === undefined) return { committed: false, snapshot: db.snapshot(db.read(location)) };
        db.write(location, next);
        return { committed: true, snapshot: db.snapshot(next) };
      });
      tail = task.catch(() => {});
      return task;
    }
  };
  return db;
}

function service(db, file, realInit = false) {
  const storage = new Map();
  const source = fs.readFileSync(path.join(__dirname, '../../', file), 'utf8')
    .replace(/^import\s[\s\S]*?;\s*/gm, '')
    .replace(/^export default .*;\s*/gm, '')
    .replace(/^export /gm, '');
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [db.now])); }
    static now() { return db.now; }
  }
  const context = vm.createContext({ ...db.api, rtdb: {}, auth: { currentUser: {} }, Date: Clock, JikoPointsEngine: Points,
    console: { log() {}, warn() {}, error() {} },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key), key: index => [...storage.keys()][index], get length() { return storage.size; } }
  });
  vm.runInContext(source + '\nglobalThis.service = StreamDB;', context);
  const instance = context.service;
  if (!realInit) instance.init = async () => true;
  instance.absorberAvatarKick = async () => null;
  return { instance, storage };
}

const profile = points => ({ username: 'test', displayName: 'Test', jikopuntos: points, experiencia: 0, nivel: 1, deudaTotal: 0, totalGanado: points, totalGastado: 0 });
const files = ['stream_firebase.js', 'mini_widgets/js/stream_firebase.js'];

function localRewardStore() {
  const storage = new Map();
  const queue = new RewardQueue({
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
    key: index => [...storage.keys()][index],
    get length() { return storage.size; }
  });
  queue.streamId = 'live_1';
  return queue;
}

test('OBS guarda asistencia y actividad sin red y agrupa el cobro en una transacción por perfil', async () => {
  const db = database({ ana: { ...profile(1000), username: 'ana' } });
  const { instance } = service(db, files[1]);
  const { instance: other } = service(db, files[1]);
  instance.localRewards = other.localRewards = localRewardStore();
  const notices = [];
  instance.onLocalAttendanceConfirmed(record => notices.push(record));
  await instance.registrarInteraccionStream({ usuario: 'ana' });
  assert.equal((await instance.registrarAsistencia({ usuario: 'ana', diferir: true })).pendiente, true);
  await other.registrarAsistencia({ usuario: 'ana', diferir: true });
  db.now += 30000;
  assert.equal(await other.registrarInteraccionStream({ usuario: 'ana' }), null);
  db.now += 30000;
  await other.registrarInteraccionStream({ usuario: 'ana' });
  db.now += 30000;
  assert.equal(await instance.registrarInteraccionStream({ usuario: 'ana' }), null);
  db.now += 30000;
  await instance.registrarInteraccionStream({ usuario: 'ana' });
  await instance.flushLocalRewards();
  assert.equal(instance.localRewards.pending(db.now).length, 3);
  assert.equal(db.read('stream/usuarios/ana/jikopuntos'), 1000);
  assert.deepEqual(db.reads, []);
  assert.deepEqual(db.transactions, []);
  instance.isConnected = true;
  await instance.flushLocalRewards();
  const user = db.read('stream/usuarios/ana');
  assert.equal(user.asistenciasCount, 1);
  assert.equal(user.tiempoVistoMinutos, 2);
  assert.equal(user.jikopuntos, 1010 + notices[0].puntosOtorgados);
  assert.equal(instance.localRewards.pending(db.now).length, 0);
  assert.deepEqual(db.reads, ['stream/transmisiones/live_1/asistentes/ana']);
  assert.equal(db.transactions.filter(path => path === 'stream/usuarios/ana').length, 1);
  assert.equal(db.read('stream/transmisiones/live_1/totalAsistentes'), 1);
  assert.equal(db.read('stream/tienda/estadisticas/resumen/totalAsistenciasRegistradas'), 1);
  assert.equal((await other.registrarAsistencia({ usuario: 'ana', diferir: true })).yaRegistrado, true);
  other.localRewards.streamId = 'live_2';
  db.now += 60000;
  assert.equal((await instance.registrarInteraccionStream({ usuario: 'ana' })).primeraVez, true);
  assert.equal(instance.localRewards.pending(db.now).length, 0);
});

test('OBS recupera el lote tras el pago sin repetir recompensas ni acumular asistencia dos veces', async () => {
  const db = database({ ana: { ...profile(1000), username: 'ana' } });
  const { instance } = service(db, files[1]);
  instance.localRewards = localRewardStore();
  instance.isConnected = true;
  const event = await instance.registrarAsistencia({ usuario: 'ana', diferir: true });
  db.fail = path => path === 'stream/tienda/estadisticas/resumen';
  await assert.rejects(instance.flushLocalRewards(), /Fallo de conexión simulado/);
  const balance = db.read('stream/usuarios/ana/jikopuntos');
  assert.ok(balance > 1000);
  assert.equal(instance.localRewards.pending(db.now).length, 1);
  assert.equal(db.read('stream/tienda/asistencias/' + Points.key(event.id)).usuarioNorm, 'ana');
  db.fail = null;
  const { instance: restarted } = service(db, files[1]);
  restarted.localRewards = instance.localRewards;
  restarted.isConnected = true;
  await restarted.flushLocalRewards();
  assert.equal(db.read('stream/usuarios/ana/jikopuntos'), balance);
  assert.equal(db.read('stream/transmisiones/live_1/totalAsistentes'), 1);
  assert.equal(db.read('stream/tienda/estadisticas/resumen/totalAsistenciasRegistradas'), 1);
  assert.equal(restarted.localRewards.pending(db.now).length, 0);
});

for (const file of files) {
  const label = file.startsWith('mini_widgets') ? 'widgets' : 'raíz';

  test(`${label}: iniciar varias veces no descarga el directorio de usuarios`, async () => {
    const db = database({ test: profile(500) });
    const { instance } = service(db, file, true);
    await Promise.all([instance.init(), instance.init()]);
    assert.deepEqual(db.reads, label === 'widgets'
      ? ['stream/transmisiones_stats/isLive', 'stream/transmisiones_stats/streamActual']
      : ['stream/transmisiones_stats']);
    assert.deepEqual(db.subscriptions.map(entry => entry.location), ['.info/connected']);
  });

  test(`${label}: el historial limita las descargas en la consulta y permite desuscribirse`, () => {
    const db = database();
    const { instance } = service(db, file);
    const records = { old: { timestamp: 1 }, recent: { timestamp: 3 }, middle: { timestamp: 2 } };
    for (const [method, path] of [['onTransacciones', 'stream/tienda/transacciones'], ['onAsistencias', 'stream/tienda/asistencias']]) {
      db.write(path, records);
      const stop = instance[method](items => assert.deepEqual(Array.from(items, item => item.timestamp), [3, 2]), 2);
      const subscription = db.subscriptions.at(-1);
      assert.deepEqual(subscription.location, { path, field: 'timestamp', last: 2 });
      stop();
      assert.equal(subscription.closed, true);
    }
  });

  test(`${label}: un usuario parcial en caché no redirige el nombre exacto de otra cuenta`, async () => {
    const db = database({ ana: profile(20), anabel: profile(30) });
    const { instance } = service(db, file);
    await instance.getUser('anabel');
    assert.equal(instance.resolverUsuarioReal('ana'), 'ana');
    assert.equal(await instance.resolverUsuarioDestino('ana'), 'ana');
    assert.equal(await instance.resolverUsuarioDestino('anab'), 'anabel');
    assert.equal(db.reads.at(-1).first, 2);
  });

  test(`${label}: las consultas de préstamos incluyen registros históricos sin descargar el banco completo`, async () => {
    const db = database();
    const { instance } = service(db, file);
    const path = 'stream/banco/prestamos';
    db.write(path, {
      old: { solicitante: '@Alice', solicitanteNorm: 'alice', acreedor: 'jikobank', tipo: 'banco', estado: 'pendiente_firma', timestamp: 1 },
      newer: { solicitante: 'bob', acreedor: 'alice', acreedorNorm: 'alice', estado: 'activo', timestamp: 2 },
      other: { solicitante: 'mallory', acreedor: 'jikobank', timestamp: 3 }
    });
    const loans = await instance.obtenerPrestamosUsuario('Alice');
    assert.deepEqual(Array.from(loans, loan => loan.id), ['newer', 'old']);
    assert.equal((await instance.obtenerPrestamoPendientePara('Alice')).id, 'old');
    assert.ok(db.reads.every(read => read.path === path && read.equal === 'alice'));
  });

  if (label === 'widgets') test('la Tiendita observa solo la hoja de saldo y conserva el cero', () => {
    const db = database({ test: profile(0) });
    const { instance } = service(db, file);
    const stop = instance.onUserBalance('test', balance => assert.equal(balance, 0));
    const subscription = db.subscriptions.at(-1);
    assert.equal(subscription.location, 'stream/usuarios/test/jikopuntos');
    assert.deepEqual(db.reads, []);
    stop();
    assert.equal(subscription.closed, true);
  });

  function setup(users) {
    const db = database(users);
    const one = service(db, file);
    const two = service(db, files.find(item => item !== file));
    return { db, a: one.instance, b: two.instance, storage: one.storage };
  }

  test(`${label}: codigo_r recibe 5000 una vez entre dos ventanas, luego compra sin resucitar saldo`, async () => {
    const { db, a, b } = setup({ codigo_r: profile(0) });
    const grant = { admin: 'jikokun', targetUser: 'codigo_r', cantidad: 5000, operacionId: 'kick.msg/5000' };
    await Promise.all([a.darJikopuntosUsuario(grant), b.darJikopuntosUsuario(grant)]);
    assert.equal(db.read('stream/usuarios/codigo_r/jikopuntos'), 5000);
    db.now += 75000; // El segundo widget puede haber esperado en la cola.
    await b.darJikopuntosUsuario(grant);
    assert.equal(db.read('stream/usuarios/codigo_r/jikopuntos'), 5000);
    await b.registrarCompra({ comprador: 'codigo_r', items: ['Café'], itemsKeys: ['cafe'], costoTotal: 1500, nuevoSaldo: 10000, operacionId: 'buy_1' });
    assert.equal(db.read('stream/usuarios/codigo_r/jikopuntos'), 3500);
    assert.equal((await a.getUser('codigo_r', true)).jikopuntos, 3500);
    await a.darJikopuntosUsuario({ ...grant, operacionId: 'kick.msg/5000_new' });
    assert.equal(db.read('stream/usuarios/codigo_r/jikopuntos'), 8500);
  });

  test(`${label}: la deduplicación sin ID también es compartida, no un Map por ventana`, async () => {
    const { db, a, b } = setup({ codigo_r: profile(0) });
    const request = { admin: 'jikokun', targetUser: 'codigo_r', cantidad: 5000 };
    await Promise.all([a.darJikopuntosUsuario(request), b.darJikopuntosUsuario(request)]);
    assert.equal(db.read('stream/usuarios/codigo_r/jikopuntos'), 5000);
  });

  test(`${label}: lluvia masiva aplica una sola vez por asistente`, async () => {
    const { db, a, b } = setup({ ana: profile(0), bea: profile(0) });
    db.write('stream/transmisiones/live_1/asistentes', { ana: {}, bea: {} });
    await Promise.all([a.darJikopuntosTodos({ admin: 'jikokun', cantidad: 5000, operacionId: 'rain_1' }), b.darJikopuntosTodos({ admin: 'jikokun', cantidad: 5000, operacionId: 'rain_1' })]);
    assert.equal(db.read('stream/usuarios/ana/jikopuntos'), 5000);
    assert.equal(db.read('stream/usuarios/bea/jikopuntos'), 5000);
  });

  test(`${label}: cantidades inválidas y sobregiros no crean puntos ni éxito local`, async () => {
    const { db, a } = setup({ ana: profile(100) });
    for (const cantidad of [0, -10, NaN, Infinity, 'abc', 2.5]) await assert.rejects(a.darJikopuntosUsuario({ admin: 'jikokun', targetUser: 'ana', cantidad }));
    await assert.rejects(a.addJikopuntos('ana', -101), /insuficientes/);
    db.fail = () => true;
    await assert.rejects(a.addJikopuntos('ana', 5000), /conexión/);
    assert.equal(db.read('stream/usuarios/ana/jikopuntos'), 100);
    assert.equal(a.getCachedPoints('ana'), 100);
  });

  test(`${label}: compras concurrentes y regalo conservan el saldo real y un solo cobro por recibo`, async () => {
    const { db, a, b } = setup({ ana: profile(5000) });
    const buy = { comprador: 'ana', items: ['Café'], itemsKeys: ['cafe'], costoTotal: 1500, operacionId: 'compra_1' };
    await Promise.all([a.registrarCompra(buy), b.registrarCompra(buy), b.darJikopuntosUsuario({ admin: 'jikokun', targetUser: 'ana', cantidad: 5000, operacionId: 'regalo_1' })]);
    const user = db.read('stream/usuarios/ana');
    assert.equal(user.jikopuntos, 8500);
    assert.equal(user.totalCompras, 1);
    assert.equal(user.totalGastado, 1500);
    assert.equal(user.stats.platosConsumidos.cafe, 1);
    assert.equal(user.experiencia, 150);
    assert.equal(db.read('stream/tienda/estadisticas/resumen/totalOrdenes'), 1);
  });

  test(`${label}: dos compras que compiten por el mismo saldo no reciben fondos gratis`, async () => {
    const { db, a, b } = setup({ ana: profile(2000) });
    const results = await Promise.allSettled([a.registrarCompra({ comprador: 'ana', costoTotal: 1500, operacionId: 'a' }), b.registrarCompra({ comprador: 'ana', costoTotal: 1500, operacionId: 'b' })]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(db.read('stream/usuarios/ana/jikopuntos'), 500);
  });

  test(`${label}: regalos entre usuarios no se duplican ni acreditan sin saldo`, async () => {
    const { db, a, b } = setup({ ana: profile(5000), bea: profile(0), clara: profile(0) });
    const gift = { remitente: 'ana', receptor: 'bea', cantidad: 3000, operacionId: 'gift_1' };
    await Promise.all([a.regalarJikopuntos(gift), b.regalarJikopuntos(gift)]);
    assert.equal(db.read('stream/usuarios/ana/jikopuntos'), 2000);
    assert.equal(db.read('stream/usuarios/bea/jikopuntos'), 3000);
    await assert.rejects(a.regalarJikopuntos({ remitente: 'ana', receptor: 'clara', cantidad: 3000, operacionId: 'gift_2' }), /insuficientes/);
    assert.equal(db.read('stream/usuarios/clara/jikopuntos'), 0);
  });

  test(`${label}: una transferencia interrumpida después del débito se reanuda sin cobrar dos veces`, async () => {
    const { db, a, b } = setup({ ana: profile(5000), bea: profile(0) });
    let fail = true;
    db.fail = location => location === 'stream/usuarios/bea' && fail;
    const gift = { remitente: 'ana', receptor: 'bea', cantidad: 3000, operacionId: 'resume_gift' };
    await assert.rejects(a.regalarJikopuntos(gift), /conexión/);
    assert.equal(db.read('stream/usuarios/ana/jikopuntos'), 2000);
    fail = false;
    await b.regalarJikopuntos({ ...gift, operacionId: 'retry_gift_from_chat' });
    assert.equal(db.read('stream/usuarios/ana/jikopuntos'), 2000);
    assert.equal(db.read('stream/usuarios/bea/jikopuntos'), 3000);
  });

  test(`${label}: dos firmas del mismo préstamo no duplican desembolso ni deuda`, async () => {
    const { db, a, b } = setup({ ana: profile(0), bea: profile(5000) });
    const request = { solicitante: 'ana', acreedor: 'bea', monto: 1000, operacionId: 'loan_msg' };
    const [one, two] = await Promise.all([a.solicitarPrestamo(request), b.solicitarPrestamo(request)]);
    assert.equal(one.prestamoId, two.prestamoId);
    await Promise.all([a.confirmarPrestamo({ autorizador: 'bea', prestamoId: one.prestamoId }), b.confirmarPrestamo({ autorizador: 'bea', prestamoId: one.prestamoId })]);
    assert.equal(db.read('stream/usuarios/ana/jikopuntos'), 1000);
    assert.equal(db.read('stream/usuarios/ana/deudaTotal'), 1020);
    assert.equal(db.read('stream/usuarios/bea/jikopuntos'), 4000);
  });

  test(`${label}: el pago repetido de un préstamo no duplica débito ni crédito`, async () => {
    const { db, a, b } = setup({ ana: { ...profile(2000), deudaTotal: 1020 }, bea: profile(4000) });
    db.write('stream/banco/prestamos/loan_1', { solicitante: 'ana', acreedor: 'bea', tipo: 'p2p', estado: 'activo', saldoPendiente: 1020, timestamp: 1 });
    const payment = { deudor: 'ana', monto: 500, operacionId: 'payment_msg' };
    await Promise.all([a.pagarPrestamo(payment), b.pagarPrestamo(payment)]);
    db.now += 20000;
    await b.pagarPrestamo(payment);
    assert.equal(db.read('stream/usuarios/ana/jikopuntos'), 1500);
    assert.equal(db.read('stream/usuarios/ana/deudaTotal'), 520);
    assert.equal(db.read('stream/usuarios/bea/jikopuntos'), 4500);
    assert.equal(db.read('stream/banco/prestamos/loan_1/saldoPendiente'), 520);
  });

  test(`${label}: un pago interrumpido se completa sin volver a descontar ni regalar saldo al acreedor`, async () => {
    const { db, a, b } = setup({ ana: { ...profile(2000), deudaTotal: 1020 }, bea: profile(4000) });
    db.write('stream/banco/prestamos/loan_1', { solicitante: 'ana', acreedor: 'bea', tipo: 'p2p', estado: 'activo', saldoPendiente: 1020, timestamp: 1 });
    let fail = true;
    db.fail = location => location === 'stream/usuarios/bea' && fail;
    const payment = { deudor: 'ana', monto: 500, operacionId: 'resume_payment' };
    await assert.rejects(a.pagarPrestamo(payment), /conexión/);
    assert.equal(db.read('stream/usuarios/ana/jikopuntos'), 1500);
    await assert.rejects(b.pagarPrestamo({ ...payment, monto: 100, operacionId: 'new_payment' }), /operación|pendiente/);
    fail = false;
    db.now += 60000;
    await b.pagarPrestamo({ ...payment, operacionId: 'retry_from_chat' });
    assert.equal(db.read('stream/usuarios/ana/jikopuntos'), 1500);
    assert.equal(db.read('stream/usuarios/bea/jikopuntos'), 4500);
    assert.equal(db.read('stream/usuarios/ana/pagoBancoPendiente'), null);
  });

  test(`${label}: asistencia y combustible se acreditan una vez entre ventanas`, async () => {
    const { db, a, b } = setup({ ana: profile(0) });
    const request = { usuario: 'ana', streamId: 'live_1' };
    await Promise.all([a.registrarAsistencia(request), b.registrarAsistencia(request)]);
    assert.equal(db.read('stream/usuarios/ana/jikopuntos'), 500);
    assert.equal(db.read('stream/usuarios/ana/asistenciasCount'), 1);
    await a.registrarAsistencia(request);
    assert.equal(db.read('stream/usuarios/ana/jikopuntos'), 500);
    const fuel = { puntos: 25, xp: 50, tiempoMinutos: 5, motivo: 'cierre_directo_kick', streamId: 'live_1' };
    await Promise.all([a.acreditarCombustibleChat('ana', fuel), b.acreditarCombustibleChat('ana', fuel)]);
    assert.equal(db.read('stream/usuarios/ana/jikopuntos'), 525);
    assert.equal(db.read('stream/usuarios/ana/experiencia'), 250);
    assert.equal(db.read('stream/usuarios/ana/tiempoVistoMinutos'), 5);
  });

  test(`${label}: la sincronización local no devuelve dinero ya gastado ni convierte cero a mil`, async () => {
    const { db, a, storage } = setup({ codigo_r: profile(3500), bea: profile(0) });
    storage.set('tiendita_pts_codigo_r', '10000');
    storage.set('tiendita_pts_bea', '5000');
    await a.syncAllFromLocalStorage();
    assert.equal(db.read('stream/usuarios/codigo_r/jikopuntos'), 3500);
    assert.equal(db.read('stream/usuarios/bea/jikopuntos'), 0);
  });

  test(`${label}: crear un usuario con cero puntos conserva cero`, async () => {
    const { db, a } = setup({});
    await a.crearUsuario({ username: 'nuevo', jikopuntos: 0 });
    assert.equal(db.read('stream/usuarios/nuevo/jikopuntos'), 0);
  });
}
