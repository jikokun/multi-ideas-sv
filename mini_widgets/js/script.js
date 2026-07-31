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
  const channelEl = document.getElementById('kick-channel-name');
  const avatarEl = document.getElementById('kick-avatar-img');
  const followersEl = document.getElementById('kick-followers-count');
  const viewersEl = document.getElementById('kick-viewers-count');
  const liveBadgeEl = document.getElementById('kick-live-badge');

  if (!channelEl && !viewersEl) return;

  const urlParams = new URLSearchParams(window.location.search);
  const channel = urlParams.get('channel') || urlParams.get('canal') || 'jikokun';

  if (channelEl) channelEl.textContent = `@${channel}`;

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
            if (liveBadgeEl) liveBadgeEl.style.display = 'flex';
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
