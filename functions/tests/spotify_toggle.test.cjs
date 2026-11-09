const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { toggleSpotifyPlayback } = require('../spotify_toggle');

function setup({ playing = true, readStatus = 200, writeStatus = 204, device = 'desktop', fallback = null } = {}) {
    let clock = 1000000;
    const locks = new Map();
    const calls = [], events = [];
    const db = { ref: path => ({
        async transaction(update) {
            const next = update(locks.get(path) || null);
            if (next === undefined) return { committed: false };
            locks.set(path, next);
            return { committed: true };
        },
        async set(value) { events.push({ path, value }); }
    }) };
    const args = {
        user: 'jikokun2', db, now: () => clock,
        getFallbackDeviceId: async () => fallback,
        async spotifyApiFetch(user, url, options = {}) {
            calls.push({ user, url, method: options.method || 'GET' });
            if (!options.method) return { res: { status: readStatus, json: async () => ({ is_playing: playing, device: { id: device } }) } };
            if (writeStatus === 204) playing = url.includes('/play?') || url.endsWith('/play');
            return { res: { status: writeStatus } };
        }
    };
    return { args, calls, events, advance: ms => { clock += ms; }, run: () => toggleSpotifyPlayback(args) };
}

test('consulta el estado real, pausa y después reanuda sin cambiar la pista', async () => {
    const h = setup();
    const pause = await h.run();
    assert.equal(pause.action, 'pause');
    assert.equal(pause.is_playing, false);
    assert.equal(pause.message, 'Música pausada.');
    assert.match(h.calls[1].url, /\/pause\?device_id=desktop$/);
    assert.equal(h.calls[1].method, 'PUT');
    h.advance(2501);
    const play = await h.run();
    assert.equal(play.action, 'play');
    assert.equal(play.is_playing, true);
    assert.equal(play.message, 'Música reanudada.');
    assert.deepEqual(h.events.map(event => event.value.action), ['pause', 'play']);
    assert.equal(h.calls.length, 4);
});

test('dos solicitudes simultáneas producen un solo cambio', async () => {
    const h = setup({ playing: false });
    const results = await Promise.all([h.run(), h.run()]);
    assert.equal(results.filter(result => result.suppressed).length, 1);
    assert.equal(h.calls.filter(call => call.method === 'PUT').length, 1);
    assert.equal(h.events.length, 1);
    assert.equal((await h.run()).suppressed, true);
    h.advance(2501);
    assert.equal((await h.run()).action, 'pause');
});

test('sin sesión activa busca un dispositivo para reanudar', async () => {
    const h = setup({ readStatus: 204, fallback: 'other device' });
    assert.equal((await h.run()).action, 'play');
    assert.match(h.calls[1].url, /\/play\?device_id=other%20device$/);
});

test('sin dispositivo informa el problema y no intenta cambiar reproducción', async () => {
    const h = setup({ readStatus: 204 });
    assert.equal((await h.run()).status, 409);
    assert.equal(h.calls.length, 1);
    assert.equal(h.events.length, 0);
});

test('un error al consultar el estado no se interpreta como pausa', async () => {
    const h = setup({ readStatus: 429 });
    assert.equal((await h.run()).status, 429);
    assert.equal(h.calls.length, 1);
    assert.equal(h.events.length, 0);
});

test('un estado incompleto no dispara una reproducción por defecto', async () => {
    const h = setup({ playing: null });
    assert.equal((await h.run()).status, 502);
    assert.equal(h.calls.length, 1);
});

test('un 403 de control se informa como error sin publicar éxito', async () => {
    const h = setup({ writeStatus: 403 });
    const result = await h.run();
    assert.equal(result.status, 403);
    assert.equal(result.success, false);
    assert.equal(h.events.length, 0);
});

test('un fallo de red no reintenta la escritura y mantiene el margen antiduplicado', async () => {
    const h = setup();
    const api = h.args.spotifyApiFetch;
    h.args.spotifyApiFetch = async (...args) => {
        const response = await api(...args);
        if (args[2]?.method === 'PUT') throw Error('Respuesta perdida');
        return response;
    };
    await assert.rejects(h.run(), /Respuesta perdida/);
    assert.equal((await h.run()).suppressed, true);
    assert.equal(h.calls.length, 2);
    assert.equal(h.events.length, 0);
});

test('la función HTTP admite toggle, playpause, .php y cmd, con texto o JSON', async () => {
    const source = fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8');
    const calls = [];
    const context = {
        exports: {}, functions: { https: { onRequest: handler => handler } },
        admin: { database: () => ({ ref: () => ({}) }) },
        toggleSpotifyPlayback: async ({ user }) => {
            calls.push(user);
            return { status: 200, success: true, action: 'pause', is_playing: false, message: 'Música pausada.' };
        },
        spotifyApiFetch() {}, getFallbackDeviceId() {}, console
    };
    vm.runInNewContext(source.slice(source.indexOf('exports.spotifyControl =')), context);
    for (const [route, query] of [
        ['/spotify/toggle', { user: 'Jikokun2' }],
        ['/spotify/playpause.php', { user: 'jikokun2', format: 'json' }],
        ['/spotifyControl', { user: 'jikokun2', cmd: 'toggle' }]
    ]) {
        const response = { headers: {}, set(key, value) { this.headers[key] = value; return this; }, status(code) { this.code = code; return this; }, send(body) { this.body = body; }, json(body) { this.body = body; } };
        await context.exports.spotifyControl({ method: 'GET', path: route, query }, response);
        assert.equal(response.code, 200);
        assert.equal(response.headers['Cache-Control'], 'no-store');
        if (query.format === 'json') assert.equal(response.body.is_playing, false);
        else assert.equal(response.body, 'Música pausada.');
    }
    assert.deepEqual(calls, ['jikokun2', 'jikokun2', 'jikokun2']);
});
