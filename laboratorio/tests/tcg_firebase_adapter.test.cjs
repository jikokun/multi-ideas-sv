const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function adapter() {
    const watchers = new Map();
    let store;
    let calls = 0;
    const source = fs.readFileSync(path.join(__dirname, '../../mini_widgets/js/jiko_tcg_firebase.js'), 'utf8')
        .replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '');
    const sdk = {
        rtdb: {}, auth: {}, ref: (_, key) => key,
        onValue: (key, listener) => {
            watchers.set(key, listener);
            if (!key.startsWith('.info/')) queueMicrotask(() => listener({ val: () => ({ jikopuntos: 3000 }) }));
            return () => watchers.delete(key);
        },
        get: async key => { calls++; throw Error('Invalid token in path: ' + key); },
        runTransaction: async (key, update) => {
            assert.ok(watchers.has(key), 'el observador mantiene el perfil en caché durante el pago');
            return { committed: true, snapshot: { val: () => update({ jikopuntos: 3000 }) } };
        },
        window: { JikoTcgService: class { constructor(value) { store = value; } } },
        console, queueMicrotask, Date, Number, Promise
    };
    vm.runInNewContext(source, sdk);
    return { store, watchers, calls: () => calls, sdk };
}

test('el pago consulta la conexión observada y nunca hace get() de .info/connected', async () => {
    const { store, watchers, calls } = adapter();
    assert.equal(await store.isOnline(), false);
    watchers.get('.info/connected')({ val: () => true });
    assert.equal(await store.isOnline(), true);
    watchers.get('.info/connected')({ val: () => false });
    assert.equal(await store.isOnline(), false);
    assert.equal(calls(), 0);
});

test('la transacción espera el dato inicial y libera su observador al terminar o fallar', async () => {
    const { store, watchers, sdk } = adapter();
    const result = await store.transaction('stream/usuarios/ana', user => ({ ...user, jikopuntos: user.jikopuntos - 1500 }));
    assert.equal(result.committed, true);
    assert.equal(result.value.jikopuntos, 1500);
    assert.equal(watchers.has('stream/usuarios/ana'), false);
    sdk.runTransaction = async () => { throw Error('network failure'); };
    await assert.rejects(store.transaction('stream/usuarios/ana', user => user), /network failure/);
    assert.equal(watchers.has('stream/usuarios/ana'), false);
});
