(function(root) {
  'use strict';
  function mezclar(items, random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function fechaCreacion(item) {
    const value = item.createdAt ?? item.fechaCreacion ?? item.ultimaActualizacion;
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
    return typeof value === 'string' ? Date.parse(value) || 0 : 0;
  }
  function ordenar(items, primeraApertura, anteriores = [], random = Math.random) {
    const disponibles = mezclar(items.filter(it => it.activo !== false && (it.precio > 0 || it.key === 'mesero')), random);
    if (primeraApertura) {
      disponibles.sort((a, b) => fechaCreacion(b) - fechaCreacion(a));
    } else {
      const vistos = new Set(anteriores);
      disponibles.sort((a, b) => Number(vistos.has(a.key)) - Number(vistos.has(b.key)));
      if (disponibles.length > 1 && disponibles[0].key === anteriores[0]) {
        [disponibles[0], disponibles[1]] = [disponibles[1], disponibles[0]];
      }
    }
    return disponibles.map(it => it.key);
  }
  const api = { ordenar, fechaCreacion };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JikoVitrina = api;
})(typeof window !== 'undefined' ? window : globalThis);
