// ==========================================================================
// MÓDULO GLOBAL DE PROTECCIÓN DE CONTENIDO Y CÓDIGO FUENTE (MINI WIDGETS)
// ==========================================================================
(function initMiniWidgetProtection() {
    const style = document.createElement('style');
    style.id = 'mini-protection-styles';
    style.innerHTML = `
        img, video, canvas, svg, audio {
            -webkit-user-drag: none !important;
            -khtml-user-drag: none !important;
            -moz-user-drag: none !important;
            -o-user-drag: none !important;
            user-drag: none !important;
            user-select: none !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            pointer-events: auto;
        }
        input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="color"]),
        textarea,
        [contenteditable="true"] {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
        }
    `;
    if (document.head) {
        document.head.appendChild(style);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.head && !document.getElementById('mini-protection-styles')) {
                document.head.appendChild(style);
            }
        });
    }

    document.addEventListener('contextmenu', function(e) {
        const target = e.target;
        const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInputField) {
            e.preventDefault();
            return false;
        }
    }, true);

    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO' || e.target.tagName === 'A') {
            e.preventDefault();
            return false;
        }
    }, true);

    document.addEventListener('keydown', function(e) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
        const key = e.key ? e.key.toUpperCase() : '';
        const keyCode = e.keyCode || e.which;

        if (key === 'F12' || keyCode === 123) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        if (ctrlOrCmd) {
            if (key === 'U' || keyCode === 85 || key === 'S' || keyCode === 83 || key === 'P' || keyCode === 80) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            if (e.shiftKey && (key === 'I' || key === 'J' || key === 'C' || keyCode === 73 || keyCode === 74 || keyCode === 67)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }
    }, true);
})();

/* ==========================================================================
   MINI WIDGETS STANDALONE DE STREAM - SCRIPT PRINCIPAL
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  applyWidgetThemeFromUrl();
  initLiveWeatherClock();
  initDigitalClock();
  initKickLiveCounter();
  initSocialRotator();
  initCountdownTimerWidget();
  initLiveChatWidget();
});

function applyWidgetThemeFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const isLight = urlParams.get('theme') === 'light' || urlParams.get('theme') === 'claro';
  if (isLight) {
    document.body.classList.add('widget-light-theme');
  } else {
    document.body.classList.remove('widget-light-theme');
  }
}

/* ==========================================================================
   1. WIDGET DE CLIMA EN VIVO + RELOJ REAL-TIME (OPEN-METEO API)
   ========================================================================== */
