// ==========================================================================
// STREAM FIREBASE REALTIME SERVICE - MULTI IDEAS SV & STREAM WIDGETS
// ==========================================================================
// Estructura bajo el nodo raíz 'stream/':
// - stream/usuarios:             Perfiles, Jikopuntos, Sistema de Niveles de Asistencia y Vinculación
// - stream/transmisiones:        Historial y registro por transmisión de Kick (número de stream, fecha, asistentes)
// - stream/transmisiones_stats:  Contador total de veces que prendió live, estado en vivo actual
// - stream/widgets:              Configuración y estado en vivo de los widgets (tiendita, etc.)
// - stream/overlays:             Configuración y estado de overlays (radioshow, etc.)
// - stream/tienda:               Transacciones, asistencias, transferencias y estadísticas
// - stream/vinculaciones:        Índice Auth UID -> username para vinculación de cuentas web
// ==========================================================================

import { rtdb, auth, signInAnonymously } from "../../firebase-config.js";
import { 
  ref, 
  set, 
  get, 
  onValue, 
  push, 
  update, 
  runTransaction,
  query,
  orderByChild,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Normalizador estándar de nombres de usuario (minúsculas, sin acentos ni @)
export const norm = s => {
  if (!s || s === 'undefined' || s === 'null') return '';
  const clean = String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^@/, '').trim();
  if (clean === 'undefined' || clean === 'null') return '';
  return clean;
};

// Constantes de Nodos
export const USER_DEFAULT_POINTS = 1000;
export const NODE_STREAM = 'stream';
export const NODE_USERS = 'stream/usuarios';
export const NODE_TRANSMISSIONS = 'stream/transmisiones';
export const NODE_TRANS_STATS = 'stream/transmisiones_stats';
export const NODE_WIDGETS = 'stream/widgets';
export const NODE_OVERLAYS = 'stream/overlays';
export const NODE_TIENDA = 'stream/tienda';
export const NODE_TRANSACTIONS = 'stream/tienda/transacciones';
export const NODE_ATTENDANCE = 'stream/tienda/asistencias';
export const NODE_TRANSFERS = 'stream/tienda/transferencias';
export const NODE_STATS = 'stream/tienda/estadisticas';
export const NODE_BINDINGS = 'stream/vinculaciones';

// Constantes de Kick
export const KICK_CHANNEL = 'jikokun';
export const KICK_CHANNEL_ID = 1874362;
export const KICK_PUSHER_KEY = '32cbd69e4b950bf97679';
export const KICK_PUSHER_CLUSTER = 'us2';

// ==========================================================================
// 🐺 ESCALAFÓN Y SISTEMA DE NIVELES DE ASISTENCIA (RANGOS DE LA MANADA)
// ==========================================================================
export const NIVELES_ASISTENCIA = [
  { nivel: 1, min: 1,  max: 2,    titulo: 'Cachorro',              emoji: '🐾', bonoExtra: 0,   descripcion: 'Recién llegado a la manada' },
  { nivel: 2, min: 3,  max: 5,    titulo: 'Explorador del Stream', emoji: '🧭', bonoExtra: 50,  descripcion: 'Sintoniza con frecuencia' },
  { nivel: 3, min: 6,  max: 9,    titulo: 'Cazador Fiel',          emoji: '🏹', bonoExtra: 100, descripcion: 'Casi nunca falta a un stream' },
  { nivel: 4, min: 10, max: 19,   titulo: 'Guardián de la Manada', emoji: '🛡️', bonoExtra: 150, descripcion: 'Pilar veterano de la comunidad' },
  { nivel: 5, min: 20, max: 34,   titulo: 'Lobo Beta (VIP)',       emoji: '⚡', bonoExtra: 200, descripcion: 'Rango élite con presencia constante' },
  { nivel: 6, min: 35, max: 99999, titulo: 'Lobo Alfa Legendario', emoji: '👑', bonoExtra: 250, descripcion: 'Leyenda con máxima lealtad en el canal' }
];

export function calcularNivelUsuario(asistenciasCount = 0) {
  const count = Math.max(0, parseInt(asistenciasCount, 10) || 0);
  let rangoActual = NIVELES_ASISTENCIA[0];

  for (let i = 0; i < NIVELES_ASISTENCIA.length; i++) {
    if (count >= NIVELES_ASISTENCIA[i].min) {
      rangoActual = NIVELES_ASISTENCIA[i];
    } else {
      break;
    }
  }

  // Si aún no tiene asistencias, está en Nivel 1 preliminar
  const nivelNum = rangoActual.nivel;
  const esMaximo = nivelNum >= NIVELES_ASISTENCIA.length;
  const sigRango = esMaximo ? null : NIVELES_ASISTENCIA[nivelNum];

  const minActual = rangoActual.min;
  const minSig = sigRango ? sigRango.min : rangoActual.min;
  const faltantes = sigRango ? Math.max(0, minSig - count) : 0;

  let porcentaje = 100;
  if (!esMaximo && sigRango) {
    const rangoSpan = minSig - minActual;
    const progressInSpan = count - minActual;
    porcentaje = Math.min(100, Math.max(0, Math.round((progressInSpan / Math.max(1, rangoSpan)) * 100)));
  }

  return {
    nivel: nivelNum,
    rangoTitulo: rangoActual.titulo,
    insigniaEmoji: rangoActual.emoji,
    bonoExtra: rangoActual.bonoExtra,
    puntosPorAsistencia: 500 + rangoActual.bonoExtra,
    asistenciasCount: count,
    faltantesParaSiguienteNivel: faltantes,
    siguienteNivelTitulo: sigRango ? sigRango.titulo : 'Nivel Máximo',
    porcentajeProgreso: porcentaje,
    descripcion: rangoActual.descripcion
  };
}

class StreamFirebaseService {
  constructor() {
    this.rtdb = rtdb;
    this.auth = auth;
    this.isInitialized = false;
    this.isConnected = false;
    this.usersCache = new Map();
    this.listeners = new Map();

    // Estado del Detector Interno de Kick
    this.kickMonitorActive = false;
    this.kickIsLive = false;
    this.kickLivestreamData = null;
    this.kickPusherWs = null;
    this.kickPollTimer = null;
    this.kickStateListeners = new Set();
  }

  // Inicialización y autenticación anónima para permisos de escritura limpios
  async init() {
    if (this.isInitialized) return true;

    try {
      if (!this.auth.currentUser) {
        try {
          await signInAnonymously(this.auth);
          console.log('[StreamDB] 🔐 Sesión anónima iniciada para widgets del stream');
        } catch (authErr) {
          console.warn('[StreamDB] Aviso al iniciar sesión anónima:', authErr);
        }
      }

      const connRef = ref(this.rtdb, '.info/connected');
      onValue(connRef, (snap) => {
        this.isConnected = snap.val() === true;
        console.log(`[StreamDB] 🌐 Conexión Firebase RTDB: ${this.isConnected ? 'ONLINE' : 'OFFLINE'}`);
      });

      // Escuchar y cachear usuarios de forma reactiva para que cualquier consulta de saldo sea instantánea
      this.onUsers((users) => {
        if (Array.isArray(users)) {
          users.forEach(u => {
            if (u && u.username) {
              this.usersCache.set(u.username, u);
              this._updateLocalCache(u.username, u.jikopuntos);
            }
          });
        }
      });

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.error('[StreamDB] Error al inicializar StreamFirebaseService:', err);
      return false;
    }
  }

  // ==========================================================================
  // 1. GESTIÓN DE USUARIOS, JIKOPUNTOS Y NIVELES DE ASISTENCIA
  // ==========================================================================

