/* Motor del simulador. No realiza compras ni escribe en servicios externos. */
(function (root, factory) {
    'use strict';
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.JikoBoosterCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const RARITIES = Object.freeze({
        common: Object.freeze({ label: 'COMÚN', rank: 0, color: '#38bdf8', secondary: '#0284c7' }),
        special: Object.freeze({ label: 'ESPECIAL', rank: 1, color: '#ec4899', secondary: '#06b6d4' }),
        rare: Object.freeze({ label: 'RARO', rank: 2, color: '#10b981', secondary: '#06b6d4' }),
        epic: Object.freeze({ label: 'ÉPICO', rank: 3, color: '#a855f7', secondary: '#ec4899' }),
        legendary: Object.freeze({ label: 'LEGENDARIO', rank: 4, color: '#facc15', secondary: '#f97316' }),
        mythic: Object.freeze({ label: 'MÍTICO', rank: 5, color: '#ff0055', secondary: '#00f3ff' })
    });

    // Pesos POR CARTA. Tres sorteos independientes de rareza por sobre.
    // El peso de una rareza sin cartas se añade a COMÚN, conservando el resto
    // de probabilidades. Con el catálogo actual: 96.05 / 3 / 0.9 / 0 / 0.05 / 0.
    const WEIGHTS = Object.freeze({ common: 96, special: 3, rare: .9, epic: .05, legendary: .05, mythic: 0 });
    const ROLL_UNITS = 10000; // Una unidad = 0.01%; cinco unidades = 0.05%.
    const BACK_IDS = Object.freeze({
        common: '1ZXeStFshIwz17abshEZk2vN5S5U2spoP',
        special: '176O8_28j-BkbGQw-ZP6QkVj0uA5MPi2I',
        rare: '1x4v_Ww6aALa0JCBW15Hjd2LEapiXEbro',
        epic: '1JBAM1EjFD_ABmAKiML89OYzDorURbFeM',
        legendary: '1q_5d9qw09uI_Bpl1WppeYAFZEXwbUuHG',
        mythic: '1OnQ1h9MO7SjwNiBhPDCNNt2tesa1-qrY'
    });
    const PACK_ART = Object.freeze({
        front: 'https://lh3.googleusercontent.com/d/1YqH7yeTZkVAtZUSnbB-YzqV2Xffcm55K',
        back: 'https://lh3.googleusercontent.com/d/10QlcwL_GMvoghpRbZIcs20PJfBd76bEz'
    });

    function normalizeRarity(value) {
        const key = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const aliases = { comun: 'common', comunes: 'common', especial: 'special', especiales: 'special', raro: 'rare', rara: 'rare', raros: 'rare', raras: 'rare', epico: 'epic', epica: 'epic', epicos: 'epic', epicas: 'epic', legendario: 'legendary', legendaria: 'legendary', legendarios: 'legendary', legendarias: 'legendary', mitico: 'mythic', mitica: 'mythic', miticos: 'mythic', miticas: 'mythic', ultra_rara: 'mythic' };
        const rarity = aliases[key] || key;
        if (!RARITIES[rarity]) throw new Error('Rareza desconocida: ' + value);
        return rarity;
    }

    function createCatalog(source) {
        if (!Array.isArray(source) || source.length !== 100) throw new Error('Se necesitan las 100 cartas de la colección 001–100.');
        const ids = new Set();
        const catalog = source.map(card => {
            const id = Number(card.num ?? card.id);
            if (!Number.isInteger(id) || id < 1 || id > 100 || ids.has(id)) throw new Error('Numeración inválida o repetida en la colección 001–100.');
            if (!card.frontImage || !card.title) throw new Error('La carta ' + id + ' no tiene portada o título.');
            ids.add(id);
            const rarity = normalizeRarity(card.rarity);
            return Object.freeze({ ...card, id, num: String(id).padStart(3, '0'), rarity, backImage: 'https://lh3.googleusercontent.com/d/' + BACK_IDS[rarity] });
        });
        return Object.freeze(catalog.sort((a, b) => a.id - b.id));
    }

    function createPools(catalog) {
        return Object.fromEntries(Object.keys(RARITIES).map(rarity => [rarity, catalog.filter(card => card.rarity === rarity)]));
    }

    function distribution(catalog) {
        const pools = createPools(catalog);
        if (!pools.common.length) throw new Error('La colección necesita cartas comunes para realizar el sorteo.');
        const units = Object.fromEntries(Object.keys(WEIGHTS).map(rarity => [rarity, Math.round(WEIGHTS[rarity] * 100)]));
        for (const rarity of Object.keys(units)) {
            if (rarity !== 'common' && !pools[rarity].length) {
                units.common += units[rarity];
                units[rarity] = 0;
            }
        }
        return Object.keys(RARITIES).map(rarity => Object.freeze({ rarity, count: pools[rarity].length, probability: units[rarity] / ROLL_UNITS }));
    }

    function random() {
        if (typeof globalThis.crypto?.getRandomValues === 'function') {
            return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
        }
        return Math.random();
    }

    function unit(rng) {
        const result = rng();
        if (!Number.isFinite(result) || result < 0 || result >= 1) throw new Error('El sorteo necesita un valor entre 0 y 1, excluyendo 1.');
        return result;
    }

    function highestRarity(cards) {
        return cards.reduce((best, card) => RARITIES[card.rarity].rank > RARITIES[best].rank ? card.rarity : best, 'common');
    }

    function drawPack(catalog, options = {}) {
        const rng = options.rng || random;
        const mode = options.mode || 'random';
        if (mode !== 'random' && mode !== 'preview') throw new Error('Modo de sobre desconocido.');
        const pools = createPools(catalog);
        const odds = distribution(catalog).filter(item => item.probability > 0);
        let forced = null;
        if (mode === 'preview') {
            forced = normalizeRarity(options.rarity || 'legendary');
            if (!pools[forced].length) throw new Error('Esta colección no contiene cartas de rareza ' + RARITIES[forced].label + '.');
        }
        const selected = new Set();
        const cards = Array.from({ length: 3 }, (_, index) => {
            let rarity;
            if (forced) rarity = index === 1 ? forced : 'common';
            else {
                const roll = unit(rng) * ROLL_UNITS;
                let limit = 0;
                rarity = odds[odds.length - 1].rarity;
                for (const item of odds) {
                    limit += Math.round(item.probability * ROLL_UNITS);
                    if (roll < limit) { rarity = item.rarity; break; }
                }
            }
            // Las comunes se sortean con reposición, también dentro del sobre.
            // Las cartas de mayor rareza conservan la exclusión por ID.
            const available = rarity === 'common' ? pools.common : pools[rarity].filter(card => !selected.has(card.id));
            if (!available.length) throw new Error('No hay suficientes cartas distintas de rareza ' + rarity + '.');
            const card = available[Math.floor(unit(rng) * available.length)];
            selected.add(card.id);
            return card;
        });
        return Object.freeze({ mode, cards: Object.freeze(cards), highestRarity: highestRarity(cards) });
    }

    function chanceInPack(probability) { return 1 - Math.pow(1 - probability, 3); }

    return Object.freeze({ RARITIES, WEIGHTS, BACK_IDS, PACK_ART, normalizeRarity, createCatalog, createPools, distribution, drawPack, highestRarity, chanceInPack });
});
