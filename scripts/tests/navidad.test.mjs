import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const musicCode = await readFile(new URL('../../overley_navideños/musica.js', import.meta.url), 'utf8');
const tickerCode = await readFile(new URL('../../overley_navideños/juego.js', import.meta.url), 'utf8');

function music() {
  let now = 0;
  const context = { window: {}, location: { search: '' }, performance: { now: () => now }, URLSearchParams, document: { addEventListener() {} } };
  vm.runInNewContext(musicCode, context);
  return { api: context.window.NavidadMusic, at(time) { now = time; return context.window.NavidadMusic.sample(); } };
}

test('el pulso sigue BPM y posición de reproducción, con intensidad y viento limitados', () => {
  const { api, at } = music();
  api.update({ is_playing: true, progress_ms: 0, item: { id: 'slow', tempo: 80, energy: .2 } });
  assert.equal(at(0).pulse, 1);
  assert(at(375).pulse < .01);
  assert.equal(at(750).pulse, 1);
  api.update({ is_playing: true, progress_ms: 0, item: { id: 'fast', tempo: 160, energy: .9 } });
  assert.equal(at(750).pulse, 1);
  assert(at(937.5).pulse < .01);
  assert.equal(at(1125).pulse, 1);
  for (let time = 1125; time < 12000; time += 50) {
    const value = at(time);
    assert(Math.abs(value.wind) <= 29);
    assert(value.speed >= 1 && value.speed <= 1.46);
    assert(value.pulse >= 0 && value.pulse <= 1);
  }
  api.pause();
  assert.equal(at(12000).pulse, 0);
  assert.equal(at(12000).speed, 1);
});

test('las señales locales tienen prioridad; pausa y pérdida de señal vuelven a calma', () => {
  const { api, at } = music();
  api.ingest({ event: { source: 'Spotify', type: 'PlaybackSync' }, data: { track: { id: 'local', bpm: 96 }, is_playing: true } });
  assert.equal(at(1000).bpm, 96);
  api.update({ is_playing: false });
  assert.equal(at(1001).playing, true);
  api.ingest({ event: { source: 'Spotify', type: 'PlaybackPaused' }, data: {} });
  assert.equal(at(1002).playing, false);
  api.ingest({ event: { source: 'General', type: 'Custom' }, data: { bpm: 140, beat: true } });
  assert.equal(at(1002).pulse, 1);
  assert.equal(at(16000).playing, false);
  api.update({ is_playing: true, item: { id: 'current' } });
  api.rhythm(210, 1, 'old-track');
  assert.equal(at(16001).bpm, null);
  api.rhythm(105, .4, 'current');
  assert.equal(at(16002).bpm, 105);
});

test('el chat no se interpreta como música y las pruebas musicales caducan a los 12 segundos', () => {
  const { api, at } = music();
  api.ingest({ event: { source: 'Kick', type: 'ChatMessage' }, data: { message: 'bpm 180', bpm: 180 } });
  assert.equal(at(0).playing, false);
  api.preview(148, .75);
  assert.equal(at(1).playing, true);
  assert.equal(at(11999).source, 'preview');
  assert.equal(at(12000).source, 'idle');
  assert.equal(at(12000).pulse, 0);
});

test('Spotify completa el tempo de Tuna sin cambiar su estado de reproducción local', () => {
  const { api, at } = music();
  api.tuna({ title: 'Tema local', status: 'playing' });
  api.update({ is_playing: true, progress_ms: 1500, item: { id: 'spotify-id', name: 'Tema local' } });
  api.rhythm(120, .5, 'spotify-id');
  assert.equal(at(0).bpm, 120);
  assert.equal(at(0).source, 'tuna');
  api.tuna({ title: 'Tema local', status: 'paused' });
  api.update({ is_playing: true, item: { id: 'spotify-id', name: 'Tema local' } });
  assert.equal(at(1).playing, false);
});

test('la tira respeta 60 s visible + 900 s oculta incluso tras saltos de tiempo y reanudaciones', () => {
  let now = 0;
  const classes = new Set();
  const listeners = new Map();
  const timers = new Map();
  const strip = { dataset: {}, classList: { toggle(name, value) { value ? classes.add(name) : classes.delete(name); } }, setAttribute() {} };
  const context = { Date: { now: () => now }, document: { getElementById: () => strip, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) }, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name), setTimeout(fn, delay) { timers.set(1, { fn, delay }); return 1; }, clearTimeout: id => timers.delete(id) };
  vm.runInNewContext(tickerCode, context);
  assert.equal(strip.dataset.phase, 'visible');
  assert.equal(timers.get(1).delay, 60000);
  for (const [time, phase, delay] of [[59999, 'visible', 1], [60000, 'pause', 900000], [959999, 'pause', 1], [960000, 'visible', 60000], [1020000, 'pause', 900000], [1920000, 'visible', 60000], [9600000 + 200000, 'pause', 760000]]) {
    now = time;
    listeners.get('visibilitychange')();
    assert.equal(strip.dataset.phase, phase, String(time));
    assert.equal(classes.has('is-hidden'), phase === 'pause');
    assert.equal(timers.get(1).delay, delay, String(time));
  }
  listeners.get('pagehide')();
  assert.equal(timers.size, 0);
});
