/**
 * ══════════════════════════════════════════════════════════════════════════════
 * JikoWidgetSync - Gestor de Sincronización y Exclusión Mutua para Widgets de Jiko
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * PROPÓSITO:
 * Evita sobreposiciones y conflictos visuales entre los widgets de stream:
 *  1. La Tiendita (tiendita.html) -> Mostrador y carrusel de platillos (!tienda)
 *  2. El Cajero Automático JikoBank (jikobank.html) -> Saldo, préstamos, donaciones (!jikopuntos, !darjikopuntos, etc.)
 *  3. La Tarjeta Cibernética de Perfil (widget_perfil.html / tiendita.html) -> Tarjeta flotante (!perfil)
 * 
 * REGLAS FUNDAMENTALES:
 *  - "No quitar el que ya estaba": Si un widget está activo, ninguna acción nueva cierra el widget actual.
 *  - "No sobreponerse": Si un widget está activo, ningún otro widget puede invadir la pantalla.
 *  - "Cola de espera inteligente": Las solicitudes concurrentes se forman en cola (FIFO) y se ejecutan
 *    automáticamente una tras otra con una transición fluida al terminar el widget anterior.
 *  - "Interconexión bidireccional": Funciona entre ventanas independientes de OBS / navegador vía
 *    BroadcastChannel de ultra baja latencia (0ms) con persistencia y fallback en localStorage y Firebase.
 */