function initLiveWeatherClock() {
  const clockEl = document.getElementById('widget-clock');
  const tempEl = document.getElementById('widget-temp');
  const descEl = document.getElementById('widget-desc');
  const iconEl = document.getElementById('widget-weather-icon');
  const container = document.getElementById('weather-clock-container');

  if (!clockEl && !tempEl) return;

  // Parámetros de URL
  const urlParams = new URLSearchParams(window.location.search);
  let lat = urlParams.get('lat');
  let lon = urlParams.get('lon');
  const noBg = urlParams.get('nobg') === 'true' || urlParams.get('nobg') === '1';

  if (noBg && container) {
    container.classList.add('no-box');
  }

  function updateClock() {
    const now = new Date();
    const optionsTime = { hour: '2-digit', minute: '2-digit', second: urlParams.get('seconds') ? '2-digit' : undefined, hour12: true };
    let timeStr = now.toLocaleTimeString('es-SV', optionsTime).toUpperCase();
    if (clockEl) clockEl.textContent = timeStr;
  }

  updateClock();
  setInterval(updateClock, 1000);

  // Consulta en vivo del Clima (Con Auto-Detección de Ubicación por IP del Streamer)
  async function fetchLiveWeather() {
    try {
      // Si no se pasaron latitud y longitud por URL, auto-detectar por la IP del streamer que cargue el widget en OBS
      if (!lat || !lon) {
        try {
          const geoRes = await fetch('https://ipapi.co/json/');
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.latitude && geoData.longitude) {
              lat = geoData.latitude;
              lon = geoData.longitude;
            }
          }
        } catch (errGeo) {
          console.warn("[MiniWidget AutoGeo] Usando coordenadas de respaldo (El Salvador):", errGeo);
          lat = '13.6929';
          lon = '-89.2182';
        }
      }

      const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat || '13.6929'}&longitude=${lon || '-89.2182'}&current_weather=true`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data.current_weather) {
          const temp = Math.round(data.current_weather.temperature);
          const weatherCode = data.current_weather.weathercode;
          const isDay = data.current_weather.is_day === 1;

          if (tempEl) tempEl.textContent = `${temp}°C`;

          let desc = isDay ? "Día Despejado" : "Noche Estrellada";
          let icon = isDay ? "☀️" : "🌙";

          if (weatherCode === 0) {
            desc = isDay ? "Soleado / Despejado" : "Noche Despejada";
            icon = isDay ? "☀️" : "🌙";
          } else if (weatherCode >= 1 && weatherCode <= 3) {
            desc = "Parcialmente Nublado";
            icon = isDay ? "⛅" : "☁️";
          } else if (weatherCode >= 45 && weatherCode <= 48) {
            desc = "Neblina Fresca";
            icon = "🌫️";
          } else if (weatherCode >= 51 && weatherCode <= 67) {
            desc = "Lluvia Ligera";
            icon = "🌧️";
          } else if (weatherCode >= 80 && weatherCode <= 99) {
            desc = "Tormenta / Lluvia";
            icon = "🌩️";
          }

          if (descEl) descEl.textContent = desc;
          if (iconEl) iconEl.textContent = icon;
        }
      }
    } catch (e) {
      console.warn("[MiniWidget Clima] Error conectando a Open-Meteo. Usando valores por defecto:", e);
      if (tempEl) tempEl.textContent = "23°C";
      if (descEl) descEl.textContent = "Noche Despejada";
      if (iconEl) iconEl.textContent = "🌙";
    }
  }

  fetchLiveWeather();
  setInterval(fetchLiveWeather, 600000); // Actualizar clima cada 10 min
}

/* ==========================================================================
   2. WIDGET DE RELOJ DIGITAL FUTURISTA
   ========================================================================== */
function initDigitalClock() {
  const clockEl = document.getElementById('digital-clock-time');
  const dateEl = document.getElementById('digital-clock-date');

  if (!clockEl && !dateEl) return;

  const urlParams = new URLSearchParams(window.location.search);
  const showSeconds = urlParams.get('seconds') === 'true' || urlParams.get('seconds') === '1';

  function updateDigitalClock() {
    const now = new Date();
    const optionsTime = { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: showSeconds ? '2-digit' : undefined, 
      hour12: true 
    };
    const optionsDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };

    if (clockEl) clockEl.textContent = now.toLocaleTimeString('es-SV', optionsTime).toUpperCase();
    if (dateEl) dateEl.textContent = now.toLocaleDateString('es-SV', optionsDate);
  }

  updateDigitalClock();
  setInterval(updateDigitalClock, 1000);
}

/* ==========================================================================
   3. WIDGET DE CONTADOR KICK EN VIVO (?channel=jikokun)
   ========================================================================== */
function initKickLiveCounter() {
  const containerEl = document.querySelector('.kick-live-widget');
  const channelTextEl = document.getElementById('kick-channel-text') || document.getElementById('kick-channel-name');
  const avatarEl = document.getElementById('kick-avatar-img');
  const followersEl = document.getElementById('kick-followers-count');
  const viewersEl = document.getElementById('kick-viewers-count');
  const liveBadgeEl = document.getElementById('kick-live-badge');

  if (!channelTextEl && !viewersEl) return;

  const urlParams = new URLSearchParams(window.location.search);
  const channel = urlParams.get('channel') || urlParams.get('canal') || 'jikokun';

  // Personalización Visual: Borde, Resplandor, Fondo y Colores de Texto
  const customBorder = urlParams.get('bordercolor') || urlParams.get('border') || urlParams.get('bc');
  const customGlow = urlParams.get('glowcolor') || urlParams.get('glow') || urlParams.get('gc');
  const customBg = urlParams.get('bgcolor') || urlParams.get('bg') || urlParams.get('bgc');
  const customUserColor = urlParams.get('usercolor') || urlParams.get('userc') || urlParams.get('uc');
  const customStatColor = urlParams.get('statcolor') || urlParams.get('statc') || urlParams.get('sc');

  if (containerEl) {
    if (customBorder) {
      const bColor = customBorder.startsWith('#') ? customBorder : `#${customBorder}`;
      containerEl.style.borderColor = bColor;
      if (avatarEl && avatarEl.parentElement) {
        avatarEl.parentElement.style.borderColor = bColor;
      }
    }

    if (customGlow) {
      const gColor = customGlow.startsWith('#') ? customGlow : `#${customGlow}`;
      containerEl.style.boxShadow = `0 0 20px ${gColor}88, inset 0 0 10px ${gColor}44`;
      if (avatarEl && avatarEl.parentElement) {
        avatarEl.parentElement.style.boxShadow = `0 0 12px ${gColor}99`;
      }
    } else if (customBorder) {
      const bColor = customBorder.startsWith('#') ? customBorder : `#${customBorder}`;
      containerEl.style.boxShadow = `0 0 20px ${bColor}88, inset 0 0 10px ${bColor}44`;
    }

    if (customBg) {
      let bgColor = customBg.startsWith('#') ? customBg : `#${customBg}`;
      if (bgColor.length === 7) {
        const r = parseInt(bgColor.slice(1, 3), 16);
        const g = parseInt(bgColor.slice(3, 5), 16);
        const b = parseInt(bgColor.slice(5, 7), 16);
        containerEl.style.background = `rgba(${r}, ${g}, ${b}, 0.85)`;
      } else {
        containerEl.style.background = bgColor;
      }
    }
  }

  if (channelTextEl) {
    channelTextEl.textContent = `${channel}`;
    if (customUserColor) {
      const uColor = customUserColor.startsWith('#') ? customUserColor : `#${customUserColor}`;
      channelTextEl.style.color = uColor;
    }
  }

  if (customStatColor) {
    const sColor = customStatColor.startsWith('#') ? customStatColor : `#${customStatColor}`;
    const statsRow = document.querySelector('.kick-stats-row');
    if (statsRow) statsRow.style.color = sColor;
  }

  async function fetchKickData() {
    try {
      const res = await fetch(`https://kick.com/api/v2/channels/${channel}`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          if (avatarEl && data.user && data.user.profile_pic) {
            avatarEl.src = data.user.profile_pic;
          }
          if (followersEl && data.followersCount !== undefined) {
            followersEl.textContent = Number(data.followersCount).toLocaleString('es-SV');
          }
          if (data.livestream) {
            if (viewersEl) viewersEl.textContent = Number(data.livestream.viewer_count || 0).toLocaleString('es-SV');
            if (liveBadgeEl) liveBadgeEl.style.display = 'inline-block';
          } else {
            if (viewersEl) viewersEl.textContent = '0';
            if (liveBadgeEl) liveBadgeEl.style.display = 'none';
          }
        }
      }
    } catch (e) {
      console.warn("[MiniWidget Kick] Usando valores simulados para Kick:", e);
      if (followersEl) followersEl.textContent = '1,450';
      if (viewersEl) viewersEl.textContent = '84';
      if (liveBadgeEl) liveBadgeEl.style.display = 'inline-block';
      if (avatarEl && !avatarEl.src) avatarEl.src = 'https://files.kick.com/images/user/default_avatar.png';
    }
  }

  fetchKickData();
  setInterval(fetchKickData, 15000); // Actualizar cada 15 segundos
}