  async getUser(username) {
    const key = norm(username);
    if (!key) return null;

    if (this.usersCache.has(key)) {
      return this.usersCache.get(key);
    }

    try {
      const userRef = ref(this.rtdb, `${NODE_USERS}/${key}`);
      const snap = await get(userRef);

      if (snap.exists()) {
        const data = snap.val();
        // Asegurar que el nivel esté calculado
        const nivelInfo = calcularNivelUsuario(data.asistenciasCount || 0);
        data.nivel = nivelInfo.nivel;
        data.rangoTitulo = nivelInfo.rangoTitulo;
        data.insigniaEmoji = nivelInfo.insigniaEmoji;
        data.bonoAsistencia = nivelInfo.puntosPorAsistencia;
        data.porcentajeProgreso = nivelInfo.porcentajeProgreso;

        this.usersCache.set(key, data);
        this._updateLocalCache(key, data.jikopuntos);
        return data;
      }

      // Crear usuario nuevo con saldo inicial y nivel 1
      const localPts = this._getLocalCache(key);
      const initialPts = localPts !== null ? localPts : USER_DEFAULT_POINTS;
      const nivelInfo = calcularNivelUsuario(0);

      const newUser = {
        username: key,
        displayName: String(username).replace(/^@/, '').trim(),
        avatar: '',
        rol: key === 'jikokun' ? 'broadcaster' : 'espectador',
        jikopuntos: initialPts,
        totalGanado: initialPts,
        totalGastado: 0,
        totalCompras: 0,
        asistenciasCount: 0,
        nivel: nivelInfo.nivel,
        rangoTitulo: nivelInfo.rangoTitulo,
        insigniaEmoji: nivelInfo.insigniaEmoji,
        bonoAsistencia: nivelInfo.puntosPorAsistencia,
        primerRegistro: Date.now(),
        ultimaActividad: Date.now(),
        vinculacion: {
          authUid: null,
          email: null,
          vinculado: false,
          vinculadoEn: null
        },
        widgets: {
          tiendita: {
            platoFavorito: null,
            pedidosCount: 0,
            platillosTotales: 0,
            ultimoPedido: null
          }
        },
        stats: {
          platosConsumidos: {},
          nivelLealtad: 'Novato'
        }
      };

      await set(userRef, newUser);
      this.usersCache.set(key, newUser);
      this._updateLocalCache(key, initialPts);
      this._incrementarEstadistica('totalUsuariosRegistrados', 1);

      return newUser;
    } catch (err) {
      console.warn(`[StreamDB] Error al consultar usuario @${key}, usando fallback local:`, err);
      const fallbackPts = this._getLocalCache(key) || USER_DEFAULT_POINTS;
      return {
        username: key,
        displayName: String(username).replace(/^@/, '').trim(),
        jikopuntos: fallbackPts,
        totalGastado: 0,
        nivel: 1,
        insigniaEmoji: '🐾',
        rangoTitulo: 'Cachorro'
      };
    }
  }

  // Crear usuario manualmente
  async crearUsuario({ username, displayName, rol = 'espectador', jikopuntos = USER_DEFAULT_POINTS, asistenciasCount = 0, avatar = '' }) {
    await this.init();
    const key = norm(username);
    if (!key) throw new Error('Nombre de usuario no válido');

    const userRef = ref(this.rtdb, `${NODE_USERS}/${key}`);
    const snap = await get(userRef);
    if (snap.exists()) {
      throw new Error(`El usuario @${key} ya existe en la base de datos.`);
    }

    const pts = Math.max(0, parseInt(jikopuntos, 10) || USER_DEFAULT_POINTS);
    const asistencias = Math.max(0, parseInt(asistenciasCount, 10) || 0);
    const nivelInfo = calcularNivelUsuario(asistencias);
    const ahora = Date.now();

    const newUser = {
      username: key,
      displayName: displayName && String(displayName).trim() ? String(displayName).trim() : key,
      avatar: avatar || '',
      rol: key === 'jikokun' ? 'broadcaster' : rol,
      jikopuntos: pts,
      totalGanado: pts,
      totalGastado: 0,
      totalCompras: 0,
      asistenciasCount: asistencias,
      nivel: nivelInfo.nivel,
      rangoTitulo: nivelInfo.rangoTitulo,
      insigniaEmoji: nivelInfo.insigniaEmoji,
      bonoAsistencia: nivelInfo.puntosPorAsistencia,
      primerRegistro: ahora,
      ultimaActividad: ahora,
      vinculacion: {
        authUid: null,
        email: null,
        vinculado: false,
        vinculadoEn: null
      },
      widgets: {
        tiendita: {
          platoFavorito: null,
          pedidosCount: 0,
          platillosTotales: 0,
          ultimoPedido: null
        }
      },
      stats: {
        platosConsumidos: {},
        nivelLealtad: nivelInfo.rangoTitulo
      }
    };

    await set(userRef, newUser);
    this.usersCache.set(key, newUser);
    this._updateLocalCache(key, pts);
    await this._incrementarEstadistica('totalUsuariosRegistrados', 1);

    return newUser;
  }

  // Actualizar datos de usuario (nombre, rol, puntos, asistencias, avatar)
  async actualizarUsuario(username, updates = {}) {
    await this.init();
    const key = norm(username);
    if (!key) throw new Error('Nombre de usuario no válido');

    const userRef = ref(this.rtdb, `${NODE_USERS}/${key}`);
    const snap = await get(userRef);
    if (!snap.exists()) {
      throw new Error(`El usuario @${key} no existe en Firebase.`);
    }

    const current = snap.val();
    const cleanUpdates = {
      ultimaActividad: Date.now()
    };

    if (updates.displayName !== undefined) {
      cleanUpdates.displayName = String(updates.displayName).trim() || current.displayName || key;
    }
    if (updates.avatar !== undefined) {
      cleanUpdates.avatar = String(updates.avatar).trim();
    }
    if (updates.rol !== undefined && key !== 'jikokun') {
      cleanUpdates.rol = updates.rol;
    }
    if (updates.jikopuntos !== undefined) {
      const pts = Math.max(0, parseInt(updates.jikopuntos, 10) || 0);
      cleanUpdates.jikopuntos = pts;
      this._updateLocalCache(key, pts);
    }
    if (updates.asistenciasCount !== undefined) {
      const asist = Math.max(0, parseInt(updates.asistenciasCount, 10) || 0);
      cleanUpdates.asistenciasCount = asist;
      const nivelInfo = calcularNivelUsuario(asist);
      cleanUpdates.nivel = nivelInfo.nivel;
      cleanUpdates.rangoTitulo = nivelInfo.rangoTitulo;
      cleanUpdates.insigniaEmoji = nivelInfo.insigniaEmoji;
      cleanUpdates.bonoAsistencia = nivelInfo.puntosPorAsistencia;
    }

    await update(userRef, cleanUpdates);
    const merged = { ...current, ...cleanUpdates };
    this.usersCache.set(key, merged);

    return merged;
  }

  // Eliminar usuario permanentemente
  async eliminarUsuario(username) {
    await this.init();
    const key = norm(username);
    if (!key) throw new Error('Nombre de usuario no válido');
    if (key === 'jikokun') {
      throw new Error('No se puede eliminar la cuenta del broadcaster oficial (@jikokun).');
    }

    const userRef = ref(this.rtdb, `${NODE_USERS}/${key}`);
    await set(userRef, null);

    this.usersCache.delete(key);
    try {
      localStorage.removeItem('tiendita_pts_' + key);
    } catch(e) {}

    await this._incrementarEstadistica('totalUsuariosRegistrados', -1);
    return true;
  }

