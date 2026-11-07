const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const Core = require('../tarjetero_sobres_core.js');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../data/tarjetas_default_data.js'), 'utf8'), context);
const source = context.window.DEFAULT_JIKOKUN_COLLECTIONS['Coleccion_Jikokun_001-100'].cards;
const catalog = Core.createCatalog(source);

function seededRandom(seed) {
    return () => {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
        value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
}

test('usa exactamente las cartas 001–100 y sus reversos oficiales sin modificar los datos', () => {
    assert.equal(catalog.length, 100);
    assert.equal(catalog[0].num, '001');
    assert.equal(catalog[99].num, '100');
    const pools = Core.createPools(catalog);
    assert.deepEqual(Object.fromEntries(Object.entries(pools).map(([rarity, cards]) => [rarity, cards.length])), { common: 45, special: 28, rare: 20, epic: 0, legendary: 7, mythic: 0 });
    catalog.forEach(card => {
        assert.equal(card.backImage, 'https://lh3.googleusercontent.com/d/' + Core.BACK_IDS[card.rarity]);
        assert.equal(card.frontImage, source.find(item => item.id === card.id).frontImage);
        assert.ok(Object.isFrozen(card));
    });
    assert.equal(source[0].rarity, 'COMÚN');
    assert.throws(() => Core.createCatalog(source.slice(0, 99)), /100 cartas/);
    assert.throws(() => Core.createCatalog(source.map((card, i) => i === 1 ? { ...card, num: '001' } : card)), /repetida/);
});

test('respeta los umbrales de 0.05%, permite comunes repetidas y evita repetir las de mayor rareza', () => {
    const values = [0, .9604999, .9605, .9904999, .9905, .9994999, .9995, .999999];
    const expected = ['common', 'common', 'special', 'special', 'rare', 'rare', 'legendary', 'legendary'];
    values.forEach((value, i) => {
        const pack = Core.drawPack(catalog, { rng: () => value });
        assert.equal(pack.cards.length, 3);
        assert.ok(pack.cards.every(card => card.rarity === expected[i]));
        assert.equal(new Set(pack.cards.map(card => card.id)).size, expected[i] === 'common' ? 1 : 3);
        assert.equal(pack.highestRarity, expected[i]);
        assert.equal(pack.mode, 'random');
    });
    assert.throws(() => Core.drawPack(catalog, { rng: () => 1 }), /excluyendo 1/);
});

test('las rarezas ausentes transfieren su peso a común sin aumentar el 0.05% legendario', () => {
    const probabilities = cards => Object.fromEntries(Core.distribution(cards).map(item => [item.rarity, item.probability]));
    assert.deepEqual(probabilities(catalog), { common: .9605, special: .03, rare: .009, epic: 0, legendary: .0005, mythic: 0 });
    const withEpic = Core.createCatalog(source.map((card, i) => i === 0 ? { ...card, rarity: 'ÉPICO' } : card));
    assert.deepEqual(probabilities(withEpic), { common: .96, special: .03, rare: .009, epic: .0005, legendary: .0005, mythic: 0 });
    const noRare = Core.createCatalog(source.map(card => card.rarity === 'RARO' ? { ...card, rarity: 'COMÚN' } : card));
    assert.equal(probabilities(noRare).legendary, .0005);
    assert.equal(probabilities(noRare).common, .9695);
    assert.throws(() => Core.distribution(catalog.filter(card => card.rarity !== 'common')), /necesita cartas comunes/);
});

test('las pruebas visuales son explícitas y no inventan épicas ni míticas', () => {
    for (const rarity of ['common', 'special', 'rare', 'legendary']) {
        const pack = Core.drawPack(catalog, { mode: 'preview', rarity, rng: seededRandom(8) });
        assert.equal(pack.mode, 'preview');
        assert.equal(pack.highestRarity, rarity);
        assert.equal(pack.cards[0].rarity, 'common');
        assert.equal(pack.cards[1].rarity, rarity);
        assert.equal(pack.cards[2].rarity, 'common');
    }
    assert.throws(() => Core.drawPack(catalog, { mode: 'preview', rarity: 'epic' }), /no contiene/);
    assert.throws(() => Core.drawPack(catalog, { mode: 'preview', rarity: 'mythic' }), /no contiene/);
    assert.equal(Core.normalizeRarity('ÉPICA'), 'epic');
});

test('300000 cartas mantienen predominio común y solo 0.05% de legendarias por carta', t => {
    const rng = seededRandom(20261107);
    const counts = { common: 0, special: 0, rare: 0, legendary: 0 };
    let legendaryPacks = 0;
    let allCommonPacks = 0;
    const packs = 100000;
    for (let i = 0; i < packs; i++) {
        const pack = Core.drawPack(catalog, { rng });
        pack.cards.forEach(card => counts[card.rarity]++);
        if (pack.cards.some(card => card.rarity === 'legendary')) legendaryPacks++;
        if (pack.cards.every(card => card.rarity === 'common')) allCommonPacks++;
    }
    for (const item of Core.distribution(catalog).filter(item => item.probability > 0)) {
        const expected = packs * 3 * item.probability;
        const tolerance = 6 * Math.sqrt(packs * 3 * item.probability * (1 - item.probability));
        assert.ok(Math.abs(counts[item.rarity] - expected) < tolerance, item.rarity);
    }
    const expectedLegendaryPacks = Core.chanceInPack(.0005);
    assert.ok(Math.abs(legendaryPacks / packs - expectedLegendaryPacks) < 6 * Math.sqrt(expectedLegendaryPacks * (1 - expectedLegendaryPacks) / packs));
    assert.ok(Math.abs(Core.chanceInPack(.0005) - .001499250125) < 1e-12);
    assert.ok(Math.abs(allCommonPacks / packs - Math.pow(.9605, 3)) < .006);
    assert.ok(allCommonPacks / packs > .88);
    t.diagnostic(JSON.stringify({ cards: packs * 3, counts, legendaryPacks, allCommonPacks }));
});

test('el archivo anterior se conserva completo y el widget nuevo no activa sus integraciones', () => {
    const legacy = fs.readFileSync(path.join(__dirname, '../tarjetero_mostrador_legacy.html.txt'), 'utf8');
    const current = fs.readFileSync(path.join(__dirname, '../tarjetero.html'), 'utf8');
    assert.ok(legacy.startsWith('<!DOCTYPE html>'));
    assert.ok(legacy.includes('function transitionToNextBatch()'));
    assert.ok(legacy.includes("clean === '!tarjetasjikokun'"));
    assert.ok(legacy.includes("clean === '!ocultartarjetas'"));
    assert.ok(!current.includes('firebase-app-compat'));
    assert.ok(!current.includes('new WebSocket'));
});