/* ==========================================================================
   4. WIDGET ROTADOR DE REDES SOCIALES (?kick=...&discord=...&instagram=...)
   ========================================================================== */
const SOCIAL_ICONS_MAP = {
  kick: { key: 'kick', platform: 'Kick', color: '#53fc18', icon: 'recursos/iconos/kick_ico.webp' },
  discord: { key: 'discord', platform: 'Discord', color: '#5865f2', icon: 'recursos/iconos/discordia_ico.png' },
  instagram: { key: 'instagram', platform: 'Instagram', color: '#e1306c', icon: 'recursos/iconos/instagram_ico.png' },
  facebook: { key: 'facebook', platform: 'Facebook', color: '#1877f2', icon: 'recursos/iconos/facebook_ico.png' },
  spotify: { key: 'spotify', platform: 'Spotify', color: '#1db954', icon: 'recursos/iconos/spotify_ico.png' },
  tiktok: { key: 'tiktok', platform: 'TikTok', color: '#00f2fe', icon: 'recursos/iconos/tiktok_ico.png' },
  telegram: { key: 'telegram', platform: 'Telegram', color: '#0088cc', icon: 'recursos/iconos/telegram_ico.png' },
  youtube: { key: 'youtube', platform: 'YouTube', color: '#ff0000', icon: 'recursos/iconos/youtube_ico.png' },
  twitch: { key: 'twitch', platform: 'Twitch', color: '#9146ff', icon: 'recursos/iconos/twitch_ico.png' }
};