(function(global) {
  'use strict';

  const CHANNEL_NAME = 'jiko_widget_sync_bus_v1';
  const STORAGE_LOCK_KEY = 'jiko_active_widget_lock_v1';
  const STORAGE_QUEUE_KEY = 'jiko_widget_queue_v1';
  const STORAGE_STANDALONE_PERFIL_KEY = 'jiko_has_standalone_perfil_v1';

  // Tiempos máximos de seguridad (TTL) para evitar bloqueos si una pestaña se cierra abruptamente
  const DEFAULT_TTLS = {
    tienda: 75000,   // Mostrador de tiendita: auto-cierre suele ser ~60s
    cajero: 20000,   // Cajero JikoBank: duración consulta ~8-14s
    perfil: 15000    // Tarjeta de perfil: duración ~10-12s
  };

  let bus = null;
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bus = new BroadcastChannel(CHANNEL_NAME);
    }
  } catch(e) {
    console.warn('[JikoWidgetSync] BroadcastChannel no soportado, usando sincronización vía localStorage:', e);
  }

  const executionHandlers = new Map();
  const queueChangeListeners = new Set();
  const lockChangeListeners = new Set();
  let queueTimer = null;
  let localHeldToken = null;

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. GESTIÓN DE LOCK (EXCLUSIÓN MUTUA)
  // ─────────────────────────────────────────────────────────────────────────────

  function getActiveLock() {
    try {
      const raw = localStorage.getItem(STORAGE_LOCK_KEY);
      if (!raw) return null;
      const lock = JSON.parse(raw);
      if (!lock || typeof lock !== 'object') return null;

      // Verificación de expiración automática de seguridad
      if (Date.now() >= lock.expiresAt) {
        localStorage.removeItem(STORAGE_LOCK_KEY);
        console.log(`[JikoWidgetSync] ⌛ Lock de [${lock.widget}] expirado por TTL de seguridad. Liberando.`);
        return null;
      }
      return lock;
    } catch(e) {
      return null;
    }
  }

  function isBusy(excludeWidget = null) {
    const lock = getActiveLock();
    if (!lock) return false;
    if (excludeWidget && lock.widget === excludeWidget) {
      // El mismo widget que ya tiene el lock puede seguir operando
      return false;
    }
    return true;
  }

  function acquire(widget, user = 'usuario', durationMs = null) {
    const cleanUser = String(user || 'usuario').replace(/^@/, '').trim();
    const ttl = durationMs || DEFAULT_TTLS[widget] || 20000;
    const now = Date.now();
    const token = Math.random().toString(36).slice(2, 9);

    const lock = {
      widget: widget,
      user: cleanUser,
      acquiredAt: now,
      expiresAt: now + ttl,
      ttlMs: ttl,
      token: token
    };

    localHeldToken = token;

    try {
      localStorage.setItem(STORAGE_LOCK_KEY, JSON.stringify(lock));
    } catch(e) {}

    broadcast({ type: 'LOCK_ACQUIRED', lock });
    notifyLockChange(lock);

    // Sincronización en la nube con Firebase RTDB si está disponible
    if (global.StreamDB && typeof global.StreamDB.setWidgetState === 'function') {
      global.StreamDB.setWidgetState('overlay_coordinator', { lock }).catch(()=>{});
    }

    console.log(`[JikoWidgetSync] 🔒 Lock ADQUIRIDO por [${widget}] (@${cleanUser}) por ${Math.round(ttl/1000)}s`);
    return lock;
  }

  function release(widget = null) {
    const current = getActiveLock();
    if (current && (!widget || current.widget === widget)) {
      try {
        localStorage.removeItem(STORAGE_LOCK_KEY);
      } catch(e) {}

      localHeldToken = null;
      broadcast({ type: 'LOCK_RELEASED', widget: current.widget, releasedAt: Date.now() });
      notifyLockChange(null);

      if (global.StreamDB && typeof global.StreamDB.setWidgetState === 'function') {
        global.StreamDB.setWidgetState('overlay_coordinator', { lock: null }).catch(()=>{});
      }

      console.log(`[JikoWidgetSync] 🔓 Lock LIBERADO por [${current.widget}]. Verificando cola de espera...`);

      // Breve margen de transición (600ms) para permitir animación de salida antes del siguiente widget
      scheduleQueueProcess(600);
      return true;
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. GESTIÓN DE COLA (FIFO INTELIGENTE & ANTI-SPAM)
  // ─────────────────────────────────────────────────────────────────────────────

  function getQueue() {
    try {
      const raw = localStorage.getItem(STORAGE_QUEUE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      const now = Date.now();
      // Descartar peticiones que lleven más de 3 minutos en cola
      return arr.filter(it => it && (now - it.timestamp) < 180000);
    } catch(e) {
      return [];
    }
  }

  function saveQueue(q) {
    try {
      localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(q));
    } catch(e) {}
    notifyQueueChange(q);
  }

  function enqueue({ widget, command, sender, params = [], raw = '', extra = {} }) {
    const cleanSender = String(sender || 'usuario').replace(/^@/, '').trim();
    const cleanCmd = String(command || '').trim();
    const now = Date.now();

    let q = getQueue();

    // Anti-duplicados: Si el mismo usuario ya tiene encolado el mismo comando, evitar spam
    const repetido = q.some(it => it.widget === widget && it.sender.toLowerCase() === cleanSender.toLowerCase() && it.command.toLowerCase() === cleanCmd.toLowerCase());
    if (repetido) {
      console.log(`[JikoWidgetSync] ℹ️ Petición repetida de @${cleanSender} ("${cleanCmd}") ya estaba en cola. Omitiendo duplicado.`);
      return null;
    }

    const item = {
      id: 'req_' + now + '_' + Math.random().toString(36).slice(2, 6),
      widget: widget,
      command: cleanCmd,
      sender: cleanSender,
      params: Array.isArray(params) ? params : [],
      raw: raw || cleanCmd,
      extra: extra || {},
      timestamp: now
    };

    // Máximo 6 peticiones en cola para garantizar fluidez del stream
    if (q.length >= 6) {
      console.warn('[JikoWidgetSync] ⚠️ Cola llena (máx 6). Descartando solicitud más vieja.');
      q.shift();
    }

    q.push(item);
    saveQueue(q);
    broadcast({ type: 'QUEUE_UPDATED', queue: q, itemAdded: item });

    console.log(`[JikoWidgetSync] 📋 Solicitud encolada: [${widget}] "${cleanCmd}" de @${cleanSender} (Posición: ${q.length})`);
    return item;
  }

  function scheduleQueueProcess(delayMs = 500) {
    if (queueTimer) clearTimeout(queueTimer);
    queueTimer = setTimeout(() => {
      processNextQueueItem();
    }, delayMs);
  }

  function processNextQueueItem() {
    // Si la pantalla sigue ocupada, no se puede despachar nada aún
    if (isBusy()) {
      return;
    }

    let q = getQueue();
    if (q.length === 0) return;

    // Desencolar elemento de forma atómica
    const nextItem = q.shift();
    saveQueue(q);

    console.log(`[JikoWidgetSync] 🚀 Despachando elemento de cola: [${nextItem.widget}] "${nextItem.command}" para @${nextItem.sender}`);

    // Adquirir de inmediato el lock para proteger la entrada del nuevo widget
    acquire(nextItem.widget, nextItem.sender, DEFAULT_TTLS[nextItem.widget]);

    // Transmitir orden de ejecución a todas las ventanas/widgets
    broadcast({ type: 'EXECUTE_QUEUED_COMMAND', item: nextItem });
    dispatchExecutionLocally(nextItem);
  }

  function clearQueue() {
    saveQueue([]);
    broadcast({ type: 'QUEUE_CLEARED' });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. REGISTRO Y DISPATCH LOCAL DE HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  function onExecute(widget, callback) {
    if (typeof callback === 'function') {
      executionHandlers.set(widget, callback);
    }
  }

  function dispatchExecutionLocally(item) {
    if (!item || !item.widget) return;
    const fn = executionHandlers.get(item.widget);
    if (typeof fn === 'function') {
      try {
        console.log(`[JikoWidgetSync] ▶️ Ejecutando handler local para [${item.widget}]:`, item);
        fn(item);
      } catch(err) {
        console.error(`[JikoWidgetSync] Error en handler local [${item.widget}]:`, err);
      }
    }
  }

  function onQueueChange(callback) {
    if (typeof callback === 'function') queueChangeListeners.add(callback);
    return () => queueChangeListeners.delete(callback);
  }

  function onLockChange(callback) {
    if (typeof callback === 'function') lockChangeListeners.add(callback);
    return () => lockChangeListeners.delete(callback);
  }

  function notifyQueueChange(q) {
    queueChangeListeners.forEach(fn => {
      try { fn(q); } catch(e){}
    });
  }

  function notifyLockChange(lock) {
    lockChangeListeners.forEach(fn => {
      try { fn(lock); } catch(e){}
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. COORDINACIÓN DE PERFIL DEDICADO vs INTEGRADO
  // ─────────────────────────────────────────────────────────────────────────────

  function registerStandalonePerfil(active = true) {
    try {
      if (active) {
        localStorage.setItem(STORAGE_STANDALONE_PERFIL_KEY, String(Date.now()));
      } else {
        localStorage.removeItem(STORAGE_STANDALONE_PERFIL_KEY);
      }
    } catch(e) {}
    broadcast({ type: 'STANDALONE_PERFIL_HEARTBEAT', active, timestamp: Date.now() });
  }

  function hasStandalonePerfil() {
    try {
      const val = localStorage.getItem(STORAGE_STANDALONE_PERFIL_KEY);
      if (!val) return false;
      return (Date.now() - parseInt(val, 10)) < 120000; // Válido si tuvo latido en últimos 2m
    } catch(e) {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. MENSAJERÍA ENTRE VENTANAS (BROADCASTCHANNEL + STORAGE EVENTS)
  // ─────────────────────────────────────────────────────────────────────────────

  function broadcast(data) {
    if (bus) {
      try { bus.postMessage(data); } catch(e){}
    }
  }

  function handleMessage(data) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'LOCK_ACQUIRED') {
      notifyLockChange(data.lock);
    } else if (data.type === 'LOCK_RELEASED') {
      notifyLockChange(null);
      scheduleQueueProcess(600);
    } else if (data.type === 'EXECUTE_QUEUED_COMMAND') {
      dispatchExecutionLocally(data.item);
    } else if (data.type === 'QUEUE_UPDATED') {
      notifyQueueChange(data.queue || []);
    } else if (data.type === 'STANDALONE_PERFIL_HEARTBEAT') {
      try {
        if (data.active) localStorage.setItem(STORAGE_STANDALONE_PERFIL_KEY, String(Date.now()));
      } catch(e){}
    }
  }

  if (bus) {
    bus.onmessage = (ev) => handleMessage(ev.data);
  }

  // Escuchador de Storage para sincronización cruzada sin BroadcastChannel
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (ev) => {
      if (ev.key === STORAGE_LOCK_KEY) {
        const lock = getActiveLock();
        notifyLockChange(lock);
        if (!lock) scheduleQueueProcess(600);
      } else if (ev.key === STORAGE_QUEUE_KEY) {
        notifyQueueChange(getQueue());
      }
    });

    // Auto-limpieza en recarga o cierre si esta pestaña tenía el lock
    window.addEventListener('beforeunload', () => {
      const lock = getActiveLock();
      if (lock && localHeldToken && lock.token === localHeldToken) {
        release(lock.widget);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. HELPER DE MENSAJES AMIGABLES
  // ─────────────────────────────────────────────────────────────────────────────

  function getFriendlyQueuedToast(item, currentLock) {
    const sender = item?.sender || 'usuario';
    const targetWidget = item?.widget || 'solicitud';
    const busyWidget = currentLock?.widget || 'otro widget';

    let busyName = 'El mostrador';
    if (busyWidget === 'cajero') busyName = 'El cajero automático JikoBank';
    else if (busyWidget === 'perfil') busyName = 'La tarjeta de perfil';
    else if (busyWidget === 'tienda') busyName = 'La tiendita';

    let reqName = 'solicitud';
    if (targetWidget === 'tienda') reqName = 'apertura de tiendita';
    else if (targetWidget === 'cajero') reqName = 'consulta en el cajero';
    else if (targetWidget === 'perfil') reqName = 'tarjeta de perfil';

    return `⏳ <b>@${sender}</b>: ${busyName} está activo. Tu ${reqName} está en cola y se mostrará al terminar.`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXPOSICIÓN GLOBAL
  // ─────────────────────────────────────────────────────────────────────────────

  const JikoWidgetSync = {
    isBusy,
    getActiveLock,
    acquire,
    release,
    enqueue,
    getQueue,
    clearQueue,
    processNextQueueItem,
    scheduleQueueProcess,
    onExecute,
    onQueueChange,
    onLockChange,
    registerStandalonePerfil,
    hasStandalonePerfil,
    getFriendlyQueuedToast,
    DEFAULT_TTLS
  };

  global.JikoWidgetSync = JikoWidgetSync;

  // Auto-verificar cola al cargar
  setTimeout(() => {
    if (!isBusy()) processNextQueueItem();
  }, 1200);

})(typeof window !== 'undefined' ? window : globalThis);
