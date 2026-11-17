/* Un minuto visible, quince minutos de pausa. El reloj no deriva al ocultar OBS. */
(() => {
  'use strict';
  const VISIBLE = 60000;
  const HIDDEN = 15 * 60000;
  const strip = document.getElementById('game-ticker');
  if (!strip) return;
  let started = Date.now();
  let timer;
  function update() {
    clearTimeout(timer);
    const phase = ((Date.now() - started) % (VISIBLE + HIDDEN) + VISIBLE + HIDDEN) % (VISIBLE + HIDDEN);
    const visible = phase < VISIBLE;
    strip.classList.toggle('is-hidden', !visible);
    strip.setAttribute('aria-hidden', String(!visible));
    strip.dataset.phase = visible ? 'visible' : 'pause';
    timer = setTimeout(update, visible ? VISIBLE - phase : VISIBLE + HIDDEN - phase);
  }
  const receive = event => {
    if (event.origin !== location.origin || event.source !== parent || parent === window || event.data?.type !== 'NAVIDAD_TEST_TICKER') return;
    started = Date.now(); update();
  };
  addEventListener('message', receive);
  document.addEventListener('visibilitychange', update);
  addEventListener('pagehide', () => { clearTimeout(timer); removeEventListener('message', receive); document.removeEventListener('visibilitychange', update); }, { once: true });
  update();
})();
