const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const folder of ['laboratorio', 'mini_widgets']) {
  test(`${folder}: una ficha sin cobrar no queda apostada ni genera reembolso`, async () => {
    const html = fs.readFileSync(path.join(__dirname, '../../', folder, 'ruleta.html'), 'utf8');
    const start = html.indexOf('  async function placeBetOnZone(');
    const end = html.indexOf('  function clearAllBets()', start);
    const state = { points: 5000, bets: {}, syncedChatStake: 0, activePlayer: { username: 'ana' } };
    const context = vm.createContext({ state, MAX_ROULETTE_BETS: 10, MAX_CASINO_BET: 5000,
      getTotalBetAmount: () => Object.values(state.bets).reduce((sum, value) => sum + value, 0),
      norm: s => s, playChipSound() {}, updateBettingUI() {}, console: { warn() {} },
      window: { StreamDB: { addJikopuntos: async () => { throw new Error('Saldo insuficiente'); } } }
    });
    vm.runInContext(html.slice(start, end), context);
    await context.placeBetOnZone('RED', false, 1000);
    assert.equal(state.points, 5000);
    assert.equal(Object.keys(state.bets).length, 0);
    assert.equal(state.syncedChatStake, 0);
    assert.equal(state.chatTransactionPending, false);
  });

  test(`${folder}: una ficha pendiente bloquea otra apuesta y usa el saldo confirmado al terminar`, async () => {
    const html = fs.readFileSync(path.join(__dirname, '../../', folder, 'ruleta.html'), 'utf8');
    const start = html.indexOf('  async function placeBetOnZone(');
    const end = html.indexOf('  function clearAllBets()', start);
    let finish, charges = 0;
    const state = { points: 5000, bets: {}, syncedChatStake: 0, activePlayer: { username: 'ana' } };
    const context = vm.createContext({ state, MAX_ROULETTE_BETS: 10, MAX_CASINO_BET: 5000,
      getTotalBetAmount: () => Object.values(state.bets).reduce((sum, value) => sum + value, 0),
      norm: s => s, playChipSound() {}, updateBettingUI() {}, console: { warn() {} },
      window: { StreamDB: { addJikopuntos: () => { charges++; return new Promise(resolve => { finish = resolve; }); } } }
    });
    vm.runInContext(html.slice(start, end), context);
    const first = context.placeBetOnZone('RED', false, 1000);
    assert.equal(state.chatTransactionPending, true);
    await context.placeBetOnZone('BLACK', false, 1000);
    assert.equal(charges, 1);
    finish(3500); // Otro gasto concurrente ya está incluido en el saldo remoto.
    await first;
    assert.equal(state.points, 3500);
    assert.equal(state.syncedChatStake, 1000);
    assert.equal(state.bets.RED, 1000);
    assert.equal(state.bets.BLACK, undefined);
  });

  test(`${folder}: un débito rechazado detiene la tragamonedas antes de girar`, async () => {
    const html = fs.readFileSync(path.join(__dirname, '../../', folder, 'tragamonedas.html'), 'utf8').replace(/\r\n/g, '\n');
    const start = html.indexOf('      // Descontar la apuesta en Firebase RTDB');
    const end = html.indexOf('\n    }\n  }\n', start);
    assert.ok(start > 0 && end > start);
    let spins = 0;
    const state = { bet: 500, spinStartPending: true, tiempoInactividad: 30 };
    const context = vm.createContext({ state, sNorm: 'ana', forcedMode: null,
      window: { StreamDB: { addJikopuntos: async () => { throw new Error('Desconectado'); } } },
      console: { warn() {} }, iniciarTemporizadorInactividad() {}, triggerSpin() { spins++; }
    });
    vm.runInContext('async function run() {\n' + html.slice(start, end) + '\n}', context);
    await context.run();
    assert.equal(spins, 0);
    assert.equal(state.spinStartPending, false);
  });
}