  getCachedPoints(username) {
    const key = norm(username);
    if (!key) return USER_DEFAULT_POINTS;

    if (this.usersCache.has(key)) {
      return this.usersCache.get(key).jikopuntos;
    }

    const localVal = this._getLocalCache(key);
    if (localVal !== null) return localVal;

    this.getUser(username).catch(() => {});
    return USER_DEFAULT_POINTS;
  }

  async setJikopuntos(username, points, motivo = 'ajuste') {
    const key = norm(username);
    if (!key) return false;
    const pts = Math.max(0, parseInt(points, 10) || 0);

    this._updateLocalCache(key, pts);
    if (this.usersCache.has(key)) {
      this.usersCache.get(key).jikopuntos = pts;
    }

    try {
      const userRef = ref(this.rtdb, `${NODE_USERS}/${key}`);
      await update(userRef, {
        jikopuntos: pts,
        ultimaActividad: Date.now()
      });
      return true;
    } catch (err) {
      console.warn(`[StreamDB] No se pudo guardar puntos de @${key}:`, err);
      return false;
    }
  }

  async addJikopuntos(username, cantidad, motivo = 'premio') {
    const key = norm(username);
    if (!key) return 0;
    const delta = parseInt(cantidad, 10) || 0;

    try {
      const userRef = ref(this.rtdb, `${NODE_USERS}/${key}/jikopuntos`);
      let nuevoSaldo = USER_DEFAULT_POINTS;

      const res = await runTransaction(userRef, (actual) => {
        const prev = (actual === null || actual === undefined) ? USER_DEFAULT_POINTS : actual;
        nuevoSaldo = Math.max(0, prev + delta);
        return nuevoSaldo;
      });

      if (res.committed) {
        this._updateLocalCache(key, nuevoSaldo);
        if (this.usersCache.has(key)) {
          this.usersCache.get(key).jikopuntos = nuevoSaldo;
        }

        if (delta > 0) {
          await runTransaction(ref(this.rtdb, `${NODE_USERS}/${key}/totalGanado`), (prev) => (prev || 0) + delta);
        }

        await update(ref(this.rtdb, `${NODE_USERS}/${key}`), { ultimaActividad: Date.now() });
        return nuevoSaldo;
      }
    } catch (err) {
      console.warn(`[StreamDB] Error en addJikopuntos @${key}:`, err);
    }

    const cur = this.getCachedPoints(key);
    const fallback = Math.max(0, cur + delta);
    this._updateLocalCache(key, fallback);
    return fallback;
  }