function initSocialRotator() {
  const iconEl = document.getElementById('social-icon');
  const platformEl = document.getElementById('social-platform');
  const handleEl = document.getElementById('social-handle');
  const widgetBox = document.getElementById('social-widget-box');

  if (!handleEl) return;

  const urlParams = new URLSearchParams(window.location.search);
  const socials = [];

  ['kick', 'discord', 'instagram', 'facebook', 'spotify', 'tiktok', 'telegram', 'youtube', 'twitch'].forEach(key => {
    const val = urlParams.get(key);
    if (val && SOCIAL_ICONS_MAP[key]) {
      socials.push({ ...SOCIAL_ICONS_MAP[key], handle: val });
    }
  });

  // Valores por defecto si no se pasan parámetros por URL
  if (socials.length === 0) {
    socials.push(
      { ...SOCIAL_ICONS_MAP.kick, handle: '@jikokun' },
      { ...SOCIAL_ICONS_MAP.instagram, handle: '@jikokun_official' },
      { ...SOCIAL_ICONS_MAP.tiktok, handle: '@jikokun_tv' },
      { ...SOCIAL_ICONS_MAP.discord, handle: 'discord.gg/jikokun' }
    );
  }

  let currentIndex = 0;

  function updateSocial() {
    const item = socials[currentIndex];

    if (iconEl) {
      iconEl.innerHTML = `<img src="${item.icon}" alt="${item.platform}" style="width: 100%; height: 100%; object-fit: contain;">`;
    }
    if (platformEl) {
      platformEl.textContent = item.platform;
      platformEl.style.color = item.color;
    }
    if (handleEl) handleEl.textContent = item.handle;

    if (widgetBox) {
      widgetBox.style.borderColor = item.color;
      widgetBox.style.boxShadow = `0 0 25px ${item.color}60, inset 0 0 12px ${item.color}25`;
    }

    currentIndex = (currentIndex + 1) % socials.length;
  }

  updateSocial();
  setInterval(updateSocial, 6000); // Cambiar cada 6 segundos
}

/* ==========================================================================
   5. WIDGET CONTADOR CUENTA ATRÁS (?min=5&title=Estamos+por+empezar)
   ========================================================================== */
