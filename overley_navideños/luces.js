/* Secuencias suaves y deterministas; no abre conexiones ni modifica el DOM. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const SLOT = 24000;
  const FADE = 4000;
  const PATTERNS = ['alternate', 'chase', 'bounce', 'breathe'];
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
  const wrap = (value, period) => ((value % period) + period) % period;
  const ease = value => {
    const t = clamp(value);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };

  function createClock() {
    let previousTime = null;
    let sequenceTime = 0;
    let previousEnabled = true;
    let baseRate = 1;
    let beatRate = 0;
    let rate = 1;

    return Object.freeze({
      sample({ time = 0, music = {}, enabled = true } = {}) {
        const now = Math.max(0, finite(time, previousTime ?? 0));
        const first = previousTime === null;
        const elapsed = first ? 0 : now - previousTime;
        const moving = enabled !== false;
        // No recuperar el tiempo de una pestaña oculta ni el de una pausa.
        const delta = moving && previousEnabled && elapsed > 0 && elapsed <= 250 ? elapsed : 0;
        previousTime = now;
        previousEnabled = moving;
        if (first) sequenceTime = now;

        const playing = music?.playing === true;
        const bpm = music?.bpm;
        // El puente musical acepta este mismo rango de BPM medidos.
        const hasTempo = Number.isFinite(bpm) && bpm >= 40 && bpm <= 240;
        const pulse = playing ? clamp(finite(music?.pulse, 0)) : 0;
        const energy = playing ? clamp(finite(music?.energy, .3)) : 0;
        const targetBase = playing && hasTempo ? clamp(bpm / 100, .65, 1.75) : 1;
        const targetBeat = pulse * (.14 + .06 * energy);

        if (delta) {
          // El tempo cambia despacio; el pulso real aporta un acento breve.
          baseRate += (targetBase - baseRate) * (1 - Math.exp(-delta / 1100));
          beatRate += (targetBeat - beatRate) * (1 - Math.exp(-delta / (targetBeat > beatRate ? 55 : 160)));
          if (Math.abs(baseRate - targetBase) < .00001) baseRate = targetBase;
          if (Math.abs(beatRate - targetBeat) < .00001) beatRate = targetBeat;
          const targetRate = clamp(baseRate + beatRate, .65, 1.95);
          const nextRate = rate + clamp(targetRate - rate, -.0009 * delta, .0009 * delta);
          // Integrar conserva la fase al reproducir, pausar o cambiar canción.
          sequenceTime += delta * (rate + nextRate) / 2;
          rate = nextRate;
        }

        return {
          time: sequenceTime,
          rate: moving ? rate : 0,
          mode: !moving ? 'paused' : playing && (hasTempo || pulse > 0 || beatRate > .001) ? 'music' : 'auto'
        };
      }
    });
  }

  function level(pattern, time, index, count) {
    const position = count > 1 ? index / (count - 1) : .5;
    if (pattern === 0) {
      // Cada color mantiene su turno y luego cede suavemente al siguiente.
      const turn = wrap(time, 10800) / 3600;
      const group = Math.floor(turn);
      const blend = ease(((turn % 1) - .68) / .32);
      const color = index % 3;
      const on = color === group ? 1 - blend : color === (group + 1) % 3 ? blend : 0;
      return .035 + .89 * on;
    }
    if (pattern === 1) {
      // Un recorrido de ocho segundos por sentido, con extremos fuera del cable.
      const leg = wrap(time - SLOT, 16000) / 8000;
      const progress = ease(leg % 1);
      const center = -.2 + 1.4 * (leg < 1 ? progress : 1 - progress);
      return .055 + .87 * Math.exp(-Math.pow((position - center) / .12, 2));
    }
    if (pattern === 2) {
      // Un grupo más ancho rebota sin detenerse ni saltar al extremo opuesto.
      const center = .5 - .5 * Math.cos(TAU * (time - 2 * SLOT) / 18000);
      const glow = ease(1 - Math.abs(position - center) / .3);
      return .085 + .81 * glow;
    }
    // Respiración amplia con un pequeño desfase entre los tres colores.
    const wave = .5 - .5 * Math.cos(TAU * ((time - 3 * SLOT) / 12000 + (index % 3) / 12));
    return .17 + .72 * wave;
  }

  function sample({ time = 0, count = 44, music = {}, motion = true, setting = 'twinkle', game = false } = {}) {
    const length = Math.max(0, Math.floor(finite(count, 44)));
    if (setting === 'off') return { pattern: 'off', levels: Array(length).fill(0) };
    if (setting === 'steady' || motion === false || motion === 'reduced' || motion === 'off') {
      return { pattern: 'steady', levels: Array(length).fill(game ? .42 : .68) };
    }

    const now = Math.max(0, finite(time, 0));
    const slot = Math.floor(now / SLOT) % PATTERNS.length;
    const next = (slot + 1) % PATTERNS.length;
    const blend = ease((wrap(now, SLOT) - SLOT + FADE) / FADE);
    const playing = !!music?.playing;
    const energy = playing ? clamp(finite(music.energy, .3)) : 0;
    const tempo = playing ? clamp((finite(music.bpm, 96) - 60) / 120) : 0;
    // El reloj integra el ritmo en el tiempo; aquí el pulso acentúa el brillo.
    // Incluso una señal de BPM/pulso extrema no crea destellos de gran amplitud.
    const pulse = playing ? clamp(finite(music.pulse, 0)) : 0;
    const musicLift = playing ? .01 * energy + pulse * (.014 + .006 * energy + .004 * tempo) : 0;
    const levels = Array.from({ length }, (_, index) => {
      const from = level(slot, now, index, length);
      const to = level(next, now, index, length);
      const brightness = clamp(from + (to - from) * blend + musicLift);
      // Juego conserva los dibujos con un halo menor y variación acotada.
      return game ? .24 + brightness * .3 : brightness;
    });
    return { pattern: PATTERNS[slot], levels };
  }

  window.NavidadLights = Object.freeze({ sample, createClock });
})();
