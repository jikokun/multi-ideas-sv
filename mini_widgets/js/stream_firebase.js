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
export const NODE_TIENDA_ITEMS = 'stream/tienda/items';
export const NODE_TRANSACTIONS = 'stream/tienda/transacciones';
export const NODE_ATTENDANCE = 'stream/tienda/asistencias';
export const NODE_TRANSFERS = 'stream/tienda/transferencias';
export const NODE_STATS = 'stream/tienda/estadisticas';
export const NODE_BINDINGS = 'stream/vinculaciones';
export const NODE_COMBUSTIBLE_ACTIVO = 'stream/transmisiones_stats/combustibleEnVivo';
export const NODE_BANCO = 'stream/banco';
export const NODE_LOANS = 'stream/banco/prestamos';
export const TASA_INTERES_PRESTAMO = 0.02; // 2% fijo por préstamo

// Constantes de Kick
export const KICK_CHANNEL = 'jikokun';
export const KICK_CHANNEL_ID = 1874362;
export const KICK_PUSHER_KEY = '32cbd69e4b950bf97679';
export const KICK_PUSHER_CLUSTER = 'us2';
export const KICK_CHATROOM_ID = 1866891;

// Extractor universal y resiliente del saludo de bienvenida de Lobito Mensajero
export function extraerUsuarioDeBienvenidaGlobal(texto) {
  if (!texto || typeof texto !== 'string') return null;
  const clean = texto.trim();

  // 1. "Gracias por estar aquí ... @usuario"
  let m = clean.match(/gracias\s+por\s+estar\s+aqu[ií][\s,!.:\-¡¿]*@?([a-zA-Z0-9_\-\.]+)/i);
  if (m && m[1]) {
    const u = m[1].replace(/^[!¡@?¿]+|[!¡?¿.,\s]+$/g, '').trim();
    if (u && !['el', 'la', 'un', 'una', 'en', 'por', 'aqui', 'aquí'].includes(u.toLowerCase())) return u;
  }

  // 2. "@usuario ... gracias por estar aquí"
  m = clean.match(/@?([a-zA-Z0-9_\-\.]+)[\s,!.:\-¡¿]+.*gracias\s+por\s+estar\s+aqu[ií]/i);
  if (m && m[1]) {
    const u = m[1].replace(/^[!¡@?¿]+|[!¡?¿.,\s]+$/g, '').trim();
    if (u && !['el', 'la', 'un', 'una', 'en', 'por', 'gracias', 'hola', 'aqui', 'aquí'].includes(u.toLowerCase())) return u;
  }

  // 3. "Bienvenido/a [a la manada / al canal / al stream] @usuario"
  m = clean.match(/bienvenid[oa@][\w\s,!.:\-¡¿]*?@([a-zA-Z0-9_\-\.]+)/i);
  if (m && m[1]) {
    const u = m[1].replace(/^[!¡@?¿]+|[!¡?¿.,\s]+$/g, '').trim();
    if (u && !['a', 'al', 'la', 'el', 'todos', 'gente', 'manada', 'stream', 'chat'].includes(u.toLowerCase())) return u;
  }

  // 4. "Bienvenido/a @?usuario" directo
  m = clean.match(/bienvenid[oa@][\s,!.:\-¡¿]*@?([a-zA-Z0-9_\-\.]+)/i);
  if (m && m[1]) {
    const u = m[1].replace(/^[!¡@?¿]+|[!¡?¿.,\s]+$/g, '').trim();
    if (u && !['a', 'al', 'la', 'el', 'todos', 'gente', 'manada', 'stream', 'chat'].includes(u.toLowerCase())) return u;
  }

  return null;
}

// ==========================================================================
// 🐺 ESCALAFÓN Y SISTEMA DE 200 NIVELES DE EXPERIENCIA (XP) Y RANGOS
// ==========================================================================
export const RANGOS_BASE_TITULOS = [
  { minNivel: 1,   maxNivel: 10,  titulo: 'Cachorro',                   emoji: '🐾', bonoExtra: 0,   descripcion: 'Recién llegado a la manada (Niveles 1 a 10)' },
  { minNivel: 11,  maxNivel: 25,  titulo: 'Explorador del Stream',      emoji: '🧭', bonoExtra: 50,  descripcion: 'Sintoniza con frecuencia (Niveles 11 a 25)' },
  { minNivel: 26,  maxNivel: 45,  titulo: 'Cazador Fiel',               emoji: '🏹', bonoExtra: 100, descripcion: 'Casi nunca falta a un stream (Niveles 26 a 45)' },
  { minNivel: 46,  maxNivel: 70,  titulo: 'Guardián de la Manada',      emoji: '🛡️', bonoExtra: 150, descripcion: 'Pilar veterano de la comunidad (Niveles 46 a 70)' },
  { minNivel: 71,  maxNivel: 100, titulo: 'Lobo Beta (VIP)',            emoji: '⚡', bonoExtra: 200, descripcion: 'Rango élite con presencia constante (Niveles 71 a 100)' },
  { minNivel: 101, maxNivel: 135, titulo: 'Lobo Alfa',                  emoji: '🐺', bonoExtra: 250, descripcion: 'Lobo Alfa dominante en la manada (Niveles 101 a 135)' },
  { minNivel: 136, maxNivel: 165, titulo: 'Manada VIP',                 emoji: '👑', bonoExtra: 300, descripcion: 'Líder respetado de la comunidad (Niveles 136 a 165)' },
  { minNivel: 166, maxNivel: 185, titulo: 'Lobo Ancestral',             emoji: '🌌', bonoExtra: 350, descripcion: 'Veterano legendario con alma cósmica (Niveles 166 a 185)' },
  { minNivel: 186, maxNivel: 199, titulo: 'Leyenda Mítica',             emoji: '🔮', bonoExtra: 400, descripcion: 'Fuerza casi insuperable del stream (Niveles 186 a 199)' },
  { minNivel: 200, maxNivel: 200, titulo: 'Señor de la Manada Suprema', emoji: '🏆', bonoExtra: 500, descripcion: 'Máximo Rango Absoluto alcanzado (Nivel 200)' }
];

// Curva progresiva de XP requerida para subir de nivel hasta 200
export function getXpParaSubirNivel(nivel) {
  if (nivel >= 200) return 0;
  if (nivel <= 10) return 1000 + (nivel - 1) * 60;
  if (nivel <= 30) return 1600 + (nivel - 10) * 110;
  if (nivel <= 60) return 3800 + (nivel - 30) * 170;
  if (nivel <= 100) return 8900 + (nivel - 60) * 260;
  if (nivel <= 150) return 19300 + (nivel - 100) * 380;
  return 38300 + (nivel - 150) * 550;
}

// Multiplicador de obtención de XP: entre más arriba el nivel, menos puntos se obtienen para dificultar la subida
export function calcularFactorXpNivel(nivel = 1) {
  const n = Math.max(1, Math.min(200, parseInt(nivel, 10) || 1));
  if (n >= 200) return 0;       // Nivel 200 máximo ya no requiere XP
  if (n <= 10) return 1.0;      // 100% de XP
  if (n <= 25) return 0.90;     // 90%
  if (n <= 50) return 0.80;     // 80%
  if (n <= 80) return 0.65;     // 65%
  if (n <= 120) return 0.50;    // 50%
  if (n <= 165) return 0.35;    // 35%
  return 0.20;                  // 20% en niveles de élite (166 a 199)
}

export const TABLA_200_NIVELES = [];
let _acumuladoXp = 0;
for (let n = 1; n <= 200; n++) {
  const req = getXpParaSubirNivel(n);
  TABLA_200_NIVELES.push({
    nivel: n,
    xpMinima: _acumuladoXp,
    xpParaSubir: req
  });
  _acumuladoXp += req;
}

