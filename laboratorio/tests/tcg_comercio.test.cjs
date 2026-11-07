const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Core = require('../tarjetero_sobres_core.js');
const Engine = require('../../mini_widgets/js/jiko_tcg_engine.js');
const Service = require('../../mini_widgets/js/jiko_tcg_service.js');
const context = { window: {} }; vm.createContext(context);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../../data/tarjetas_default_data.js'), 'utf8'), context);
const catalog = context.window.DEFAULT_JIKOKUN_COLLECTIONS['Coleccion_Jikokun_001-100'].cards;
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

class Store {
    constructor() { this.data = {}; this.listeners = []; this.serial = Promise.resolve(); this.failPublish = false; }
    read(path) { return path.split('/').filter(Boolean).reduce((node, key) => node?.[key], this.data) ?? null; }
    async get(path) { return clone(this.read(path)); }
    async set(path, value) {
        const parts = path.split('/').filter(Boolean); let node = this.data;
        for (const key of parts.slice(0, -1)) node = node[key] ||= {};
        if (value === null) delete node[parts.at(-1)]; else node[parts.at(-1)] = clone(value);
        this.notify();
    }
    async update(values) { for (const [path, value] of Object.entries(values)) await this.set(path, value); }
    transaction(path, callback) {
        const operation = this.serial.then(async () => {
            const current = clone(this.read(path));
            // Simula dos evaluaciones del mismo callback antes de confirmar.
            callback(clone(current));
            const next = callback(clone(current));
            if (next === undefined) return { committed: false, value: current };
            if (this.failPublish && path === 'stream/widgets/tcg/control' && Object.values(next.jobs || {}).some(job => job.status === 'ready' && job.type === 'purchase')) throw Error('Network interruption after debit');
            await this.set(path, next);
            return { committed: true, value: clone(next) };
        });
        this.serial = operation.catch(() => {});
        return operation;
    }
    watch(path, callback) { const listener = { path, callback }; this.listeners.push(listener); queueMicrotask(() => callback(clone(this.read(path)))); return () => { this.listeners = this.listeners.filter(item => item !== listener); }; }
    notify() { for (const listener of this.listeners) queueMicrotask(() => listener.callback(clone(this.read(listener.path)))); }
    async isOnline() { return true; }
}
async function setup() {
    const store = new Store(); let time = 200000;
    const fixedCore = { ...Core, drawPack: cards => Core.drawPack(cards, { rng: () => 0 }) };
    const helpers = { level: user => ({ nivel: Math.floor(user.experiencia / 1000) + 1 }), factor: () => 1, purchaseXp: cost => Math.floor(cost * .1) };
    const service = new Service(store, fixedCore, { now: () => time, helpers });
    await service.init(catalog);
    await store.set('stream/usuarios/ana', { username: 'ana', jikopuntos: 6000, experiencia: 0, avatar: 'preserve-me', stats: { other: 2 } });
    return { service, store, advance: ms => { time += ms; }, now: () => time };
}

test('cobra una vez, guarda cartas repetidas y XP en la misma transacción; reintentar conserva el premio', async () => {
    const { service, store } = await setup();
    try {
        const first = await service.purchase('ana', [{ key: 'sobre' }], 'purchase_1');
        const retry = await service.purchase('ana', [{ key: 'sobre' }], 'purchase_1');
        assert.deepEqual(retry, first);
        const user = await store.get('stream/usuarios/ana');
        assert.equal(user.jikopuntos, 4500);
        assert.equal(user.experiencia, 30); // primera carta nueva, dos repetidas a 15 XP.
        assert.equal(user.tarjetas.inventario['001'].cantidad, 3);
        assert.equal(user.tarjetas.porRareza.common, 3);
        assert.equal(user.tarjetas.cartasUnicas, 1);
        assert.equal(user.tarjetas.repetidas, 2);
        assert.equal(user.tarjetas.sobresComprados, 1);
        assert.equal(user.avatar, 'preserve-me');
        assert.equal(user.stats.other, 2);
        assert.deepEqual(first.packs, [[1, 1, 1]]);
        assert.equal(Engine.pending(service.control).length, 1);
    } finally { service.destroy(); }
});

