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

// Normalizador de Avatar de Kick: Convierte URLs temporales de S3 al CDN permanente oficial de Kick (files.kick.com)
export const normalizarAvatarKickUrl = url => {
  if (!url || typeof url !== 'string') return null;
  let clean = url.trim();
  if (!clean.startsWith('http')) return null;

  // 1. Quitar query parameters temporales de AWS S3 (?X-Amz-...)
  if (clean.includes('kick-files-prod.s3') || clean.includes('files.kick.com')) {
    clean = clean.split('?')[0];
  }

  // 2. Reemplazar endpoint privado S3 por el CDN público y permanente oficial de Kick
  clean = clean.replace(/https?:\/\/kick-files-prod\.s3[^\/]*\.amazonaws\.com\//i, 'https://files.kick.com/');

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
// 🐺 ESCALAFÓN Y SISTEMA DE 50 NIVELES DE EXPERIENCIA (XP) Y RANGOS
// ==========================================================================
export const RANGOS_BASE_TITULOS = [
  { minNivel: 1,  maxNivel: 5,  titulo: 'Cachorro',              emoji: '🐾', bonoExtra: 0,   descripcion: 'Recién llegado a la manada (Niveles 1 a 5)' },
  { minNivel: 6,  maxNivel: 11, titulo: 'Explorador del Stream', emoji: '🧭', bonoExtra: 50,  descripcion: 'Sintoniza con frecuencia (Niveles 6 a 11)' },
  { minNivel: 12, maxNivel: 18, titulo: 'Cazador Fiel',          emoji: '🏹', bonoExtra: 100, descripcion: 'Casi nunca falta a un stream (Niveles 12 a 18)' },
  { minNivel: 19, maxNivel: 25, titulo: 'Guardián de la Manada', emoji: '🛡️', bonoExtra: 150, descripcion: 'Pilar veterano de la comunidad (Niveles 19 a 25)' },
  { minNivel: 26, maxNivel: 33, titulo: 'Lobo Beta (VIP)',       emoji: '⚡', bonoExtra: 200, descripcion: 'Rango élite con presencia constante (Niveles 26 a 33)' },
  { minNivel: 34, maxNivel: 42, titulo: 'Lobo Alfa',             emoji: '🐺', bonoExtra: 250, descripcion: 'Lobo Alfa dominante en la manada (Niveles 34 a 42)' },
  { minNivel: 43, maxNivel: 50, titulo: 'Manada VIP',            emoji: '👑', bonoExtra: 300, descripcion: 'Máximo rango legendario alcanzado (Niveles 43 a 50)' }
];

export function getXpParaSubirNivel(nivel) {
  if (nivel >= 50) return 0;
  if (nivel <= 5) return 1000;
  return 1000 + (nivel - 5) * 150;
}

export const TABLA_50_NIVELES = [];
let _acumuladoXp = 0;
for (let n = 1; n <= 50; n++) {
  const req = getXpParaSubirNivel(n);
  TABLA_50_NIVELES.push({
    nivel: n,
    xpMinima: _acumuladoXp,
    xpParaSubir: req
  });
  _acumuladoXp += req;
}

// Compatibilidad con código previo que usaba NIVELES_ASISTENCIA
export const NIVELES_ASISTENCIA = RANGOS_BASE_TITULOS.map((r, idx) => ({
  nivel: idx + 1,
  min: r.minNivel,
  max: r.maxNivel,
  titulo: r.titulo,
  emoji: r.emoji,
  bonoExtra: r.bonoExtra,
  descripcion: r.descripcion
}));

export function formatearTiempoVisto(minutos = 0) {
  const totalMin = Math.max(0, parseInt(minutos, 10) || 0);
  const horas = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (horas === 0) return `${mins}m`;
  if (mins === 0) return `${horas}h`;
  return `${horas}h ${mins}m`;
}

export function formatearHorasDecimal(minutos = 0) {
  const totalMin = Math.max(0, parseInt(minutos, 10) || 0);
  return (totalMin / 60).toFixed(1) + ' hrs';
}

export function calcularNivelUsuario(arg1 = 0, arg2 = 0, arg3 = null) {
  let xp = 0;
  let asistencias = 0;
  let tituloPersonalizado = null;

  if (typeof arg1 === 'object' && arg1 !== null) {
    asistencias = Math.max(0, parseInt(arg1.asistenciasCount, 10) || 0);
    if (arg1.experiencia !== undefined && arg1.experiencia !== null) {
      xp = Math.max(0, parseInt(arg1.experiencia, 10) || 0);
    } else {
      xp = asistencias * 200;
    }
    tituloPersonalizado = arg1.tituloPersonalizado || null;
  } else {
    const num = Math.max(0, parseInt(arg1, 10) || 0);
    if (arg2 !== undefined && arg2 !== null && arg2 !== 0) {
      xp = num;
      asistencias = Math.max(0, parseInt(arg2, 10) || 0);
      tituloPersonalizado = arg3 || null;
    } else {
      if (num < 200) {
        asistencias = num;
        xp = num * 200;
      } else {
        xp = num;
        asistencias = Math.max(0, parseInt(arg2, 10) || 0);
      }
      tituloPersonalizado = arg3 || null;
    }
  }

  let nivelInfo = TABLA_50_NIVELES[0];
  for (let i = 0; i < TABLA_50_NIVELES.length; i++) {
    if (xp >= TABLA_50_NIVELES[i].xpMinima) {
      nivelInfo = TABLA_50_NIVELES[i];
    } else {
      break;
    }
  }

  const nivel = nivelInfo.nivel;
  const esMaximo = nivel >= 50;
  const xpEnNivel = xp - nivelInfo.xpMinima;
  const xpParaSubir = nivelInfo.xpParaSubir;
  const faltantes = esMaximo ? 0 : Math.max(0, xpParaSubir - xpEnNivel);
  const porcentaje = esMaximo ? 100 : Math.min(100, Math.max(0, Math.round((xpEnNivel / Math.max(1, xpParaSubir)) * 100)));

  let rango = RANGOS_BASE_TITULOS[0];
  for (const r of RANGOS_BASE_TITULOS) {
    if (nivel >= r.minNivel && nivel <= r.maxNivel) {
      rango = r;
      break;
    }
  }

  let emojiFinal = rango.emoji;
  let bonoFinal = rango.bonoExtra;
  let esPersonalizado = false;

  if (tituloPersonalizado && String(tituloPersonalizado).trim()) {
    esPersonalizado = true;
    const match = RANGOS_BASE_TITULOS.find(r => r.titulo.toLowerCase() === String(tituloPersonalizado).trim().toLowerCase());
    if (match) {
      emojiFinal = match.emoji;
      bonoFinal = match.bonoExtra;
    } else {
      emojiFinal = '⭐';
    }
  }

  const tituloFinal = esPersonalizado ? String(tituloPersonalizado).trim() : rango.titulo;
  const siguienteNivel = (nivel < 50) ? (nivel + 1) : 50;
  const siguienteInfo = (nivel < 50) ? (TABLA_50_NIVELES[siguienteNivel - 1] || null) : null;
  const siguienteRango = siguienteInfo ? siguienteInfo.rangoTitulo : '¡Rango Máximo!';

  return {
    nivel,
    experiencia: xp,
    xpTotal: xp,
    xpEnNivel,
    xpEnNivelActual: xpEnNivel,
    xpParaSubir,
    xpRequeridaParaSubir: xpParaSubir,
    xpFaltante: faltantes,
    faltantesParaSiguienteNivel: faltantes,
    porcentajeProgreso: porcentaje,
    siguienteNivel,
    siguienteRango,
    rangoTitulo: tituloFinal,
    tituloAutomatico: rango.titulo,
    tituloPersonalizado: esPersonalizado ? tituloFinal : null,
    esTituloPersonalizado: esPersonalizado,
    insigniaEmoji: emojiFinal,
    color: rango.color,
    bonoExtra: bonoFinal,
    puntosPorAsistencia: 500 + bonoFinal,
    asistenciasCount: asistencias,
    descripcion: rango.descripcion
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

    // Tracking de Duración del Directo e Interacciones con XP Progresiva
    this.interaccionesUsuarios = new Map();
    this._streamLocalInicioTimestamp = Date.now();
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
              if (u.avatar) {
                u.avatar = normalizarAvatarKickUrl(u.avatar);
              } else if (u.username === 'jikokun') {
                u.avatar = 'https://files.kick.com/images/user/1926986/profile_image/conversion/ee30bea9-daf6-42be-83a5-082929611657-fullsize.webp';
              }
              this.usersCache.set(u.username, u);
              this._updateLocalCache(u.username, u.jikopuntos);
              if (!u.avatar || !String(u.avatar).startsWith('http')) {
                this.absorberAvatarKick(u.username).catch(() => {});
              }
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
        const asistencias = data.asistenciasCount || 0;
        const xp = (data.experiencia !== undefined && data.experiencia !== null)
          ? (parseInt(data.experiencia, 10) || 0)
          : (asistencias * 200);
        const tiempoMin = parseInt(data.tiempoVistoMinutos, 10) || 0;
        const customTitle = data.tituloPersonalizado || null;

        const nivelInfo = calcularNivelUsuario({
          experiencia: xp,
          asistenciasCount: asistencias,
          tituloPersonalizado: customTitle
        });

        data.experiencia = xp;
        data.tiempoVistoMinutos = tiempoMin;
        data.tiempoVistoLegible = formatearTiempoVisto(tiempoMin);
        data.tiempoVistoHoras = formatearHorasDecimal(tiempoMin);
        data.tituloPersonalizado = customTitle;
        data.esTituloPersonalizado = nivelInfo.esTituloPersonalizado;
        data.tituloAutomatico = nivelInfo.tituloAutomatico;
        data.nivel = nivelInfo.nivel;
        data.rangoTitulo = nivelInfo.rangoTitulo;
        data.insigniaEmoji = nivelInfo.insigniaEmoji;
        data.bonoAsistencia = nivelInfo.puntosPorAsistencia;
        data.porcentajeProgreso = nivelInfo.porcentajeProgreso;
        data.xpEnNivel = nivelInfo.xpEnNivel;
        data.xpParaSubir = nivelInfo.xpParaSubir;
        data.xpFaltante = nivelInfo.xpFaltante;
        data.faltantesParaSiguienteNivel = nivelInfo.xpFaltante;

        if (data.avatar) {
          data.avatar = normalizarAvatarKickUrl(data.avatar);
        } else if (key === 'jikokun') {
          data.avatar = 'https://files.kick.com/images/user/1926986/profile_image/conversion/ee30bea9-daf6-42be-83a5-082929611657-fullsize.webp';
        }

        this.usersCache.set(key, data);
        this._updateLocalCache(key, data.jikopuntos);
        if (!data.avatar || !String(data.avatar).startsWith('http')) {
          this.absorberAvatarKick(key).catch(() => {});
        }
        return data;
      }

      // Crear usuario nuevo con saldo inicial y nivel 1
      const localPts = this._getLocalCache(key);
      const initialPts = localPts !== null ? localPts : USER_DEFAULT_POINTS;
      const nivelInfo = calcularNivelUsuario({ experiencia: 0, asistenciasCount: 0 });

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
        experiencia: 0,
        tiempoVistoMinutos: 0,
        tituloPersonalizado: null,
        nivel: nivelInfo.nivel,
        rangoTitulo: nivelInfo.rangoTitulo,
        tituloAutomatico: nivelInfo.tituloAutomatico,
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

      this.absorberAvatarKick(key).catch(() => {});
      return newUser;
    } catch (err) {
      console.warn(`[StreamDB] Error al consultar usuario @${key}, usando fallback local:`, err);
      const fallbackPts = this._getLocalCache(key) || USER_DEFAULT_POINTS;
      return {
        username: key,
        displayName: String(username).replace(/^@/, '').trim(),
        jikopuntos: fallbackPts,
        totalGastado: 0,
        experiencia: 0,
        tiempoVistoMinutos: 0,
        nivel: 1,
        insigniaEmoji: '🐾',
        rangoTitulo: 'Cachorro'
      };
    }
  }

  // Crear usuario manualmente
  async crearUsuario({ username, displayName, rol = 'espectador', jikopuntos = USER_DEFAULT_POINTS, asistenciasCount = 0, experiencia = null, tiempoVistoMinutos = 0, tituloPersonalizado = null, avatar = '', marcoPerfil = null }) {
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
    const xp = (experiencia !== null && experiencia !== undefined)
      ? Math.max(0, parseInt(experiencia, 10) || 0)
      : (asistencias * 200);
    const tiempoMin = Math.max(0, parseInt(tiempoVistoMinutos, 10) || 0);
    const customTitle = tituloPersonalizado && String(tituloPersonalizado).trim() ? String(tituloPersonalizado).trim() : null;
    const cleanMarco = marcoPerfil && marcoPerfil !== 'auto' && String(marcoPerfil).trim() ? String(marcoPerfil).trim() : null;

    const nivelInfo = calcularNivelUsuario({
      experiencia: xp,
      asistenciasCount: asistencias,
      tituloPersonalizado: customTitle
    });
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
      experiencia: xp,
      tiempoVistoMinutos: tiempoMin,
      tituloPersonalizado: customTitle,
      marcoPerfil: cleanMarco,
      nivel: nivelInfo.nivel,
      rangoTitulo: nivelInfo.rangoTitulo,
      tituloAutomatico: nivelInfo.tituloAutomatico,
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

    if (!avatar || !String(avatar).startsWith('http')) {
      this.absorberAvatarKick(key).catch(() => {});
    }

    return newUser;
  }

  // Actualizar datos de usuario (nombre, rol, puntos, asistencias, experiencia, tiempoVisto, avatar)
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
      cleanUpdates.avatar = normalizarAvatarKickUrl(updates.avatar);
    }
    if (updates.rol !== undefined && key !== 'jikokun') {
      cleanUpdates.rol = updates.rol;
    }
    if (updates.jikopuntos !== undefined) {
      const pts = Math.max(0, parseInt(updates.jikopuntos, 10) || 0);
      cleanUpdates.jikopuntos = pts;
      this._updateLocalCache(key, pts);
    }
    if (updates.tiempoVistoMinutos !== undefined) {
      cleanUpdates.tiempoVistoMinutos = Math.max(0, parseInt(updates.tiempoVistoMinutos, 10) || 0);
    }
    if (updates.tituloPersonalizado !== undefined) {
      cleanUpdates.tituloPersonalizado = updates.tituloPersonalizado && String(updates.tituloPersonalizado).trim()
        ? String(updates.tituloPersonalizado).trim()
        : null;
    }
    if (updates.marcoPerfil !== undefined) {
      cleanUpdates.marcoPerfil = updates.marcoPerfil && updates.marcoPerfil !== 'auto' && String(updates.marcoPerfil).trim()
        ? String(updates.marcoPerfil).trim()
        : null;
    }

    let recalculateLevel = false;
    let nextAsist = current.asistenciasCount || 0;
    let nextXp = (current.experiencia !== undefined && current.experiencia !== null)
      ? current.experiencia
      : (nextAsist * 200);
    let nextTitle = cleanUpdates.tituloPersonalizado !== undefined
      ? cleanUpdates.tituloPersonalizado
      : (current.tituloPersonalizado || null);

    if (updates.asistenciasCount !== undefined) {
      nextAsist = Math.max(0, parseInt(updates.asistenciasCount, 10) || 0);
      cleanUpdates.asistenciasCount = nextAsist;
      recalculateLevel = true;
    }
    if (updates.experiencia !== undefined) {
      nextXp = Math.max(0, parseInt(updates.experiencia, 10) || 0);
      cleanUpdates.experiencia = nextXp;
      recalculateLevel = true;
    }
    if (updates.tituloPersonalizado !== undefined) {
      recalculateLevel = true;
    }

    if (recalculateLevel) {
      const nivelInfo = calcularNivelUsuario({
        experiencia: nextXp,
        asistenciasCount: nextAsist,
        tituloPersonalizado: nextTitle
      });
      cleanUpdates.experiencia = nextXp;
      cleanUpdates.nivel = nivelInfo.nivel;
      cleanUpdates.rangoTitulo = nivelInfo.rangoTitulo;
      cleanUpdates.tituloAutomatico = nivelInfo.tituloAutomatico;
      cleanUpdates.insigniaEmoji = nivelInfo.insigniaEmoji;
      cleanUpdates.bonoAsistencia = nivelInfo.puntosPorAsistencia;
    }

    await update(userRef, cleanUpdates);
    const merged = { ...current, ...cleanUpdates };
    this.usersCache.set(key, merged);

    return merged;
  }

  // Métodos de Experiencia (XP), Título Personalizado y Tiempo Visto
  async addExperiencia(username, deltaXp, motivo = 'premio_xp') {
    const key = norm(username);
    if (!key) return null;
    const delta = parseInt(deltaXp, 10) || 0;
    const user = await this.getUser(username);
    const prevXp = user?.experiencia !== undefined ? user.experiencia : ((user?.asistenciasCount || 0) * 200);
    const nuevoXp = Math.max(0, prevXp + delta);
    return this.actualizarUsuario(key, { experiencia: nuevoXp });
  }

  async setExperiencia(username, totalXp, motivo = 'ajuste_xp') {
    const key = norm(username);
    if (!key) return null;
    const xp = Math.max(0, parseInt(totalXp, 10) || 0);
    return this.actualizarUsuario(key, { experiencia: xp });
  }

  async setTituloPersonalizado(username, titulo) {
    const key = norm(username);
    if (!key) return null;
    const cleanTitle = (titulo && String(titulo).trim()) ? String(titulo).trim() : null;
    return this.actualizarUsuario(key, { tituloPersonalizado: cleanTitle });
  }

  async setMarcoPerfil(username, marco) {
    const key = norm(username);
    if (!key) return null;
    const cleanMarco = (marco && marco !== 'auto' && String(marco).trim()) ? String(marco).trim() : null;
    return this.actualizarUsuario(key, { marcoPerfil: cleanMarco });
  }

  async addTiempoVisto(username, minutosDelta) {
    const key = norm(username);
    if (!key) return null;
    const delta = parseInt(minutosDelta, 10) || 0;
    const user = await this.getUser(username);
    const prevMin = user?.tiempoVistoMinutos || 0;
    const nuevoMin = Math.max(0, prevMin + delta);
    return this.actualizarUsuario(key, { tiempoVistoMinutos: nuevoMin });
  }

  async setTiempoVisto(username, totalMinutos) {
    const key = norm(username);
    if (!key) return null;
    const totalMin = Math.max(0, parseInt(totalMinutos, 10) || 0);
    return this.actualizarUsuario(key, { tiempoVistoMinutos: totalMin });
  }

  // Absorbe automáticamente la foto de perfil del usuario de Kick
  async absorberAvatarKick(username) {
    const key = norm(username);
    if (!key) return null;

    // Fallback permanente oficial para el dueño
    if (key === 'jikokun') {
      const jikoAvatar = 'https://files.kick.com/images/user/1926986/profile_image/conversion/ee30bea9-daf6-42be-83a5-082929611657-fullsize.webp';
      await this.actualizarUsuario(key, { avatar: jikoAvatar });
      return jikoAvatar;
    }

    // Probar múltiples endpoints y proxy seguro para evitar bloqueos CORS
    const endpoints = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent('https://kick.com/api/v1/users/' + username)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent('https://kick.com/api/v2/channels/' + username)}`,
      `https://kick.com/api/v1/users/${encodeURIComponent(username)}`,
      `https://kick.com/api/v2/channels/${encodeURIComponent(username)}`
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep);
        if (res.ok) {
          const data = await res.json();
          const rawPic = data.profilepic || data.profile_pic || data.profile_image || data.avatar || data.user?.profilepic || data.user?.profile_pic || data.user?.avatar;
          if (rawPic && typeof rawPic === 'string' && rawPic.startsWith('http')) {
            const cleanPic = normalizarAvatarKickUrl(rawPic);
            await this.actualizarUsuario(key, { avatar: cleanPic });
            return cleanPic;
          }
        }
      } catch (e) {}
    }

    return null;
  }

  // Absorbe en lote los avatars de todos los usuarios de Kick registrados
  async absorberAvataresKickTodos() {
    await this.init();
    const usersSnap = await get(ref(this.rtdb, NODE_USERS));
    if (!usersSnap.exists()) return { procesados: 0, actualizados: 0 };

    let procesados = 0;
    let actualizados = 0;
    const users = usersSnap.val();

    for (const [key, u] of Object.entries(users)) {
      if (!u || !u.username) continue;
      procesados++;
      if (!u.avatar || !String(u.avatar).startsWith('http')) {
        try {
          const pic = await this.absorberAvatarKick(u.username);
          if (pic) actualizados++;
          await new Promise(r => setTimeout(r, 120));
        } catch (e) {}
      }
    }

    return { procesados, actualizados };
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
        const asistencias = data.asistenciasCount || 0;
        const xp = (data.experiencia !== undefined && data.experiencia !== null)
          ? (parseInt(data.experiencia, 10) || 0)
          : (asistencias * 200);
        const tiempoMin = parseInt(data.tiempoVistoMinutos, 10) || 0;
        const customTitle = data.tituloPersonalizado || null;

        const nivelInfo = calcularNivelUsuario({
          experiencia: xp,
          asistenciasCount: asistencias,
          tituloPersonalizado: customTitle
        });

        data.experiencia = xp;
        data.tiempoVistoMinutos = tiempoMin;
        data.tiempoVistoLegible = formatearTiempoVisto(tiempoMin);
        data.tiempoVistoHoras = formatearHorasDecimal(tiempoMin);
        data.tituloPersonalizado = customTitle;
        data.esTituloPersonalizado = nivelInfo.esTituloPersonalizado;
        data.tituloAutomatico = nivelInfo.tituloAutomatico;
        data.nivel = nivelInfo.nivel;
        data.rangoTitulo = nivelInfo.rangoTitulo;
        data.insigniaEmoji = nivelInfo.insigniaEmoji;
        data.bonoAsistencia = nivelInfo.puntosPorAsistencia;
        data.porcentajeProgreso = nivelInfo.porcentajeProgreso;
        data.xpEnNivel = nivelInfo.xpEnNivel;
        data.xpParaSubir = nivelInfo.xpParaSubir;
        data.xpFaltante = nivelInfo.xpFaltante;
        data.faltantesParaSiguienteNivel = nivelInfo.xpFaltante;

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
          const asistencias = u.asistenciasCount || 0;
          const xp = (u.experiencia !== undefined && u.experiencia !== null)
            ? (parseInt(u.experiencia, 10) || 0)
            : (asistencias * 200);
          const tiempoMin = parseInt(u.tiempoVistoMinutos, 10) || 0;
          const customTitle = u.tituloPersonalizado || null;

          const nivelInfo = calcularNivelUsuario({
            experiencia: xp,
            asistenciasCount: asistencias,
            tituloPersonalizado: customTitle
          });

          u.experiencia = xp;
          u.tiempoVistoMinutos = tiempoMin;
          u.tiempoVistoLegible = formatearTiempoVisto(tiempoMin);
          u.tiempoVistoHoras = formatearHorasDecimal(tiempoMin);
          u.tituloPersonalizado = customTitle;
          u.esTituloPersonalizado = nivelInfo.esTituloPersonalizado;
          u.tituloAutomatico = nivelInfo.tituloAutomatico;
          u.nivel = nivelInfo.nivel;
          u.rangoTitulo = nivelInfo.rangoTitulo;
          u.insigniaEmoji = nivelInfo.insigniaEmoji;
          u.bonoAsistencia = nivelInfo.puntosPorAsistencia;
          u.porcentajeProgreso = nivelInfo.porcentajeProgreso;
          u.xpEnNivel = nivelInfo.xpEnNivel;
          u.xpParaSubir = nivelInfo.xpParaSubir;
          u.xpFaltante = nivelInfo.xpFaltante;
          u.faltantesParaSiguienteNivel = nivelInfo.xpFaltante;
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

  // ══════════════════════════════════════════════════════════════════════════
  // 3. TIEMPO, DURACIÓN DEL DIRECTO & MULTIPLICADOR JUSTO DE EXPERIENCIA (XP)
  // ══════════════════════════════════════════════════════════════════════════

  // Obtener estado y duración activa del stream actual (en minutos y horas)
  getStreamDuracionActual() {
    const ahora = Date.now();
    let isLive = this.kickIsLive;
    let inicioTimestamp = null;
    let titulo = 'Transmisión en Vivo';

    // 1. Kick livestream data oficial
    if (this.kickLivestreamData) {
      isLive = true;
      if (this.kickLivestreamData.created_at) {
        inicioTimestamp = new Date(this.kickLivestreamData.created_at).getTime();
      }
      titulo = this.kickLivestreamData.session_title || titulo;
    }

    // 2. Sesión activa local como fallback si Kick monitor está offline o en pruebas de OBS
    if (!inicioTimestamp) {
      if (!this._streamLocalInicioTimestamp) {
        this._streamLocalInicioTimestamp = ahora;
      }
      inicioTimestamp = this._streamLocalInicioTimestamp;
    }

    const duracionMs = Math.max(0, ahora - inicioTimestamp);
    const duracionMinutos = Math.max(1, Math.floor(duracionMs / 60000));

    return {
      isLive: isLive || true,
      inicioTimestamp: inicioTimestamp,
      duracionMinutos: duracionMinutos,
      duracionHoras: (duracionMinutos / 60).toFixed(1),
      titulo: titulo
    };
  }

  // Multiplicador justo de XP según la duración del directo:
  // A mayor tiempo transcurrido en el directo, más se multiplica la XP por fidelidad:
  // - 0 a 29 min:  1.00x (Inicio del stream)
  // - 30 a 59 min: 1.25x (Comunidad activa)
  // - 60 a 89 min: 1.50x (1 hora de stream cumplida)
  // - 90 a 119 min: 1.75x (Transmisión sólida)
  // - 120+ min:    2.00x (Maratón / Gran directo de Jikokun)
  calcularMultiplicadorDuracionStream(duracionMinutos = 1) {
    const bloques = Math.floor(Math.max(0, duracionMinutos) / 30);
    const factor = 1.0 + Math.min(1.0, bloques * 0.25);
    return Number(factor.toFixed(2));
  }

  // Registrar interacción de un usuario en el directo y acumular XP por tiempo activo de forma justa
  async registrarInteraccionStream({ usuario, tipo = 'chat', mensaje = '' }) {
    const key = norm(usuario);
    if (!key) return null;

    const BOTS_IGNORADOS = ['botrix', 'lobito_mensajero', 'kickbot', 'nightbot', 'streamelements', 'streamlabs', 'jikobot', 'streamerbot'];
    if (BOTS_IGNORADOS.includes(key)) return null;

    const ahora = Date.now();
    if (!this.interaccionesUsuarios) {
      this.interaccionesUsuarios = new Map();
    }

    let userTrack = this.interaccionesUsuarios.get(key);
    if (!userTrack) {
      userTrack = {
        usuario: key,
        primeraInteraccion: ahora,
        ultimaInteraccion: ahora,
        ultimaXpAsignada: ahora,
        minutosInteractuados: 0,
        xpGanadaEnDirecto: 0
      };
      this.interaccionesUsuarios.set(key, userTrack);
      return {
        usuario: key,
        primeraVez: true,
        xpGanada: 0,
        minutosDelta: 0,
        factor: 1.0
      };
    }

    userTrack.ultimaInteraccion = ahora;
    const deltaMs = ahora - userTrack.ultimaXpAsignada;

    // Acumulación justa poco a poco: cada 60 segundos (1 minuto) de permanencia activa
    if (deltaMs >= 60000) {
      const minutosDelta = Math.min(5, Math.max(1, Math.floor(deltaMs / 60000)));
      const streamInfo = this.getStreamDuracionActual();
      const factor = this.calcularMultiplicadorDuracionStream(streamInfo.duracionMinutos);

      // 10 XP base por minuto activo * factor multiplicador de la duración del directo
      const xpBase = 10 * minutosDelta;
      const xpGanada = Math.round(xpBase * factor);

      // Persistir XP y tiempo visto en Firebase
      await this.addExperiencia(key, xpGanada, 'interaccion_tiempo_stream');
      await this.addTiempoVisto(key, minutosDelta);

      userTrack.ultimaXpAsignada = ahora;
      userTrack.minutosInteractuados += minutosDelta;
      userTrack.xpGanadaEnDirecto += xpGanada;

      console.log(`[StreamXP] ⚡ @${key} ganó +${xpGanada} XP (+${minutosDelta}m activo | Directo: ${streamInfo.duracionMinutos}m | Factor: x${factor})`);

      return {
        usuario: key,
        xpGanada: xpGanada,
        minutosDelta: minutosDelta,
        minutosInteractuados: userTrack.minutosInteractuados,
        totalXpDirecto: userTrack.xpGanadaEnDirecto,
        factor: factor,
        duracionStreamMinutos: streamInfo.duracionMinutos
      };
    }

    return {
      usuario: key,
      xpGanada: 0,
      cooldownMinuto: true
    };
  }

  // ==========================================================================
  // 4. ASISTENCIA CON BONO POR NIVEL & CONTRASTE POR TRANSMISIÓN
  // ==========================================================================

  // Registrar asistencia: otorga puntos según el nivel de asistencia y vincula al stream activo
  async registrarAsistencia({ usuario, botEmisor = 'Lobito_Mensajero' }) {
    const key = norm(usuario);
    const ahora = Date.now();
    const fechaLegible = new Date().toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'medium' });

    if (!this._streamLocalInicioTimestamp) {
      this._streamLocalInicioTimestamp = ahora;
    }
    if (!this.interaccionesUsuarios) {
      this.interaccionesUsuarios = new Map();
    }
    if (!this.interaccionesUsuarios.has(key)) {
      this.interaccionesUsuarios.set(key, {
        usuario: key,
        primeraInteraccion: ahora,
        ultimaInteraccion: ahora,
        ultimaXpAsignada: ahora,
        minutosInteractuados: 0,
        xpGanadaEnDirecto: 200,
        asistio: true
      });
    }

    try {
      // 1. Obtener perfil del usuario y calcular nivel
      const user = await this.getUser(usuario);
      const prevAsistencias = user ? (user.asistenciasCount || 0) : 0;
      const nuevoTotalAsistencias = prevAsistencias + 1;

      // Calcular XP: +200 XP por cada transmisión
      const prevXp = (user && user.experiencia !== undefined && user.experiencia !== null)
        ? user.experiencia
        : (prevAsistencias * 200);
      const nuevoTotalXp = prevXp + 200;

      // Calcular nuevo nivel del usuario tras ganar 200 XP en esta transmisión
      const nivelInfo = calcularNivelUsuario({
        experiencia: nuevoTotalXp,
        asistenciasCount: nuevoTotalAsistencias,
        tituloPersonalizado: user?.tituloPersonalizado
      });

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
        experienciaGanada: 200,
        experienciaTotal: nuevoTotalXp,
        nivelUsuario: nivelInfo.nivel,
        rangoTitulo: nivelInfo.rangoTitulo,
        tituloAutomatico: nivelInfo.tituloAutomatico,
        tituloPersonalizado: nivelInfo.tituloPersonalizado,
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
          experiencia: nuevoTotalXp,
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
            experiencia: nuevoTotalXp,
            tiempoVistoMinutos: 0,
            tituloPersonalizado: null,
            nivel: nivelInfo.nivel,
            rangoTitulo: nivelInfo.rangoTitulo,
            tituloAutomatico: nivelInfo.tituloAutomatico,
            insigniaEmoji: nivelInfo.insigniaEmoji,
            bonoAsistencia: nivelInfo.puntosPorAsistencia,
            ultimaActividad: ahora
          };
        } else {
          u.jikopuntos = (u.jikopuntos || 0) + puntosOtorgados;
          u.totalGanado = (u.totalGanado || 0) + puntosOtorgados;
          u.asistenciasCount = nuevoTotalAsistencias;
          u.experiencia = nuevoTotalXp;
          u.nivel = nivelInfo.nivel;
          u.rangoTitulo = nivelInfo.rangoTitulo;
          u.tituloAutomatico = nivelInfo.tituloAutomatico;
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

      console.log(`[StreamDB] 🐺 Asistencia @${usuario}: ${nivelInfo.insigniaEmoji} ${nivelInfo.rangoTitulo} (Nivel ${nivelInfo.nivel} • ${nuevoTotalXp} XP) +${puntosOtorgados} pts`);
      if (!user?.avatar || !String(user.avatar).startsWith('http')) {
        this.absorberAvatarKick(usuario).catch(() => {});
      }
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
              avatar: u.avatar || '',
              nivel: u.nivel || 1,
              rangoTitulo: u.rangoTitulo || 'Cachorro',
              insigniaEmoji: u.insigniaEmoji || '🐾',
              hora: asistentesMap[uKey].hora || '--:--'
            });
          } else {
            ausentes.push({
              username: u.displayName || u.username,
              userKey: uKey,
              avatar: u.avatar || '',
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

  async registrarCompra({ comprador, items, itemsKeys = [], cantidad, costoTotal, nuevoSaldo, xpGanada = null }) {
    const key = norm(comprador);
    const ahora = Date.now();
    const fechaLegible = new Date().toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'medium' });

    // ⭐ REGLA DE EXPERIENCIA: Otorgar 50% equivalente de los Jikopuntos gastados como XP al comprador
    // Ejemplo: gasta 500 jikopuntos -> recibe 250 puntos de experiencia
    const gastoPuntos = Math.max(0, parseInt(costoTotal, 10) || 0);
    const xpOtorgada = (xpGanada !== null && xpGanada !== undefined)
      ? Math.max(0, parseInt(xpGanada, 10) || 0)
      : Math.round(gastoPuntos * 0.5);

    let nivelPrevio = 1;
    let nuevoNivel = 1;
    let totalXpUsuario = 0;
    let subioNivel = false;
    let rangoTituloNuevo = 'Cachorro';
    let insigniaEmojiNueva = '🐾';

    const transaccion = {
      usuario: comprador,
      usuarioNorm: key,
      items: Array.isArray(items) ? items.join(', ') : String(items || ''),
      itemsKeys: itemsKeys,
      cantidadPlatos: cantidad || itemsKeys.length || 1,
      costoTotal: gastoPuntos,
      nuevoSaldo: nuevoSaldo,
      experienciaGanada: xpOtorgada,
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
          totalXpUsuario = xpOtorgada;
          const nivelInfo = calcularNivelUsuario({ experiencia: totalXpUsuario, asistenciasCount: 0 });
          nuevoNivel = nivelInfo.nivel;
          rangoTituloNuevo = nivelInfo.rangoTitulo;
          insigniaEmojiNueva = nivelInfo.insigniaEmoji;
          u = {
            username: key,
            displayName: comprador,
            jikopuntos: nuevoSaldo,
            totalGastado: gastoPuntos,
            totalCompras: 1,
            experiencia: totalXpUsuario,
            nivel: nuevoNivel,
            rangoTitulo: rangoTituloNuevo,
            insigniaEmoji: insigniaEmojiNueva,
            porcentajeProgreso: nivelInfo.porcentajeProgreso,
            xpEnNivel: nivelInfo.xpEnNivel,
            xpParaSubir: nivelInfo.xpParaSubir,
            xpFaltante: nivelInfo.xpFaltante,
            ultimaActividad: ahora,
            widgets: { tiendita: { pedidosCount: 1, platillosTotales: transaccion.cantidadPlatos, ultimoPedido: ahora } },
            stats: { platosConsumidos: {} }
          };
        } else {
          u.jikopuntos = nuevoSaldo;
          u.totalGastado = (u.totalGastado || 0) + gastoPuntos;
          u.totalCompras = (u.totalCompras || 0) + 1;
          u.ultimaActividad = ahora;

          // ⭐ RECOMPENSA DE EXPERIENCIA: 50% de lo gastado acumulado
          nivelPrevio = u.nivel || 1;
          const prevXp = (u.experiencia !== undefined && u.experiencia !== null)
            ? Math.max(0, parseInt(u.experiencia, 10) || 0)
            : ((u.asistenciasCount || 0) * 200);
          totalXpUsuario = prevXp + xpOtorgada;
          u.experiencia = totalXpUsuario;

          const nivelInfo = calcularNivelUsuario({
            experiencia: totalXpUsuario,
            asistenciasCount: u.asistenciasCount || 0,
            tituloPersonalizado: u.tituloPersonalizado || null
          });
          nuevoNivel = nivelInfo.nivel;
          rangoTituloNuevo = nivelInfo.rangoTitulo;
          insigniaEmojiNueva = nivelInfo.insigniaEmoji;
          subioNivel = nuevoNivel > nivelPrevio;

          u.nivel = nuevoNivel;
          u.rangoTitulo = rangoTituloNuevo;
          u.insigniaEmoji = insigniaEmojiNueva;
          u.porcentajeProgreso = nivelInfo.porcentajeProgreso;
          u.xpEnNivel = nivelInfo.xpEnNivel;
          u.xpParaSubir = nivelInfo.xpParaSubir;
          u.xpFaltante = nivelInfo.xpFaltante;

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

      transaccion.experienciaTotal = totalXpUsuario;
      transaccion.nivelPrevio = nivelPrevio;
      transaccion.nuevoNivel = nuevoNivel;
      transaccion.subioNivel = subioNivel;
      transaccion.rangoTitulo = rangoTituloNuevo;
      transaccion.insigniaEmoji = insigniaEmojiNueva;

      const resumenRef = ref(this.rtdb, `${NODE_STATS}/resumen`);
      await runTransaction(resumenRef, (res) => {
        if (!res) res = {};
        res.totalVentasPts = (res.totalVentasPts || 0) + gastoPuntos;
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
            totalGastado: gastoPuntos,
            comprasCount: 1,
            platillosCount: transaccion.cantidadPlatos,
            saldoActual: nuevoSaldo,
            experienciaTotal: totalXpUsuario,
            nivel: nuevoNivel,
            ultimoGastoTimestamp: ahora
          };
        } else {
          ru.totalGastado = (ru.totalGastado || 0) + gastoPuntos;
          ru.comprasCount = (ru.comprasCount || 0) + 1;
          ru.platillosCount = (ru.platillosCount || 0) + transaccion.cantidadPlatos;
          ru.saldoActual = nuevoSaldo;
          ru.experienciaTotal = totalXpUsuario;
          ru.nivel = nuevoNivel;
          ru.ultimoGastoTimestamp = ahora;
        }
        return ru;
      });

      if (this.usersCache.has(key)) {
        const cached = this.usersCache.get(key);
        cached.jikopuntos = nuevoSaldo;
        cached.experiencia = totalXpUsuario;
        cached.nivel = nuevoNivel;
        cached.rangoTitulo = rangoTituloNuevo;
        cached.insigniaEmoji = insigniaEmojiNueva;
      }

      console.log(`[StreamDB] 🛒 Compra registrada para @${comprador}: -${gastoPuntos} pts | +${xpOtorgada} XP (50% de compra) -> Total XP: ${totalXpUsuario} (Nvl ${nuevoNivel})`);
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
  window.RANGOS_BASE_TITULOS = RANGOS_BASE_TITULOS;
  window.TABLA_50_NIVELES = TABLA_50_NIVELES;
  window.NIVELES_ASISTENCIA = NIVELES_ASISTENCIA;
  window.formatearTiempoVisto = formatearTiempoVisto;
  window.formatearHorasDecimal = formatearHorasDecimal;
  window.calcularNivelUsuario = calcularNivelUsuario;
  window.normalizarAvatarKickUrl = normalizarAvatarKickUrl;
}

export default StreamDB;