// Compatibilidad con código previo que usaba TABLA_50_NIVELES
export const TABLA_50_NIVELES = TABLA_200_NIVELES;

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

  let nivelInfo = TABLA_200_NIVELES[0];
  for (let i = 0; i < TABLA_200_NIVELES.length; i++) {
    if (xp >= TABLA_200_NIVELES[i].xpMinima) {
      nivelInfo = TABLA_200_NIVELES[i];
    } else {
      break;
    }
  }

  const nivel = nivelInfo.nivel;
  const esMaximo = nivel >= 200;
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
  const siguienteNivel = (nivel < 200) ? (nivel + 1) : 200;
  const siguienteInfo = (nivel < 200) ? (TABLA_200_NIVELES[siguienteNivel - 1] || null) : null;
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
    this.kickChatListeners = new Set();
    this.kickChatStatusListeners = new Set();
    this.streamStartedListeners = new Set();
    this.streamStoppedListeners = new Set();
    this.combustibleAcreditadoListeners = new Set();

    // Tracking de Duración del Directo e Interacciones con XP Progresiva
    this.interaccionesUsuarios = new Map();
    this._streamLocalInicioTimestamp = Date.now();
    this._asistenciaLocks = new Map();
  }

  // Inicialización y autenticación anónima para permisos de escritura limpios
  async init() {
    if (this.isInitialized) return true;

    try {
      if (!this.auth.currentUser) {
        // No bloquear init() esperando autenticación anónima para compatibilidad instantánea en file:/// y OBS
        signInAnonymously(this.auth).then(() => {
          console.log('[StreamDB] 🔐 Sesión anónima iniciada para widgets del stream');
        }).catch((authErr) => {
          console.warn('[StreamDB] Modo local/público activo (aviso auth):', authErr.message);
        });
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

      // Sincronizar estado inicial de stream en vivo desde Firebase RTDB
      try {
        const statsSnap = await get(ref(this.rtdb, NODE_TRANS_STATS));
        if (statsSnap.exists()) {
          const stats = statsSnap.val();
          if (stats.isLive) {
            this.kickIsLive = true;
            this.kickLivestreamData = stats.streamActual || null;
          }
        }
      } catch(e) {}

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

  resolverUsuarioReal(username) {
    if (!username) return '';
    const q = norm(username);
    if (!q) return '';

    if (this.usersCache && this.usersCache.has(q)) return q;

    const ALIASES = {
      'codigo': 'codigo_r',
      'nessa': 'nessaxov',
      'dailer': 'dailerrg',
      'luna': 'lunagamer',
      'jiko': 'jikokun',
      'rejitas': 'elrejitasoficial',
      'capo': 'xelcapo',
      'riki': 'tioriki',
      'villalta': 'villalta_20',
      'camiii': 'camiii07_ok',
      'emmy': 'emmy_aine',
      'juancho': 'juanchofficial',
      'ethan': 'xeth4n_k'
    };
    if (ALIASES[q]) return ALIASES[q];

    if (this.usersCache) {
      const keysCache = Array.from(this.usersCache.keys());
      const matchPrefix = keysCache.filter(k => k.startsWith(q));
      if (matchPrefix.length === 1) return matchPrefix[0];
      const matchContains = keysCache.filter(k => k.includes(q));
      if (matchContains.length === 1) return matchContains[0];
    }

    return q;
  }

  async getUser(username) {
    const rawKey = norm(username);
    const key = this.resolverUsuarioReal(rawKey);
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

      let finalUser = newUser;
      await runTransaction(userRef, (actual) => {
        if (actual) {
          finalUser = actual;
          return actual;
        }
        return newUser;
      });

      this.usersCache.set(key, finalUser);
      this._updateLocalCache(key, finalUser.jikopuntos);
      this._incrementarEstadistica('totalUsuariosRegistrados', 1);

      this.absorberAvatarKick(key).catch(() => {});
      return finalUser;
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
    if (points === undefined || points === null || isNaN(points)) {
      console.warn(`[StreamDB] ⚠️ Intento de setJikopuntos con valor inválido (${points}) para @${key}. Operación abortada.`);
      return false;
    }
    const pts = Math.max(0, parseInt(points, 10));

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

  // Obtener lista completa de usuarios con cálculo de nivel y estadísticas
  async obtenerUsuarios() {
    await this.init();
    try {
      const snap = await get(ref(this.rtdb, NODE_USERS));
      const usersList = [];
      if (snap.exists()) {
        snap.forEach(child => {
          const uKey = child.key;
          if (!uKey || uKey === 'undefined' || uKey === 'null') return;
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
      return usersList;
    } catch(err) {
      console.warn('[StreamDB] Error al obtener usuarios:', err);
      return [];
    }
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
        console.log('[StreamDB] ⚡ Pusher Kick conectado. Suscribiendo a channel.' + channelId + ' y chatrooms.1866891.v2');
        ws.send(JSON.stringify({
          event: 'pusher:subscribe',
          data: { channel: `channel.${channelId}` }
        }));
        ws.send(JSON.stringify({
          event: 'pusher:subscribe',
          data: { channel: 'chatrooms.1866891.v2' }
        }));
        this._notifyKickChatStatus(true);
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
          } else if (ev === 'App\\Events\\ChatMessageEvent') {
            this._handleKickPusherChatMessage(msg.data);
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        this._notifyKickChatStatus(false);
        if (this.kickMonitorActive) {
          setTimeout(() => this._connectKickPusher(channelId), 8000);
        }
      };

      ws.onerror = () => {};
    } catch (e) {}
  }

  // Interceptar mensajes de Kick Chat en tiempo real desde Pusher WebSocket
  _handleKickPusherChatMessage(rawData) {
    try {
      let data = rawData;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch(e){}
      }
      if (data && data.data) {
        if (typeof data.data === 'string') {
          try { data = JSON.parse(data.data); } catch(e){}
        } else {
          data = data.data;
        }
      }
      if (!data || !data.content) return;

      const sender = data.sender?.username || '';
      const content = String(data.content || '').trim();

      // Construir objeto enriquecido de mensaje de Kick para el Monitor y Combustible
      const chatMsg = {
        id: data.id || `kick_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        usuario: sender,
        usuarioNorm: norm(sender),
        mensaje: content,
        timestamp: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
        color: data.sender?.identity?.color || '#53fc18',
        badges: Array.isArray(data.sender?.identity?.badges) ? data.sender.identity.badges : [],
        esBot: (norm(sender) === 'lobitomensajero' || norm(sender) === 'lobito_mensajero'),
        raw: data
      };

      // Notificar a los listeners del chat en vivo
      if (this.kickChatListeners && this.kickChatListeners.size > 0) {
        this.kickChatListeners.forEach(cb => {
          try { cb(chatMsg); } catch(err){}
        });
      }

      // Registrar interacción activa del chatter (acumulación de permanencia, XP y Jikopuntos)
      if (!chatMsg.esBot && chatMsg.usuarioNorm) {
        this.registrarInteraccionStream({
          usuario: chatMsg.usuario,
          tipo: 'chat',
          mensaje: content
        }).catch(err => console.warn('[StreamDB] Error en registrarInteraccionStream:', err));
      }

      const usuarioDetectado = extraerUsuarioDeBienvenidaGlobal(content);
      if (usuarioDetectado) {
        console.log(`[StreamDB] 🐺 Saludo de Lobito detectado en Kick Chat para @${usuarioDetectado} (emisor: ${sender}): "${content}"`);
        this.registrarAsistencia({
          usuario: usuarioDetectado,
          botEmisor: 'Lobito_Mensajero'
        }).catch(err => console.warn('[StreamDB] Error al procesar asistencia interceptada:', err));
      }
    } catch(err) {
      console.warn('[StreamDB] Error procesando mensaje de chat Pusher:', err);
    }
  }

  // Manejar inicio de transmisión detectado internamente de forma idempotente y segura
  async _handleStreamStarted(channelData) {
    const ahora = Date.now();
    const live = channelData.livestream || {};
    const streamId = live.id ? `stream_${live.id}` : `stream_${ahora}`;
    const fechaLegible = new Date(ahora).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'medium' });

    console.log(`[StreamDB] 🚀 Verificando inicio/continuidad de sesión Kick: ${streamId}`);

    try {
      const statsRef = ref(this.rtdb, NODE_TRANS_STATS);
      const transRef = ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamId}`);

      const [statsSnap, transSnap] = await Promise.all([
        get(statsRef),
        get(transRef)
      ]);

      const currentStats = statsSnap.exists() ? statsSnap.val() : {};
      const transYaExiste = transSnap.exists();
      const yaEsStreamActivo = currentStats.isLive === true && currentStats.streamActivoId === streamId;

      let numeroStream = transYaExiste 
        ? (transSnap.val().numeroStream || currentStats.totalStreamsPrendidos || 1)
        : ((currentStats.totalStreamsPrendidos || 0) + 1);

      // 1. Si no era el stream actualmente activo, actualizar stats sin inflar contador
      if (!yaEsStreamActivo) {
        await runTransaction(statsRef, (stats) => {
          if (!stats) stats = {};
          if (!transYaExiste && stats.streamActivoId !== streamId) {
            stats.totalStreamsPrendidos = (stats.totalStreamsPrendidos || 0) + 1;
            numeroStream = stats.totalStreamsPrendidos;
          }
          stats.streamActivoId = streamId;
          stats.isLive = true;
          stats.ultimoLiveTimestamp = ahora;
          stats.ultimoStreamId = streamId;
          stats.streamActual = {
            id: streamId,
            numeroStream: numeroStream,
            titulo: live.session_title || (transYaExiste ? transSnap.val().titulo : 'Transmisión en Vivo'),
            categoria: live.categories?.[0]?.name || (transYaExiste ? transSnap.val().categoria : 'Just Chatting'),
            inicioTimestamp: transYaExiste ? (transSnap.val().inicioTimestamp || ahora) : ahora,
            inicioFechaLegible: transYaExiste ? (transSnap.val().inicioFechaLegible || fechaLegible) : fechaLegible,
            viewers: live.viewer_count || 0
          };
          return stats;
        });
      }

      // 2. Si la transmisión YA EXISTE en Firebase: NUNCA SOBREESCRIBIR CON set()
      if (transYaExiste) {
        const existingData = transSnap.val();
        await update(transRef, {
          estado: 'en_vivo',
          titulo: live.session_title || existingData.titulo || 'Transmisión en Vivo',
          categoria: live.categories?.[0]?.name || existingData.categoria || 'Just Chatting',
          viewersPico: Math.max(existingData.viewersPico || 0, live.viewer_count || 0)
        });
        console.log(`[StreamDB] ℹ️ Sesión existente ${streamId} mantenida con sus ${existingData.totalAsistentes || Object.keys(existingData.asistentes || {}).length} asistentes intactos.`);
      } else {
        // Absorber asistentes que hayan registrado asistencia en las últimas 3 horas (pre-stream)
        const asistentesIniciales = {};
        let totalAsist = 0;
        let ptsRepartidos = 0;

        try {
          const ventanaReciente = ahora - (3 * 3600 * 1000);
          const asisRecientesSnap = await get(ref(this.rtdb, NODE_ATTENDANCE));
          if (asisRecientesSnap.exists()) {
            asisRecientesSnap.forEach(child => {
              const a = child.val();
              if (a.timestamp >= ventanaReciente && a.usuarioNorm && !asistentesIniciales[a.usuarioNorm]) {
                asistentesIniciales[a.usuarioNorm] = {
                  username: a.usuario || a.usuarioNorm,
                  usuarioNorm: a.usuarioNorm,
                  hora: a.fechaLegible ? a.fechaLegible.split(',')[1]?.trim() : new Date(a.timestamp).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }),
                  timestamp: a.timestamp,
                  experiencia: a.experienciaTotal || 200,
                  nivel: a.nivelUsuario || 1,
                  rangoTitulo: a.rangoTitulo || 'Cachorro',
                  insigniaEmoji: a.insigniaEmoji || '🐾',
                  puntosOtorgados: a.puntosOtorgados || 500
                };
                totalAsist++;
                ptsRepartidos += (a.puntosOtorgados || 500);
              }
            });
          }
        } catch(e) {}

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
          totalAsistentes: totalAsist,
          puntosRepartidos: ptsRepartidos,
          asistentes: asistentesIniciales
        });
        console.log(`[StreamDB] 🆕 Nueva sesión ${streamId} creada vinculando ${totalAsist} asistentes recientes.`);
      }

      this.kickIsLive = true;
      this._notifyKickStateListeners();
      if (!transYaExiste && !yaEsStreamActivo) {
        this._notifyStreamStarted(streamId);
      }
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
        // Auto-acreditar combustible acumulado de la sesión antes de cerrar
        try {
          await this.autoAcreditarCombustibleDirecto(streamId);
        } catch (errComb) {
          console.warn('[StreamDB] Error al auto-acreditar combustible al finalizar stream:', errComb);
        }

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
        streamActual: null,
        ultimoStreamId: streamId || null
      });

      this.kickIsLive = false;
      this.kickLivestreamData = null;
      this._notifyKickStateListeners();
      if (streamId) this._notifyStreamStopped(streamId);
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

  onKickChatMessage(callback) {
    if (typeof callback !== 'function') return () => {};
    this.kickChatListeners.add(callback);
    return () => this.kickChatListeners.delete(callback);
  }

  onKickChatStatus(callback) {
    if (typeof callback !== 'function') return () => {};
    if (!this.kickChatStatusListeners) this.kickChatStatusListeners = new Set();
    this.kickChatStatusListeners.add(callback);
    callback(this.getKickPusherStatus());
    return () => this.kickChatStatusListeners.delete(callback);
  }

  _notifyKickChatStatus(connected) {
    if (this.kickChatStatusListeners) {
      this.kickChatStatusListeners.forEach(cb => {
        try { cb(this.getKickPusherStatus()); } catch (e) {}
      });
    }
  }

  getKickPusherStatus() {
    const isConnected = !!this.kickPusherWs && this.kickPusherWs.readyState === 1;
    return {
      connected: isConnected,
      channelId: KICK_CHANNEL_ID,
      chatroom: 'chatrooms.1866891.v2',
      channelName: KICK_CHANNEL
    };
  }

  onStreamStarted(callback) {
    if (typeof callback !== 'function') return () => {};
    this.streamStartedListeners.add(callback);
    return () => this.streamStartedListeners.delete(callback);
  }

  _notifyStreamStarted(streamId) {
    this.streamStartedListeners.forEach(fn => {
      try { fn(streamId); } catch(e){}
    });
  }

  onStreamStopped(callback) {
    if (typeof callback !== 'function') return () => {};
    this.streamStoppedListeners.add(callback);
    return () => this.streamStoppedListeners.delete(callback);
  }

  _notifyStreamStopped(streamId) {
    this.streamStoppedListeners.forEach(fn => {
      try { fn(streamId); } catch(e){}
    });
  }

  onCombustibleAutoAcreditado(callback) {
    if (typeof callback !== 'function') return () => {};
    this.combustibleAcreditadoListeners.add(callback);
    return () => this.combustibleAcreditadoListeners.delete(callback);
  }

  _notifyCombustibleAutoAcreditado(res) {
    this.combustibleAcreditadoListeners.forEach(fn => {
      try { fn(res); } catch(e){}
    });
  }

  // Sincronizar por lotes en Firebase RTDB (Evita sobrecarga: se llama cada 25-30s sólo si hay cambios)
  async sincronizarCombustibleEnVivoLote(datosLote = {}) {
    if (!datosLote || !datosLote.chatters) return;
    await this.init();
    try {
      const payload = {
        streamId: datosLote.streamId || null,
        factorCombustible: datosLote.factorCombustible || 0.50,
        factorTiempoPts: datosLote.factorTiempoPts || 5,
        factorTiempoXp: datosLote.factorTiempoXp || 10,
        ultimaActualizacion: Date.now(),
        totalMensajes: datosLote.totalMensajes || 0,
        totalMinutosVistos: datosLote.totalMinutosVistos || 0,
        totalChatters: datosLote.totalChatters || 0,
        totalJikopuntos: datosLote.totalJikopuntos || 0,
        totalXp: datosLote.totalXp || 0,
        chatters: datosLote.chatters
      };

      await set(ref(this.rtdb, NODE_COMBUSTIBLE_ACTIVO), payload);

      if (datosLote.streamId) {
        const transRef = ref(this.rtdb, `${NODE_TRANSMISSIONS}/${datosLote.streamId}/combustibleEnVivo`);
        await set(transRef, {
          totalMensajes: datosLote.totalMensajes || 0,
          totalMinutosVistos: datosLote.totalMinutosVistos || 0,
          totalChatters: datosLote.totalChatters || 0,
          totalJikopuntos: datosLote.totalJikopuntos || 0,
          totalXp: datosLote.totalXp || 0,
          ultimaActualizacion: Date.now()
        });
      }
    } catch (err) {
      console.warn('[StreamDB] Error al sincronizar combustible en vivo por lote:', err);
    }
  }

  // Obtener combustible en vivo guardado en Firebase RTDB (para restauración inmediata)
  async obtenerCombustibleEnVivo() {
    await this.init();
    try {
      const snap = await get(ref(this.rtdb, NODE_COMBUSTIBLE_ACTIVO));
      return snap.exists() ? snap.val() : null;
    } catch (e) {
      return null;
    }
  }

  // Auto-acreditar el combustible a los usuarios en Firebase al terminar el directo
  async autoAcreditarCombustibleDirecto(streamId = null, chattersFallback = null) {
    await this.init();
    const ahora = Date.now();
    let targetStreamId = streamId;

    if (!targetStreamId) {
      try {
        const statsSnap = await get(ref(this.rtdb, `${NODE_TRANS_STATS}/streamActivoId`));
        targetStreamId = statsSnap.exists() ? statsSnap.val() : null;
      } catch(e){}
    }

    let combustibleData = null;
    try {
      const snap = await get(ref(this.rtdb, NODE_COMBUSTIBLE_ACTIVO));
      if (snap.exists()) {
        combustibleData = snap.val();
      }
    } catch (e) {}

    let chatters = (combustibleData && combustibleData.chatters) ? combustibleData.chatters : chattersFallback;
    if (!chatters || typeof chatters !== 'object') {
      console.log('[StreamDB] ℹ️ No hay combustible en vivo pendiente de auto-acreditar.');
      return { exitos: 0, totalPts: 0, totalXp: 0, espectadores: 0 };
    }

    const BOTS_IGNORADOS = ['botrix', 'lobito_mensajero', 'lobitomensajero', 'kickbot', 'nightbot', 'streamelements', 'streamlabs', 'jikobot', 'streamerbot'];
    let exitos = 0;
    let totalPts = 0;
    let totalXp = 0;
    const detallesAcreditados = {};

    for (const [keyRaw, c] of Object.entries(chatters)) {
      const uKey = norm(c.usernameNorm || c.username || keyRaw);
      if (!uKey || BOTS_IGNORADOS.includes(uKey)) continue;

      const pts = Math.round(Number(c.jikopuntosGenerados) || 0);
      const xp = Math.round(Number(c.xpGenerada) || 0);
      const mins = Math.max(0, Math.round(Number(c.minutosVistos) || 0));

      if (pts <= 0 && xp <= 0) continue;

      try {
        await this.acreditarCombustibleChat(uKey, {
          puntos: pts,
          xp: xp,
          tiempoMinutos: mins,
          motivo: 'cierre_directo_kick',
          streamId: targetStreamId
        });
        exitos++;
        totalPts += pts;
        totalXp += xp;
        detallesAcreditados[uKey] = {
          username: c.username || uKey,
          puntos: pts,
          xp: xp,
          minutosVistos: mins,
          mensajes: c.count || 0,
          timestamp: ahora
        };
      } catch (errUser) {
        console.warn(`[StreamDB] Error al auto-acreditar combustible a @${uKey}:`, errUser);
      }
    }

    // Registrar en la transmisión histórica en Firebase RTDB
    if (targetStreamId && exitos > 0) {
      try {
        const transRef = ref(this.rtdb, `${NODE_TRANSMISSIONS}/${targetStreamId}`);
        await update(transRef, {
          combustibleAutoAcreditado: true,
          combustibleFechaAcreditacion: new Date(ahora).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'medium' }),
          combustiblePuntosRepartidos: totalPts,
          combustibleXpRepartida: totalXp,
          combustibleEspectadoresPremiados: exitos,
          combustibleDetalles: detallesAcreditados
        });
      } catch (e) {}
    }

    // Limpiar el nodo de combustible en vivo para que no quede pendiente duplicado
    try {
      await set(ref(this.rtdb, NODE_COMBUSTIBLE_ACTIVO), null);
    } catch (e) {}

    console.log(`[StreamDB] 🎉 Auto-acreditación completada: +${totalPts} pts y +${totalXp} XP a ${exitos} espectadores.`);
    this._notifyCombustibleAutoAcreditado({
      streamId: targetStreamId,
      exitos,
      totalPts,
      totalXp,
      espectadores: exitos
    });

    return { exitos, totalPts, totalXp, espectadores: exitos };
  }

  // Acreditar combustible acumulado de chat y permanencia a un usuario en Firebase RTDB
  async acreditarCombustibleChat(username, { puntos = 0, xp = 0, tiempoMinutos = 0, motivo = 'combustible_chat', streamId = null } = {}) {
    await this.init();
    const key = norm(username);
    if (!key) throw new Error('Usuario no válido');

    let user = await this.getUser(key);
    const ptsDelta = Math.max(0, Math.round(Number(puntos) || 0));
    const xpDelta = Math.max(0, Math.round(Number(xp) || 0));
    const minsDelta = Math.max(0, Math.round(Number(tiempoMinutos) || 0));

    if (!user) {
      // Auto-crear perfil para el espectador en su primera interacción
      user = await this.crearUsuario({
        username: key,
        displayName: username,
        jikopuntos: USER_DEFAULT_POINTS,
        experiencia: 0
      });
    }

    const updates = {};
    if (ptsDelta > 0) {
      updates.jikopuntos = (user.jikopuntos || 0) + ptsDelta;
      updates.totalGanado = (user.totalGanado || 0) + ptsDelta;
    }
    if (xpDelta > 0) {
      const prevXp = user.experiencia !== undefined ? user.experiencia : ((user.asistenciasCount || 0) * 200);
      updates.experiencia = prevXp + xpDelta;
    }
    if (minsDelta > 0) {
      updates.tiempoVistoMinutos = (user.tiempoVistoMinutos || 0) + minsDelta;
    }

    if (Object.keys(updates).length > 0) {
      return this.actualizarUsuario(key, updates);
    }
    return user;
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

      // 10 XP base por minuto activo * factor duración del directo * factor nivel (menos XP en niveles altos)
      const userCached = this.usersCache.get(key);
      const userNvl = userCached?.nivel || (await this.getUser(key))?.nivel || 1;
      const factorNivel = calcularFactorXpNivel(userNvl);

      const xpBase = 10 * minutosDelta;
      const xpGanada = Math.max(1, Math.round(xpBase * factor * factorNivel));

      // Otorgar combustible de permanencia (+5 Jikopuntos por minuto activo de stream)
      const ptsGanados = 5 * minutosDelta;
      await this.addJikopuntos(key, ptsGanados, 'interaccion_tiempo_stream');

      // Persistir XP y tiempo visto en Firebase
      await this.addExperiencia(key, xpGanada, 'interaccion_tiempo_stream');
      await this.addTiempoVisto(key, minutosDelta);

      userTrack.ultimaXpAsignada = ahora;
      userTrack.minutosInteractuados += minutosDelta;
      userTrack.xpGanadaEnDirecto += xpGanada;

      console.log(`[StreamXP] ⚡ @${key} ganó +${ptsGanados} JP y +${xpGanada} XP (+${minutosDelta}m activo | Directo: ${streamInfo.duracionMinutos}m | Factor: x${factor})`);

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

  // Asegurar o auto-iniciar una sesión de transmisión activa en Firebase RTDB
  async asegurarStreamActivoAuto(origen = 'auto_asistencia') {
    const ahora = Date.now();
    const fechaLegible = new Date(ahora).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'medium' });

    try {
      const statsRef = ref(this.rtdb, NODE_TRANS_STATS);
      const statsSnap = await get(statsRef);
      const stats = statsSnap.exists() ? statsSnap.val() : {};

      // Si ya hay un stream activo y marcado como live en Firebase:
      if (stats.isLive === true && stats.streamActivoId) {
        return stats.streamActivoId;
      }

      // Si no hay stream activo, verificar si Kick API reporta un livestream activo
      let streamId = null;
      let livestreamData = null;
      try {
        if (this.kickLivestreamData && this.kickLivestreamData.id) {
          livestreamData = this.kickLivestreamData;
          streamId = `stream_${livestreamData.id}`;
        } else {
          const res = await fetch(`https://kick.com/api/v2/channels/${KICK_CHANNEL}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.livestream && data.livestream.id) {
              livestreamData = data.livestream;
              streamId = `stream_${livestreamData.id}`;
            }
          }
        }
      } catch (err) {}

      // Si Kick API no responde o no está disponible, generar ID único de sesión basado en timestamp
      if (!streamId) {
        streamId = `stream_${ahora}`;
      }

      console.log(`[StreamDB] 🚀 Auto-iniciando sesión de stream en Firebase (${origen}): ${streamId}`);

      // Registrar o actualizar transmisión en NODE_TRANSMISSIONS
      const transRef = ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamId}`);
      const transSnap = await get(transRef);
      const transYaExiste = transSnap.exists();

      let numeroStream = transYaExiste
        ? (transSnap.val().numeroStream || stats.totalStreamsPrendidos || 1)
        : ((stats.totalStreamsPrendidos || 0) + 1);

      await runTransaction(statsRef, (s) => {
        if (!s) s = {};
        if (!transYaExiste && s.streamActivoId !== streamId) {
          s.totalStreamsPrendidos = (s.totalStreamsPrendidos || 0) + 1;
          numeroStream = s.totalStreamsPrendidos;
        }
        s.streamActivoId = streamId;
        s.isLive = true;
        s.ultimoLiveTimestamp = ahora;
        s.ultimoStreamId = streamId;
        s.streamActual = {
          id: streamId,
          numeroStream: numeroStream,
          titulo: livestreamData?.session_title || (transYaExiste ? transSnap.val().titulo : 'Transmisión en Vivo'),
          categoria: livestreamData?.categories?.[0]?.name || (transYaExiste ? transSnap.val().categoria : 'Just Chatting'),
          inicioTimestamp: transYaExiste ? (transSnap.val().inicioTimestamp || ahora) : ahora,
          inicioFechaLegible: transYaExiste ? (transSnap.val().inicioFechaLegible || fechaLegible) : fechaLegible,
          viewers: livestreamData?.viewer_count || 0
        };
        return s;
      });

      if (!transYaExiste) {
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
          titulo: livestreamData?.session_title || 'Transmisión en Vivo',
          categoria: livestreamData?.categories?.[0]?.name || 'Just Chatting',
          viewersPico: livestreamData?.viewer_count || 0,
          totalAsistentes: 0,
          puntosRepartidos: 0,
          asistentes: {}
        });
      } else {
        await update(transRef, { estado: 'en_vivo' });
      }

      this.kickIsLive = true;
      this._notifyKickStateListeners();
      this._notifyStreamStarted(streamId);

      return streamId;
    } catch (err) {
      console.warn('[StreamDB] Error en asegurarStreamActivoAuto:', err);
      return `stream_${ahora}`;
    }
  }

  // Iniciar manualmente o forzar una nueva sesión de transmisión
  async iniciarNuevaTransmision({ origen = 'manual', titulo = null } = {}) {
    console.log(`[StreamDB] 📢 Iniciando nueva sesión de transmisión (origen: ${origen})`);
    return await this.asegurarStreamActivoAuto(origen);
  }

  // Registrar asistencia: otorga puntos según el nivel de asistencia y vincula al stream activo
  async registrarAsistencia({ usuario, botEmisor = 'Lobito_Mensajero', streamId = null }) {
    const key = norm(usuario);
    if (!key) return null;

    // Mutex concurrente: Evitar que dos eventos concurrentes (Pusher y Streamer.bot) procesen al mismo usuario a la vez
    if (!this._asistenciaLocks) {
      this._asistenciaLocks = new Map();
    }
    const ahora = Date.now();
    const lastLock = this._asistenciaLocks.get(key) || 0;
    if (ahora - lastLock < 15000) {
      console.log(`[StreamDB] ⏳ Saludo para @${key} ignorado por lock concurrente (${ahora - lastLock}ms).`);
      return null;
    }
    this._asistenciaLocks.set(key, ahora);

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
      // 1. Obtener stream activo si existe, o usar el streamId especificado
      let streamActivoId = streamId || null;
      let numeroStream = null;
      if (!streamActivoId) {
        try {
          const statsSnap = await get(ref(this.rtdb, NODE_TRANS_STATS));
          if (statsSnap.exists()) {
            const stats = statsSnap.val();
            if (stats.isLive === true && stats.streamActivoId) {
              streamActivoId = stats.streamActivoId;
              numeroStream = stats.streamActual?.numeroStream || stats.totalStreamsPrendidos || null;
            }
          }
        } catch (e) {}
      } else {
        try {
          const sSnap = await get(ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamActivoId}/numeroStream`));
          numeroStream = sSnap.exists() ? sSnap.val() : null;
        } catch(e) {}
      }

      // Si no hay stream activo pero estamos recibiendo un saludo de Lobito en vivo:
      // Auto-iniciar o asegurar la sesión de transmisión activa
      if (!streamActivoId) {
        streamActivoId = await this.asegurarStreamActivoAuto('asistencia_lobito');
        try {
          const sSnap = await get(ref(this.rtdb, `${NODE_TRANS_STATS}/streamActual/numeroStream`));
          numeroStream = sSnap.exists() ? sSnap.val() : null;
        } catch(e) {}
      }

      // Si ya está registrado en este stream activo específico, no duplicar puntos pero devolver saldo real
      if (streamActivoId) {
        try {
          const streamUserSnap = await get(ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamActivoId}/asistentes/${key}`));
          if (streamUserSnap.exists()) {
            console.log(`[StreamDB] ℹ️ @${usuario} ya tiene asistencia registrada en stream activo ${streamActivoId}`);
            const currentUser = await this.getUser(usuario);
            const dataSnap = streamUserSnap.val() || {};
            const saldoSeguro = (currentUser && currentUser.jikopuntos !== undefined && currentUser.jikopuntos !== null)
              ? currentUser.jikopuntos
              : (this._getLocalCache(key) || USER_DEFAULT_POINTS);
            return {
              ...dataSnap,
              yaRegistrado: true,
              nuevoSaldo: saldoSeguro,
              puntosOtorgados: 0,
              experienciaGanada: 0,
              nivelUsuario: currentUser?.nivel || dataSnap.nivel || 1,
              insigniaEmoji: currentUser?.insigniaEmoji || dataSnap.insigniaEmoji || '🐾',
              rangoTitulo: currentUser?.rangoTitulo || dataSnap.rangoTitulo || 'Cachorro'
            };
          }
        } catch(e) {}
      }

      // 2. Obtener perfil del usuario y calcular nivel
      const user = await this.getUser(usuario);
      const prevAsistencias = user ? (user.asistenciasCount || 0) : 0;
      const nuevoTotalAsistencias = prevAsistencias + 1;

      // Calcular XP según nivel: curva progresiva donde niveles altos reciben menos puntos de XP
      const nvlPrev = user?.nivel || 1;
      const factorNvl = calcularFactorXpNivel(nvlPrev);
      const xpGanadaAsistencia = Math.max(20, Math.round(200 * factorNvl));

      const prevXp = (user && user.experiencia !== undefined && user.experiencia !== null)
        ? user.experiencia
        : (prevAsistencias * 200);
      const nuevoTotalXp = prevXp + xpGanadaAsistencia;

      // Calcular nuevo nivel del usuario tras ganar XP en esta transmisión
      const nivelInfo = calcularNivelUsuario({
        experiencia: nuevoTotalXp,
        asistenciasCount: nuevoTotalAsistencias,
        tituloPersonalizado: user?.tituloPersonalizado
      });

      const puntosOtorgados = nivelInfo.puntosPorAsistencia; // 500 base + bono de lealtad
      const nuevoSaldo = (user && user.jikopuntos !== undefined ? user.jikopuntos : USER_DEFAULT_POINTS) + puntosOtorgados;

      // 3. Guardar registro inmutable en stream/tienda/asistencias
      const asisRef = push(ref(this.rtdb, NODE_ATTENDANCE));
      const record = {
        id: asisRef.key,
        usuario: usuario,
        usuarioNorm: key,
        puntosOtorgados: puntosOtorgados,
        bonoExtraNivel: nivelInfo.bonoExtra,
        experienciaGanada: xpGanadaAsistencia,
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
            if (!s.asistentes) s.asistentes = {};
            s.totalAsistentes = Object.keys(s.asistentes).length;
            s.puntosRepartidos = (s.puntosRepartidos || 0) + puntosOtorgados;
          }
          return s;
        });
      }

      // 5. Actualizar usuario con su nuevo nivel e historial de stream de forma atómica
      const userRef = ref(this.rtdb, `${NODE_USERS}/${key}`);
      let userSaldoFinal = nuevoSaldo;
      let userXpFinal = nuevoTotalXp;
      let userAsistFinal = nuevoTotalAsistencias;

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
          userSaldoFinal = nuevoSaldo;
          userXpFinal = nuevoTotalXp;
          userAsistFinal = nuevoTotalAsistencias;
        } else {
          u.jikopuntos = (u.jikopuntos || 0) + puntosOtorgados;
          u.totalGanado = (u.totalGanado || 0) + puntosOtorgados;
          userSaldoFinal = u.jikopuntos;
          u.asistenciasCount = (u.asistenciasCount || 0) + 1;
          userAsistFinal = u.asistenciasCount;

          const userXp = (u.experiencia !== undefined && u.experiencia !== null)
            ? u.experiencia
            : ((u.asistenciasCount - 1) * 200);
          const finalXp = userXp + 200;
          u.experiencia = finalXp;
          userXpFinal = finalXp;

          const freshNivelInfo = calcularNivelUsuario({
            experiencia: finalXp,
            asistenciasCount: u.asistenciasCount,
            tituloPersonalizado: u.tituloPersonalizado
          });
          u.nivel = freshNivelInfo.nivel;
          u.rangoTitulo = freshNivelInfo.rangoTitulo;
          u.tituloAutomatico = freshNivelInfo.tituloAutomatico;
          u.insigniaEmoji = freshNivelInfo.insigniaEmoji;
          u.bonoAsistencia = freshNivelInfo.puntosPorAsistencia;
          u.porcentajeProgreso = freshNivelInfo.porcentajeProgreso;
          u.xpEnNivel = freshNivelInfo.xpEnNivel;
          u.xpParaSubir = freshNivelInfo.xpParaSubir;
          u.xpFaltante = freshNivelInfo.xpFaltante;
          u.ultimaActividad = ahora;

          if (!u.historialTransmisiones) u.historialTransmisiones = {};
          if (streamActivoId) {
            u.historialTransmisiones[streamActivoId] = true;
          }
        }
        return u;
      });

      this._updateLocalCache(key, userSaldoFinal);
      if (this.usersCache.has(key)) {
        const cached = this.usersCache.get(key);
        cached.jikopuntos = userSaldoFinal;
        cached.asistenciasCount = userAsistFinal;
        cached.experiencia = userXpFinal;
        cached.nivel = nivelInfo.nivel;
        cached.rangoTitulo = nivelInfo.rangoTitulo;
        cached.insigniaEmoji = nivelInfo.insigniaEmoji;
      }

      // 6. Actualizar métricas agregadas globales
      const resumenRef = ref(this.rtdb, `${NODE_STATS}/resumen`);
      await runTransaction(resumenRef, (res) => {
        if (!res) res = {};
        res.totalAsistenciasRegistradas = (res.totalAsistenciasRegistradas || 0) + 1;
        res.totalPuntosOtorgados = (res.totalPuntosOtorgados || 0) + puntosOtorgados;
        res.ultimaActualizacion = ahora;
        return res;
      });

      console.log(`[StreamDB] 🐺 Asistencia @${usuario}: ${nivelInfo.insigniaEmoji} ${nivelInfo.rangoTitulo} (Nivel ${nivelInfo.nivel} • ${userXpFinal} XP) +${puntosOtorgados} pts -> Saldo: ${userSaldoFinal}`);
      if (!user?.avatar || !String(user.avatar).startsWith('http')) {
        this.absorberAvatarKick(usuario).catch(() => {});
      }
      record.nuevoSaldo = userSaldoFinal;
      record.experienciaTotal = userXpFinal;
      return record;
    } catch (err) {
      console.warn(`[StreamDB] Error al registrar asistencia @${usuario}:`, err);
      return null;
    }
  }

  // Asegurar que un usuario esté vinculado a la sesión de stream activa
  async asegurarAsistenteEnStreamActivo(usuario) {
    const key = norm(usuario);
    if (!key) return null;
    try {
      const statsSnap = await get(ref(this.rtdb, NODE_TRANS_STATS));
      if (!statsSnap.exists()) return null;
      const stats = statsSnap.val();
      const streamId = (stats.isLive === true && stats.streamActivoId) ? stats.streamActivoId : null;
      if (!streamId) return null;

      const userAsistRef = ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamId}/asistentes/${key}`);
      const snap = await get(userAsistRef);
      if (snap.exists()) return snap.val();

      const user = await this.getUser(usuario);
      const asistCount = user ? (user.asistenciasCount || 1) : 1;
      const totalXp = user?.experiencia || (asistCount * 200);
      const nivelInfo = calcularNivelUsuario({
        experiencia: totalXp,
        asistenciasCount: asistCount,
        tituloPersonalizado: user?.tituloPersonalizado
      });
      const puntosOtorgados = nivelInfo.puntosPorAsistencia;

      const dataAsist = {
        username: user?.displayName || usuario,
        usuarioNorm: key,
        hora: new Date().toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        experiencia: totalXp,
        nivel: nivelInfo.nivel,
        rangoTitulo: nivelInfo.rangoTitulo,
        insigniaEmoji: nivelInfo.insigniaEmoji,
        puntosOtorgados: puntosOtorgados
      };
      await set(userAsistRef, dataAsist);

      const transRef = ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamId}`);
      await runTransaction(transRef, (s) => {
        if (s) {
          if (!s.asistentes) s.asistentes = {};
          s.totalAsistentes = Object.keys(s.asistentes).length;
        }
        return s;
      });

      console.log(`[StreamDB] 🐺 Asistente @${usuario} vinculado con éxito al stream activo ${streamId}`);
      return dataAsist;
    } catch (e) {
      console.warn(`[StreamDB] Error asegurando asistente @${usuario}:`, e);
      return null;
    }
  }

  // Remover asistencia de un stream específico (deshacer asistencia errónea)
  async removerAsistenciaDeStream(usuario, streamId) {
    await this.init();
    const key = norm(usuario);
    if (!key || !streamId) return false;
    try {
      await set(ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamId}/asistentes/${key}`), null);
      const transRef = ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamId}`);
      await runTransaction(transRef, (s) => {
        if (s && s.asistentes) {
          delete s.asistentes[key];
          s.totalAsistentes = Object.keys(s.asistentes).length;
        }
        return s;
      });
      console.log(`[StreamDB] Asistencia de @${usuario} retirada de stream ${streamId}`);
      return true;
    } catch(e) {
      console.warn('[StreamDB] Error al remover asistente de stream:', e);
      return false;
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

      // Auto-reconciliación: Integrar cualquier asistencia registrada para este stream en NODE_ATTENDANCE
      try {
        const asisSnap = await get(ref(this.rtdb, NODE_ATTENDANCE));
        if (asisSnap.exists()) {
          asisSnap.forEach(child => {
            const a = child.val();
            if (a.usuarioNorm && !asistentesKeys.has(a.usuarioNorm)) {
              const ventanaMin = streamData.inicioTimestamp ? (streamData.inicioTimestamp - 3 * 3600 * 1000) : 0;
              const ventanaMax = streamData.finTimestamp ? (streamData.finTimestamp + 3600 * 1000) : (Date.now() + 3600 * 1000);
              if (a.streamId === streamId || (a.timestamp >= ventanaMin && a.timestamp <= ventanaMax)) {
                asistentesKeys.add(a.usuarioNorm);
                asistentesMap[a.usuarioNorm] = {
                  username: a.usuario || a.usuarioNorm,
                  usuarioNorm: a.usuarioNorm,
                  hora: a.fechaLegible ? (a.fechaLegible.split(',')[1]?.trim() || '--:--') : '--:--',
                  timestamp: a.timestamp,
                  experiencia: a.experienciaTotal || 200,
                  nivel: a.nivelUsuario || 1,
                  rangoTitulo: a.rangoTitulo || 'Cachorro',
                  insigniaEmoji: a.insigniaEmoji || '🐾',
                  puntosOtorgados: a.puntosOtorgados || 500
                };
              }
            }
          });
        }
      } catch(e) {}

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
  async getTransmisionesHistorial(limit = 50) {
    try {
      const snap = await get(ref(this.rtdb, NODE_TRANSMISSIONS));
      const lista = [];
      if (snap.exists()) {
        snap.forEach(child => {
          lista.push(child.val());
        });
        lista.sort((a, b) => (b.inicioTimestamp || 0) - (a.inicioTimestamp || 0));
      }
      return lista.slice(0, limit);
    } catch (e) {
      return [];
    }
  }

  onTransmisionesHistorial(callback, limit = 50) {
    if (typeof callback !== 'function') return () => {};
    return onValue(ref(this.rtdb, NODE_TRANSMISSIONS), (snap) => {
      const lista = [];
      if (snap.exists()) {
        snap.forEach(child => {
          lista.push(child.val());
        });
        lista.sort((a, b) => (b.inicioTimestamp || 0) - (a.inicioTimestamp || 0));
      }
      callback(lista.slice(0, limit));
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

  onTransacciones(callback, limit = 50) {
    if (typeof callback !== 'function') return () => {};
    return onValue(ref(this.rtdb, NODE_TRANSACTIONS), snap => {
      const lista = [];
      if (snap.exists()) {
        snap.forEach(child => {
          lista.push(child.val());
        });
        lista.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      }
      callback(lista.slice(0, limit));
    });
  }

  onAsistencias(callback, limit = 200) {
    if (typeof callback !== 'function') return () => {};
    return onValue(ref(this.rtdb, NODE_ATTENDANCE), snap => {
      const lista = [];
      if (snap.exists()) {
        snap.forEach(child => {
          lista.push(child.val());
        });
        lista.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      }
      callback(lista.slice(0, limit));
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
  // 5.1 SISTEMA BANCARIO JIKOBANK (PRÉSTAMOS, DEUDAS, REGALOS Y CONDONACIONES)
  // ==========================================================================

  // Obtener todos los préstamos registrados en JikoBank (para dashboard administrativo)
  async obtenerTodosLosPrestamos() {
    try {
      const snap = await get(ref(this.rtdb, NODE_LOANS));
      if (!snap.exists()) return [];
      const list = [];
      snap.forEach(child => {
        list.push({ id: child.key, ...child.val() });
      });
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return list;
    } catch (e) {
      console.warn('[JikoBank] Error obteniendo todos los préstamos:', e);
      return [];
    }
  }

  // Escuchar préstamos en tiempo real para el dashboard administrativo
  onLoans(callback) {
    if (typeof callback !== 'function') return () => {};
    const loansRef = ref(this.rtdb, NODE_LOANS);

    // Carga inicial ultrarrápida vía REST para renderizado inmediato
    fetch('https://sensunshopweb-default-rtdb.firebaseio.com/stream/banco/prestamos.json')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === 'object') {
          const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
          list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          callback(list);
        } else {
          callback([]);
        }
      })
      .catch(() => {});

    return onValue(loansRef, snap => {
      const list = [];
      if (snap.exists()) {
        snap.forEach(child => {
          list.push({ id: child.key, ...child.val() });
        });
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      }
      callback(list);
    });
  }

  // Obtener préstamos de un usuario (como solicitante/deudor o acreedor)
  async obtenerPrestamosUsuario(username) {
    const key = norm(username);
    if (!key) return [];
    try {
      const snap = await get(ref(this.rtdb, NODE_LOANS));
      if (!snap.exists()) return [];
      const list = [];
      snap.forEach(child => {
        const p = child.val();
        if (p.solicitanteNorm === key || p.acreedorNorm === key) {
          list.push({ id: child.key, ...p });
        }
      });
      return list;
    } catch (e) {
      console.warn(`[JikoBank] Error obteniendo préstamos de @${key}:`, e);
      return [];
    }
  }

  // Obtener resumen de deuda activa de un usuario
  async obtenerDeudaUsuario(username) {
    const key = norm(username);
    if (!key) return { deudaTotal: 0, prestamosActivos: [] };
    try {
      const snap = await get(ref(this.rtdb, NODE_LOANS));
      if (!snap.exists()) return { deudaTotal: 0, prestamosActivos: [] };
      let deudaTotal = 0;
      const prestamosActivos = [];
      snap.forEach(child => {
        const p = child.val();
        if (p.solicitanteNorm === key && p.estado === 'pendiente') {
          deudaTotal += (parseInt(p.saldoPendiente, 10) || 0);
          prestamosActivos.push({ id: child.key, ...p });
        }
      });
      return { deudaTotal, prestamosActivos };
    } catch (e) {
      return { deudaTotal: 0, prestamosActivos: [] };
    }
  }

  // Solicitar un préstamo (P2P entre espectadores o directo al banco 'jikobank')
  async solicitarPrestamo({ solicitante, acreedor = 'jikobank', monto }) {
    const solNorm = norm(solicitante);
    const acrNorm = norm(acreedor);
    const montoNum = Math.max(1, parseInt(monto, 10) || 0);
    const ahora = Date.now();
    const fechaLegible = new Date(ahora).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'medium' });

    if (!solNorm) throw new Error('Solicitante no válido');
    if (montoNum <= 0) throw new Error('El monto debe ser mayor a 0');

    const esBanco = (acrNorm === 'jikobank' || acrNorm === 'banco' || acrNorm === 'jikokun');
    const acreedorFinal = esBanco ? 'JikoBank' : acreedor;
    const acreedorFinalNorm = esBanco ? 'jikobank' : acrNorm;

    // Calcular interés del 2%
    const interes = Math.max(1, Math.round(montoNum * TASA_INTERES_PRESTAMO));
    const totalDevolver = montoNum + interes;

    // Si es P2P, verificar que el prestamista tenga saldo suficiente para prestar
    if (!esBanco) {
      if (solNorm === acreedorFinalNorm) {
        throw new Error('No puedes solicitarte un préstamo a ti mismo');
      }
      const prestamistaSaldo = await this.getCachedPoints(acreedorFinalNorm);
      if (prestamistaSaldo < montoNum) {
        throw new Error(`@${acreedor} no cuenta con saldo suficiente (${prestamistaSaldo} < ${montoNum} pts)`);
      }
    }

    try {
      const loanRef = push(ref(this.rtdb, NODE_LOANS));
      const record = {
        id: loanRef.key,
        solicitante: solicitante,
        solicitanteNorm: solNorm,
        acreedor: acreedorFinal,
        acreedorNorm: acreedorFinalNorm,
        esBanco: esBanco,
        montoPrestado: montoNum,
        tasaInteres: 2,
        interesCalculado: interes,
        totalDevolver: totalDevolver,
        saldoPendiente: totalDevolver,
        montoPagado: 0,
        estado: 'solicitado', // Requiere !aceptar o !firmar
        timestamp: ahora,
        fechaLegible: fechaLegible
      };

      await set(loanRef, record);
      console.log(`[JikoBank] 📋 Solicitud de préstamo #${loanRef.key} creada: @${solNorm} pide ${montoNum} pts a @${acreedorFinalNorm} (Devolver: ${totalDevolver} pts)`);
      return record;
    } catch (err) {
      console.error('[JikoBank] Error creando solicitud de préstamo:', err);
      throw err;
    }
  }

  // Confirmar/Aceptar y desembolsar un préstamo solicitado
  async confirmarPrestamo({ prestamoId, autorizador }) {
    if (!prestamoId) throw new Error('ID de préstamo no especificado');
    const autNorm = norm(autorizador);

    try {
      const loanRef = ref(this.rtdb, `${NODE_LOANS}/${prestamoId}`);
      const snap = await get(loanRef);
      if (!snap.exists()) throw new Error('El préstamo no existe');

      const loan = snap.val();
      if (loan.estado !== 'solicitado') {
        throw new Error(`El préstamo ya fue ${loan.estado}`);
      }

      // Validar quién autoriza
      if (loan.esBanco) {
        // En préstamo de banco, el solicitante es quien "firma"
        if (autNorm !== loan.solicitanteNorm && autNorm !== 'jikokun') {
          throw new Error('Solo el solicitante o Jikokun pueden firmar el préstamo del banco');
        }
      } else {
        // En préstamo P2P, el prestamista debe ser quien acepta
        if (autNorm !== loan.acreedorNorm && autNorm !== 'jikokun') {
          throw new Error(`Solo @${loan.acreedor} puede aceptar prestar sus fondos`);
        }
        // Deducción al prestamista
        const saldoAcreedor = await this.getCachedPoints(loan.acreedorNorm);
        if (saldoAcreedor < loan.montoPrestado) {
          throw new Error(`@${loan.acreedor} no cuenta con saldo suficiente (${saldoAcreedor} < ${loan.montoPrestado})`);
        }
        await this.addJikopuntos(loan.acreedorNorm, -loan.montoPrestado, `Préstamo otorgado a @${loan.solicitante}`);
      }

      // Acreditar fondos al solicitante
      const nuevoSaldoSol = await this.addJikopuntos(loan.solicitanteNorm, loan.montoPrestado, `Préstamo recibido de @${loan.acreedor}`);

      // Actualizar deuda total del usuario solicitante
      const userRef = ref(this.rtdb, `${NODE_USERS}/${loan.solicitanteNorm}`);
      await runTransaction(userRef, (u) => {
        if (u) {
          u.deudaTotal = (u.deudaTotal || 0) + loan.totalDevolver;
        }
        return u;
      });

      // Actualizar estado del préstamo a activo / 'pendiente'
      const ahora = Date.now();
      await update(loanRef, {
        estado: 'pendiente',
        fechaAprobado: ahora,
        fechaAprobadoLegible: new Date(ahora).toLocaleString('es-SV')
      });

      console.log(`[JikoBank] 🏦 Préstamo #${prestamoId} desembolsado exitosamente: +${loan.montoPrestado} pts a @${loan.solicitanteNorm} (Deuda: ${loan.totalDevolver} pts)`);
      loan.estado = 'pendiente';
      return {
        exito: true,
        prestamo: loan,
        nuevoSaldoSolicitante: nuevoSaldoSol
      };
    } catch (err) {
      console.warn('[JikoBank] Error confirmando préstamo:', err);
      throw err;
    }
  }

  // Rechazar o cancelar una solicitud de préstamo
  async rechazarPrestamo({ prestamoId, usuario }) {
    if (!prestamoId) return false;
    const uNorm = norm(usuario);
    try {
      const loanRef = ref(this.rtdb, `${NODE_LOANS}/${prestamoId}`);
      const snap = await get(loanRef);
      if (!snap.exists()) return false;
      const loan = snap.val();
      if (loan.estado !== 'solicitado') return false;

      await update(loanRef, {
        estado: 'rechazado',
        rechazadoPor: uNorm,
        fechaRechazo: Date.now()
      });
      return true;
    } catch(e) {
      return false;
    }
  }

  // Pagar total o parcialmente una deuda de préstamo
  async pagarPrestamo({ deudor, prestamoId = null, monto = null }) {
    const key = norm(deudor);
    if (!key) throw new Error('Usuario deudor no válido');

    try {
      const snap = await get(ref(this.rtdb, NODE_LOANS));
      if (!snap.exists()) throw new Error('No existen préstamos registrados');

      // Buscar préstamos pendientes del usuario
      const prestamos = [];
      snap.forEach(child => {
        const p = child.val();
        if (p.solicitanteNorm === key && p.estado === 'pendiente') {
          prestamos.push({ id: child.key, ...p });
        }
      });

      if (prestamos.length === 0) {
        throw new Error(`@${deudor} no tiene ninguna deuda de préstamo pendiente`);
      }

      // Ordenar por más antiguo primero o seleccionar el prestamoId
      let targetLoan = prestamoId 
        ? prestamos.find(p => p.id === prestamoId)
        : prestamos[0];

      if (!targetLoan) targetLoan = prestamos[0];

      const saldoActual = await this.getCachedPoints(key);
      const saldoPendiente = parseInt(targetLoan.saldoPendiente, 10) || targetLoan.totalDevolver;
      const abonoDeseado = monto ? Math.min(saldoPendiente, parseInt(monto, 10) || 0) : saldoPendiente;

      if (abonoDeseado <= 0) throw new Error('El monto a abonar debe ser mayor a 0');
      if (saldoActual < abonoDeseado) {
        throw new Error(`Saldo insuficiente para abonar (${saldoActual} < ${abonoDeseado} pts)`);
      }

      // 1. Deducir saldo del deudor
      const nuevoSaldoDeudor = await this.addJikopuntos(key, -abonoDeseado, `Pago de préstamo a @${targetLoan.acreedor}`);

      // 2. Si el acreedor no es el banco, abonar al acreedor (con el interés ganado)
      if (!targetLoan.esBanco) {
        await this.addJikopuntos(targetLoan.acreedorNorm, abonoDeseado, `Cobro de préstamo saldado por @${deudor}`);
      }

      // 3. Actualizar registro del préstamo
      const nuevoSaldoPendiente = Math.max(0, saldoPendiente - abonoDeseado);
      const pagadoTotalmente = nuevoSaldoPendiente === 0;

      await update(ref(this.rtdb, `${NODE_LOANS}/${targetLoan.id}`), {
        saldoPendiente: nuevoSaldoPendiente,
        montoPagado: (targetLoan.montoPagado || 0) + abonoDeseado,
        estado: pagadoTotalmente ? 'pagado' : 'pendiente',
        ultimoPagoTimestamp: Date.now()
      });

      // 4. Actualizar deudaTotal en perfil de usuario
      const userRef = ref(this.rtdb, `${NODE_USERS}/${key}`);
      await runTransaction(userRef, (u) => {
        if (u) {
          u.deudaTotal = Math.max(0, (u.deudaTotal || abonoDeseado) - abonoDeseado);
        }
        return u;
      });

      console.log(`[JikoBank] 💳 Pago registrado de @${key}: -${abonoDeseado} pts (Restante préstamo #${targetLoan.id}: ${nuevoSaldoPendiente} pts)`);
      return {
        exito: true,
        abono: abonoDeseado,
        saldoPendiente: nuevoSaldoPendiente,
        pagadoTotalmente: pagadoTotalmente,
        nuevoSaldoDeudor: nuevoSaldoDeudor,
        prestamo: targetLoan
      };
    } catch (err) {
      console.warn('[JikoBank] Error procesando pago de préstamo:', err);
      throw err;
    }
  }

  // Absolución/Perdón de préstamos (Exclusivo para @Jikokun)
  async perdonarPrestamos({ admin = 'jikokun', targetUser = null }) {
    const adminNorm = norm(admin);
    if (adminNorm !== 'jikokun') {
      throw new Error('Comando exclusivo del dueño del canal @Jikokun');
    }

    const targetNorm = targetUser ? norm(targetUser) : null;
    let totalPerdonados = 0;
    let montoTotalPerdonado = 0;
    const usuariosAfectados = new Set();

    try {
      const snap = await get(ref(this.rtdb, NODE_LOANS));
      if (!snap.exists()) {
        return { totalPerdonados: 0, montoTotalPerdonado: 0, usuariosAfectados: [] };
      }

      const updates = {};
      const ahora = Date.now();
      const fecha = new Date(ahora).toLocaleString('es-SV');

      snap.forEach(child => {
        const p = child.val();
        if (p.estado === 'pendiente' || p.estado === 'solicitado') {
          if (!targetNorm || p.solicitanteNorm === targetNorm) {
            updates[`${child.key}/estado`] = 'perdonado';
            updates[`${child.key}/saldoPendiente`] = 0;
            updates[`${child.key}/perdonadoPor`] = 'jikokun';
            updates[`${child.key}/fechaPerdonado`] = ahora;
            updates[`${child.key}/fechaPerdonadoLegible`] = fecha;

            totalPerdonados++;
            montoTotalPerdonado += (parseInt(p.saldoPendiente, 10) || parseInt(p.totalDevolver, 10) || 0);
            usuariosAfectados.add(p.solicitanteNorm);
          }
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(this.rtdb, NODE_LOANS), updates);

        // Resetear deudaTotal en perfiles de usuarios perdonados
        for (const uKey of usuariosAfectados) {
          await runTransaction(ref(this.rtdb, `${NODE_USERS}/${uKey}`), (u) => {
            if (u) u.deudaTotal = 0;
            return u;
          });
        }
      }

      console.log(`[JikoBank] 👑 ¡ABSOLUCIÓN REALIZADA POR JIKOKUN! ${totalPerdonados} préstamos perdonados (${montoTotalPerdonado} pts)`);
      return {
        exito: true,
        totalPerdonados: totalPerdonados,
        montoTotalPerdonado: montoTotalPerdonado,
        usuariosAfectados: Array.from(usuariosAfectados)
      };
    } catch (err) {
      console.error('[JikoBank] Error en perdonarPrestamos:', err);
      throw err;
    }
  }

  // Perdonar un préstamo individual por su ID (Exclusivo para @Jikokun)
  async perdonarPrestamoPorId(loanId, admin = 'jikokun') {
    const adminNorm = norm(admin);
    if (adminNorm !== 'jikokun') {
      throw new Error('Comando exclusivo del dueño del canal @Jikokun');
    }
    if (!loanId) throw new Error('ID de préstamo no especificado');

    try {
      const loanRef = ref(this.rtdb, `${NODE_LOANS}/${loanId}`);
      const snap = await get(loanRef);
      if (!snap.exists()) throw new Error('Préstamo no encontrado');

      const loan = snap.val();
      const saldoRemanente = parseInt(loan.saldoPendiente, 10) || parseInt(loan.totalDevolver, 10) || 0;
      const ahora = Date.now();
      const fecha = new Date(ahora).toLocaleString('es-SV');

      await update(loanRef, {
        estado: 'perdonado',
        saldoPendiente: 0,
        perdonadoPor: 'jikokun',
        fechaPerdonado: ahora,
        fechaPerdonadoLegible: fecha
      });

      // Deducir el saldo perdonado de la deudaTotal del deudor en stream/usuarios
      if (loan.solicitanteNorm && saldoRemanente > 0) {
        await runTransaction(ref(this.rtdb, `${NODE_USERS}/${loan.solicitanteNorm}`), (u) => {
          if (u) {
            u.deudaTotal = Math.max(0, (u.deudaTotal || saldoRemanente) - saldoRemanente);
          }
          return u;
        });
      }

      console.log(`[JikoBank] 🕊️ Préstamo #${loanId} perdonado por Jikokun a @${loan.solicitanteNorm} (${saldoRemanente} pts condonados)`);
      return { exito: true, prestamo: loan, saldoPerdonado: saldoRemanente };
    } catch (err) {
      console.warn('[JikoBank] Error perdonando préstamo individual:', err);
      throw err;
    }
  }


  // Dar Jikopuntos a TODOS los asistentes de la transmisión actual (Exclusivo de Jikokun)
  async darJikopuntosTodos({ admin = 'jikokun', cantidad }) {
    const adminNorm = norm(admin);
    if (adminNorm !== 'jikokun') {
      throw new Error('Comando exclusivo del dueño del canal @Jikokun');
    }
    const monto = Math.max(1, parseInt(cantidad, 10) || 0);

    try {
      const statsSnap = await get(ref(this.rtdb, NODE_TRANS_STATS));
      const stats = statsSnap.exists() ? statsSnap.val() : {};
      const streamId = (stats.isLive === true && stats.streamActivoId) ? stats.streamActivoId : stats.ultimoStreamId;

      if (!streamId) {
        throw new Error('No hay transmisión activa o reciente registrada');
      }

      const transSnap = await get(ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamId}/asistentes`));
      if (!transSnap.exists()) {
        throw new Error('Aún no hay asistentes registrados en esta transmisión');
      }

      const asistentes = transSnap.val();
      const keys = Object.keys(asistentes);
      if (keys.length === 0) {
        throw new Error('Lista de asistentes vacía en la transmisión actual');
      }

      const premiados = [];
      for (const uKey of keys) {
        try {
          const uData = asistentes[uKey];
          const displayName = uData.username || uKey;
          await this.addJikopuntos(uKey, monto, `Lluvia comunitaria de Jikokun (${streamId})`);
          premiados.push(displayName);
        } catch (e) {}
      }

      const totalRepartido = premiados.length * monto;
      // Actualizar total en stream
      await runTransaction(ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamId}`), (s) => {
        if (s) s.puntosRepartidos = (s.puntosRepartidos || 0) + totalRepartido;
        return s;
      });

      console.log(`[JikoBank] 🐺 ¡LLUVIA DE JIKOPUNTOS! ${premiados.length} asistentes recibieron +${monto} pts cada uno (Total: ${totalRepartido} pts)`);
      return {
        exito: true,
        totalAsistentes: premiados.length,
        montoPorUsuario: monto,
        totalRepartido: totalRepartido,
        asistentesPremiados: premiados
      };
    } catch (err) {
      console.warn('[JikoBank] Error en darJikopuntosTodos:', err);
      throw err;
    }
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

  onOverlayState(overlayName, callback) {
    return onValue(ref(this.rtdb, `${NODE_OVERLAYS}/${overlayName}/estadoEnVivo`), snap => {
      callback(snap.val() || {});
    });
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
          // El usuario ya existe en Firebase: sincronizar puntos respetando el saldo mayor para no perder puntos de Firebase
          const asistencias = Math.max(fbUser.asistenciasCount || 0, localData.asistenciasCount || 0);
          const nivelInfo = calcularNivelUsuario(asistencias);
          const safePts = Math.max(Number(fbUser.jikopuntos) || 0, localPts);
          const totalGanado = Math.max(fbUser.totalGanado || 0, safePts + (fbUser.totalGastado || 0));

          const userUpdates = {
            jikopuntos: safePts,
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
          this._updateLocalCache(uKey, safePts);
          const merged = { ...fbUser, ...userUpdates };
          this.usersCache.set(uKey, merged);

          statsResult.actualizadosEnFirebase++;
          statsResult.usuarios.push({
            username: uKey,
            displayName: merged.displayName,
            puntos: safePts,
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
  // 8. SISTEMA BANCARIO JIKOBANK (PRÉSTAMOS, CRÉDITOS, REGALOS Y PERDÓN DE DEUDAS)
  // ==========================================================================

  // Obtener todos los préstamos asociados a un usuario (como solicitante o acreedor)
  async obtenerPrestamosUsuario(username) {
    await this.init();
    const key = norm(username);
    if (!key) return [];
    try {
      const snap = await get(ref(this.rtdb, NODE_LOANS));
      if (!snap.exists()) return [];
      const lista = [];
      snap.forEach(child => {
        const p = child.val();
        if (p && (norm(p.solicitante) === key || norm(p.acreedor) === key)) {
          lista.push({ ...p, id: child.key });
        }
      });
      return lista.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (e) {
      console.warn('[StreamDB] Error al obtener préstamos de @' + key, e);
      return [];
    }
  }

  // Obtener préstamos pendientes de confirmación o firma para un usuario
  async obtenerPrestamoPendientePara(username) {
    await this.init();
    const key = norm(username);
    if (!key) return null;
    try {
      const snap = await get(ref(this.rtdb, NODE_LOANS));
      if (!snap.exists()) return null;
      let pendiente = null;
      snap.forEach(child => {
        const p = child.val();
        if (!p) return;
        // Si es banco esperando firma del solicitante (!firmar o !aceptar)
        if (p.tipo === 'banco' && p.estado === 'pendiente_firma' && norm(p.solicitante) === key) {
          pendiente = { ...p, id: child.key };
        }
        // Si es P2P esperando que el acreedor acepte o rechace
        if (p.tipo === 'p2p' && p.estado === 'pendiente' && norm(p.acreedor) === key) {
          pendiente = { ...p, id: child.key };
        }
      });
      return pendiente;
    } catch (e) {
      return null;
    }
  }

  // Obtener consolidado del cajero para visualización de tarjeta y HUD
  async obtenerDatosCajero(username) {
    const rawKey = norm(username);
    const key = this.resolverUsuarioReal(rawKey);
    if (!key) return null;
    const user = await this.getUser(key);
    if (!user) return null;

    const saldoBruto = Math.max(0, parseInt(user.jikopuntos, 10) || 0);
    const deuda = Math.max(0, parseInt(user.deudaTotal, 10) || 0);
    const saldoReal = saldoBruto - deuda; // Saldo real neto (puede ser negativo si debe más de lo que tiene)

    return {
      username: key,
      displayName: user.displayName || key,
      avatar: user.avatar || '',
      nivel: user.nivel || 1,
      rangoTitulo: user.rangoTitulo || 'Cachorro',
      insigniaEmoji: user.insigniaEmoji || '🐾',
      saldoActual: saldoBruto,
      deudaTotal: deuda,
      saldoReal: saldoReal,
      tasaInteres: TASA_INTERES_PRESTAMO,
      tasaPorcentaje: Math.round(TASA_INTERES_PRESTAMO * 100) + '%'
    };
  }

  // Solicitar un préstamo (P2P entre usuarios o directo a JikoBank)
  async solicitarPrestamo({ solicitante, acreedor, monto }) {
    await this.init();
    const solNorm = norm(solicitante);
    const montoNum = Math.max(1, parseInt(monto, 10) || 0);

    if (!solNorm) throw new Error('Usuario solicitante inválido');
    if (montoNum <= 0) throw new Error('El monto debe ser mayor a 0');

    const acrNorm = norm(acreedor);
    const esBanco = (acrNorm === 'jikobank' || acrNorm === 'jiko' || acrNorm === 'banco');

    if (!esBanco && solNorm === acrNorm) {
      throw new Error('No puedes pedirte un préstamo a ti mismo');
    }

    // Calcular tasa de interés del 2%
    const interesMonto = Math.max(1, Math.round(montoNum * TASA_INTERES_PRESTAMO));
    const totalAPagar = montoNum + interesMonto;
    const ahora = Date.now();

    // Asegurar perfiles en Firebase
    await this.getUser(solNorm);
    if (!esBanco) {
      const acreedorUser = await this.getUser(acrNorm);
      if (!acreedorUser || (acreedorUser.jikopuntos || 0) < montoNum) {
        throw new Error(`@${acrNorm} no cuenta con saldo suficiente (${montoNum} JP) para prestarte.`);
      }
    }

    const nuevoPrestamo = {
      solicitante: solNorm,
      acreedor: esBanco ? 'jikobank' : acrNorm,
      montoOriginal: montoNum,
      interesTasa: TASA_INTERES_PRESTAMO,
      interesMonto: interesMonto,
      totalAPagar: totalAPagar,
      saldoPendiente: totalAPagar,
      tipo: esBanco ? 'banco' : 'p2p',
      estado: esBanco ? 'pendiente_firma' : 'pendiente',
      timestamp: ahora,
      fechaSolicitud: ahora,
      fechaSolicitudLegible: new Date(ahora).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' })
    };

    const prestamoRef = push(ref(this.rtdb, NODE_LOANS));
    const prestamoId = prestamoRef.key;
    await set(prestamoRef, { ...nuevoPrestamo, id: prestamoId });

    console.log(`[StreamDB] 🏦 Préstamo #${prestamoId} registrado (${nuevoPrestamo.tipo}): @${solNorm} solicita ${montoNum} JP a ${nuevoPrestamo.acreedor}`);

    return {
      success: true,
      prestamoId: prestamoId,
      prestamo: { ...nuevoPrestamo, id: prestamoId },
      esBanco: esBanco,
      interesPorcentaje: '2%'
    };
  }

  // Confirmar/Aceptar/Firmar préstamo pendiente
  async confirmarPrestamo({ autorizador, prestamoId = null }) {
    await this.init();
    const autNorm = norm(autorizador);
    if (!autNorm) throw new Error('Autorizador inválido');

    let pData = null;
    let targetKey = prestamoId;

    if (targetKey) {
      const snap = await get(ref(this.rtdb, `${NODE_LOANS}/${targetKey}`));
      if (snap.exists()) pData = snap.val();
    } else {
      // Buscar el último pendiente para este autorizador
      const pendiente = await this.obtenerPrestamoPendientePara(autNorm);
      if (pendiente) {
        pData = pendiente;
        targetKey = pendiente.id;
      }
    }

    if (!pData || !targetKey) {
      throw new Error(`No hay ningún préstamo pendiente que requiera confirmación de @${autNorm}.`);
    }

    // Validar permisos de autorización
    const esBanco = pData.tipo === 'banco';
    if (esBanco) {
      // En préstamo con JikoBank, es el solicitante quien debe firmar/aceptar
      if (norm(pData.solicitante) !== autNorm) {
        throw new Error(`Solo @${pData.solicitante} puede firmar este préstamo del banco.`);
      }
      if (pData.estado !== 'pendiente_firma') {
        throw new Error(`El préstamo ya no está pendiente de firma (Estado actual: ${pData.estado}).`);
      }
    } else {
      // En préstamo P2P, es el acreedor quien debe autorizar el desembolso
      if (norm(pData.acreedor) !== autNorm) {
        throw new Error(`Solo @${pData.acreedor} puede aceptar prestar los jikopuntos.`);
      }
      if (pData.estado !== 'pendiente') {
        throw new Error(`El préstamo ya no está pendiente de aprobación (Estado actual: ${pData.estado}).`);
      }
    }

    const solNorm = norm(pData.solicitante);
    const monto = pData.montoOriginal;
    const totalAPagar = pData.totalAPagar;
    const ahora = Date.now();

    // 1. Si es P2P, verificar y debitar fondos del acreedor
    if (!esBanco) {
      const acrNorm = norm(pData.acreedor);
      const acrRef = ref(this.rtdb, `${NODE_USERS}/${acrNorm}`);
      let fondosSuficientes = true;

      await runTransaction(acrRef, (actual) => {
        if (!actual || (actual.jikopuntos || 0) < monto) {
          fondosSuficientes = false;
          return actual;
        }
        actual.jikopuntos = (actual.jikopuntos || 0) - monto;
        actual.totalGastado = (actual.totalGastado || 0) + monto;
        actual.ultimaActividad = ahora;
        return actual;
      });

      if (!fondosSuficientes) {
        throw new Error(`@${acrNorm} no tiene suficientes Jikopuntos (${monto} JP) para completar el préstamo.`);
      }
      this._updateLocalCache(acrNorm, (await this.getUser(acrNorm))?.jikopuntos);
    }

    // 2. Acreditar monto original al solicitante y cargar deuda total (capital + 2% interés)
    const solRef = ref(this.rtdb, `${NODE_USERS}/${solNorm}`);
    await runTransaction(solRef, (actual) => {
      if (!actual) return actual;
      actual.jikopuntos = (actual.jikopuntos || 0) + monto;
      actual.totalGanado = (actual.totalGanado || 0) + monto;
      actual.deudaTotal = Math.max(0, (actual.deudaTotal || 0) + totalAPagar);
      actual.ultimaActividad = ahora;
      return actual;
    });

    const solUserActualizado = await this.getUser(solNorm);
    this._updateLocalCache(solNorm, solUserActualizado?.jikopuntos);

    // 3. Actualizar estado del préstamo a activo
    const pRef = ref(this.rtdb, `${NODE_LOANS}/${targetKey}`);
    const actualizacionPrestamo = {
      estado: 'activo',
      fechaAprobacion: ahora,
      fechaAprobacionLegible: new Date(ahora).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' }),
      saldoPendiente: totalAPagar,
      aprobadoPor: autNorm
    };
    await update(pRef, actualizacionPrestamo);

    // 4. Registrar en transacciones históricas
    try {
      const transRef = push(ref(this.rtdb, NODE_TRANSACTIONS));
      await set(transRef, {
        tipo: 'prestamo_desembolsado',
        solicitante: solNorm,
        acreedor: pData.acreedor,
        monto: monto,
        interesMonto: pData.interesMonto,
        totalDeuda: totalAPagar,
        prestamoId: targetKey,
        timestamp: ahora
      });
    } catch(e) {}

    console.log(`[StreamDB] 🚀 Préstamo #${targetKey} aprobado con éxito. Acreditados ${monto} JP a @${solNorm}. Deuda contraída: ${totalAPagar} JP (2% tasa).`);

    return {
      success: true,
      prestamoId: targetKey,
      solicitante: solNorm,
      acreedor: pData.acreedor,
      montoAcreditado: monto,
      totalDeuda: totalAPagar,
      saldoActualSolicitante: solUserActualizado?.jikopuntos || 0,
      deudaTotalSolicitante: solUserActualizado?.deudaTotal || totalAPagar
    };
  }

  // Rechazar o cancelar préstamo pendiente
  async rechazarPrestamo({ usuario, prestamoId = null }) {
    await this.init();
    const uNorm = norm(usuario);
    if (!uNorm) throw new Error('Usuario inválido');

    let pData = null;
    let targetKey = prestamoId;

    if (targetKey) {
      const snap = await get(ref(this.rtdb, `${NODE_LOANS}/${targetKey}`));
      if (snap.exists()) pData = snap.val();
    } else {
      const pendiente = await this.obtenerPrestamoPendientePara(uNorm);
      if (pendiente) {
        pData = pendiente;
        targetKey = pendiente.id;
      }
    }

    if (!pData || !targetKey) {
      throw new Error(`No hay ningún préstamo pendiente que rechazar para @${uNorm}.`);
    }

    const solNorm = norm(pData.solicitante);
    const acrNorm = norm(pData.acreedor);

    if (uNorm !== solNorm && uNorm !== acrNorm && uNorm !== 'jikokun') {
      throw new Error('No tienes autorización para cancelar o rechazar esta solicitud.');
    }

    const ahora = Date.now();
    await update(ref(this.rtdb, `${NODE_LOANS}/${targetKey}`), {
      estado: 'rechazado',
      fechaRechazo: ahora,
      rechazadoPor: uNorm
    });

    return {
      success: true,
      prestamoId: targetKey,
      solicitante: solNorm,
      acreedor: acrNorm,
      rechazadoPor: uNorm
    };
  }

  // Pagar deuda / amortizar préstamos activos (!pagarprestamo [monto])
  async pagarPrestamo({ deudor, monto = null }) {
    await this.init();
    const dNorm = norm(deudor);
    if (!dNorm) throw new Error('Usuario deudor inválido');

    const user = await this.getUser(dNorm);
    if (!user) throw new Error('Usuario no encontrado');

    const deudaTotal = Math.max(0, parseInt(user.deudaTotal, 10) || 0);
    if (deudaTotal <= 0) {
      throw new Error(`¡Felicidades @${dNorm}! No tienes ninguna deuda pendiente en JikoBank.`);
    }

    const saldoActual = Math.max(0, parseInt(user.jikopuntos, 10) || 0);
    if (saldoActual <= 0) {
      throw new Error(`@${dNorm}, no tienes Jikopuntos disponibles para abonar a tu deuda.`);
    }

    // Determinar cuánto se puede pagar
    let montoDeseado = monto !== null ? Math.max(1, parseInt(monto, 10) || 0) : deudaTotal;
    const montoAPagar = Math.min(saldoActual, deudaTotal, montoDeseado);

    if (montoAPagar <= 0) {
      throw new Error('El monto a pagar debe ser mayor a 0');
    }

    const ahora = Date.now();

    // 1. Obtener préstamos activos del deudor para amortizarlos en orden FIFO
    const snap = await get(ref(this.rtdb, NODE_LOANS));
    const prestamosActivos = [];
    if (snap.exists()) {
      snap.forEach(child => {
        const p = child.val();
        if (p && norm(p.solicitante) === dNorm && p.estado === 'activo' && (p.saldoPendiente || 0) > 0) {
          prestamosActivos.push({ ...p, id: child.key });
        }
      });
      prestamosActivos.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }

    let restantePorDistribuir = montoAPagar;

    for (const p of prestamosActivos) {
      if (restantePorDistribuir <= 0) break;

      const deudaEstePrestamo = Math.max(0, parseInt(p.saldoPendiente, 10) || 0);
      const abono = Math.min(restantePorDistribuir, deudaEstePrestamo);
      const nuevoSaldoPrestamo = deudaEstePrestamo - abono;
      const pagadoTotalmente = nuevoSaldoPrestamo <= 0;

      // Si fue préstamo P2P a otro usuario, devolverle su capital/intereses amortizados
      if (p.tipo === 'p2p' && p.acreedor && norm(p.acreedor) !== 'jikobank') {
        const acrNorm = norm(p.acreedor);
        const acrRef = ref(this.rtdb, `${NODE_USERS}/${acrNorm}`);
        await runTransaction(acrRef, (actual) => {
          if (!actual) return actual;
          actual.jikopuntos = (actual.jikopuntos || 0) + abono;
          actual.totalGanado = (actual.totalGanado || 0) + abono;
          actual.ultimaActividad = ahora;
          return actual;
        });
        this._updateLocalCache(acrNorm, (await this.getUser(acrNorm))?.jikopuntos);
      }

      // Actualizar estado del préstamo
      await update(ref(this.rtdb, `${NODE_LOANS}/${p.id}`), {
        saldoPendiente: nuevoSaldoPrestamo,
        estado: pagadoTotalmente ? 'pagado' : 'activo',
        ultimoPagoTimestamp: ahora,
        ultimoAbono: abono,
        ...(pagadoTotalmente ? { fechaPagoCompleto: ahora } : {})
      });

      restantePorDistribuir -= abono;
    }

    // 2. Debitar del deudor y rebajar deudaTotal
    const deudorRef = ref(this.rtdb, `${NODE_USERS}/${dNorm}`);
    await runTransaction(deudorRef, (actual) => {
      if (!actual) return actual;
      actual.jikopuntos = Math.max(0, (actual.jikopuntos || 0) - montoAPagar);
      actual.totalGastado = (actual.totalGastado || 0) + montoAPagar;
      actual.deudaTotal = Math.max(0, (actual.deudaTotal || 0) - montoAPagar);
      actual.ultimaActividad = ahora;
      return actual;
    });

    const userFinal = await this.getUser(dNorm);
    this._updateLocalCache(dNorm, userFinal?.jikopuntos);

    console.log(`[StreamDB] 💳 Pago completado por @${dNorm}: Abono de ${montoAPagar} JP. Deuda restante: ${userFinal.deudaTotal} JP.`);

    return {
      success: true,
      deudor: dNorm,
      montoPagado: montoAPagar,
      deudaRestante: userFinal.deudaTotal || 0,
      saldoRestante: userFinal.jikopuntos || 0,
      totalmenteSaldado: (userFinal.deudaTotal || 0) === 0
    };
  }

  // Regalo Solidario (!regalar @usuario [cantidad]) - 0% interés, no genera deuda
  async regalarJikopuntos({ remitente, receptor, cantidad }) {
    await this.init();
    let recRaw = receptor;
    let cantRaw = cantidad;

    // Protección defensiva en caso de argumentos invertidos (ej: { receptor: '12', cantidad: '@user' })
    if ((typeof recRaw === 'number' || /^\d+$/.test(String(recRaw || '').trim())) && 
        (typeof cantRaw === 'string' && (cantRaw.startsWith('@') || !/^\d+$/.test(cantRaw.trim())))) {
      const temp = recRaw;
      recRaw = cantRaw;
      cantRaw = temp;
    }

    const remNorm = norm(remitente);
    const recNorm = norm(recRaw);
    const cantNum = Math.max(1, parseInt(cantRaw, 10) || 0);

    if (!remNorm) throw new Error('Remitente no válido');
    if (!recNorm) throw new Error('Debes especificar a qué usuario regalarle');
    if (remNorm === recNorm) throw new Error('No puedes regalarte Jikopuntos a ti mismo');
    if (cantNum <= 0) throw new Error('La cantidad a regalar debe ser mayor a 0');

    const remUser = await this.getUser(remNorm);
    if (!remUser || (remUser.jikopuntos || 0) < cantNum) {
      throw new Error(`Saldo insuficiente. Tienes ${remUser?.jikopuntos || 0} JP y deseas regalar ${cantNum} JP.`);
    }

    const recUser = await this.getUser(recNorm); // Asegurar existencia del receptor
    const ahora = Date.now();
    const saldoRemAntes = remUser?.jikopuntos || 0;
    const saldoRecAntes = recUser?.jikopuntos || 0;

    // Debitar de remitente
    await runTransaction(ref(this.rtdb, `${NODE_USERS}/${remNorm}`), (u) => {
      if (!u) return u;
      u.jikopuntos = Math.max(0, (u.jikopuntos || 0) - cantNum);
      u.totalGastado = (u.totalGastado || 0) + cantNum;
      u.ultimaActividad = ahora;
      return u;
    });

    // Acreditar a receptor
    await runTransaction(ref(this.rtdb, `${NODE_USERS}/${recNorm}`), (u) => {
      if (!u) return u;
      u.jikopuntos = (u.jikopuntos || 0) + cantNum;
      u.totalGanado = (u.totalGanado || 0) + cantNum;
      u.ultimaActividad = ahora;
      return u;
    });

    const [finalRem, finalRec] = await Promise.all([
      this.getUser(remNorm),
      this.getUser(recNorm)
    ]);

    this._updateLocalCache(remNorm, finalRem?.jikopuntos);
    this._updateLocalCache(recNorm, finalRec?.jikopuntos);

    // Registrar en transferencias de tienda
    try {
      const transRef = push(ref(this.rtdb, NODE_TRANSFERS));
      await set(transRef, {
        remitente: remNorm,
        receptor: recNorm,
        cantidad: cantNum,
        tipo: 'regalo_solidario',
        timestamp: ahora,
        fechaLegible: new Date(ahora).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' })
      });
      await this._incrementarEstadistica('totalTransferencias', 1);
    } catch(e) {}

    console.log(`[StreamDB] 🎁 Regalo solidario: @${remNorm} regaló ${cantNum} JP a @${recNorm} (Rem: ${saldoRemAntes} -> ${finalRem?.jikopuntos}, Rec: ${saldoRecAntes} -> ${finalRec?.jikopuntos})`);

    return {
      success: true,
      exito: true,
      remitente: remNorm,
      receptor: recNorm,
      cantidad: cantNum,
      monto: cantNum,
      saldoRemitenteAntes: saldoRemAntes,
      saldoRemitenteDespues: finalRem?.jikopuntos || 0,
      saldoRemitente: finalRem?.jikopuntos || 0,
      saldoReceptorAntes: saldoRecAntes,
      saldoReceptorDespues: finalRec?.jikopuntos || 0,
      saldoReceptor: finalRec?.jikopuntos || 0,
      nuevoSaldoRemitente: finalRem?.jikopuntos || 0,
      nuevoSaldoReceptor: finalRec?.jikopuntos || 0,
      avatarRemitente: finalRem?.avatar,
      avatarReceptor: finalRec?.avatar,
      deudaRemitente: finalRem?.deudaTotal || 0,
      deudaReceptor: finalRec?.deudaTotal || 0
    };
  }

  // Absolución de Deudas / Perdón (!perdonarprestamos [@usuario]) - Solo Broadcaster Jikokun
  async perdonarPrestamos({ admin, targetUser = null }) {
    await this.init();
    const admNorm = norm(admin);
    if (admNorm !== 'jikokun') {
      throw new Error('Comando exclusivo del dueño del canal (@jikokun).');
    }

    const targetNorm = targetUser ? norm(targetUser) : null;
    const ahora = Date.now();
    let usuariosPerdonados = 0;
    let prestamosCancelados = 0;

    if (targetNorm) {
      // Perdonar únicamente a un usuario específico
      const uRef = ref(this.rtdb, `${NODE_USERS}/${targetNorm}`);
      await update(uRef, {
        deudaTotal: 0,
        ultimaActividad: ahora
      });
      usuariosPerdonados = 1;

      // Marcar préstamos activos de ese usuario como perdonados
      const snap = await get(ref(this.rtdb, NODE_LOANS));
      if (snap.exists()) {
        const updatesBatch = {};
        snap.forEach(child => {
          const p = child.val();
          if (p && norm(p.solicitante) === targetNorm && p.estado === 'activo') {
            updatesBatch[`${child.key}/estado`] = 'perdonado';
            updatesBatch[`${child.key}/saldoPendiente`] = 0;
            updatesBatch[`${child.key}/fechaPerdon`] = ahora;
            updatesBatch[`${child.key}/perdonadoPor`] = 'jikokun';
            prestamosCancelados++;
          }
        });
        if (Object.keys(updatesBatch).length > 0) {
          await update(ref(this.rtdb, NODE_LOANS), updatesBatch);
        }
      }

      console.log(`[StreamDB] 🕊️ Absolución de deuda concedida a @${targetNorm} por @jikokun (${prestamosCancelados} préstamos cancelados).`);
      return {
        success: true,
        targetUser: targetNorm,
        esGeneral: false,
        prestamosCancelados: prestamosCancelados
      };
    } else {
      // Absolución general para todos los usuarios con deudas
      const usersSnap = await get(ref(this.rtdb, NODE_USERS));
      if (usersSnap.exists()) {
        const updatesUsers = {};
        usersSnap.forEach(child => {
          const u = child.val();
          if (u && (u.deudaTotal || 0) > 0) {
            updatesUsers[`${child.key}/deudaTotal`] = 0;
            usuariosPerdonados++;
          }
        });
        if (Object.keys(updatesUsers).length > 0) {
          await update(ref(this.rtdb, NODE_USERS), updatesUsers);
        }
      }

      // Marcar todos los préstamos activos en el banco como perdonados
      const snap = await get(ref(this.rtdb, NODE_LOANS));
      if (snap.exists()) {
        const updatesLoans = {};
        snap.forEach(child => {
          const p = child.val();
          if (p && p.estado === 'activo') {
            updatesLoans[`${child.key}/estado`] = 'perdonado';
            updatesLoans[`${child.key}/saldoPendiente`] = 0;
            updatesLoans[`${child.key}/fechaPerdon`] = ahora;
            updatesLoans[`${child.key}/perdonadoPor`] = 'jikokun';
            prestamosCancelados++;
          }
        });
        if (Object.keys(updatesLoans).length > 0) {
          await update(ref(this.rtdb, NODE_LOANS), updatesLoans);
        }
      }

      console.log(`[StreamDB] 🕊️ Absolución General de JikoBank: ${usuariosPerdonados} usuarios liberados de deudas (${prestamosCancelados} préstamos cancelados).`);
      return {
        success: true,
        targetUser: null,
        esGeneral: true,
        usuariosPerdonados: usuariosPerdonados,
        prestamosCancelados: prestamosCancelados
      };
    }
  }

  // Entregar Jikopuntos a todos los asistentes (!darjikopuntos todos [cantidad]) - Solo Broadcaster Jikokun
  async darJikopuntosTodos({ admin, cantidad }) {
    await this.init();
    const admNorm = norm(admin);
    if (admNorm !== 'jikokun' && admNorm !== 'broadcaster') {
      throw new Error('Comando exclusivo del dueño del canal (@jikokun).');
    }

    const cantNum = Math.max(1, parseInt(cantidad, 10) || 0);
    if (cantNum <= 0) throw new Error('La cantidad de puntos debe ser mayor a 0');

    // Deduplicación atómica para bonificación masiva
    const ahora = Date.now();
    if (this._darPuntosTodosLock && (ahora - this._darPuntosTodosLock < 5000)) {
      console.log(`[StreamDB] ℹ️ darJikopuntosTodos duplicado ignorado (${cantNum} pts ya repartidos hace <5s)`);
      return {
        success: true,
        cantidad: cantNum,
        usuariosBeneficiados: 0,
        duplicadoIgnorado: true
      };
    }
    this._darPuntosTodosLock = ahora;

    let usuariosBeneficiados = 0;
    const listaUsuarios = [];

    // Prioridad 1: Asistentes del stream activo
    try {
      const statsSnap = await get(ref(this.rtdb, NODE_TRANS_STATS));
      const streamId = statsSnap.exists() ? statsSnap.val().streamActivoId : null;
      if (streamId) {
        const asistSnap = await get(ref(this.rtdb, `${NODE_TRANSMISSIONS}/${streamId}/asistentes`));
        if (asistSnap.exists()) {
          const asistentes = asistSnap.val();
          for (const key of Object.keys(asistentes)) {
            const uNorm = norm(key);
            if (!uNorm) continue;
            await runTransaction(ref(this.rtdb, `${NODE_USERS}/${uNorm}`), (u) => {
              if (!u) return u;
              u.jikopuntos = (u.jikopuntos || 0) + cantNum;
              u.totalGanado = (u.totalGanado || 0) + cantNum;
              u.ultimaActividad = ahora;
              return u;
            });
            usuariosBeneficiados++;
            listaUsuarios.push(uNorm);
          }
        }
      }
    } catch(e) {}

    // Si no había stream activo o ningún asistente conectado, aplicar a todos los usuarios registrados
    if (usuariosBeneficiados === 0) {
      const usersSnap = await get(ref(this.rtdb, NODE_USERS));
      if (usersSnap.exists()) {
        const users = usersSnap.val();
        for (const [key, u] of Object.entries(users)) {
          const uNorm = norm(key);
          if (!uNorm) continue;
          await runTransaction(ref(this.rtdb, `${NODE_USERS}/${uNorm}`), (userObj) => {
            if (!userObj) return userObj;
            userObj.jikopuntos = (userObj.jikopuntos || 0) + cantNum;
            userObj.totalGanado = (userObj.totalGanado || 0) + cantNum;
            userObj.ultimaActividad = ahora;
            return userObj;
          });
          usuariosBeneficiados++;
          listaUsuarios.push(uNorm);
        }
      }
    }

    console.log(`[StreamDB] 🎁 ¡Regalo Masivo de Jikokun! ${cantNum} JP entregados a ${usuariosBeneficiados} usuarios.`);

    return {
      success: true,
      cantidad: cantNum,
      usuariosBeneficiados: usuariosBeneficiados,
      lista: listaUsuarios
    };
  }

  // Entregar Jikopuntos a un usuario específico (!darjikopuntos @usuario [cantidad]) - Solo Broadcaster Jikokun
  async darJikopuntosUsuario({ admin, targetUser, cantidad }) {
    await this.init();
    const admNorm = norm(admin);
    if (admNorm !== 'jikokun' && admNorm !== 'broadcaster') {
      throw new Error('Comando exclusivo del dueño del canal (@jikokun).');
    }

    const targetNorm = norm(targetUser);
    const cantNum = Math.max(1, parseInt(cantidad, 10) || 0);

    if (!targetNorm) throw new Error('Usuario destino no válido');
    if (cantNum <= 0) throw new Error('La cantidad debe ser mayor a 0');

    // Deduplicación atómica para evitar que múltiples widgets en OBS dupliquen los puntos
    if (!this._darPuntosLocks) {
      this._darPuntosLocks = new Map();
    }
    const ahora = Date.now();
    const dedupeKey = `${targetNorm}_${cantNum}`;
    const lastExec = this._darPuntosLocks.get(dedupeKey) || 0;
    if (ahora - lastExec < 4000) {
      console.log(`[StreamDB] ℹ️ darJikopuntosUsuario duplicado ignorado para @${targetNorm} (+${cantNum} pts ya procesados en los últimos 4s)`);
      const existingUser = await this.getUser(targetNorm);
      return {
        success: true,
        targetUser: targetNorm,
        cantidad: cantNum,
        nuevoSaldo: existingUser?.jikopuntos || 0,
        duplicadoIgnorado: true
      };
    }
    this._darPuntosLocks.set(dedupeKey, ahora);

    await this.getUser(targetNorm); // asegurar que existe

    await runTransaction(ref(this.rtdb, `${NODE_USERS}/${targetNorm}`), (u) => {
      if (!u) return u;
      u.jikopuntos = (u.jikopuntos || 0) + cantNum;
      u.totalGanado = (u.totalGanado || 0) + cantNum;
      u.ultimaActividad = ahora;
      return u;
    });

    const userFinal = await this.getUser(targetNorm);
    this._updateLocalCache(targetNorm, userFinal?.jikopuntos);

    console.log(`[StreamDB] 🎁 @jikokun otorgó ${cantNum} JP a @${targetNorm}. Saldo final: ${userFinal.jikopuntos} JP.`);

    return {
      success: true,
      targetUser: targetNorm,
      cantidad: cantNum,
      nuevoSaldo: userFinal?.jikopuntos || 0
    };
  }

  // ==========================================================================
  // 8.5 MÓDULO CATÁLOGO & STOCK DINÁMICO DE TIENDITA EN TIEMPO REAL
  // ==========================================================================

  // Obtener catálogo completo de ítems
  async obtenerTiendaItems() {
    await this.init();
    try {
      const snap = await get(ref(this.rtdb, NODE_TIENDA_ITEMS));
      if (snap.exists()) {
        const val = snap.val();
        if (Array.isArray(val)) return val.filter(Boolean);
        return Object.values(val);
      }
      return [];
    } catch(err) {
      console.warn('[StreamDB] Error al obtener catálogo de tienda:', err);
      return [];
    }
  }

  // Suscribirse a cambios en tiempo real del catálogo
  onTiendaItems(callback) {
    if (!this.rtdb || typeof callback !== 'function') return () => {};
    const itemsRef = ref(this.rtdb, NODE_TIENDA_ITEMS);
    return onValue(itemsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const lista = Array.isArray(val) ? val.filter(Boolean) : Object.values(val);
        callback(lista);
      } else {
        callback([]);
      }
    }, (err) => {
      console.warn('[StreamDB] Error en listener de catálogo:', err);
    });
  }

  // Guardar o actualizar un ítem del catálogo
  async guardarTiendaItem(item) {
    await this.init();
    if (!item || !item.key) throw new Error('El ítem debe tener una clave única (key)');
    const key = norm(item.key);
    const itemData = {
      key: key,
      nombre: item.nombre || key,
      precio: Math.max(1, parseInt(item.precio, 10) || 150),
      stock: (item.stock === -1 || item.stock === '-1' || item.stock === undefined || item.stock === null) ? -1 : Math.max(0, parseInt(item.stock, 10) || 0),
      emoji: item.emoji || '🍽️',
      img: item.img || item.driveUrl || '',
      driveUrl: item.driveUrl || item.img || '',
      driveFileId: item.driveFileId || '',
      localImg: item.localImg || '',
      categoria: item.categoria || 'comida',
      activo: item.activo !== false,
      comando: item.comando || `!${key}`,
      aliases: Array.isArray(item.aliases) ? item.aliases : (typeof item.aliases === 'string' ? item.aliases.split(',').map(s=>norm(s)).filter(Boolean) : []),
      descripcion: item.descripcion || `${item.nombre || key} en la Tiendita`,
      ultimaActualizacion: Date.now()
    };

    await set(ref(this.rtdb, `${NODE_TIENDA_ITEMS}/${key}`), itemData);
    console.log(`[StreamDB] 🏪 Ítem "${key}" guardado en Firebase RTDB.`);
    return itemData;
  }

  // Eliminar un ítem del catálogo
  async eliminarTiendaItem(key) {
    await this.init();
    const k = norm(key);
    await set(ref(this.rtdb, `${NODE_TIENDA_ITEMS}/${k}`), null);
    console.log(`[StreamDB] 🗑️ Ítem "${k}" eliminado de Firebase RTDB.`);
    return true;
  }

  // Sembrar/Poblar catálogo completo en lote
  async sembrarTiendaItems(itemsArray) {
    await this.init();
    if (!Array.isArray(itemsArray)) return;
    const updates = {};
    itemsArray.forEach(item => {
      const k = norm(item.key);
      updates[`${NODE_TIENDA_ITEMS}/${k}`] = {
        ...item,
        key: k,
        ultimaActualizacion: Date.now()
      };
    });
    await update(ref(this.rtdb), updates);
    console.log(`[StreamDB] 🌱 Catálogo sembrado con éxito (${itemsArray.length} ítems).`);
    return true;
  }

  // Decrementar stock de un ítem tras una compra
  async decrementarStockItem(key, cantidad = 1) {
    await this.init();
    const k = norm(key);
    try {
      await runTransaction(ref(this.rtdb, `${NODE_TIENDA_ITEMS}/${k}/stock`), (current) => {
        if (current === -1 || current === undefined || current === null) return current; // Ilimitado
        return Math.max(0, (current || 0) - cantidad);
      });
    } catch(e) {}
  }

  // ==========================================================================
  // 9. LIMPIEZA TOTAL DE REGISTROS DE PRUEBA EN FIREBASE RTDB
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
  window.TABLA_200_NIVELES = TABLA_200_NIVELES;
  window.TABLA_50_NIVELES = TABLA_50_NIVELES;
  window.NIVELES_ASISTENCIA = NIVELES_ASISTENCIA;
  window.formatearTiempoVisto = formatearTiempoVisto;
  window.formatearHorasDecimal = formatearHorasDecimal;
  window.calcularNivelUsuario = calcularNivelUsuario;
  window.calcularFactorXpNivel = calcularFactorXpNivel;
  window.normalizarAvatarKickUrl = normalizarAvatarKickUrl;
}

export default StreamDB;
