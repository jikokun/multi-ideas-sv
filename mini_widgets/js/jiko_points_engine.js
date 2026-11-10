(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.JikoPointsEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function integer(value, positive = false) {
    const number = Number(value);
    if (value === null || value === '' || !Number.isSafeInteger(number) || (positive && number <= 0)) {
      throw new Error('La cantidad de Jikopuntos debe ser un entero válido.');
    }
    return number;
  }

  const balance = value => Math.max(0, integer(value ?? 0));
  // Codificación reversible: los identificadores del chat pueden contener caracteres prohibidos en RTDB.
  const key = value => Array.from(String(value), char => char.codePointAt(0).toString(16)).join('_');

  function previous(user, operation) {
    const direct = user?.operacionesPuntos?.[key(operation.id)];
    if (direct) {
      if (direct.firma !== operation.firma || direct.delta !== operation.delta) throw new Error('El identificador ya pertenece a otra operación.');
      return direct;
    }
    if (!operation.deduplicar) return null;
    const recent = user?.ultimasOperacionesPuntos?.[key(operation.firma)];
    if (recent && operation.timestamp >= recent.timestamp && operation.timestamp - recent.timestamp < 5000 &&
        (!operation.idExplicito || !recent.idExplicito)) {
      return user.operacionesPuntos?.[key(recent.id)] || null;
    }
    return null;
  }

  function apply(user, operation, modify) {
    if (!user) return; // El servicio carga o crea el perfil antes de la transacción.
    if (previous(user, operation)) return user;
    const delta = integer(operation.delta);
    const before = balance(user.jikopuntos);
    const after = integer(before + delta);
    if (after < 0) throw new Error('Jikopuntos insuficientes para completar la operación.');
    const receipt = { id: operation.id, firma: operation.firma, delta, timestamp: operation.timestamp, saldoAnterior: before, nuevoSaldo: after };
    user.jikopuntos = after;
    if (delta > 0) user.totalGanado = balance(user.totalGanado) + delta;
    if (delta < 0) user.totalGastado = balance(user.totalGastado) - delta;
    user.ultimaActividad = operation.timestamp;
    if (modify) Object.assign(receipt, modify(user) || {});
    user.operacionesPuntos ||= {};
    user.ultimasOperacionesPuntos ||= {};
    user.operacionesPuntos[key(operation.id)] = receipt;
    if (operation.deduplicar) user.ultimasOperacionesPuntos[key(operation.firma)] = {
      id: operation.id, idExplicito: operation.idExplicito, timestamp: operation.timestamp
    };
    return user;
  }

  return { integer, balance, key, previous, apply };
});