test('dos clientes compitiendo no duplican compras, no sobregiran saldo y respetan una solicitud por usuario', async () => {
    const { service, store } = await setup();
    const other = new Service(store, { ...Core, drawPack: cards => Core.drawPack(cards, { rng: () => 0 }) }, { now: () => 200000 });
    await other.init(catalog);
    try {
        const results = await Promise.allSettled([service.purchase('ana', [{ key: 'sobre' }], 'request_a'), other.purchase('ana', [{ key: 'sobre' }], 'request_b')]);
        assert.equal(results.filter(item => item.status === 'fulfilled').length, 1);
        assert.equal((await store.get('stream/usuarios/ana')).jikopuntos, 4500);
        await store.set('stream/usuarios/beto', { username: 'beto', jikopuntos: 1000 });
        await assert.rejects(service.purchase('beto', [{ key: 'sobre' }], 'no_funds'), /insuficientes/);
        assert.equal((await store.get('stream/usuarios/beto')).jikopuntos, 1000);
        assert.equal((await store.get('stream/widgets/tcg/control/jobs/no_funds')).status, 'cancelled');
    } finally { service.destroy(); other.destroy(); }
});

test('un fallo tras el cobro conserva el recibo y la recuperación republica exactamente sus cartas', async () => {
    const { service, store } = await setup();
    try {
        store.failPublish = true;
        const receipt = await service.purchase('ana', [{ key: 'sobre' }], 'recover_1');
        assert.equal((await store.get('stream/usuarios/ana')).jikopuntos, 4500);
        store.failPublish = false;
        await service.repair({ ana: await store.get('stream/usuarios/ana') });
        assert.deepEqual((await store.get('stream/widgets/tcg/control/jobs/recover_1')).receipt.packs, receipt.packs);
        assert.equal((await store.get('stream/usuarios/ana')).tarjetas.totalCartas, 3);
    } finally { service.destroy(); }
});

test('entrega y apertura tienen turnos exclusivos, vencimiento y cercado por token', async () => {
    const { service, store, now } = await setup();
    try {
        await service.purchase('ana', [{ key: 'sobre' }], 'job_1');
        let state = await store.get('stream/widgets/tcg/control');
        assert.equal(Engine.claim(state, 'cards', 'obs', 'early', now(), service.settings), undefined);
        state = Engine.claim(state, 'delivery', 'shop', 'delivery_token', now(), service.settings);
        assert.equal(state.jobs.job_1.status, 'delivering');
        assert.equal(Engine.claim(state, 'delivery', 'other-shop', 'other', now(), service.settings), undefined);
        state.jobs.job_1.status = 'awaiting_open'; delete state.active;
        const opening = Engine.claim(state, 'cards', 'obs', 'opening_token', now(), service.settings);
        assert.equal(opening.jobs.job_1.status, 'opening');
        assert.equal(opening.active.token, 'opening_token');
        assert.equal(Engine.claim(opening, 'cards', 'second-obs', 'duplicate', now(), service.settings), undefined);
        const resumed = Engine.claim(opening, 'cards', 'second-obs', 'resume', now() + 31000, service.settings);
        assert.equal(resumed.active.token, 'resume');
        assert.deepEqual(resumed.jobs.job_1.receipt.packs, [[1, 1, 1]]);
    } finally { service.destroy(); }
});

test('mostrarcartas filtra las últimas cinco, comparte cooldown entre rarezas y rechaza colas llenas', async () => {
    const { service, store, advance } = await setup();
    try {
        await service.purchase('ana', [{ key: 'sobre' }], 'owned');
        let control = await store.get('stream/widgets/tcg/control'); control.jobs.owned.status = 'done'; await store.set('stream/widgets/tcg/control', control);
        await service.acknowledge('ana', 'owned');
        advance(20001);
        const job = await service.showCollection('ana', 'comunes');
        assert.deepEqual(job.cards, [1, 1, 1]);
        await assert.rejects(service.showCollection('ana'), /solicitud/);
        control = await store.get('stream/widgets/tcg/control'); control.jobs[job.id].status = 'done'; await store.set('stream/widgets/tcg/control', control);
        await assert.rejects(service.showCollection('ana', 'comun'), /Espera/);
        advance(20001);
        await assert.rejects(service.showCollection('ana', 'legendaria'), /Todavía no tienes/);
        const recent = Array.from({ length: 8 }, (_, i) => ({ cardId: i + 1, timestamp: i, orden: i }));
        assert.deepEqual(Engine.recentCards({ tarjetas: { ultimasPorRareza: { rare: recent } } }, 'rare').map(item => item.cardId), [8, 7, 6, 5, 4]);
        const limited = Engine.config({ maxQueue: 1 });
        const base = Engine.reserve(null, { id: 'a', user: 'ana', status: 'ready', createdAt: 0 }, limited, 0);
        assert.throws(() => Engine.reserve(base, { id: 'b', user: 'beto', status: 'ready', createdAt: 1 }, limited, 1), /llena/);
    } finally { service.destroy(); }
});