  onUser(username, callback) {
    const key = norm(username);
    if (!key || typeof callback !== 'function') return () => {};

    const userRef = ref(this.rtdb, `${NODE_USERS}/${key}`);
    return onValue(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const nivelInfo = calcularNivelUsuario(data.asistenciasCount || 0);
        data.nivel = nivelInfo.nivel;
        data.rangoTitulo = nivelInfo.rangoTitulo;
        data.insigniaEmoji = nivelInfo.insigniaEmoji;
        data.bonoAsistencia = nivelInfo.puntosPorAsistencia;
        data.porcentajeProgreso = nivelInfo.porcentajeProgreso;

        this.usersCache.set(key, data);
        this._updateLocalCache(key, data.jikopuntos);
        callback(data);
      } else {
        callback(null);
      }
    });
  }

  onUsers(callback) {
    if (typeof callback !== 'function') return () => {};
    return onValue(ref(this.rtdb, NODE_USERS), (snap) => {
      const usersList = [];
      if (snap.exists()) {
        snap.forEach(child => {
          const uKey = child.key;
          if (!uKey || uKey === 'undefined' || uKey === 'null') {
            try { set(ref(this.rtdb, `${NODE_USERS}/${uKey}`), null); } catch(e){}
            return;
          }
          const u = child.val();
          if (!u || !u.username || u.username === 'undefined' || u.username === 'null') return;
          const nivelInfo = calcularNivelUsuario(u.asistenciasCount || 0);
          u.nivel = nivelInfo.nivel;
          u.rangoTitulo = nivelInfo.rangoTitulo;
          u.insigniaEmoji = nivelInfo.insigniaEmoji;
          u.bonoAsistencia = nivelInfo.puntosPorAsistencia;
          u.porcentajeProgreso = nivelInfo.porcentajeProgreso;
          usersList.push(u);
        });
      }
      callback(usersList);
    });
  }

  // ==========================================================================
  // 2. DETECTOR INTERNO DE KICK (SIN STREAMER.BOT) & HISTORIAL DE TRANSMISIONES
  // ==========================================================================

  // Iniciar monitoreo interno continuo de Kick (Pusher WebSocket + HTTP Polling)
  startKickStreamMonitor(channel = KICK_CHANNEL, pollIntervalMs = 25000) {
    if (this.kickMonitorActive) return;
    this.kickMonitorActive = true;
    console.log(`[StreamDB] 📡 Iniciando detector interno de Kick para canal: @${channel} (ID: ${KICK_CHANNEL_ID})`);

    // 1. Chequeo inicial inmediato vía API
    this.checkKickLiveStatusViaApi(channel);

    // 2. Conexión nativa a Pusher WebSocket de Kick
    this._connectKickPusher(KICK_CHANNEL_ID);

    // 3. Polling de respaldo periódico
    if (this.kickPollTimer) clearInterval(this.kickPollTimer);
    this.kickPollTimer = setInterval(() => {
      this.checkKickLiveStatusViaApi(channel);
    }, pollIntervalMs);
  }

  stopKickStreamMonitor() {
    this.kickMonitorActive = false;
    if (this.kickPollTimer) clearInterval(this.kickPollTimer);
    if (this.kickPusherWs) {
      try { this.kickPusherWs.close(); } catch(e){}
      this.kickPusherWs = null;
    }
  }

  // Consultar estado de Kick directamente mediante su API v2 pública
  async checkKickLiveStatusViaApi(channel = KICK_CHANNEL) {
    try {
      const res = await fetch(`https://kick.com/api/v2/channels/${channel}`);
      if (res.ok) {
        const data = await res.json();
        const wasLive = this.kickIsLive;
        const isNowLive = !!(data && data.livestream);
        this.kickLivestreamData = data.livestream || null;

        if (!wasLive && isNowLive) {
          // 🚀 Transición: El canal acaba de encender DIRECTO en Kick
          await this._handleStreamStarted(data);
        } else if (wasLive && !isNowLive) {
          // 🛑 Transición: El canal acaba de apagar DIRECTO en Kick
          await this._handleStreamStopped();
        } else if (isNowLive) {
          // Actualizar métricas del stream activo (pico de viewers, título)
          await this._updateLiveStreamMetrics(data.livestream);
        }

        this.kickIsLive = isNowLive;
        this._notifyKickStateListeners();
      }
    } catch (err) {
      // Fallback silencioso por posibles bloqueos CORS o de red temporales
    }
  }

  // Conexión directa a Pusher WebSocket oficial de Kick (sin dependencias externas)
  _connectKickPusher(channelId = KICK_CHANNEL_ID) {
    try {
      const wsUrl = `wss://ws-${KICK_PUSHER_CLUSTER}.pusher.com/app/${KICK_PUSHER_KEY}?protocol=7&client=js&version=7.6.0&flash=false`;
      const ws = new WebSocket(wsUrl);
      this.kickPusherWs = ws;

      ws.onopen = () => {
        console.log('[StreamDB] ⚡ Pusher Kick conectado. Suscribiendo a eventos en vivo de channel.' + channelId);
        ws.send(JSON.stringify({
          event: 'pusher:subscribe',
          data: { channel: `channel.${channelId}` }
        }));
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          const ev = msg.event;

          if (ev === 'App\\Events\\StreamerIsLive') {
            console.log('[StreamDB] 🔴 [KICK PUSHER] ¡EVENTO DETECTADO: StreamerIsLive!');
            await this.checkKickLiveStatusViaApi(KICK_CHANNEL);
          } else if (ev === 'App\\Events\\StopStreamBroadcast') {
            console.log('[StreamDB] ⚪ [KICK PUSHER] ¡EVENTO DETECTADO: StopStreamBroadcast!');
            await this._handleStreamStopped();
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        if (this.kickMonitorActive) {
          setTimeout(() => this._connectKickPusher(channelId), 8000);
        }
      };

      ws.onerror = () => {};
    } catch (e) {}
  }

  // Manejar inicio de transmisión detectado internamente
  async _handleStreamStarted(channelData) {
    const ahora = Date.now();
    const live = channelData.livestream || {};
    const streamId = live.id ? `stream_${live.id}` : `stream_${ahora}`;
    const fechaLegible = new Date(ahora).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'medium' });

    console.log(`[StreamDB] 🚀 ¡DIRECTO INICIADO EN KICK! Registrando sesión en Firebase: ${streamId}`);

    try {
      // 1. Obtener y actualizar número total correlativo de streams
      const statsRef = ref(this.rtdb, NODE_TRANS_STATS);
      let numeroStream = 1;

      await runTransaction(statsRef, (stats) => {
        if (!stats) stats = {};
        stats.totalStreamsPrendidos = (stats.totalStreamsPrendidos || 0) + 1;
        stats.streamActivoId = streamId;
        stats.isLive = true;
        stats.ultimoLiveTimestamp = ahora;
        stats.streamActual = {
          id: streamId,
          numeroStream: stats.totalStreamsPrendidos,
          titulo: live.session_title || 'Transmisión en Vivo',
          categoria: live.categories?.[0]?.name || 'Just Chatting',
          inicioTimestamp: ahora,
          inicioFechaLegible: fechaLegible,
          viewers: live.viewer_count || 0
        };
        numeroStream = stats.totalStreamsPrendidos;
        return stats;
      });

      // 2. Crear documento de la transmisión en stream/transmisiones/{streamId}
      const transRef = ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamId}`);
      await set(transRef, {
        id: streamId,
        numeroStream: numeroStream,
        canal: KICK_CHANNEL,
        canalId: KICK_CHANNEL_ID,
        inicioTimestamp: ahora,
        inicioFechaLegible: fechaLegible,
        finTimestamp: null,
        finFechaLegible: null,
        duracionMinutos: 0,
        estado: 'en_vivo',
        titulo: live.session_title || 'Transmisión en Vivo',
        categoria: live.categories?.[0]?.name || 'Just Chatting',
        viewersPico: live.viewer_count || 0,
        totalAsistentes: 0,
        puntosRepartidos: 0,
        asistentes: {}
      });

      return streamId;
    } catch (err) {
      console.error('[StreamDB] Error al registrar inicio de stream en Firebase:', err);
      return streamId;
    }
  }

  // Manejar fin de transmisión detectado internamente
  async _handleStreamStopped() {
    const ahora = Date.now();
    console.log('[StreamDB] 🛑 Directo de Kick finalizado. Cerrando sesión en Firebase RTDB...');

    try {
      // 1. Obtener ID del stream activo
      const statsSnap = await get(ref(this.rtdb, `${NODE_TRANS_STATS}/streamActivoId`));
      const streamId = statsSnap.exists() ? statsSnap.val() : null;

      if (streamId) {
        const streamRef = ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamId}`);
        const streamSnap = await get(streamRef);

        if (streamSnap.exists()) {
          const sData = streamSnap.val();
          const duracionMin = Math.round(Math.max(1, (ahora - (sData.inicioTimestamp || ahora)) / 60000));
          const finLegible = new Date(ahora).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'medium' });

          await update(streamRef, {
            finTimestamp: ahora,
            finFechaLegible: finLegible,
            duracionMinutos: duracionMin,
            estado: 'finalizado'
          });
        }
      }

      // 2. Actualizar estadísticas globales
      await update(ref(this.rtdb, NODE_TRANS_STATS), {
        streamActivoId: null,
        isLive: false,
        streamActual: null
      });

      this.kickIsLive = false;
      this.kickLivestreamData = null;
      this._notifyKickStateListeners();
    } catch (err) {
      console.warn('[StreamDB] Error al cerrar sesión de transmisión:', err);
    }
  }

  async _updateLiveStreamMetrics(live) {
    if (!live) return;
    try {
      const statsSnap = await get(ref(this.rtdb, `${NODE_TRANS_STATS}/streamActivoId`));
      const streamId = statsSnap.exists() ? statsSnap.val() : null;
      if (!streamId) return;

      const viewers = live.viewer_count || 0;
      await update(ref(this.rtdb, `${NODE_TRANS_STATS}/streamActual`), {
        viewers: viewers,
        titulo: live.session_title || 'Transmisión en Vivo'
      });

      // Actualizar pico de viewers en el stream
      const streamRef = ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamId}`);
      await runTransaction(streamRef, (s) => {
        if (s) {
          if (viewers > (s.viewersPico || 0)) s.viewersPico = viewers;
          if (live.session_title) s.titulo = live.session_title;
        }
        return s;
      });
    } catch (e) {}
  }

  onKickLiveStateChange(callback) {
    if (typeof callback !== 'function') return () => {};
    this.kickStateListeners.add(callback);
    // Disparar estado actual inmediatamente
    callback({
      isLive: this.kickIsLive,
      livestream: this.kickLivestreamData
    });
    return () => this.kickStateListeners.delete(callback);
  }

  _notifyKickStateListeners() {
    this.kickStateListeners.forEach(fn => {
      try {
        fn({
          isLive: this.kickIsLive,
          livestream: this.kickLivestreamData
        });
      } catch (e) {}
    });
  }

  // ==========================================================================
  // 3. ASISTENCIA CON BONO POR NIVEL & CONTRASTE POR TRANSMISIÓN
  // ==========================================================================

  // Registrar asistencia: otorga puntos según el nivel de asistencia y vincula al stream activo
  async registrarAsistencia({ usuario, botEmisor = 'Lobito_Mensajero' }) {
    const key = norm(usuario);
    const ahora = Date.now();
    const fechaLegible = new Date().toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'medium' });

    try {
      // 1. Obtener perfil del usuario y calcular nivel
      const user = await this.getUser(usuario);
      const prevAsistencias = user ? (user.asistenciasCount || 0) : 0;
      const nuevoTotalAsistencias = prevAsistencias + 1;

      // Calcular nuevo nivel del usuario tras esta asistencia
      const nivelInfo = calcularNivelUsuario(nuevoTotalAsistencias);
      const puntosOtorgados = nivelInfo.puntosPorAsistencia; // 500 base + bono de lealtad
      const nuevoSaldo = (user ? user.jikopuntos : USER_DEFAULT_POINTS) + puntosOtorgados;

      // 2. Obtener stream activo si existe
      let streamActivoId = null;
      let numeroStream = null;
      try {
        const statsSnap = await get(ref(this.rtdb, NODE_TRANS_STATS));
        if (statsSnap.exists()) {
          const stats = statsSnap.val();
          if (stats.isLive && stats.streamActivoId) {
            streamActivoId = stats.streamActivoId;
            numeroStream = stats.streamActual?.numeroStream || null;
          }
        }
      } catch (e) {}

      // 3. Guardar registro en stream/tienda/asistencias
      const asisRef = push(ref(this.rtdb, NODE_ATTENDANCE));
      const record = {
        id: asisRef.key,
        usuario: usuario,
        usuarioNorm: key,
        puntosOtorgados: puntosOtorgados,
        bonoExtraNivel: nivelInfo.bonoExtra,
        nivelUsuario: nivelInfo.nivel,
        rangoTitulo: nivelInfo.rangoTitulo,
        insigniaEmoji: nivelInfo.insigniaEmoji,
        nuevoSaldo: nuevoSaldo,
        botEmisor: botEmisor,
        streamId: streamActivoId,
        numeroStream: numeroStream,
        timestamp: ahora,
        fechaLegible: fechaLegible
      };
      await set(asisRef, record);

      // 4. Si hay un stream activo, vincular la asistencia en stream/transmisiones/{streamId}/asistentes/{user}
      if (streamActivoId) {
        const streamUserRef = ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamActivoId}/asistentes/${key}`);
        await set(streamUserRef, {
          username: usuario,
          usuarioNorm: key,
          hora: new Date(ahora).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }),
          timestamp: ahora,
          nivel: nivelInfo.nivel,
          rangoTitulo: nivelInfo.rangoTitulo,
          insigniaEmoji: nivelInfo.insigniaEmoji,
          puntosOtorgados: puntosOtorgados
        });

        // Actualizar contadores del stream
        const transRef = ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamActivoId}`);
        await runTransaction(transRef, (s) => {
          if (s) {
            s.totalAsistentes = (s.totalAsistentes || 0) + 1;
            s.puntosRepartidos = (s.puntosRepartidos || 0) + puntosOtorgados;
          }
          return s;
        });
      }

      // 5. Actualizar usuario con su nuevo nivel e historial de stream
      const userRef = ref(this.rtdb, `${NODE_USERS}/${key}`);
      await runTransaction(userRef, (u) => {
        if (!u) {
          u = {
            username: key,
            displayName: usuario,
            jikopuntos: nuevoSaldo,
            totalGanado: nuevoSaldo,
            asistenciasCount: nuevoTotalAsistencias,
            nivel: nivelInfo.nivel,
            rangoTitulo: nivelInfo.rangoTitulo,
            insigniaEmoji: nivelInfo.insigniaEmoji,
            bonoAsistencia: nivelInfo.puntosPorAsistencia,
            ultimaActividad: ahora
          };
        } else {
          u.jikopuntos = (u.jikopuntos || 0) + puntosOtorgados;
          u.totalGanado = (u.totalGanado || 0) + puntosOtorgados;
          u.asistenciasCount = nuevoTotalAsistencias;
          u.nivel = nivelInfo.nivel;
          u.rangoTitulo = nivelInfo.rangoTitulo;
          u.insigniaEmoji = nivelInfo.insigniaEmoji;
          u.bonoAsistencia = nivelInfo.puntosPorAsistencia;
          u.ultimaActividad = ahora;

          if (!u.historialTransmisiones) u.historialTransmisiones = {};
          if (streamActivoId) {
            u.historialTransmisiones[streamActivoId] = true;
          }
        }
        return u;
      });

      this._updateLocalCache(key, nuevoSaldo);

      // 6. Actualizar métricas agregadas globales
      const resumenRef = ref(this.rtdb, `${NODE_STATS}/resumen`);
      await runTransaction(resumenRef, (res) => {
        if (!res) res = {};
        res.totalAsistenciasRegistradas = (res.totalAsistenciasRegistradas || 0) + 1;
        res.totalPuntosOtorgados = (res.totalPuntosOtorgados || 0) + puntosOtorgados;
        res.ultimaActualizacion = ahora;
        return res;
      });

      console.log(`[StreamDB] 🐺 Asistencia @${usuario}: ${nivelInfo.insigniaEmoji} ${nivelInfo.rangoTitulo} (Nivel ${nivelInfo.nivel}) +${puntosOtorgados} pts`);
      return record;
    } catch (err) {
      console.warn(`[StreamDB] Error al registrar asistencia @${usuario}:`, err);
      return null;
    }
  }

  // Contrastar quiénes asistieron vs quiénes estuvieron ausentes en una transmisión
  async contrastarAsistenciasTransmision(streamId) {
    try {
      if (!streamId) {
        const stats = await get(ref(this.rtdb, `${NODE_TRANS_STATS}/streamActivoId`));
        streamId = stats.exists() ? stats.val() : null;
      }
      if (!streamId) return null;

      const [streamSnap, usersSnap] = await Promise.all([
        get(ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamId}`)),
        get(ref(this.rtdb, NODE_USERS))
      ]);

      if (!streamSnap.exists()) return null;

      const streamData = streamSnap.val();
      const asistentesMap = streamData.asistentes || {};
      const asistentesKeys = new Set(Object.keys(asistentesMap));

      const presentes = [];
      const ausentes = [];

      if (usersSnap.exists()) {
        usersSnap.forEach(child => {
          const u = child.val();
          const uKey = child.key;
          if (uKey === 'jikokun') return; // Excluir broadcaster

          if (asistentesKeys.has(uKey)) {
            presentes.push({
              username: u.displayName || u.username,
              userKey: uKey,
              nivel: u.nivel || 1,
              rangoTitulo: u.rangoTitulo || 'Cachorro',
              insigniaEmoji: u.insigniaEmoji || '🐾',
              hora: asistentesMap[uKey].hora || '--:--'
            });
          } else {
            ausentes.push({
              username: u.displayName || u.username,
              userKey: uKey,
              nivel: u.nivel || 1,
              rangoTitulo: u.rangoTitulo || 'Cachorro',
              insigniaEmoji: u.insigniaEmoji || '🐾',
              asistenciasCount: u.asistenciasCount || 0
            });
          }
        });
      }

      const totalEspectadores = presentes.length + ausentes.length;
      const tasaAsistencia = totalEspectadores > 0 ? Math.round((presentes.length / totalEspectadores) * 100) : 0;

      return {
        streamId,
        streamNumero: streamData.numeroStream,
        streamTitulo: streamData.titulo,
        inicioFechaLegible: streamData.inicioFechaLegible,
        estado: streamData.estado,
        presentes,
        ausentes,
        totalPresentes: presentes.length,
        totalAusentes: ausentes.length,
        totalEspectadores,
        tasaAsistencia
      };
    } catch (err) {
      console.warn('[StreamDB] Error al contrastar asistencias:', err);
      return null;
    }
  }

  // Obtener historial de transmisiones realizadas
  async getTransmisionesHistorial(limit = 20) {
    try {
      const q = query(ref(this.rtdb, NODE_TRANSMISSIONS), limitToLast(limit));
      const snap = await get(q);
      const lista = [];
      if (snap.exists()) {
        snap.forEach(child => {
          lista.unshift(child.val()); // Más recientes primero
        });
      }
      return lista;
    } catch (e) {
      return [];
    }
  }

  onTransmisionesHistorial(callback, limit = 20) {
    if (typeof callback !== 'function') return () => {};
    const q = query(ref(this.rtdb, NODE_TRANSMISSIONS), limitToLast(limit));
    return onValue(q, (snap) => {
      const lista = [];
      if (snap.exists()) {
        snap.forEach(child => lista.unshift(child.val()));
      }
      callback(lista);
    });
  }

  // Escuchar estado en vivo de transmisiones (contador de prendidos y si está live)
  onTransmisionesStats(callback) {
    if (typeof callback !== 'function') return () => {};
    return onValue(ref(this.rtdb, NODE_TRANS_STATS), (snap) => {
      callback(snap.val() || { totalStreamsPrendidos: 0, isLive: false, streamActivoId: null });
    });
  }

  // Simular manualmente inicio o fin de stream (para pruebas en panel de desarrollo)
  async simularLiveStreamToggle(forzarLive = null) {
    const statsSnap = await get(ref(this.rtdb, `${NODE_TRANS_STATS}/isLive`));
    const estaLiveActualmente = statsSnap.exists() ? statsSnap.val() : false;
    const nuevoEstado = forzarLive !== null ? forzarLive : !estaLiveActualmente;

    if (nuevoEstado) {
      await this._handleStreamStarted({
        livestream: {
          id: Math.floor(Math.random() * 900000 + 100000),
          session_title: '🔥 TRANSMISIÓN EN VIVO ✦ JIKOKUN STREAM',
          viewer_count: Math.floor(Math.random() * 80 + 20),
          categories: [{ name: 'Just Chatting' }]
        }
      });
      this.kickIsLive = true;
    } else {
      await this._handleStreamStopped();
      this.kickIsLive = false;
    }
    this._notifyKickStateListeners();
    return nuevoEstado;
  }

  // ==========================================================================
  // 4. TIENDA DE JIKO: REGISTRO DE COMPRAS, TRANSFERENCIAS Y ESTADÍSTICAS
  // ==========================================================================

  async registrarCompra({ comprador, items, itemsKeys = [], cantidad, costoTotal, nuevoSaldo }) {
    const key = norm(comprador);
    const ahora = Date.now();
    const fechaLegible = new Date().toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'medium' });

    const transaccion = {
      usuario: comprador,
      usuarioNorm: key,
      items: Array.isArray(items) ? items.join(', ') : String(items || ''),
      itemsKeys: itemsKeys,
      cantidadPlatos: cantidad || itemsKeys.length || 1,
      costoTotal: costoTotal,
      nuevoSaldo: nuevoSaldo,
      timestamp: ahora,
      fechaLegible: fechaLegible,
      origen: 'tiendita_widget'
    };

    this._updateLocalCache(key, nuevoSaldo);
    if (this.usersCache.has(key)) {
      this.usersCache.get(key).jikopuntos = nuevoSaldo;
    }

    try {
      const txRef = push(ref(this.rtdb, NODE_TRANSACTIONS));
      transaccion.id = txRef.key;
      await set(txRef, transaccion);

      const userRef = ref(this.rtdb, `${NODE_USERS}/${key}`);
      await runTransaction(userRef, (u) => {
        if (!u) {
          u = {
            username: key,
            displayName: comprador,
            jikopuntos: nuevoSaldo,
            totalGastado: costoTotal,
            totalCompras: 1,
            ultimaActividad: ahora,
            widgets: { tiendita: { pedidosCount: 1, platillosTotales: transaccion.cantidadPlatos, ultimoPedido: ahora } },
            stats: { platosConsumidos: {} }
          };
        } else {
          u.jikopuntos = nuevoSaldo;
          u.totalGastado = (u.totalGastado || 0) + costoTotal;
          u.totalCompras = (u.totalCompras || 0) + 1;
          u.ultimaActividad = ahora;

          if (!u.widgets) u.widgets = {};
          if (!u.widgets.tiendita) u.widgets.tiendita = {};
          u.widgets.tiendita.pedidosCount = (u.widgets.tiendita.pedidosCount || 0) + 1;
          u.widgets.tiendita.platillosTotales = (u.widgets.tiendita.platillosTotales || 0) + transaccion.cantidadPlatos;
          u.widgets.tiendita.ultimoPedido = ahora;

          if (!u.stats) u.stats = {};
          if (!u.stats.platosConsumidos) u.stats.platosConsumidos = {};

          itemsKeys.forEach(k => {
            u.stats.platosConsumidos[k] = (u.stats.platosConsumidos[k] || 0) + 1;
          });

          let fav = null;
          let maxCount = 0;
          for (const [pk, count] of Object.entries(u.stats.platosConsumidos)) {
            if (count > maxCount) {
              maxCount = count;
              fav = pk;
            }
          }
          if (fav) u.widgets.tiendita.platoFavorito = fav;
        }
        return u;
      });

      const resumenRef = ref(this.rtdb, `${NODE_STATS}/resumen`);
      await runTransaction(resumenRef, (res) => {
        if (!res) res = {};
        res.totalVentasPts = (res.totalVentasPts || 0) + costoTotal;
        res.totalOrdenes = (res.totalOrdenes || 0) + 1;
        res.totalPlatillosServidos = (res.totalPlatillosServidos || 0) + transaccion.cantidadPlatos;
        res.ultimoPedidoTimestamp = ahora;
        res.ultimaActualizacion = ahora;
        return res;
      });

      for (const k of itemsKeys) {
        const prodRef = ref(this.rtdb, `${NODE_STATS}/rankingProductos/${k}`);
        await runTransaction(prodRef, (p) => {
          if (!p) p = { key: k, totalVendidos: 0 };
          p.totalVendidos = (p.totalVendidos || 0) + 1;
          p.ultimoVendido = ahora;
          return p;
        });
      }

      const rankingUserRef = ref(this.rtdb, `${NODE_STATS}/rankingUsuarios/${key}`);
      await runTransaction(rankingUserRef, (ru) => {
        if (!ru) {
          ru = {
            username: key,
            displayName: comprador,
            totalGastado: costoTotal,
            comprasCount: 1,
            platillosCount: transaccion.cantidadPlatos,
            saldoActual: nuevoSaldo,
            ultimoGastoTimestamp: ahora
          };
        } else {
          ru.totalGastado = (ru.totalGastado || 0) + costoTotal;
          ru.comprasCount = (ru.comprasCount || 0) + 1;
          ru.platillosCount = (ru.platillosCount || 0) + transaccion.cantidadPlatos;
          ru.saldoActual = nuevoSaldo;
          ru.ultimoGastoTimestamp = ahora;
        }
        return ru;
      });

      return transaccion;
    } catch (err) {
      console.error('[StreamDB] Error al registrar compra:', err);
      return transaccion;
    }
  }

  async registrarTransferencia({ admin, receptor, cantidad, motivo = 'Regalo de streamer' }) {
    const keyReceptor = norm(receptor);
    const delta = parseInt(cantidad, 10) || 0;
    const ahora = Date.now();

    try {
      const nuevoSaldo = await this.addJikopuntos(receptor, delta, motivo);

      const transRef = push(ref(this.rtdb, NODE_TRANSFERS));
      const record = {
        id: transRef.key,
        admin: admin,
        receptor: receptor,
        receptorNorm: keyReceptor,
        cantidad: delta,
        nuevoSaldo: nuevoSaldo,
        motivo: motivo,
        timestamp: ahora,
        fechaLegible: new Date().toLocaleString('es-SV')
      };
      await set(transRef, record);

      this._incrementarEstadistica('totalPuntosOtorgados', delta);
      return record;
    } catch (err) {
      console.warn('[StreamDB] Error al registrar transferencia:', err);
      return null;
    }
  }

  async getEstadisticas() {
    try {
      const snap = await get(ref(this.rtdb, NODE_STATS));
      if (snap.exists()) return snap.val();
    } catch (err) {}
    return {
      resumen: { totalVentasPts: 0, totalOrdenes: 0, totalPlatillosServidos: 0, totalPuntosOtorgados: 0 },
      rankingProductos: {},
      rankingUsuarios: {}
    };
  }

  onEstadisticas(callback) {
    if (typeof callback !== 'function') return () => {};
    return onValue(ref(this.rtdb, NODE_STATS), snap => callback(snap.val() || {}));
  }

  onTransacciones(callback, limit = 25) {
    if (typeof callback !== 'function') return () => {};
    const txQuery = query(ref(this.rtdb, NODE_TRANSACTIONS), limitToLast(limit));
    return onValue(txQuery, snap => {
      const lista = [];
      if (snap.exists()) {
        snap.forEach(child => lista.unshift(child.val()));
      }
      callback(lista);
    });
  }

  onAsistencias(callback, limit = 25) {
    if (typeof callback !== 'function') return () => {};
    const asisQuery = query(ref(this.rtdb, NODE_ATTENDANCE), limitToLast(limit));
    return onValue(asisQuery, snap => {
      const lista = [];
      if (snap.exists()) {
        snap.forEach(child => lista.unshift(child.val()));
      }
      callback(lista);
    });
  }

  // ==========================================================================
  // 5. VINCULACIÓN CON CUENTAS WEB (AUTH UID)
  // ==========================================================================

  async vincularCuenta(username, authUser) {
    const key = norm(username);
    if (!key || !authUser || !authUser.uid) return false;
    try {
      await update(ref(this.rtdb, `${NODE_USERS}/${key}/vinculacion`), {
        authUid: authUser.uid,
        email: authUser.email || null,
        vinculado: true,
        vinculadoEn: Date.now()
      });
      await set(ref(this.rtdb, `${NODE_BINDINGS}/${authUser.uid}`), {
        username: key,
        displayName: username,
        vinculadoEn: Date.now()
      });
      return true;
    } catch (err) {
      return false;
    }
  }

  async getUsuarioPorAuthUid(authUid) {
    if (!authUid) return null;
    try {
      const snap = await get(ref(this.rtdb, `${NODE_BINDINGS}/${authUid}`));
      if (snap.exists()) {
        return await this.getUser(snap.val().username);
      }
    } catch (e) {}
    return null;
  }

  // ==========================================================================
  // 6. ESTADO Y CONFIGURACIÓN DE WIDGETS Y OVERLAYS
  // ==========================================================================

  async setWidgetState(widgetName, stateData) {
    try {
      await update(ref(this.rtdb, `${NODE_WIDGETS}/${widgetName}/estadoEnVivo`), {
        ...stateData,
        ultimaActualizacion: Date.now()
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  onWidgetState(widgetName, callback) {
    return onValue(ref(this.rtdb, `${NODE_WIDGETS}/${widgetName}/estadoEnVivo`), snap => {
      callback(snap.val() || {});
    });
  }

  async setOverlayState(overlayName, stateData) {
    try {
      await update(ref(this.rtdb, `${NODE_OVERLAYS}/${overlayName}/estadoEnVivo`), {
        ...stateData,
        ultimaActualizacion: Date.now()
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  // ==========================================================================
  // 7. SINCRONIZACIÓN MAESTRA DE DATOS LOCALES CON FIREBASE RTDB
  // ==========================================================================
  async syncAllFromLocalStorage() {
    await this.init();

    const localUsersMap = new Map();
    const statsResult = {
      totalEncontrados: 0,
      actualizadosEnFirebase: 0,
      nuevosEnFirebase: 0,
      usuarios: []
    };

    // 1. Escanear todo el localStorage en busca de usuarios y puntos guardados ('tiendita_pts_*')
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('tiendita_pts_')) {
          const rawName = k.replace('tiendita_pts_', '');
          const uKey = norm(rawName);
          if (uKey) {
            const rawVal = localStorage.getItem(k);
            const pts = parseInt(rawVal, 10);
            if (!isNaN(pts)) {
              localUsersMap.set(uKey, {
                username: uKey,
                displayName: rawName,
                jikopuntos: pts,
                source: 'localStorage'
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[StreamDB] Error al leer claves de localStorage:', e);
    }

    // 2. Extraer usuarios de la lista de asistencia local ('tiendita_asistencia_stream_v1')
    try {
      const rawAsis = localStorage.getItem('tiendita_asistencia_stream_v1');
      if (rawAsis) {
        const parsed = JSON.parse(rawAsis);
        if (parsed && Array.isArray(parsed.lista)) {
          parsed.lista.forEach(uName => {
            const uKey = norm(uName);
            if (uKey && !localUsersMap.has(uKey)) {
              const currentPts = this._getLocalCache(uKey) || USER_DEFAULT_POINTS;
              localUsersMap.set(uKey, {
                username: uKey,
                displayName: uName,
                jikopuntos: currentPts,
                asistenciasCount: 1,
                source: 'asistencia_local'
              });
            }
          });
        }
      }
    } catch (e) {}

    // 3. Únicamente sincronizar usuarios reales de localStorage (sin inyectar semillas simuladas)
    // Asegurar únicamente la ficha del broadcaster oficial (@jikokun)
    if (!localUsersMap.has('jikokun')) {
      const broadcasterPts = this._getLocalCache('jikokun') || 99999;
      localUsersMap.set('jikokun', {
        username: 'jikokun',
        displayName: 'Jikokun',
        rol: 'broadcaster',
        jikopuntos: broadcasterPts,
        asistenciasCount: 0,
        source: 'broadcaster'
      });
    } else {
      localUsersMap.get('jikokun').rol = 'broadcaster';
    }

    // 4. Consultar el estado actual de Firebase RTDB (stream/usuarios)
    let firebaseUsers = {};
    try {
      const snap = await get(ref(this.rtdb, NODE_USERS));
      if (snap.exists()) {
        firebaseUsers = snap.val() || {};
      }
      // Limpiar nodo huérfano 'undefined' si existe en Firebase
      if (firebaseUsers['undefined']) {
        await set(ref(this.rtdb, `${NODE_USERS}/undefined`), null);
        delete firebaseUsers['undefined'];
      }
    } catch (err) {
      console.warn('[StreamDB] Error al obtener usuarios de Firebase:', err);
    }

    statsResult.totalEncontrados = localUsersMap.size;

    // 5. Sincronizar cada usuario hacia Firebase RTDB
    for (const [uKey, localData] of localUsersMap.entries()) {
      try {
        const localPts = Math.max(0, parseInt(localData.jikopuntos, 10) || 0);
        const fbUser = firebaseUsers[uKey];

        if (fbUser) {
          // El usuario ya existe en Firebase: sincronizar puntos locales prioritarios
          const asistencias = Math.max(fbUser.asistenciasCount || 0, localData.asistenciasCount || 0);
          const nivelInfo = calcularNivelUsuario(asistencias);
          const totalGanado = Math.max(fbUser.totalGanado || 0, localPts + (fbUser.totalGastado || 0));

          const userUpdates = {
            jikopuntos: localPts,
            totalGanado: totalGanado,
            asistenciasCount: asistencias,
            nivel: nivelInfo.nivel,
            rangoTitulo: nivelInfo.rangoTitulo,
            insigniaEmoji: nivelInfo.insigniaEmoji,
            bonoAsistencia: nivelInfo.puntosPorAsistencia,
            ultimaActividad: Date.now()
          };

          if (!fbUser.displayName || fbUser.displayName === uKey) {
            userUpdates.displayName = localData.displayName || uKey;
          }

          await update(ref(this.rtdb, `${NODE_USERS}/${uKey}`), userUpdates);

          // Actualizar memoria y cache local
          this._updateLocalCache(uKey, localPts);
          const merged = { ...fbUser, ...userUpdates };
          this.usersCache.set(uKey, merged);

          statsResult.actualizadosEnFirebase++;
          statsResult.usuarios.push({
            username: uKey,
            displayName: merged.displayName,
            puntos: localPts,
            accion: 'actualizado',
            nivel: nivelInfo.rangoTitulo
          });
        } else {
          // El usuario es nuevo en Firebase: crear su registro completo
          const asistencias = localData.asistenciasCount || 0;
          const nivelInfo = calcularNivelUsuario(asistencias);
          const newUser = {
            username: uKey,
            displayName: localData.displayName || uKey,
            avatar: '',
            rol: uKey === 'jikokun' ? 'broadcaster' : (localData.rol || 'espectador'),
            jikopuntos: localPts,
            totalGanado: localPts,
            totalGastado: localData.totalGastado || 0,
            totalCompras: localData.totalCompras || 0,
            asistenciasCount: asistencias,
            nivel: nivelInfo.nivel,
            rangoTitulo: nivelInfo.rangoTitulo,
            insigniaEmoji: nivelInfo.insigniaEmoji,
            bonoAsistencia: nivelInfo.puntosPorAsistencia,
            primerRegistro: Date.now(),
            ultimaActividad: Date.now(),
            vinculacion: {
              authUid: null,
              email: null,
              vinculado: false,
              vinculadoEn: null
            },
            widgets: {
              tiendita: {
                platoFavorito: localData.platoFavorito || null,
                pedidosCount: 0,
                platillosTotales: 0,
                ultimoPedido: null
              }
            },
            stats: {
              platosConsumidos: {},
              nivelLealtad: nivelInfo.rangoTitulo
            }
          };

          await set(ref(this.rtdb, `${NODE_USERS}/${uKey}`), newUser);

          this._updateLocalCache(uKey, localPts);
          this.usersCache.set(uKey, newUser);

          statsResult.nuevosEnFirebase++;
          statsResult.usuarios.push({
            username: uKey,
            displayName: newUser.displayName,
            puntos: localPts,
            accion: 'creado',
            nivel: nivelInfo.rangoTitulo
          });
        }

        // 6. Actualizar ranking individual de clientes en estadísticas
        const rankingUserRef = ref(this.rtdb, `${NODE_STATS}/rankingUsuarios/${uKey}`);
        await update(rankingUserRef, {
          username: localData.displayName || uKey,
          usuarioNorm: uKey,
          saldoActual: localPts,
          ultimaActividad: Date.now()
        });

      } catch (errUser) {
        console.warn(`[StreamDB] Error al sincronizar usuario @${uKey}:`, errUser);
      }
    }

    // 7. Asegurar que usuarios existentes en Firebase que no estaban en localStorage se guarden localmente
    for (const [fbKey, fbUser] of Object.entries(firebaseUsers)) {
      if (fbKey && fbKey !== 'undefined' && !localUsersMap.has(fbKey)) {
        this._updateLocalCache(fbKey, fbUser.jikopuntos || USER_DEFAULT_POINTS);
      }
    }

    // 8. Actualizar resumen global en stream/tienda/estadisticas/resumen
    try {
      const snapUsers = await get(ref(this.rtdb, NODE_USERS));
      const totalUsersCount = snapUsers.exists() ? snapUsers.size : localUsersMap.size;
      const resumenRef = ref(this.rtdb, `${NODE_STATS}/resumen`);
      await update(resumenRef, {
        totalUsuariosRegistrados: totalUsersCount,
        ultimaSincronizacionLocal: Date.now()
      });
    } catch (e) {}

    console.log('[StreamDB] ✅ Sincronización maestra de Jikopuntos completada:', statsResult);
    return statsResult;
  }

  // ==========================================================================
  // 8. LIMPIEZA TOTAL DE REGISTROS DE PRUEBA EN FIREBASE RTDB
  // ==========================================================================
  async limpiarRegistrosDePrueba() {
    await this.init();

    try {
      const ahora = Date.now();
      const broadcasterUser = {
        username: 'jikokun',
        displayName: 'Jikokun',
        avatar: '',
        rol: 'broadcaster',
        jikopuntos: 99999,
        totalGanado: 99999,
        totalGastado: 0,
        totalCompras: 0,
        asistenciasCount: 0,
        nivel: 1,
        rangoTitulo: 'Cachorro',
        insigniaEmoji: '🐾',
        bonoAsistencia: 500,
        primerRegistro: ahora,
        ultimaActividad: ahora,
        vinculacion: { authUid: null, email: null, vinculado: false, vinculadoEn: null },
        widgets: { tiendita: { platoFavorito: 'pupusas', pedidosCount: 0, platillosTotales: 0, ultimoPedido: null } },
        stats: { platosConsumidos: {}, nivelLealtad: 'Creador' }
      };

      // 1. Resetear stream/usuarios dejando únicamente al broadcaster oficial
      await set(ref(this.rtdb, NODE_USERS), {
        jikokun: broadcasterUser
      });

      // 2. Limpiar transacciones, transferencias, asistencias y rankings
      await set(ref(this.rtdb, NODE_TRANSACTIONS), null);
      await set(ref(this.rtdb, 'stream/tienda/transferencias'), null);
      await set(ref(this.rtdb, NODE_ATTENDANCE), null);
      await set(ref(this.rtdb, `${NODE_STATS}/rankingUsuarios`), null);
      await set(ref(this.rtdb, `${NODE_STATS}/rankingProductos`), null);

      // 3. Reiniciar resumen global
      await set(ref(this.rtdb, `${NODE_STATS}/resumen`), {
        totalUsuariosRegistrados: 1,
        totalTransacciones: 0,
        totalPuntosGastados: 0,
        totalPlatillosConsumidos: 0,
        totalTransferencias: 0,
        ultimaActualizacion: ahora
      });

      // 4. Limpiar cache en memoria
      this.usersCache.clear();
      this.usersCache.set('jikokun', broadcasterUser);

      if (limpiarLocalStorageLocal) {
        try {
          const keys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('tiendita_pts_') || k.startsWith('tiendita_asistencia_'))) {
              keys.push(k);
            }
          }
          keys.forEach(k => localStorage.removeItem(k));
        } catch(e) {}
      }

      console.log('[StreamDB] 🧹 Base de datos de Firebase limpiada con éxito. Solo broadcaster jikokun preservado.');
      return true;
    } catch (err) {
      console.error('[StreamDB] Error al limpiar base de datos:', err);
      throw err;
    }
  }

  _getLocalCache(key) {
    try {
      const v = localStorage.getItem('tiendita_pts_' + key);
      return v !== null ? parseInt(v, 10) : null;
    } catch (e) {
      return null;
    }
  }

  _updateLocalCache(key, pts) {
    try {
      localStorage.setItem('tiendita_pts_' + key, pts);
    } catch (e) {}
  }

  async _incrementarEstadistica(campo, delta = 1) {
    try {
      await runTransaction(ref(this.rtdb, `${NODE_STATS}/resumen/${campo}`), val => (val || 0) + delta);
    } catch (e) {}
  }
}

export const StreamDB = new StreamFirebaseService();

if (typeof window !== 'undefined') {
  window.StreamDB = StreamDB;
  window.NIVELES_ASISTENCIA = NIVELES_ASISTENCIA;
  window.calcularNivelUsuario = calcularNivelUsuario;
}

export default StreamDB;