function initCountdownTimerWidget() {
  const timeEl = document.getElementById('countdown-timer-display');
  const titleEl = document.getElementById('countdown-timer-title');

  if (!timeEl) return;

  const urlParams = new URLSearchParams(window.location.search);
  const minutes = parseInt(urlParams.get('min') || urlParams.get('minutos') || '5', 10);
  const titleText = urlParams.get('title') || urlParams.get('titulo') || 'Estamos Por Empezar';

  if (titleEl) titleEl.textContent = titleText;

  let totalSeconds = minutes * 60;

  function updateTimer() {
    if (totalSeconds <= 0) {
      timeEl.textContent = '00:00';
      return;
    }

    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
    const secsStr = secs < 10 ? `0${secs}` : `${secs}`;

    timeEl.textContent = `${minsStr}:${secsStr}`;
    totalSeconds--;
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

/* ==========================================================================
   6. WIDGET DE CHAT EN VIVO PARA OBS (?channel=jikokun&nobg=true)
   ========================================================================== */
/* ==========================================================================
   6. WIDGET DE CHAT DE KICK EN VIVO (?channel=jikokun&nobg=true)
   ========================================================================== */
function sanitizeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initLiveChatWidget() {
  const container = document.getElementById('chat-messages-box') || document.getElementById('chat-container') || document.getElementById('chat-messages');
  if (!container) return;

  // 1. Obtención del usuario desde los parámetros URL (ej: ?channel=XRufus o ?username=XRufus)
  const urlParams = new URLSearchParams(window.location.search);
  const rawChannel = urlParams.get('channel') || urlParams.get('username') || urlParams.get('canal') || urlParams.get('user');
  const noBg = urlParams.get('nobg') === 'true' || urlParams.get('nobg') === '1';

  const widgetBox = document.getElementById('chat-widget-container') || document.getElementById('kick-chat-container');
  if (noBg && widgetBox) {
    widgetBox.classList.add('no-box');
  }

  if (!rawChannel) {
    showError("Error: Falta el parámetro ?channel=NOMBRE_DE_USUARIO en la URL.");
    return;
  }

  const slug = cleanKickUsername(rawChannel);
  initKickWidget(slug);

  async function getKickChatroomId(channelSlug) {
    // Intento 1: Directo (Kick API v2)
    try {
      const response = await fetch(`https://kick.com/api/v2/channels/${channelSlug}`);
      if (response.ok) {
        const channelData = await response.json();
        if (channelData && channelData.chatroom && channelData.chatroom.id) {
          return channelData.chatroom.id;
        }
      }
    } catch (err) {
      console.warn(`[Kick API] Direct fetch error for "${channelSlug}". Probando proxies CORS...`, err);
    }

    // Intento 2: Proxy AllOrigins
    try {
      const resProxy = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent('https://kick.com/api/v2/channels/' + channelSlug)}`);
      if (resProxy.ok) {
        const dataProxy = await resProxy.json();
        if (dataProxy && dataProxy.chatroom && dataProxy.chatroom.id) {
          return dataProxy.chatroom.id;
        }
      }
    } catch (errProxy) {}

    // Intento 3: Proxy CorsProxy.io
    try {
      const resProxy2 = await fetch(`https://corsproxy.io/?${encodeURIComponent('https://kick.com/api/v2/channels/' + channelSlug)}`);
      if (resProxy2.ok) {
        const dataProxy2 = await resProxy2.json();
        if (dataProxy2 && dataProxy2.chatroom && dataProxy2.chatroom.id) {
          return dataProxy2.chatroom.id;
        }
      }
    } catch (errProxy2) {}

    return null;
  }

  async function initKickWidget(channelSlug) {
    try {
      const chatroomId = await getKickChatroomId(channelSlug);

      if (!chatroomId) {
        throw new Error(`Canal "${channelSlug}" no encontrado o bloqueo CORS/Cloudflare.`);
      }

      console.log(`[Kick API] Canal: ${channelSlug} | Chatroom ID: ${chatroomId}`);

      // 3. Conexión al clúster público WebSocket de Pusher usado por Kick
      const PUSHER_KEY = "eb1d5f28b619a93b7726";
      const PUSHER_CLUSTER = "us2";

      let pusherSubscribed = false;

      if (window.Pusher) {
        try {
          const pusher = new Pusher(PUSHER_KEY, {
            cluster: PUSHER_CLUSTER,
            wsHost: `ws-${PUSHER_CLUSTER}.pusher.com`,
            wsPort: 443,
            wssPort: 443,
            enabledTransports: ['ws', 'wss'],
            forceTLS: true
          });

          const channelName = `chatrooms.${chatroomId}.v2`;
          const pusherChannel = pusher.subscribe(channelName);

          pusherChannel.bind('App\\Events\\ChatMessageEvent', function(data) {
            renderChatMessage(data);
          });

          pusher.connection.bind('connected', function() {
            renderChatMessage({
              sender: {
                username: 'KICK_BOT',
                identity: { color: '#00f5d4', badges: [{ type: 'broadcaster' }] }
              },
              content: `🟢 Chat de Kick en vivo conectado para @${channelSlug}`
            });
          });

          pusherSubscribed = true;
        } catch (errPusher) {
          console.warn("[Kick Pusher SDK] Error al inicializar cliente Pusher:", errPusher);
        }
      }

      if (!pusherSubscribed) {
        connectNativePusherWS(chatroomId, PUSHER_KEY, channelSlug);
      }

    } catch (error) {
      console.error(error);
      showError(error.message);
    }
  }

  // Listener para el botón "Corroborar Conexión / Probar Chat" del configurador
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SEND_TEST_CHAT') {
      renderChatMessage({
        sender: {
          username: event.data.username || slug,
          identity: {
            color: '#53fc18',
            badges: [{ type: 'broadcaster' }, { type: 'subscriber' }]
          }
        },
        content: event.data.message || `¡Conexión verificada exitosamente en Kick! 🎉 [emote:24074:LFG]`
      });
    }
  });

  function connectNativePusherWS(roomId, key, channelName) {
    try {
      const ws = new WebSocket(`wss://ws-us2.pusher.com/app/${key}?protocol=7&client=js&version=8.0.1&flash=false`);
      ws.onopen = () => {
        ws.send(JSON.stringify({
          event: 'pusher:subscribe',
          data: { auth: '', channel: `chatrooms.${roomId}.v2` }
        }));
        renderChatMessage({
          sender: {
            username: 'KICK_BOT',
            identity: { color: '#00f5d4', badges: [{ type: 'broadcaster' }] }
          },
          content: `🟢 Chat de Kick en vivo conectado para @${channelName}`
        });
        setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
          }
        }, 30000);
      };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.event === 'App\\Events\\ChatMessageEvent') {
            const payload = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
            if (payload) renderChatMessage(payload);
          }
        } catch (e) {}
      };
    } catch (e) {
      console.error("[Kick WebSocket Native] Error:", e);
    }
  }

  function renderChatMessage(data) {
    if (!data || !data.sender) return;

    const sender = data.sender;
    const username = sender.username || sender.slug || 'Usuario';
    const userColor = sender.identity?.color || '#53fc18'; // Color personalizado o Verde Kick por defecto
    let content = data.content || '';

    // Sanear texto HTML contra inyecciones
    content = sanitizeHTML(content);

    // Parseo de Emoticonos: Reemplazar [emote:ID:NOMBRE] con la etiqueta <img> apuntando a la CDN de Kick
    content = content.replace(/\[emote:(\d+):([\w-]+)\]/g, (match, id, name) => {
      return `<img class="kick-emote chat-emote" src="https://files.kick.com/emotes/${id}/fullsize" title="${name}" alt="${name}">`;
    });

    // Creación dinámica de componentes HTML
    const card = document.createElement('div');
    card.className = `chat-msg-card message-card ${noBg ? 'no-box' : ''}`;
    card.style.borderLeft = `4px solid ${userColor}`;

    const header = document.createElement('div');
    header.className = 'user-header chat-msg-author-row';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '6px';
    header.style.marginBottom = '4px';

    // Parseo de Insignias (Badges) si existen
    if (sender.identity && sender.identity.badges && Array.isArray(sender.identity.badges)) {
      sender.identity.badges.forEach(badge => {
        const bType = (badge.type || '').toLowerCase();
        const badgeSpan = document.createElement('span');
        badgeSpan.className = 'chat-msg-badge badge';

        if (bType === 'broadcaster' || bType === 'streamer') {
          badgeSpan.className += ' badge-streamer';
          badgeSpan.textContent = 'STREAMER 👑';
          header.appendChild(badgeSpan);
        } else if (bType === 'moderator' || bType === 'mod') {
          badgeSpan.className += ' badge-mod';
          badgeSpan.textContent = 'MOD 🛡️';
          header.appendChild(badgeSpan);
        } else if (bType === 'subscriber' || bType === 'sub') {
          badgeSpan.className += ' badge-sub';
          badgeSpan.textContent = 'SUB ⭐';
          header.appendChild(badgeSpan);
        } else if (bType === 'vip') {
          badgeSpan.className += ' badge-vip';
          badgeSpan.textContent = 'VIP 💎';
          header.appendChild(badgeSpan);
        } else if (bType === 'founder') {
          badgeSpan.className += ' badge-founder';
          badgeSpan.textContent = 'FOUNDER 🚀';
          header.appendChild(badgeSpan);
        } else if (bType === 'og') {
          badgeSpan.className += ' badge-og';
          badgeSpan.textContent = 'OG 🔥';
          header.appendChild(badgeSpan);
        }
      });
    }

    const userSpan = document.createElement('span');
    userSpan.className = 'username chat-msg-user';
    userSpan.style.color = userColor;
    userSpan.style.fontWeight = '700';
    userSpan.style.fontSize = '14px';
    userSpan.textContent = username;

    header.appendChild(userSpan);

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text chat-msg-text';
    textDiv.innerHTML = content;

    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'chat-msg-body';
    bodyDiv.appendChild(header);
    bodyDiv.appendChild(textDiv);

    card.appendChild(bodyDiv);

    container.appendChild(card);

    // Limitar cantidad de mensajes en pantalla (Máximo 10) para evitar sobrecarga del render de OBS
    while (container.children.length > 10) {
      container.removeChild(container.firstChild);
    }

    // Desplazamiento automático hacia abajo
    container.scrollTop = container.scrollHeight;
  }

  function showError(msg) {
    const errCard = document.createElement('div');
    errCard.className = 'chat-msg-card message-card error-card';
    errCard.style.borderLeft = '4px solid #f87171';
    errCard.style.background = 'rgba(220, 38, 38, 0.85)';
    errCard.innerHTML = `<div class="message-text chat-msg-text" style="color: #ffffff;"><strong>Kick Widget Error:</strong> ${sanitizeHTML(msg)}</div>`;
    container.appendChild(errCard);
  }

  function cleanKickUsername(input) {
    if (!input) return '';
    let str = String(input).trim().replace(/\/+$/, '');
    const popoutMatch = str.match(/kick\.com\/popout\/([^\/]+)/i);
    if (popoutMatch && popoutMatch[1]) return popoutMatch[1].toLowerCase();
    const channelMatch = str.match(/kick\.com\/([^\/]+)/i);
    if (channelMatch && channelMatch[1] && channelMatch[1] !== 'popout') return channelMatch[1].toLowerCase();
    return str.replace(/^@/, '').split('/')[0].toLowerCase();
  }
}

