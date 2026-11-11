/* Reglas puras de inventario y coordinación. El estado se persiste en RTDB. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.JikoTcgEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const RARITIES = ['common', 'special', 'rare', 'epic', 'legendary', 'mythic'];
    const MAX_PACKS_PER_STREAM = 10;
    const DEFAULT_CONFIG = Object.freeze({ duplicateXpPercent: 1, userCooldownMs: 20000, globalCooldownMs: 20000, collectionDurationMs: 12000, revealDurationMs: 8000, maxQueue: 20, maxPacksPerPurchase: 10 });
    const copy = value => JSON.parse(JSON.stringify(value));
    const count = value => Math.max(0, Math.floor(Number(value) || 0));
    function userKey(value) {
        const key = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^@/, '').trim();
        if (!key || key.length > 80 || /[.#$\[\]\/\u0000-\u001f\u007f]/.test(key)) throw new Error('Usuario inválido.');
        return key;
    }
    function config(value = {}) {
        const number = (key, min, max) => Math.min(max, Math.max(min, Number(value[key] ?? DEFAULT_CONFIG[key]) || DEFAULT_CONFIG[key]));
        return { duplicateXpPercent: number('duplicateXpPercent', .1, 5), userCooldownMs: number('userCooldownMs', 20000, 300000), globalCooldownMs: number('globalCooldownMs', 20000, 300000), collectionDurationMs: number('collectionDurationMs', 6000, 15000), revealDurationMs: number('revealDurationMs', 4000, 20000), maxQueue: Math.floor(number('maxQueue', 1, 30)), maxPacksPerPurchase: Math.floor(number('maxPacksPerPurchase', 1, MAX_PACKS_PER_STREAM)) };
    }
    function packLimitError() {
        const error = new Error('Límite de 10 sobres por transmisión alcanzado.');
        error.code = 'PACK_LIMIT_REACHED';
        return error;
    }
    function inventory(user) {
        const data = copy(user?.tarjetas || {});
        data.version = 1;
        data.coleccion = 'Coleccion_Jikokun_001-100';
        data.inventario ||= {};
        data.porRareza ||= {};
        data.unicasPorRareza ||= {};
        data.ultimas = Array.isArray(data.ultimas) ? data.ultimas : Object.values(data.ultimas || {});
        data.ultimasPorRareza ||= {};
        data.compras ||= {};
        data.entregasPendientes ||= {};
        for (const rarity of RARITIES) {
            data.porRareza[rarity] = count(data.porRareza[rarity]);
            data.unicasPorRareza[rarity] = count(data.unicasPorRareza[rarity]);
        }
        return data;
    }
    function applyPurchase(current, request, helpers = {}) {
        if (!current) throw new Error('El usuario aún no tiene un perfil guardado en Firebase.');
        const user = copy(current);
        const cards = inventory(user);
        if (cards.compras[request.id]) {
            if (cards.compras[request.id].fingerprint !== request.fingerprint) throw new Error('El identificador pertenece a otra compra.');
            return user;
        }
        const boughtThisStream = Object.values(cards.compras).reduce((total, receipt) => {
            const fromThisStream = receipt.streamId === request.streamId ||
                (!receipt.streamId && request.streamStart && Number(receipt.timestamp) >= request.streamStart && Number(receipt.timestamp) <= request.now);
            return total + (fromThisStream ? (receipt.packs?.length || 0) : 0);
        }, 0);
        if (boughtThisStream + request.packs.length > MAX_PACKS_PER_STREAM) throw packLimitError();
        if (count(user.jikopuntos) < request.total) throw new Error('Jikopuntos insuficientes para esta compra.');
        let duplicates = 0, unique = 0;
        const awarded = [];
        for (let packIndex = 0; packIndex < request.packs.length; packIndex++) {
            const pack = request.packs[packIndex];
            for (let index = 0; index < pack.length; index++) {
                const card = pack[index];
                const number = String(card.id).padStart(3, '0');
                const previous = cards.inventario[number] || { cantidad: 0, rareza: card.rarity, primeraObtencion: request.now };
                const duplicate = count(previous.cantidad) > 0;
                if (duplicate) duplicates++; else { unique++; cards.unicasPorRareza[card.rarity]++; }
                cards.inventario[number] = { ...previous, cantidad: count(previous.cantidad) + 1, rareza: card.rarity, ultimaObtencion: request.now };
                cards.porRareza[card.rarity]++;
                const obtained = { cardId: card.id, rareza: card.rarity, timestamp: request.now, orden: packIndex * 3 + index, compraId: request.id, repetida: duplicate };
                awarded.push(obtained);
                cards.ultimas = [...cards.ultimas, obtained].slice(-5);
                const recent = Object.values(cards.ultimasPorRareza[card.rarity] || {});
                cards.ultimasPorRareza[card.rarity] = [...recent, obtained].slice(-5);
            }
        }
        const oldXp = user.experiencia == null ? count(user.asistenciasCount) * 200 : count(user.experiencia);
        const before = helpers.level ? helpers.level({ ...user, experiencia: oldXp }) : { nivel: count(user.nivel) || 1 };
        const factor = helpers.factor ? helpers.factor(before.nivel) : 1;
        const xpPerDuplicate = factor <= 0 ? 0 : Math.max(1, Math.floor(request.packPrice * request.config.duplicateXpPercent / 100 * factor));
        const bonus = duplicates * xpPerDuplicate;
        const foodXp = helpers.purchaseXp ? helpers.purchaseXp(request.foodCost, before.nivel) : Math.round(request.foodCost * .1 * factor);
        user.experiencia = oldXp + bonus + foodXp;
        const after = helpers.level ? helpers.level(user) : { nivel: before.nivel };
        for (const field of ['nivel', 'rangoTitulo', 'insigniaEmoji', 'porcentajeProgreso', 'xpEnNivel', 'xpParaSubir', 'xpFaltante']) if (after[field] !== undefined) user[field] = after[field];
        user.jikopuntos = count(user.jikopuntos) - request.total;
        user.totalGastado = count(user.totalGastado) + request.total;
        user.totalCompras = count(user.totalCompras) + 1;
        user.ultimaActividad = request.now;
        user.stats ||= {}; user.stats.platosConsumidos ||= {};
        for (const item of request.items.filter(item => item.key !== 'sobre')) user.stats.platosConsumidos[item.key] = count(user.stats.platosConsumidos[item.key]) + 1;
        user.widgets ||= {}; user.widgets.tiendita ||= {};
        user.widgets.tiendita.pedidosCount = count(user.widgets.tiendita.pedidosCount) + 1;
        user.widgets.tiendita.ultimoPedido = request.now;
        cards.totalCartas = count(cards.totalCartas) + awarded.length;
        cards.cartasUnicas = count(cards.cartasUnicas) + unique;
        cards.repetidas = count(cards.repetidas) + duplicates;
        cards.sobresComprados = count(cards.sobresComprados) + request.packs.length;
        cards.xpRepetidas = count(cards.xpRepetidas) + bonus;
        cards.pendiente = true;
        const receipt = { id: request.id, user: request.user, streamId: request.streamId, fingerprint: request.fingerprint, timestamp: request.now, costoTotal: request.total, precioSobre: request.packPrice, nuevoSaldo: user.jikopuntos, xpRepetidas: bonus, xpGanada: bonus + foodXp, nuevas: unique, repetidas: duplicates, packs: request.packs.map(pack => pack.map(card => card.id)), items: request.items, cartas: awarded, entregado: false };
        cards.compras[request.id] = receipt;
        cards.entregasPendientes[request.id] = true;
        user.tarjetas = cards;
        return user;
    }
    function recentCards(user, rarity = '') {
        const data = user?.tarjetas || {};
        return Object.values(rarity ? data.ultimasPorRareza?.[rarity] || {} : data.ultimas || {}).sort((a, b) => (b.timestamp - a.timestamp) || (b.orden - a.orden)).slice(0, 5);
    }
    function pending(control) {
        return Object.values(control?.jobs || {}).filter(job => !['done', 'cancelled'].includes(job.status)).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    }
    function reserve(current, job, settings, now) {
        const state = copy(current || { jobs: {}, cooldowns: {} });
        state.jobs ||= {}; state.cooldowns ||= {};
        if (state.jobs[job.id]) {
            if (state.jobs[job.id].user !== job.user || state.jobs[job.id].type !== job.type) throw new Error('Solicitud duplicada de otro usuario.');
            if (state.jobs[job.id].status !== 'cancelled') return state;
            delete state.jobs[job.id];
        }
        for (const [key, entry] of Object.entries(state.cooldowns)) if (now - entry.timestamp > 300000) delete state.cooldowns[key];
        const queue = pending(state);
        if (queue.length >= settings.maxQueue) throw new Error('La cola de tarjetas está llena. No se ha cobrado nada.');
        const last = state.cooldowns[job.user];
        const own = queue.filter(item => item.user === job.user);
        const afterPurchase = job.type === 'collection' && own.every(item => item.type === 'purchase') && (own.some(item => item.type === 'purchase') || state.jobs[last?.id]?.type === 'purchase');
        if (own.length && !afterPurchase) throw new Error('Ya tienes una solicitud de tarjetas en la cola.');
        if (last && now - last.timestamp < settings.userCooldownMs) {
            if (!afterPurchase) throw new Error('Espera ' + Math.ceil((settings.userCooldownMs - now + last.timestamp) / 1000) + ' segundos para volver a usar las tarjetas.');
            job.notBefore = last.timestamp + settings.userCooldownMs;
        }
        state.cooldowns[job.user] = { timestamp: now, id: job.id };
        state.jobs[job.id] = job;
        // Los recibos económicos se conservan en el perfil. Solo se recorta el historial visual terminado.
        const terminal = Object.values(state.jobs).filter(item => ['done', 'cancelled'].includes(item.status)).sort((a, b) => b.createdAt - a.createdAt);
        terminal.slice(60).forEach(item => delete state.jobs[item.id]);
        return state;
    }
    function claim(current, role, owner, token, now, settings) {
        if (!current) return;
        const state = copy(current);
        if (state.active && state.active.expiresAt > now) return;
        const job = pending(state)[0];
        if (!job || job.status === 'reserved' || Math.max(job.retryAt || 0, job.notBefore || 0) > now) return;
        // Una apertura exige el comprobante de que la mesa quedó vacía.
        // Los trabajos antiguos sin comprobante vuelven a entregar sus mismos
        // productos, sin repetir cobro ni sorteo.
        const delivered = Number(job.deliveryCompletedAt) > 0;
        const expected = job.type === 'collection' || (delivered && ['opening', 'awaiting_open'].includes(job.status)) ? 'cards' : 'delivery';
        if (role !== expected || (!job.startedAt && (state.nextStartAt || 0) > now)) return;
        if (!job.startedAt) { job.startedAt = now; state.nextStartAt = now + settings.globalCooldownMs; }
        delete job.retryAt; delete job.lastError;
        if (role === 'delivery') { job.deliveryAttemptAt = now; delete job.deliveryCompletedAt; }
        job.status = role === 'delivery' ? 'delivering' : job.type === 'collection' ? 'showing' : 'opening';
        state.active = { jobId: job.id, role, owner, token, expiresAt: now + 30000 };
        return state;
    }
    return Object.freeze({ RARITIES, MAX_PACKS_PER_STREAM, DEFAULT_CONFIG, copy, userKey, config, packLimitError, inventory, applyPurchase, recentCards, pending, reserve, claim });
});
