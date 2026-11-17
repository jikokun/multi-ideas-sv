import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const code = await readFile(new URL('../../overley_navideños/luces.js', import.meta.url), 'utf8');
const context = { window: {} };
vm.runInNewContext(code, context);
const { sample, createClock } = context.window.NavidadLights;
const loudMusic = Object.freeze({ playing: true, bpm: 100000, energy: 1, pulse: 1 });
const maxDifference = (a, b) => Math.max(0, ...a.map((value, index) => Math.abs(value - b[index])));
const range = values => Math.max(...values) - Math.min(...values);
const center = values => {
  const floor = Math.min(...values);
  const weights = values.map(value => value - floor);
  return weights.reduce((sum, value, index) => sum + value * index, 0) / weights.reduce((sum, value) => sum + value, 0);
};
const advanceClock = (clock, from, to, music = {}, enabled = true) => {
  let frame;
  for (let time = from; time <= to; time += 16) frame = clock.sample({ time, music, enabled });
  return frame;
};

test('el reloj integra BPM reales: la música lenta y rápida mueven los dibujos a distinto ritmo', () => {
  const slow = advanceClock(createClock(), 0, 16000, { playing: true, bpm: 76 });
  const fast = advanceClock(createClock(), 0, 16000, { playing: true, bpm: 148 });
  const idle = advanceClock(createClock(), 0, 16000);
  assert.equal(slow.mode, 'music');
  assert.equal(fast.mode, 'music');
  assert.equal(idle.mode, 'auto');
  assert(Math.abs(slow.rate - .76) < .001);
  assert(Math.abs(fast.rate - 1.48) < .001);
  assert(slow.time < 13000);
  assert(fast.time > 22500);
  assert.equal(idle.time, 16000);
  assert.equal(idle.rate, 1);
  assert.notDeepEqual(Array.from(sample({ time: slow.time }).levels), Array.from(sample({ time: fast.time }).levels));
});

test('el reloj usa el pulso recibido para acentuar el movimiento sin inventar BPM', () => {
  const pulsed = createClock();
  const plain = createClock();
  let previous = pulsed.sample({ time: 0 });
  let peak = 1;
  let trough = 2;
  let baseline;
  for (let time = 16; time <= 9600; time += 16) {
    const pulse = Math.max(0, 1 - (time % 600) / 140);
    const frame = pulsed.sample({ time, music: { playing: true, bpm: null, energy: .7, pulse } });
    baseline = plain.sample({ time, music: { playing: true, bpm: null, energy: .7, pulse: 0 } });
    assert(Math.abs(frame.rate - previous.rate) <= .014401);
    assert(frame.time > previous.time);
    if (time > 2400) {
      peak = Math.max(peak, frame.rate);
      trough = Math.min(trough, frame.rate);
    }
    previous = frame;
  }
  assert.equal(baseline.rate, 1);
  assert.equal(baseline.mode, 'auto');
  assert(peak - trough > .05);
  assert(previous.time > baseline.time + 100);
  assert.equal(previous.mode, 'music');
});

test('reproducir, cambiar canción y pausar conservan la fase y suavizan la velocidad', () => {
  const clock = createClock();
  const first = clock.sample({ time: 28000 });
  assert.equal(first.time, 28000);
  const slow = { playing: true, bpm: 76, pulse: 0, track: 'slow' };
  const fast = { playing: true, bpm: 148, pulse: 1, track: 'fast' };
  let previous = advanceClock(clock, 28016, 32000, slow);
  const changed = clock.sample({ time: 32000, music: fast });
  assert.equal(changed.time, previous.time);
  assert.equal(changed.rate, previous.rate);
  for (let time = 32016; time <= 36000; time += 16) {
    const frame = clock.sample({ time, music: fast });
    assert(Math.abs(frame.rate - previous.rate) <= .014401);
    assert(frame.time > previous.time);
    assert(frame.time - previous.time <= 16 * 1.95);
    assert(maxDifference(sample({ time: previous.time }).levels, sample({ time: frame.time }).levels) < .06);
    previous = frame;
  }
  const paused = clock.sample({ time: 36000, music: { ...fast, playing: false } });
  assert.equal(paused.time, previous.time);
  assert.equal(paused.mode, 'auto');
  const idle = advanceClock(clock, 36016, 52000, { ...fast, playing: false });
  assert.equal(idle.mode, 'auto');
  assert.equal(idle.rate, 1);
  assert(idle.time > paused.time);
});

