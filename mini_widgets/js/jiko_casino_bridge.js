/* The original games keep their own rendering. Casino supplies commands, economy and settings. */
(function () {
  'use strict';
  if (new URLSearchParams(location.search).get('embedded') !== 'casino' || parent === window) return;
  try {
    if (parent.location.origin !== location.origin || !parent.JikoCasino) return;
    window.JikoCasinoHost = parent.JikoCasino;
    const game = location.pathname.endsWith('/ruleta.html') ? 'ruleta' : 'tragamonedas';
    window.JikoWidgetSync = parent.JikoCasino.createSync(game);
    window.StreamDB = parent.JikoCasino.database;
    window.calcularNivelUsuario = user => parent.JikoCasino.level(user);
  } catch (error) {
    console.error('[Casino] No se pudo conectar el juego:', error);
  }
})();
