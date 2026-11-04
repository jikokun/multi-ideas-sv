const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CasinoController } = require('../js/jiko_casino.js');

function setup(sync) {
  const calls = [];
  const errors = [];
  let time = 100000;
  const controller = new CasinoController({ sync, now: () => time, onError: error => errors.push(error) });
  const states = {};
  for (const name of ['ruleta', 'tragamonedas']) {
    const state = states[name] = { visible: false, spinning: false, pending: false };
    controller.register(name, {
      status: () => ({ ...state }),
      command: async (text, user) => {
        calls.push({ name, text, user });
        if (/^!(ruleta|slot)(\s|$)/.test(text)) {
          assert.ok(controller.acquire(name, user));
          state.visible = true;
        }
      },
      close: async () => { calls.push({ name, text: 'CLOSE' }); state.visible = false; }
    });
  }
  return { controller, calls, states, errors, advance: ms => { time += ms; } };
}

test('each user spins their own game; unknown users cannot spin or exit another turn', async () => {
  const { controller: c, calls } = setup();
  await Promise.all([c.command('!ruleta', '@ANA'), c.command('!slot', 'bob')]);
  await c.command('!apostar 50 rojo', 'ana');
  await c.command('!girar', 'ana');
  await c.command('!girar 25', 'bob');
  const count = calls.length;
  await c.command('!girar 500', 'outsider');
  await c.command('!salir', 'outsider');
  assert.equal(calls.length, count);
  assert.deepEqual(calls.slice(-2), [
    { name: 'ruleta', text: '!girar', user: 'ana' },
    { name: 'tragamonedas', text: '!girar 25', user: 'bob' }
  ]);
});

test('queues are independent and an exit releases only the selected game', async () => {
  const { controller: c } = setup();
  await c.command('!ruleta', 'ana');
  await c.command('!ruleta', 'carla');
  await c.command('!slot', 'bob');
  await c.command('!slots', 'dan');
  await c.command('!girar', 'carla');
  assert.equal(c.games.get('ruleta').owner, 'ana');
  await c.command('!salir', 'ana');
  await c.tick();
  assert.equal(c.games.get('ruleta').owner, 'carla');
  assert.equal(c.games.get('tragamonedas').owner, 'bob');
  assert.equal(c.games.get('tragamonedas').queue[0].sender, 'dan');
});

test('cross-transport duplicates and repeated IDs are discarded; legitimate same-source commands remain', async () => {
  const { controller: c, calls, advance } = setup();
  await c.command('!slot', 'ana');
  await c.command('!girar 50', 'ana', 'kick', 'one');
  await c.command('!girar 50', 'ana', 'streamerbot', 'different-id');
  await c.command('!girar 50', 'ana', 'kick', 'one');
  await c.command('!girar 50', 'ana', 'kick', 'two');
  assert.equal(calls.filter(call => call.text === '!girar 50').length, 2);
  advance(2000);
  await c.command('!girar 50', 'ana', 'streamerbot', 'three');
  assert.equal(calls.filter(call => call.text === '!girar 50').length, 3);
});

test('switching games closes the previous session before activation, including awaited refunds', async () => {
  const { controller: c, calls } = setup();
  let refunded = false;
  c.games.get('ruleta').adapter.close = async () => {
    await new Promise(resolve => setImmediate(resolve));
    refunded = true;
    calls.push({ name: 'ruleta', text: 'REFUND' });
  };
  await c.command('!ruleta', 'ana');
  await c.command('!slot', 'ana');
  assert.ok(refunded);
  assert.equal(c.games.get('ruleta').owner, '');
  assert.equal(c.games.get('tragamonedas').owner, 'ana');
  assert.equal(c.context.get('ana'), 'tragamonedas');
  assert.deepEqual(calls.slice(-2).map(item => item.text), ['REFUND', '!slot']);
});

test('a spin or pending transaction prevents switching, queue waits for completion', async () => {
  const { controller: c, states } = setup();
  await c.command('!ruleta', 'ana');
  states.ruleta.spinning = true;
  await c.command('!slot', 'ana');
  await c.command('!ruleta cerrar', 'ana');
  await c.tick();
  assert.equal(c.games.get('ruleta').owner, 'ana');
  assert.equal(c.games.get('tragamonedas').owner, '');
  states.ruleta.spinning = false;
  states.ruleta.pending = true;
  await c.tick();
  assert.equal(c.games.get('tragamonedas').owner, '');
  states.ruleta.pending = false;
  await c.tick();
  assert.equal(c.games.get('tragamonedas').owner, 'ana');
});

test('the ecosystem lock survives one game ending and is released after both end', async () => {
  let lock = null;
  const sync = {
    getActiveLock: () => lock,
    acquire: (widget, user) => { lock = { widget, user }; },
    release: widget => { assert.equal(widget, 'casino'); lock = null; }
  };
  const { controller: c } = setup(sync);
  lock = { widget: 'cajero' };
  await c.command('!slot', 'ana');
  await c.command('!ruleta', 'bob');
  assert.equal(c.games.get('tragamonedas').owner, '');
  lock = null;
  await c.tick();
  assert.equal(lock.widget, 'casino');
  await c.command('!salir', 'ana');
  assert.equal(lock.widget, 'casino');
  await c.command('!salir', 'bob');
  assert.equal(lock, null);
});

test('queued users can cancel, expire and change their requested game without stale activations', async () => {
  const { controller: c, advance } = setup();
  await c.command('!ruleta', 'ana');
  await c.command('!ruleta', 'bob');
  await c.command('!salir', 'bob');
  assert.equal(c.games.get('ruleta').queue.length, 0);
  await c.command('!ruleta', 'bob');
  await c.command('!slot', 'bob');
  await c.tick();
  assert.equal(c.games.get('ruleta').queue.length, 0);
  await c.command('!ruleta', 'carla');
  advance(180001);
  await c.tick();
  assert.equal(c.games.get('ruleta').queue.length, 0);
});

test('aliases route consistently, and apostar only applies to a roulette context', async () => {
  const { controller: c, calls } = setup();
  await c.command('!roulette', { username: '@Ana' });
  await c.command('!bet 100 17', 'ana');
  await c.command('!spin', 'ana');
  await c.command('!tragamoneda', 'bob');
  const count = calls.length;
  await c.command('!apostar 50 rojo', 'bob');
  assert.equal(calls.length, count);
  assert.equal(calls[1].text, '!apostar 100 17');
  await c.command('!giro salir', 'bob');
  assert.equal(c.games.get('tragamonedas').owner, '');
  assert.equal(c.games.get('ruleta').owner, 'ana');
});