test('desactivar congela el reloj y reanudar o volver de una pestaña oculta no recupera tiempo', () => {
  const clock = createClock();
  const music = { playing: true, bpm: 148, pulse: .6 };
  const before = advanceClock(clock, 0, 8000, music);
  const disabled = clock.sample({ time: 8016, music, enabled: false });
  assert.equal(disabled.time, before.time);
  assert.equal(disabled.rate, 0);
  assert.equal(disabled.mode, 'paused');
  const stillDisabled = clock.sample({ time: 7200000, music, enabled: false });
  assert.equal(stillDisabled.time, before.time);
  const resumed = clock.sample({ time: 7200016, music });
  assert.equal(resumed.time, before.time);
  assert.equal(resumed.rate, before.rate);
  const next = clock.sample({ time: 7200032, music });
  assert(next.time > resumed.time);
  assert(next.time - resumed.time <= 16 * 1.95);
  const hidden = clock.sample({ time: 14400000, music });
  assert.equal(hidden.time, next.time);
  const returned = clock.sample({ time: 14400016, music });
  assert(returned.time > hidden.time);
  assert(returned.time - hidden.time <= 16 * 1.95);
});

test('el reloj tolera señales vacías o extremas, limita velocidad y mantiene instancias independientes', () => {
  for (const bpm of [null, undefined, NaN, Infinity, -40, 0, 39, 241, 100000, '148']) {
    const frame = advanceClock(createClock(), 0, 1600, { playing: true, bpm, pulse: NaN, energy: Infinity });
    assert.equal(frame.rate, 1);
    assert.equal(frame.time, 1600);
    assert.equal(frame.mode, 'auto');
  }
  for (const music of [null, {}, { playing: false, bpm: 240, pulse: 1, energy: 1 }, { playing: true, bpm: 40, pulse: -100, energy: -100 }, loudMusic, { playing: true, bpm: 240, pulse: 100, energy: 100 }]) {
    const clock = createClock();
    let previous = clock.sample({ time: 0, music });
    for (let time = 16; time <= 16000; time += 16) {
      const frame = clock.sample({ time, music });
      assert(Number.isFinite(frame.time) && frame.time >= previous.time);
      assert(Number.isFinite(frame.rate) && frame.rate >= .65 && frame.rate <= 1.95);
      assert(Math.abs(frame.rate - previous.rate) <= .014401);
      previous = frame;
    }
    for (const time of [NaN, Infinity, -1, 0]) {
      const frame = clock.sample({ time, music });
      assert.equal(frame.time, previous.time);
      assert(Number.isFinite(frame.rate));
      previous = frame;
    }
  }
  const independent = createClock();
  advanceClock(createClock(), 0, 8000, loudMusic);
  assert.equal(independent.sample({ time: 100 }).time, 100);
  assert.equal(independent.sample({ time: 116 }).time, 116);
  assert.equal(Object.isFrozen(independent), true);
});

test('alterna los tres colores con grupos encendidos y casi apagados', () => {
  for (let group = 0; group < 3; group++) {
    const { pattern, levels } = sample({ time: group * 3600 + 500 });
    assert.equal(pattern, 'alternate');
    assert.equal(levels.length, 44);
    levels.forEach((value, index) => assert(index % 3 === group ? value > .9 : value < .05));
  }
});

test('el recorrido avanza a la derecha y regresa a la izquierda sin música', () => {
  const at = time => sample({ time, count: 61 }).levels;
  assert.equal(sample({ time: 26000 }).pattern, 'chase');
  assert(center(at(26000)) < center(at(28000)));
  assert(center(at(28000)) < center(at(30000)));
  assert(center(at(34000)) > center(at(36000)));
  assert(center(at(36000)) > center(at(38000)));
  assert.equal(sample({ time: 52000 }).pattern, 'bounce');
  assert(center(at(49000)) < center(at(52000)));
  assert(center(at(58000)) > center(at(61000)));
});

test('la respiración alterna brillo suave y fuerte y el ciclo reúne cuatro secuencias', () => {
  assert.deepEqual(Array.from([0, 24000, 48000, 72000], time => sample({ time }).pattern), ['alternate', 'chase', 'bounce', 'breathe']);
  const soft = sample({ time: 72000 }).levels[0];
  const strong = sample({ time: 78000 }).levels[0];
  assert(soft < .2);
  assert(strong > .85);
  assert.equal(sample({ time: 96000 }).pattern, 'alternate');
});

