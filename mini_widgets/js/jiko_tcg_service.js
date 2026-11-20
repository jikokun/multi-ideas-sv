(function (root, factory) {
    const Engine = typeof module === 'object' && module.exports ? require('./jiko_tcg_engine.js') : root.JikoTcgEngine;
    const Service = factory(Engine);
    if (typeof module === 'object' && module.exports) module.exports = Service;
    else root.JikoTcgService = Service;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (E) {
    'use strict';
    const BASE = 'stream/widgets/tcg';
    const CONTROL = BASE + '/control';
    const userPath = user => 'stream/usuarios/' + E.userKey(user);
    return class JikoTcgService {
        constructor(store, core, options = {}) {
            this.store = store; this.core = core; this.helpers = options.helpers || {};
            this.now = options.now || (() => Date.now());
            this.settings = E.config(); this.catalog = []; this.control = {}; this.product = null;
            this.listeners = new Set(); this.stops = []; this.workers = new Set(); this.connected = true;
            this.initializing = null; this.ready = false;
            this.activeControllers = new Set();
        }
        id() { return 'tcg_' + this.now() + '_' + (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, ''); }
        emit() { this.listeners.forEach(callback => { try { callback(this); } catch (error) { console.warn('[TCG]', error); } }); }
        subscribe(callback) { this.listeners.add(callback); if (this.ready) callback(this); return () => this.listeners.delete(callback); }
        watchInitial(path, apply, fallback) {
            return new Promise((resolve, reject) => {
                let received = false, seeding = false;
                const fail = error => {
                    if (received) console.warn('[TCG Firebase]', error.message);
                    else reject(error);
                };
                const receive = value => {
                    try {
                        apply(value);
                        received = true;
                        resolve();
                        this.emit();
                    } catch (error) { fail(error); }
                };
                this.stops.push(this.store.watch(path, value => {
                    if (value == null && !received && fallback !== undefined) {
                        if (seeding) return;
                        seeding = true;
                        this.store.transaction(path, current => current == null ? fallback : undefined)
                            .then(result => { if (!received) receive(result.value); }, fail);
                        return;
                    }
                    receive(value);
                }, fail));
            });
        }
        async init(seed) {
            if (this.initializing) return this.initializing;
            this.initializing = (async () => {
                const cards = this.core.createCatalog(seed);
                const product = { key: 'sobre', nombre: 'Sobre', precio: 1500, stock: -1, activo: true, emoji: '✦', categoria: 'recurso', comando: '!sobre', aliases: ['sobres', 'sobre de cartas', 'sobretarjetas'], img: this.core.PACK_ART.front, driveUrl: this.core.PACK_ART.front, packBack: this.core.PACK_ART.back, tipo: 'tcg_booster', descripcion: 'Sobre Jikokun con tres cartas de la colección 001–100' };
                await Promise.all([
                    this.watchInitial(BASE + '/config', value => { this.settings = E.config(value || {}); }, E.config()),
                    this.watchInitial(BASE + '/catalog', value => { this.catalog = this.core.createCatalog(Object.values(value || {})); },
                        cards.map(({ id, num, title, rarity, frontImage, backImage }) => ({ id, num, title, rarity, frontImage, backImage }))),
                    this.watchInitial('stream/tienda/items/sobre', value => { this.product = value; }, product),
                    this.watchInitial(CONTROL, value => { this.control = value || {}; })
                ]);
                if (this.store.watchConnection) this.stops.push(this.store.watchConnection(online => {
                    this.connected = online;
                    if (!online) this.activeControllers.forEach(controller => controller.abort());
                    else this.emit();
                }));
                this.ready = true; this.emit(); return this;
            })().catch(error => {
                this.stops.splice(0).forEach(stop => stop());
                this.initializing = null;
                throw error;
            });
            return this.initializing;
        }
        async online() { if (this.store.isOnline && !await this.store.isOnline()) throw new Error('Firebase no está conectado. No se ha cobrado nada.'); }
        async cancelReservation(id, user) {
            await this.store.transaction(CONTROL, state => {
                if (!state?.jobs?.[id] || state.jobs[id].status !== 'reserved') return;
                state.jobs[id].status = 'cancelled';
                if (state.cooldowns?.[user]?.id === id) delete state.cooldowns[user];
                return state;
            });
        }
        async promote(receipt) {
            await this.store.transaction(CONTROL, state => {
                state ||= { jobs: {}, cooldowns: {} }; state.jobs ||= {};
                const previous = state.jobs[receipt.id];
                if (previous?.status === 'done') return;
                const presentation = { packs: receipt.packs, items: receipt.items };
                state.jobs[receipt.id] = { id: receipt.id, user: receipt.user, type: 'purchase', createdAt: receipt.timestamp, status: previous?.status && previous.status !== 'reserved' && previous.status !== 'cancelled' ? previous.status : 'ready', packIndex: previous?.packIndex || 0, receipt: presentation, ...(previous?.startedAt ? { startedAt: previous.startedAt } : {}), ...(previous?.deliveryCompletedAt ? { deliveryCompletedAt: previous.deliveryCompletedAt } : {}), ...(previous?.presentationReadyAt ? { presentationReadyAt: previous.presentationReadyAt } : {}), ...(previous?.retryAt ? { retryAt: previous.retryAt, lastError: previous.lastError } : {}) };
                return state;
            });
        }
        async purchase(username, cart, id = this.id()) {
            if (!this.ready) throw new Error('El catálogo de sobres todavía no está conectado a Firebase.');
            await this.online();
            const user = E.userKey(username);
            const fingerprint = JSON.stringify(cart.map(item => String(item.key)).sort());
            const existing = await this.store.get(userPath(user) + '/tarjetas/compras/' + id);
            if (existing) {
                if (existing.fingerprint !== fingerprint) throw new Error('Este identificador pertenece a otra orden.');
                if (!existing.entregado) await this.promote(existing);
                return existing;
            }
            const keys = [...new Set(cart.map(item => item.key))];
            if (keys.some(key => typeof key !== 'string' || !key || /[.#$\[\]/\u0000-\u001f\u007f]/.test(key))) {
                throw new Error('El pedido contiene un producto inválido.');
            }
            const itemsByKey = new Map(await Promise.all(keys.map(async key => [key, await this.store.get('stream/tienda/items/' + key)])));
            const cfg = this.settings, catalog = this.catalog;
            const items = cart.map(line => {
                const item = itemsByKey.get(line.key);
                if (!item || item.activo === false || !(Number(item.precio) > 0)) throw new Error('El producto ' + line.key + ' ya no está disponible.');
                if (Number(item.stock) >= 0) throw new Error('Las órdenes con sobres requieren productos de stock ilimitado.');
                return { key: item.key, nombre: String(item.nombre || item.key), precio: Math.round(Number(item.precio)), img: String(item.img || item.driveUrl || ''), localImg: String(item.localImg || '') };
            });
            const quantity = items.filter(item => item.key === 'sobre').length;
            if (quantity > E.MAX_PACKS_PER_STREAM) throw E.packLimitError();
            if (quantity < 1 || quantity > cfg.maxPacksPerPurchase) throw new Error('Puedes comprar entre 1 y ' + cfg.maxPacksPerPurchase + ' sobres por orden.');
            if (items.length > 20) throw new Error('La orden supera el límite de 20 productos.');
            const statsPath = 'stream/transmisiones_stats/';
            const [isLive, activeId, stream] = await Promise.all(['isLive', 'streamActivoId', 'streamActual'].map(key => this.store.get(statsPath + key)));
            const streamId = isLive === true ? activeId : null;
            if (!streamId) throw new Error('No hay una transmisión activa para comprar sobres.');
            const streamStart = stream?.id === streamId ? Number(stream.inicioTimestamp) || 0 : 0;
            const now = this.now();
            const job = { id, user, type: 'purchase', status: 'reserved', createdAt: now };
            await this.store.transaction(CONTROL, state => E.reserve(state, job, cfg, now));
            let committed = false;
            try {
                // Sorteo único fuera del callback: los reintentos de la transacción conservan el premio.
                const packs = Array.from({ length: quantity }, () => this.core.drawPack(catalog).cards);
                const packPrice = items.find(item => item.key === 'sobre').precio;
                const total = items.reduce((sum, item) => sum + item.precio, 0);
                const foodCost = items.filter(item => item.key !== 'sobre').reduce((sum, item) => sum + item.precio, 0);
                const request = { id, user, streamId, streamStart, fingerprint, now, packs, packPrice, total, foodCost, items, config: cfg };
                const result = await this.store.transaction(userPath(user), current => E.applyPurchase(current, request, this.helpers));
                if (!result.committed) throw new Error('La compra no pudo confirmarse.');
                committed = true;
                const receipt = result.value.tarjetas.compras[id];
                // El recibo y el inventario ya están guardados aunque falle esta publicación.
                await this.promote(receipt).catch(error => console.warn('[TCG] La recuperación publicará el recibo pendiente:', error));
                await this.store.set('stream/tienda/transacciones/' + id, { usuario: user, usuarioNorm: user, items: items.map(item => item.nombre).join(', '), itemsKeys: items.map(item => item.key), costoTotal: total, nuevoSaldo: receipt.nuevoSaldo, experienciaGanada: receipt.xpGanada, timestamp: now, tipo: 'sobre_tcg', compraId: id }).catch(() => {});
                return receipt;
            } catch (error) { if (!committed) await this.cancelReservation(id, user).catch(() => {}); throw error; }
        }
        async markPresentationReady(id) {
            return this.store.transaction(CONTROL, state => {
                const job = state?.jobs?.[id];
                if (!job || job.type !== 'purchase' || job.status !== 'delivering') return;
                job.presentationReadyAt = this.now();
                return state;
            });
        }
        async waitForPresentation(id, signal) {
            for (let attempt = 0; attempt < 12; attempt++) {
                if (signal?.aborted) throw new Error('Entrega interrumpida.');
                const ready = this.control.jobs?.[id]?.presentationReadyAt;
                if (ready && this.now() - ready < 5000) return true;
                await new Promise(resolve => setTimeout(resolve, 70));
            }
            return false;
        }
        async showCollection(username, rarity = '') {
            await this.online();
            const user = E.userKey(username);
            const filter = rarity ? this.core.normalizeRarity(rarity) : '';
            const path = userPath(user) + '/tarjetas/' + (filter ? 'ultimasPorRareza/' + filter : 'ultimas');
            const data = await this.store.get(path);
            const recent = E.recentCards({ tarjetas: filter ? { ultimasPorRareza: { [filter]: data } } : { ultimas: data } }, filter);
            if (!recent.length) throw new Error(filter ? 'Todavía no tienes cartas de esa rareza.' : 'Todavía no tienes cartas. Compra un sobre en la tiendita.');
            const job = { id: this.id(), user, type: 'collection', status: 'ready', createdAt: this.now(), rarity: filter, cards: recent.map(item => item.cardId) };
            await this.store.transaction(CONTROL, state => E.reserve(state, job, this.settings, this.now()));
            return job;
        }
        async acknowledge(user, id) {
            await this.store.transaction(userPath(user) + '/tarjetas', data => {
                if (!data?.compras?.[id]) return;
                data.compras[id].entregado = true;
                delete data.entregasPendientes?.[id];
                data.pendiente = Object.keys(data.entregasPendientes || {}).length > 0;
                return data;
            });
        }
        async finishAcknowledgement(job) {
            await this.acknowledge(job.user, job.id);
            await this.store.set(CONTROL + '/jobs/' + job.id + '/ackPending', null);
        }
        async saveSettings(values) {
            const cfg = E.config(values);
            const price = Math.round(Number(values.precio));
            if (!Number.isInteger(price) || price < 1 || price > 1000000) throw new Error('Precio inválido.');
            const image = values.img || this.product.img;
            const back = values.packBack || this.product.packBack;
            if (![image, back].every(url => /^https:\/\//.test(url))) throw new Error('Las imágenes deben usar enlaces HTTPS.');
            const item = { ...this.product, nombre: String(values.nombre || this.product.nombre || 'Sobre').slice(0, 80), precio: price, activo: values.activo !== false, pendienteIntegracion: values.activo === false, img: image, driveUrl: image, packBack: back, ultimaActualizacion: this.now() };
            await this.store.update({ [BASE + '/config']: cfg, 'stream/tienda/items/sobre': item });
        }
        async publishCatalog(cards) { const valid = this.core.createCatalog(cards); await this.store.set(BASE + '/catalog', valid.map(card => ({ id: card.id, num: card.num, title: card.title, rarity: card.rarity, frontImage: card.frontImage, backImage: card.backImage }))); }
        startWorker(role, render, canRun = () => true) {
            const owner = this.id(); let working = false, stopped = false, aborter = null;
            let lastRecovery = null;
            const pump = async () => {
                if (stopped || working || !this.ready || !this.connected) return;
                const head = E.pending(this.control)[0];
                const acknowledgement = role === 'cards' && Object.values(this.control.jobs || {}).find(job => job.ackPending);
                const now = this.now();
                const reserved = head?.status === 'reserved' && now - head.createdAt >= 15000 ? head : null;
                const recovery = acknowledgement || reserved;
                const canRecover = recovery && (lastRecovery?.id !== recovery.id || now - lastRecovery.at >= 15000);
                const canClaim = canRun() && E.claimable(this.control, role, now);
                if (!canRecover && !canClaim) return;
                working = true;
                let heartbeat = null;
                let token = null;
                try {
                    await this.online();
                    if (canRecover) {
                        lastRecovery = { id: recovery.id, at: now };
                        if (recovery.ackPending) await this.finishAcknowledgement(recovery);
                        else {
                            const receipt = await this.store.get(userPath(recovery.user) + '/tarjetas/compras/' + recovery.id);
                            if (receipt) await this.promote(receipt);
                            else if (now - recovery.createdAt > 120000) await this.cancelReservation(recovery.id, recovery.user);
                        }
                        return;
                    }
                    token = this.id();
                    const claim = await this.store.transaction(CONTROL, state => E.claim(state, role, owner, token, this.now(), this.settings));
                    if (!claim.committed) return;
                    const lease = claim.value.active, job = claim.value.jobs[lease.jobId];
                    aborter = new AbortController();
                    const controller = aborter;
                    this.activeControllers.add(controller);
                    heartbeat = setInterval(async () => {
                        try {
                            const renewed = await this.store.transaction(CONTROL + '/active', active => {
                                if (active?.token !== token) return;
                                return { ...active, expiresAt: this.now() + 30000 };
                            });
                            if (!renewed.committed) controller.abort();
                        } catch (_) { controller.abort(); }
                    }, 5000);
                    const checkpoint = async packIndex => {
                        const result = await this.store.transaction(CONTROL, state => {
                            if (state?.active?.token !== token) return;
                            state.jobs[job.id].packIndex = packIndex; return state;
                        });
                        if (!result.committed) throw new Error('Se perdió el turno del widget.');
                    };
                    const result = await render(job, aborter.signal, checkpoint);
                    if (aborter.signal.aborted) return;
                    if (role === 'delivery' && result?.deliveryCleared !== true) throw new Error('La tiendita todavía no confirmó que la mesa y sus productos desaparecieron.');
                    const completed = await this.store.transaction(CONTROL, state => {
                        if (state?.active?.token !== token) return;
                        state.jobs[job.id].status = role === 'delivery' ? 'awaiting_open' : 'done';
                        if (role === 'delivery') state.jobs[job.id].deliveryCompletedAt = this.now();
                        if (role === 'cards') state.jobs[job.id] = {
                            id: job.id, user: job.user, type: job.type, createdAt: job.createdAt, status: 'done',
                            completedAt: this.now(), ...(job.type === 'purchase' ? { ackPending: true } : {})
                        };
                        delete state.active; return state;
                    });
                    if (completed.committed && role === 'cards' && job.type === 'purchase') {
                        lastRecovery = { id: job.id, at: this.now() };
                        await this.finishAcknowledgement(job);
                    }
                } catch (error) {
                    console.warn('[TCG cola]', error.message);
                    if (token) await this.store.transaction(CONTROL, state => {
                        if (state?.active?.token !== token) return;
                        const job = state.jobs[state.active.jobId];
                        job.status = role === 'delivery' ? 'ready' : job.type === 'collection' ? 'ready' : 'awaiting_open';
                        job.retryAt = this.now() + 30000;
                        job.lastError = { message: String(error.message).slice(0, 300), timestamp: this.now() };
                        delete state.active; return state;
                    }).catch(() => {});
                }
                finally { if (heartbeat) clearInterval(heartbeat); if (aborter) this.activeControllers.delete(aborter); aborter = null; working = false; }
            };
            const timer = setInterval(pump, 1200);
            const unsubscribe = this.subscribe(pump);
            const stop = () => { stopped = true; aborter?.abort(); clearInterval(timer); unsubscribe(); this.workers.delete(stop); };
            this.workers.add(stop); return stop;
        }
        destroy() { this.workers.forEach(stop => stop()); this.stops.forEach(stop => stop()); this.listeners.clear(); }
    };
});