test('la cola guarda una separación global de 20 segundos y las compras no dan XP normal por el sobre', async () => {
    const { service, store, now } = await setup();
    try {
        await store.set('stream/tienda/items/cafe', { key: 'cafe', nombre: 'Café', precio: 200, activo: true, stock: -1 });
        const receipt = await service.purchase('ana', [{ key: 'sobre' }, { key: 'cafe' }], 'mixed');
        assert.equal(receipt.costoTotal, 1700);
        assert.equal(receipt.xpGanada, 50); // 30 repetidas + 20 del café; sin 150 XP por el sobre.
        const state = Engine.claim(await store.get('stream/widgets/tcg/control'), 'delivery', 'shop', 'x', now(), service.settings);
        assert.equal(state.nextStartAt, now() + 20000);
        state.jobs.mixed.status = 'done'; delete state.active;
        state.jobs.next = { id: 'next', user: 'beto', type: 'collection', status: 'ready', cards: [1], createdAt: now() + 1 };
        assert.equal(Engine.claim(state, 'cards', 'obs', 'y', now() + 15000, service.settings), undefined);
        assert.ok(Engine.claim(state, 'cards', 'obs', 'y', now() + 20000, service.settings));
        assert.equal(Engine.config({ userCooldownMs: 1, globalCooldownMs: 0 }).userCooldownMs, 20000);
    } finally { service.destroy(); }
});

test('recomprar una carta conserva una sola única, acumula seis copias y las últimas cinco', async () => {
    const { service, store, advance } = await setup();
    try {
        await service.purchase('ana', [{ key: 'sobre' }], 'first');
        let control = await store.get('stream/widgets/tcg/control'); control.jobs.first.status = 'done'; await store.set('stream/widgets/tcg/control', control);
        await service.acknowledge('ana', 'first'); advance(20001);
        const second = await service.purchase('ana', [{ key: 'sobre' }], 'second');
        const user = await store.get('stream/usuarios/ana');
        assert.equal(second.xpRepetidas, 45);
        assert.equal(user.experiencia, 75);
        assert.equal(user.tarjetas.cartasUnicas, 1);
        assert.equal(user.tarjetas.totalCartas, 6);
        assert.equal(user.tarjetas.inventario['001'].cantidad, 6);
        assert.equal(Engine.recentCards(user).length, 5);
        assert.equal(Engine.recentCards(user, 'common').length, 5);
    } finally { service.destroy(); }
});

test('una reserva cancelada no permite saltarse una cola llena al reintentar el mismo ID', () => {
    const cfg = Engine.config({ maxQueue: 1 });
    const state = { jobs: { retry: { id: 'retry', user: 'ana', type: 'purchase', status: 'cancelled', createdAt: 1 }, full: { id: 'full', user: 'beto', type: 'collection', status: 'ready', createdAt: 2 } }, cooldowns: {} };
    assert.throws(() => Engine.reserve(state, { id: 'retry', user: 'ana', type: 'purchase', status: 'reserved', createdAt: 3 }, cfg, 3), /llena/);
});

test('sin conexión no se reserva cola ni se modifica el saldo', async () => {
    const { service, store } = await setup();
    try {
        store.isOnline = async () => false;
        await assert.rejects(service.purchase('ana', [{ key: 'sobre' }], 'offline'), /no está conectado/);
        assert.equal((await store.get('stream/usuarios/ana')).jikopuntos, 6000);
        assert.equal(await store.get('stream/widgets/tcg/control/jobs/offline'), null);
    } finally { service.destroy(); }
});

test('seis sobres cobran una vez y guardan sus 18 cartas; el límite administrable llega hasta veinte', async () => {
    const { service, store } = await setup();
    try {
        await store.set('stream/usuarios/ana', { username: 'ana', jikopuntos: 60000, experiencia: 0 });
        const cart = Array.from({ length: 6 }, () => ({ key: 'sobre' }));
        const receipt = await service.purchase('ana', cart, 'bulk_six');
        assert.deepEqual(await service.purchase('ana', cart, 'bulk_six'), receipt);
        assert.equal(receipt.packs.length, 6);
        assert.ok(receipt.packs.every(pack => pack.length === 3));
        const user = await store.get('stream/usuarios/ana');
        assert.equal(user.jikopuntos, 51000);
        assert.equal(user.tarjetas.totalCartas, 18);
        assert.equal(user.tarjetas.inventario['001'].cantidad, 18);
        assert.equal(user.tarjetas.repetidas, 17);
        assert.equal(user.tarjetas.xpRepetidas, 255);
        assert.equal(Engine.config({ maxPacksPerPurchase: 99 }).maxPacksPerPurchase, 20);
        await store.set('stream/widgets/tcg/config', Engine.config({ maxPacksPerPurchase: 5 }));
        await store.set('stream/usuarios/beto', { username: 'beto', jikopuntos: 60000 });
        await assert.rejects(service.purchase('beto', cart, 'bulk_reject'), /entre 1 y 5/);
        assert.equal((await store.get('stream/usuarios/beto')).jikopuntos, 60000);
        assert.equal(await store.get('stream/widgets/tcg/control/jobs/bulk_reject'), null);
    } finally { service.destroy(); }
});

