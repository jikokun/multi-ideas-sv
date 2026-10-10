// ==========================================================================
// STREAM FIREBASE REALTIME SERVICE (ROOT EXPORT) - MULTI IDEAS SV
// ==========================================================================
import { rtdb, auth, signInAnonymously } from "./firebase-config.js";
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

export const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^@/, '').trim();

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

export const KICK_CHANNEL = 'jikokun';
export const KICK_CHANNEL_ID = 1874362;
export const KICK_PUSHER_KEY = '32cbd69e4b950bf97679';
export const KICK_PUSHER_CLUSTER = 'us2';

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

    this.kickMonitorActive = false;
    this.kickIsLive = false;
    this.kickLivestreamData = null;
    this.kickPusherWs = null;
    this.kickPollTimer = null;
    this.kickStateListeners = new Set();
  }

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

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.error('[StreamDB] Error al inicializar StreamFirebaseService:', err);
      return false;
    }
  }

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
      console.warn(`[StreamDB] Error al consultar usuario @${key}:`, err);
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
          const u = child.val();
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

  startKickStreamMonitor(channel = KICK_CHANNEL, pollIntervalMs = 25000) {
    if (this.kickMonitorActive) return;
    this.kickMonitorActive = true;
    console.log(`[StreamDB] 📡 Iniciando detector interno de Kick para canal: @${channel} (ID: ${KICK_CHANNEL_ID})`);

    this.checkKickLiveStatusViaApi(channel);
    this._connectKickPusher(KICK_CHANNEL_ID);

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

  async checkKickLiveStatusViaApi(channel = KICK_CHANNEL) {
    try {
      const res = await fetch(`https://kick.com/api/v2/channels/${channel}`);
      if (res.ok) {
        const data = await res.json();
        const wasLive = this.kickIsLive;
        const isNowLive = !!(data && data.livestream);
        this.kickLivestreamData = data.livestream || null;

        if (!wasLive && isNowLive) {
          await this._handleStreamStarted(data);
        } else if (wasLive && !isNowLive) {
          await this._handleStreamStopped();
        } else if (isNowLive) {
          await this._updateLiveStreamMetrics(data.livestream);
        }

        this.kickIsLive = isNowLive;
        this._notifyKickStateListeners();
      }
    } catch (err) {}
  }

  _connectKickPusher(channelId = KICK_CHANNEL_ID) {
    try {
      const wsUrl = `wss://ws-${KICK_PUSHER_CLUSTER}.pusher.com/app/${KICK_PUSHER_KEY}?protocol=7&client=js&version=7.6.0&flash=false`;
      const ws = new WebSocket(wsUrl);
      this.kickPusherWs = ws;

      ws.onopen = () => {
        console.log('[StreamDB] ⚡ Pusher Kick conectado. Suscribiendo a channel.' + channelId);
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
            console.log('[StreamDB] 🔴 [KICK PUSHER] StreamerIsLive detectado!');
            await this.checkKickLiveStatusViaApi(KICK_CHANNEL);
          } else if (ev === 'App\\Events\\StopStreamBroadcast') {
            console.log('[StreamDB] ⚪ [KICK PUSHER] StopStreamBroadcast detectado!');
            await this._handleStreamStopped();
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        if (this.kickMonitorActive) {
          setTimeout(() => this._connectKickPusher(channelId), 8000);
        }
      };
    } catch (e) {}
  }

  async _handleStreamStarted(channelData) {
    const ahora = Date.now();
    const live = channelData.livestream || {};
    const streamId = live.id ? `stream_${live.id}` : `stream_${ahora}`;
    const fechaLegible = new Date(ahora).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'medium' });

    console.log(`[StreamDB] 🚀 Directo iniciado en Kick: ${streamId}`);

    try {
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
      return streamId;
    }
  }

  async _handleStreamStopped() {
    const ahora = Date.now();
    try {
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

      await update(ref(this.rtdb, NODE_TRANS_STATS), {
        streamActivoId: null,
        isLive: false,
        streamActual: null
      });

      this.kickIsLive = false;
      this.kickLivestreamData = null;
      this._notifyKickStateListeners();
    } catch (err) {}
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

  async registrarAsistencia({ usuario, botEmisor = 'Lobito_Mensajero' }) {
    const key = norm(usuario);
    const ahora = Date.now();
    const fechaLegible = new Date().toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'medium' });

    try {
      const user = await this.getUser(usuario);
      const prevAsistencias = user ? (user.asistenciasCount || 0) : 0;
      const nuevoTotalAsistencias = prevAsistencias + 1;

      const nivelInfo = calcularNivelUsuario(nuevoTotalAsistencias);
      const puntosOtorgados = nivelInfo.puntosPorAsistencia;
      const nuevoSaldo = (user ? user.jikopuntos : USER_DEFAULT_POINTS) + puntosOtorgados;

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

        const transRef = ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamActivoId}`);
        await runTransaction(transRef, (s) => {
          if (s) {
            s.totalAsistentes = (s.totalAsistentes || 0) + 1;
            s.puntosRepartidos = (s.puntosRepartidos || 0) + puntosOtorgados;
          }
          return s;
        });
      }

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

      const resumenRef = ref(this.rtdb, `${NODE_STATS}/resumen`);
      await runTransaction(resumenRef, (res) => {
        if (!res) res = {};
        res.totalAsistenciasRegistradas = (res.totalAsistenciasRegistradas || 0) + 1;
        res.totalPuntosOtorgados = (res.totalPuntosOtorgados || 0) + puntosOtorgados;
        res.ultimaActualizacion = ahora;
        return res;
      });

      return record;
    } catch (err) {
      console.warn(`[StreamDB] Error al registrar asistencia @${usuario}:`, err);
      return null;
    }
  }

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
          if (uKey === 'jikokun') return;

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
      return null;
    }
  }

  async getTransmisionesHistorial(limit = 20) {
    try {
      const q = query(ref(this.rtdb, NODE_TRANSMISSIONS), limitToLast(limit));
      const snap = await get(q);
      const lista = [];
      if (snap.exists()) {
        snap.forEach(child => {
          lista.unshift(child.val());
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

  onTransmisionesStats(callback) {
    if (typeof callback !== 'function') return () => {};
    return onValue(ref(this.rtdb, NODE_TRANS_STATS), (snap) => {
      callback(snap.val() || { totalStreamsPrendidos: 0, isLive: false, streamActivoId: null });
    });
  }

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