test('los recorridos y cambios de secuencia son continuos incluso con BPM extremo', () => {
  for (const music of [{}, loudMusic, { playing: true, bpm: 1, energy: 1, pulse: 1 }]) {
    let previous = sample({ time: 0, music }).levels;
    for (let time = 16; time <= 192000; time += 16) {
      const current = sample({ time, music }).levels;
      current.forEach(value => assert(Number.isFinite(value) && value >= 0 && value <= 1));
      assert(maxDifference(previous, current) < .035, `cambio brusco en ${time} ms`);
      previous = current;
    }
    for (const boundary of [24000, 48000, 72000, 96000, 120000, 144000, 168000, 192000]) {
      assert(maxDifference(sample({ time: boundary - 1, music }).levels, sample({ time: boundary + 1, music }).levels) < .005);
    }
  }
});

test('el pulso responde suavemente sin cambiar la posición ni acelerar el dibujo', () => {
  for (const time of [500, 28000, 54000, 80000]) {
    const silent = sample({ time }).levels;
    const calm = sample({ time, music: { playing: true, bpm: 40, energy: 0, pulse: 0 } }).levels;
    const pulse = sample({ time, music: loudMusic }).levels;
    assert.deepEqual(Array.from(calm), Array.from(silent));
    assert(pulse.every((value, index) => value >= silent[index]));
    assert(maxDifference(silent, pulse) > .02);
    assert(maxDifference(silent, pulse) <= .0381);
    assert(Math.abs(center(silent) - center(pulse)) < 1);
  }
  for (let time = 0; time < 96000; time += 100) {
    const off = sample({ time, music: { ...loudMusic, pulse: 0 } }).levels;
    const on = sample({ time: time + 16, music: loudMusic }).levels;
    assert(maxDifference(off, on) < .06);
  }
  assert.deepEqual(Array.from(sample({ time: 500, music: { ...loudMusic, playing: false } }).levels), Array.from(sample({ time: 500 }).levels));
});

test('apagado, fijo y movimiento reducido mantienen niveles estables con cualquier música', () => {
  for (const options of [{ setting: 'off' }, { setting: 'steady' }, { motion: false }, { motion: 'reduced' }, { motion: 'off' }]) {
    const first = sample({ time: 0, ...options });
    const later = sample({ time: 123456, music: loudMusic, ...options });
    assert.deepEqual(Array.from(later.levels), Array.from(first.levels));
    assert.equal(later.pattern, options.setting === 'off' ? 'off' : 'steady');
    assert(first.levels.every(value => value === (options.setting === 'off' ? 0 : .68)));
  }
  assert(sample({ setting: 'steady', game: true }).levels.every(value => value === .42));
});

test('juego conserva las secuencias con brillo y variación mucho menores', () => {
  for (const time of [500, 28000, 54000, 80000]) {
    const normal = sample({ time, music: loudMusic });
    const game = sample({ time, music: loudMusic, game: true });
    assert.equal(game.pattern, normal.pattern);
    assert(game.levels.every(value => value >= .24 && value <= .54));
    assert(Math.max(...game.levels) < Math.max(...normal.levels));
    assert(Math.abs(range(game.levels) - range(normal.levels) * .3) < 1e-10);
    assert(range(game.levels) > .02);
  }
  const normalChange = maxDifference(sample({ time: 500 }).levels, sample({ time: 4100 }).levels);
  const gameChange = maxDifference(sample({ time: 500, game: true }).levels, sample({ time: 4100, game: true }).levels);
  assert(gameChange > 0 && gameChange <= normalChange * .301);
});

test('el muestreo es puro, repetible y tolera cantidades y señales vacías', () => {
  const options = Object.freeze({ time: 28000, count: 9, music: loudMusic });
  const first = sample(options);
  first.levels[0] = 999;
  assert(sample(options).levels[0] <= 1);
  assert.equal(sample({ count: 0 }).levels.length, 0);
  assert.equal(sample({ count: 1 }).levels.length, 1);
  assert.equal(sample({ count: 7.9 }).levels.length, 7);
  assert(sample({ time: NaN, music: null }).levels.every(Number.isFinite));
  assert.equal(Object.isFrozen(context.window.NavidadLights), true);
});