test('la mesa entrega los sobres al mismo renderizador y conserva su confirmación al recuperar el recibo', async () => {
    const { service, store, now } = await setup();
    try {
        const receipt = await service.purchase('ana', [{ key: 'sobre' }], 'handoff');
        assert.equal((await service.markPresentationReady('handoff')).committed, false);
        const delivery = Engine.claim(await store.get('stream/widgets/tcg/control'), 'delivery', 'shop', 'token', now(), service.settings);
        await store.set('stream/widgets/tcg/control', delivery);
        assert.equal((await service.markPresentationReady('handoff')).committed, true);
        assert.equal(await service.waitForPresentation('handoff'), true);
        await service.promote(receipt);
        assert.equal((await store.get('stream/widgets/tcg/control/jobs/handoff')).presentationReadyAt, now());
        const aborter = new AbortController(); aborter.abort();
        await assert.rejects(service.waitForPresentation('handoff', aborter.signal), /interrumpida/);
        assert.equal(await service.waitForPresentation('no_renderer'), false);
        assert.equal((await store.get('stream/usuarios/ana')).jikopuntos, 4500);
    } finally { service.destroy(); }
});

test('mostrar cartas después de comprar queda en cola, respeta los 20 segundos y no permite otra colección pendiente', async () => {
    const { service, store, now, advance } = await setup();
    try {
        await service.purchase('ana', [{ key: 'sobre' }], 'before_collection');
        advance(1000);
        const collection = await service.showCollection('ana', 'comunes');
        assert.deepEqual(collection.cards, [1, 1, 1]);
        assert.equal(service.control.jobs[collection.id].notBefore, 220000);
        assert.equal(Engine.pending(service.control).length, 2);
        await assert.rejects(service.showCollection('ana'), /solicitud/);
        const control = await store.get('stream/widgets/tcg/control');
        control.jobs.before_collection.status = 'done';
        assert.equal(Engine.claim(control, 'cards', 'obs', 'early', now(), service.settings), undefined);
        advance(19000);
        assert.ok(Engine.claim(control, 'cards', 'obs', 'on_time', now(), service.settings));
    } finally { service.destroy(); }
});

test('un fallo de imágenes conserva el recibo pendiente, espera 30 segundos y reintenta sin cobrar ni sortear otra vez', async () => {
    const { service, store, now, advance } = await setup();
    let stop;
    const waitUntil = async condition => {
        const deadline = Date.now() + 3000;
        while (!await condition()) { if (Date.now() > deadline) throw Error('Worker timeout'); await new Promise(resolve => setTimeout(resolve, 10)); }
    };
    try {
        const receipt = await service.purchase('ana', [{ key: 'sobre' }], 'retry_images');
        const control = Engine.claim(await store.get('stream/widgets/tcg/control'), 'delivery', 'shop', 'delivery', now(), service.settings);
        control.jobs.retry_images.status = 'awaiting_open'; delete control.active;
        await store.set('stream/widgets/tcg/control', control);
        let available = false, calls = 0;
        stop = service.startWorker('cards', async job => {
            calls++;
            assert.deepEqual(job.receipt.packs, receipt.packs);
            if (!available) throw Error('Imágenes de Drive no disponibles.');
        });
        await waitUntil(() => !!store.read('stream/widgets/tcg/control/jobs/retry_images/retryAt'));
        const failed = await store.get('stream/widgets/tcg/control');
        assert.equal(failed.jobs.retry_images.status, 'awaiting_open');
        assert.equal(failed.jobs.retry_images.retryAt, now() + 30000);
        assert.match(failed.jobs.retry_images.lastError.message, /Drive/);
        assert.equal(failed.active, undefined);
        assert.equal((await store.get('stream/usuarios/ana')).tarjetas.compras.retry_images.entregado, false);
        assert.equal(Engine.claim(failed, 'cards', 'other', 'too_soon', now() + 29999, service.settings), undefined);
        await service.promote(receipt);
        assert.equal(service.control.jobs.retry_images.retryAt, failed.jobs.retry_images.retryAt);
        available = true; advance(30000);
        await store.set('stream/widgets/tcg/control', service.control);
        await waitUntil(() => store.read('stream/usuarios/ana/tarjetas/compras/retry_images/entregado') === true);
        const user = await store.get('stream/usuarios/ana');
        assert.equal(calls, 2);
        assert.equal(user.jikopuntos, 4500);
        assert.equal(user.tarjetas.totalCartas, 3);
        assert.equal(user.tarjetas.pendiente, false);
    } finally { stop?.(); service.destroy(); }
});
