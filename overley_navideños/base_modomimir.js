/* Funcionalidad conservada de laboratorio/modomimir_integrado.html.
 * Los efectos navideños sustituyen únicamente las partículas y rayos originales. */

/* ==========================================================================
   OVERLAY: JIKOKUN - SCRIPT DE ANIMACIÓN (ESCENARIO 1920x1080 + PARTÍCULAS + RAYOS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initAutoScaling();
  initFrameBorders();
  initCountdownTimer(5 * 60); // 5 minutos por defecto
  initKickChat();
  initSpotifyWidget();
  initMimirClock();
  initMimirLetterAnimation();
});

/* ==========================================================================
   0. AUTO-ESCALADO PROPORCIONAL DEL ESCENARIO 1920x1080 (RELACIÓN 16:9)
   ========================================================================== */
function initAutoScaling() {
  const stage = document.getElementById('overlay-stage');
  if (!stage) return;

  function resizeStage() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const scaleX = windowWidth / 1920;
    const scaleY = windowHeight / 1080;
    const scale = Math.min(scaleX, scaleY);

    stage.style.transform = `scale(${scale})`;
  }

  window.addEventListener('resize', resizeStage);
  resizeStage();
}

/* ==========================================================================
   0.5. INYECCIÓN DE CORRIENTE NEÓN SVG EN EL CONTORNO (STROKE) DE MARCOS
   ========================================================================== */
function initFrameBorders() {
  const frames = document.querySelectorAll('.chatmode-frame, .cam-frame');
  frames.forEach(frame => {
    if (frame.querySelector('.frame-border-svg')) return;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "frame-border-svg");
    svg.setAttribute("viewBox", "0 0 1000 1000");
    svg.setAttribute("preserveAspectRatio", "none");

    const basePolygon = document.createElementNS(svgNS, "polygon");
    basePolygon.setAttribute("points", "30,0 1000,0 1000,970 970,1000 0,1000 0,30");
    basePolygon.setAttribute("class", "svg-border-base");

    const streamPolygon = document.createElementNS(svgNS, "polygon");
    streamPolygon.setAttribute("points", "30,0 1000,0 1000,970 970,1000 0,1000 0,30");
    streamPolygon.setAttribute("class", "svg-border-stream");

    svg.appendChild(basePolygon);
    svg.appendChild(streamPolygon);
    frame.appendChild(svg);
  });
}

/* ==========================================================================
   1. CANVAS DE FONDO NATIVO 1920x1080
   ========================================================================== */
function initBackgroundCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const width = canvas.width = 1920;
  const height = canvas.height = 1080;
  let particles = [];
  const particleCount = 80;

  // Clase Partícula
  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.radius = Math.random() * 3 + 0.8;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = -Math.random() * 0.9 - 0.3; // Ascenso suave
      this.alpha = Math.random() * 0.7 + 0.2;
      this.maxAlpha = this.alpha;
      this.color = Math.random() > 0.4 ? '#00f5d4' : '#00e5ff';
      this.pulseSpeed = Math.random() * 0.02 + 0.005;
    }

    update(frameScale = 1) {
      this.x += (this.vx + Math.sin(this.y * 0.01) * 0.2) * frameScale;
      this.y += this.vy * frameScale;

      this.alpha += Math.sin(Date.now() * this.pulseSpeed) * 0.05 * frameScale;
      if (this.alpha < 0.1) this.alpha = 0.1;
      if (this.alpha > this.maxAlpha) this.alpha = this.maxAlpha;

      if (this.y < -10 || this.x < -10 || this.x > width + 10) {
        this.y = height + 10;
        this.x = Math.random() * width;
      }
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < 130 * 130) {
          const dist = Math.sqrt(distanceSquared);
          ctx.save();
          ctx.globalAlpha = (1 - dist / 130) * 0.22;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = '#00f5d4';
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  const targetFrameMs = 1000 / 30;
  let lastFrameTime = 0;
  let animationFrameId = null;

  function scheduleFrame() {
    if (!document.hidden && animationFrameId === null) {
      animationFrameId = requestAnimationFrame(animate);
    }
  }

  function animate(now) {
    animationFrameId = null;
    if (document.hidden) return;
    if (lastFrameTime && now - lastFrameTime < targetFrameMs - 1) {
      scheduleFrame();
      return;
    }
    const frameScale = lastFrameTime ? Math.min((now - lastFrameTime) / (1000 / 60), 3) : 2;
    lastFrameTime = now;
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.update(frameScale);
      p.draw();
    });

    drawConnections();
    scheduleFrame();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
      lastFrameTime = 0;
    } else {
      lastFrameTime = 0;
      scheduleFrame();
    }
  });
  scheduleFrame();
}

/* ==========================================================================
   2. MOTOR DE RAYOS Y CHISPAS EN CANVAS NATIVO 1920x1080
   ========================================================================== */
function initElectricCanvas() {
  const canvas = document.getElementById('electric-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const width = canvas.width = 1920;
  const height = canvas.height = 1080;
  let bolts = [];
  let sparks = [];

  function getTitleBounds() {
    const title = document.querySelector('.brush-title');
    if (!title) return null;
    const stage = document.getElementById('overlay-stage');
    const titleRect = title.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();

    // Convertir coordenadas del título a la escala nativa 1920x1080
    const scale = stageRect.width / 1920 || 1;
    return {
      left: (titleRect.left - stageRect.left) / scale,
      top: (titleRect.top - stageRect.top) / scale,
      width: titleRect.width / scale,
      height: titleRect.height / scale,
      right: (titleRect.right - stageRect.left) / scale,
      bottom: (titleRect.bottom - stageRect.top) / scale
    };
  }

  function createLightningPath(x1, y1, x2, y2, displacement) {
    if (displacement < 4) {
      return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    }

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    const normalX = -(y2 - y1);
    const normalY = x2 - x1;
    const len = Math.sqrt(normalX * normalX + normalY * normalY);

    const offsetX = (Math.random() - 0.5) * displacement * (normalX / (len || 1));
    const offsetY = (Math.random() - 0.5) * displacement * (normalY / (len || 1));

    const path1 = createLightningPath(x1, y1, midX + offsetX, midY + offsetY, displacement / 2);
    const path2 = createLightningPath(midX + offsetX, midY + offsetY, x2, y2, displacement / 2);

    return path1.concat(path2.slice(1));
  }

  class LightningBolt {
    constructor(x1, y1, x2, y2) {
      this.x1 = x1;
      this.y1 = y1;
      this.x2 = x2;
      this.y2 = y2;
      this.path = createLightningPath(x1, y1, x2, y2, 45);
      this.life = 1.0;
      this.decay = Math.random() * 0.15 + 0.1;
      this.width = Math.random() * 2 + 1.5;
    }

    draw() {
      if (this.life <= 0) return;

      ctx.save();
      ctx.globalAlpha = this.life;
      ctx.beginPath();
      ctx.moveTo(this.path[0].x, this.path[0].y);

      for (let i = 1; i < this.path.length; i++) {
        ctx.lineTo(this.path[i].x, this.path[i].y);
      }

      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = this.width + 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00f5d4';
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = this.width;
      ctx.shadowBlur = 3;
      ctx.shadowColor = '#ffffff';
      ctx.stroke();

      ctx.restore();
    }

    update(frameScale = 1) {
      this.life -= this.decay * frameScale;
    }
  }

  class ElectricSpark {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.life = 1.0;
      this.decay = Math.random() * 0.08 + 0.04;
      this.size = Math.random() * 3 + 1;
    }

    update(frameScale = 1) {
      this.x += this.vx * frameScale;
      this.y += this.vy * frameScale;
      this.life -= this.decay * frameScale;
    }

    draw() {
      if (this.life <= 0) return;
      ctx.save();
      ctx.globalAlpha = this.life;
      ctx.fillStyle = '#00f5d4';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f5d4';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function spawnBoxLightning() {
    const bounds = getTitleBounds();
    if (!bounds) return;

    const sides = ['top', 'bottom', 'left', 'right'];
    const side = sides[Math.floor(Math.random() * sides.length)];

    let p1 = { x: 0, y: 0 }, p2 = { x: 0, y: 0 };
    const offset = 10;

    if (side === 'top') {
      p1.x = bounds.left + Math.random() * bounds.width * 0.5;
      p1.y = bounds.top - offset;
      p2.x = p1.x + Math.random() * 180 + 40;
      p2.y = bounds.top - offset;
    } else if (side === 'bottom') {
      p1.x = bounds.left + Math.random() * bounds.width * 0.5;
      p1.y = bounds.bottom + offset;
      p2.x = p1.x + Math.random() * 180 + 40;
      p2.y = bounds.bottom + offset;
    } else if (side === 'left') {
      p1.x = bounds.left - offset;
      p1.y = bounds.top + Math.random() * bounds.height * 0.5;
      p2.x = bounds.left - offset;
      p2.y = p1.y + Math.random() * 100 + 30;
    } else {
      p1.x = bounds.right + offset;
      p1.y = bounds.top + Math.random() * bounds.height * 0.5;
      p2.x = bounds.right + offset;
      p2.y = p1.y + Math.random() * 100 + 30;
    }

    bolts.push(new LightningBolt(p1.x, p1.y, p2.x, p2.y));

    for (let i = 0; i < 6; i++) {
      sparks.push(new ElectricSpark((p1.x + p2.x) / 2, (p1.y + p2.y) / 2));
    }
  }

  function spawnCornerLightning() {
    if (Math.random() > 0.4) return;
    const p1 = { x: width * 0.7, y: 30 };
    const p2 = { x: width * 0.95, y: 150 };
    bolts.push(new LightningBolt(p1.x, p1.y, p2.x, p2.y));

    const p3 = { x: width * 0.05, y: height - 150 };
    const p4 = { x: width * 0.3, y: height - 30 };
    bolts.push(new LightningBolt(p3.x, p3.y, p4.x, p4.y));
  }

  const targetFrameMs = 1000 / 30;
  let lastFrameTime = 0;
  let animationFrameId = null;
  let boxFrameProgress = 0;
  let cornerFrameProgress = 0;

  function scheduleElectricFrame() {
    if (!document.hidden && animationFrameId === null) {
      animationFrameId = requestAnimationFrame(animateElectric);
    }
  }

  function animateElectric(now) {
    animationFrameId = null;
    if (document.hidden) return;
    if (lastFrameTime && now - lastFrameTime < targetFrameMs - 1) {
      scheduleElectricFrame();
      return;
    }
    const frameScale = lastFrameTime ? Math.min((now - lastFrameTime) / (1000 / 60), 3) : 2;
    lastFrameTime = now;
    ctx.clearRect(0, 0, width, height);

    boxFrameProgress += frameScale;
    cornerFrameProgress += frameScale;
    while (boxFrameProgress >= 18) {
      boxFrameProgress -= 18;
      spawnBoxLightning();
    }
    while (cornerFrameProgress >= 45) {
      cornerFrameProgress -= 45;
      spawnCornerLightning();
    }
    if (Math.random() < 1 - Math.pow(1 - 0.08, frameScale)) spawnBoxLightning();

    for (let i = bolts.length - 1; i >= 0; i--) {
      bolts[i].update(frameScale);
      bolts[i].draw();
      if (bolts[i].life <= 0) {
        bolts.splice(i, 1);
      }
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      sparks[i].update(frameScale);
      sparks[i].draw();
      if (sparks[i].life <= 0) {
        sparks.splice(i, 1);
      }
    }

    scheduleElectricFrame();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
      lastFrameTime = 0;
    } else {
      lastFrameTime = 0;
      scheduleElectricFrame();
    }
  });
  scheduleElectricFrame();
}

/* ==========================================================================
   3. CONTADOR REGRESIVO Y BARRA DE PROGRESO
   ========================================================================== */
function initCountdownTimer(totalSeconds) {
  let secondsRemaining = totalSeconds;
  const timerDisplay = document.getElementById('timer');
  const progressFill = document.getElementById('progress-fill');

  function updateTimer() {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;

    const formattedMins = String(mins).padStart(2, '0');
    const formattedSecs = String(secs).padStart(2, '0');

    if (timerDisplay) {
      timerDisplay.textContent = `${formattedMins}:${formattedSecs}`;
    }

    if (progressFill) {
      const percentage = ((totalSeconds - secondsRemaining) / totalSeconds) * 100;
      progressFill.style.width = `${percentage}%`;
    }

    if (secondsRemaining > 0) {
      secondsRemaining--;
    } else {
      if (timerDisplay) timerDisplay.textContent = "00:00";
      if (progressFill) progressFill.style.width = "100%";
      clearInterval(interval);
    }
  }

  updateTimer();
  const interval = setInterval(updateTimer, 1000);
}

/* ==========================================================================
   4. CONECTOR DE KICK CHAT EN VIVO (STREAMER.BOT WEBSOCKET PORT 4445)
   ========================================================================== */
function initKickChat() {
  const chatContainer = document.getElementById('chat-container');
  if (!chatContainer) return;

  const params = new URLSearchParams(location.search);
  const SERVER_IP = params.get('ip') || '127.0.0.1';
  const SERVER_PORT = params.get('port') || '4445';
  const channel = (params.get('channel') || 'jikokun').toLowerCase();
  const filterCommands = params.get('filterCommands') !== 'false';
  const botsIgnorados = ['botrix', 'kickbot', 'nightbot', 'lobito_mensajero', 'jikobot'];
  const avatarCache = new Map();
  function safeAvatar(value) {
    if (typeof value !== 'string') return '';
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
  }
  function avatarFrom(obj) {
    if (!obj || typeof obj !== 'object') return '';
    return [obj.avatar, obj.avatarUrl, obj.avatar_url, obj.profilePicture, obj.profilePictureUrl,
      obj.profileImageUrl, obj.profile_image, obj.profile_pic, obj.profilepic, obj.profile_picture].map(safeAvatar).find(Boolean) || '';
  }
  function applyAvatar(element, url) {
    if (!url) return;
    const image = new Image(); image.alt = ''; image.decoding = 'async';
    image.onload = () => element.replaceChildren(image);
    image.src = url;
  }
  function loadAvatar(element, username, supplied) {
    if (supplied) { avatarCache.set(username, Promise.resolve(supplied)); applyAvatar(element, supplied); return; }
    if (!avatarCache.has(username)) {
      // Read the avatar saved by the existing stream integration, without modifying users.
      const key = username.replace(/[.#$\[\]\/]/g, '_');
      const request = fetch(`https://sensunshopweb-default-rtdb.firebaseio.com/stream/usuarios/${encodeURIComponent(key)}/avatar.json`, {
        signal: AbortSignal.timeout(5000)
      }).then(r => r.ok ? r.json() : '').then(safeAvatar).catch(() => '');
      if (avatarCache.size >= 200) avatarCache.delete(avatarCache.keys().next().value);
      avatarCache.set(username, request);
    }
    avatarCache.get(username).then(url => applyAvatar(element, url));
  }
  function appendMessage(element) {
    const previous = [...chatContainer.children].map(node => [node, node.getBoundingClientRect().top]);
    chatContainer.appendChild(element);
    const style = getComputedStyle(chatContainer);
    const available = chatContainer.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const contentHeight = () => [...chatContainer.children].reduce((sum, node) => sum + node.offsetHeight, 0) + Math.max(0, chatContainer.children.length - 1) * parseFloat(style.rowGap);
    while (chatContainer.children.length > 30 || (chatContainer.children.length > 1 && contentHeight() > available)) {
      chatContainer.firstElementChild.remove();
    }
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      previous.forEach(([node, top]) => {
        if (!node.isConnected) return;
        const scale = chatContainer.getBoundingClientRect().height / chatContainer.offsetHeight || 1;
        const offset = (top - node.getBoundingClientRect().top) / scale;
        if (offset) node.animate([{ translate:`0 ${offset}px` }, { translate:'0 0' }], { duration:420, easing:'cubic-bezier(.22,1,.36,1)' });
      });
    }
  }

  function conectarConStreamerBot() {
    console.log(`[Jikokun Chat] Intentando conectar a Streamer.bot WebSocket (ws://${SERVER_IP}:${SERVER_PORT})...`);
    
    let ws;
    try {
      ws = new WebSocket(`ws://${SERVER_IP}:${SERVER_PORT}/`);
    } catch (e) {
      console.warn("[Jikokun Chat] No se pudo abrir WebSocket a Streamer.bot. Reintentando en 5s...", e);
      setTimeout(conectarConStreamerBot, 5000);
      return;
    }

    ws.onopen = () => {
      console.log("✅ ¡Conexión local a Streamer.bot establecida con éxito!");
      const payloadSuscripcion = {
        "request": "Subscribe",
        "id": "jikokun-glass-chat",
        "events": {
          "Kick": [
            "ChatMessage",
            "Message",
            "Follow"
          ]
        }
      };
      ws.send(JSON.stringify(payloadSuscripcion));
    };

    ws.onmessage = (event) => {
      try {
        const rawPayload = JSON.parse(event.data);
        const payload = rawPayload.data || rawPayload;

        const eventObj = rawPayload.event || payload.event || {};
        const eventName = (
          (typeof eventObj === 'object' ? (eventObj.type || eventObj.name || '') : eventObj) ||
          rawPayload.type || rawPayload.eventType || rawPayload.name ||
          payload.type || payload.eventType || payload.name || ''
        ).toString().toLowerCase();

        const payloadText = JSON.stringify(payload).toLowerCase();
        const isFollowEvent = eventName.includes('follow') || eventName.includes('follower') || payloadText.includes('followed');

        if (isFollowEvent && !payload.message && !payload.text && !payload.messageText) {
          showFollowAlert(payload);
          return;
        }

        if (payload.message || rawPayload.message || payload.text || payload.messageText || payload.content) {
          processMessage(payload);
          return;
        }
      } catch (error) {
        console.error("Fallo procesando mensaje de Streamer.bot:", error);
      }
    };

    ws.onerror = (err) => {
      console.warn("[Jikokun Chat] WebSocket Streamer.bot error o servidor no disponible.", err);
    };

    ws.onclose = () => {
      console.warn("[Jikokun Chat] Desconectado de Streamer.bot. Reintentando en 5 segundos...");
      setTimeout(conectarConStreamerBot, 5000);
    };
  }

  function processMessage(data) {
    if (!data) return;

    let messageObj = data.message || data;
    let userObj = data.user || data.sender || (typeof messageObj === 'object' ? (messageObj.user || messageObj.sender) : null) || {};

    let usernameRaw = "Usuario";
    if (typeof userObj === 'string') {
      usernameRaw = userObj;
    } else if (typeof userObj === 'object') {
      usernameRaw = userObj.username || userObj.name || userObj.displayName || userObj.user_name || data.user_name || data.username || data.userName || "Usuario";
    }
    const usernameLower = usernameRaw.trim().toLowerCase();

    if (botsIgnorados.includes(usernameLower) || userObj.is_bot || data.is_bot) return;

    let contentRaw = "";
    if (typeof data.messageText === 'string') {
      contentRaw = data.messageText;
    } else if (typeof messageObj === 'string') {
      contentRaw = messageObj;
    } else if (typeof messageObj === 'object' && messageObj !== null) {
      if (typeof messageObj.message === 'string') contentRaw = messageObj.message;
      else if (typeof messageObj.text === 'string') contentRaw = messageObj.text;
      else if (typeof messageObj.content === 'string') contentRaw = messageObj.content;
    }
    if (!contentRaw && typeof data.message === 'string') contentRaw = data.message;
    if (!contentRaw && typeof data.text === 'string') contentRaw = data.text;
    if (!contentRaw && typeof data.content === 'string') contentRaw = data.content;

    if (!contentRaw || typeof contentRaw !== 'string' || !contentRaw.trim()) return;
    if (filterCommands && /^[!\/]/.test(contentRaw.trim())) return;

    let safeContent = escapeHTML(contentRaw);

    // Renderizar Emotes de Kick [emote:id:nombre]
    safeContent = safeContent.replace(/\[emote:(\d+):([^\]]+)\]/g, function(match, emoteId, emoteName) {
      return `<img src="https://files.kick.com/emotes/${emoteId}/fullsize" alt="${emoteName}" class="kick-emote" style="height: 32px; width: auto; vertical-align: middle; margin: 0 2px;">`;
    });

    let userColor = userObj.color || data.color || "#00f5d4";
    if (!/^#[0-9a-f]{6}$/i.test(userColor)) userColor = generarColorElegante(usernameLower);
    if (userColor === '#000000' || userColor === '#FFFFFF') {
      userColor = generarColorElegante(usernameLower);
    }
    const userColorDim = userColor + '40';

    let badgesHtml = '';
    const isBroadcaster = (usernameLower === channel) || data.isBroadcaster || userObj.isBroadcaster || messageObj.isBroadcaster || data.isOwner || userObj.isOwner || false;
    const isModerator = data.isModerator || userObj.isModerator || messageObj.isModerator || data.isMod || userObj.isMod || false;
    const isSubscriber = data.isSubscriber || userObj.isSubscriber || messageObj.isSubscriber || data.isSub || userObj.isSub || false;
    const isVip = data.isVip || userObj.isVip || messageObj.isVip || data.vip || userObj.vip || false;
    const isOg = data.isOg || userObj.isOg || data.og || userObj.og || false;

    if (isBroadcaster) badgesHtml += '<span class="badge streamer">👑</span>';
    else if (isModerator) badgesHtml += '<span class="badge mod">🛡️</span>';
    else if (isVip) badgesHtml += '<span class="badge vip">💎</span>';
    if (isSubscriber && !isBroadcaster) badgesHtml += '<span class="badge sub">⭐</span>';
    if (isOg && !isBroadcaster) badgesHtml += '<span class="badge og">🔥</span>';

    const isMimir = !!chatContainer.closest('.mimir-chat-card');
    const isMe = isBroadcaster || data.isMe || (data.sender === 'me');
    const senderClass = isMe ? 'me' : 'them';
    const avatarInitial = Array.from(usernameRaw.trim())[0] || '?';

    const msgElement = document.createElement('div');
    msgElement.style.setProperty('--user-color', userColor);
    msgElement.style.setProperty('--user-color-dim', userColorDim);

    if (isMimir) {
      // Exclusivo para Modo Mimir: Chat tipo Nube 3D Flotante con Partículas
      msgElement.className = `message-row glass-message ${senderClass}`;
      msgElement.innerHTML = `
        <div class="avatar ${senderClass}">
          <span>${escapeHTML(avatarInitial)}</span>
        </div>
        <div class="cloud-bubble">
          <div class="cloud-puff p1"></div>
          <div class="cloud-puff p2"></div>
          <div class="cloud-puff p3"></div>
          <div class="cloud-puff p4"></div>
          <div class="cloud-puff p5"></div>
          <div class="cloud-shine"></div>
          <div class="cloud-body">
            <div class="message-header" style="display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
              <span class="badges" style="display: flex; align-items: center; gap: 2px;">${badgesHtml}</span>
              <span class="username" style="font-weight: 800; color: var(--user-color, #041c34);">${escapeHTML(usernameRaw)}</span>
            </div>
            <div class="content" style="word-break: break-word;">${safeContent}</div>
          </div>
          <div class="cloud-shadow"></div>
        </div>
      `;
      appendMessage(msgElement);

      loadAvatar(msgElement.querySelector('.avatar'), usernameLower, avatarFrom(userObj) || avatarFrom(messageObj) || avatarFrom(data));
    } else {
      // Estándar para Modo Chat y demás escenas: Cristal Líquido Aqua Neón original
      msgElement.className = 'glass-message';
      msgElement.innerHTML = `
        <div class="message-header" style="display: flex; align-items: center; margin-bottom: 4px;">
          <span class="badges" style="display: flex; align-items: center;">${badgesHtml}</span>
          <span class="username" style="font-weight: bold; color: var(--user-color); margin-left: 2px;">${escapeHTML(usernameRaw)}</span>
        </div>
        <div class="content" style="word-break: break-word; color: #f0ffff;">${safeContent}</div>
      `;
      appendMessage(msgElement);
    }

    setTimeout(() => {
      msgElement.classList.add('evaporating');
      setTimeout(() => {
        if (msgElement.parentNode) msgElement.parentNode.removeChild(msgElement);
      }, 700);
    }, 30000);
  }

  function showFollowAlert(data) {
    const username = data.user?.username || data.user?.name || data.user?.displayName || data.username || data.name || data.displayName || data.user_name || data.userName || 'Nuevo seguidor';
    const msgElement = document.createElement('div');
    msgElement.className = 'glass-message follow-alert';
    msgElement.innerHTML = `
      <div class="message-header" style="display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
        <span class="username" style="font-weight: 800; color: #ffd700; font-size: 15px; text-shadow: 0 0 12px rgba(255, 215, 0, 0.95);">${escapeHTML(username)}</span>
      </div>
      <div class="content" style="word-break: break-word; color: #fff8d2; text-align: center; font-weight: 700;">¡Gracias por seguir el canal! ✨</div>
    `;
    appendMessage(msgElement);

    setTimeout(() => {
      msgElement.classList.add('evaporating');
      setTimeout(() => {
        if (msgElement.parentNode) msgElement.parentNode.removeChild(msgElement);
      }, 700);
    }, 8000);
  }

  function generarColorElegante(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const colores = ['#FF5E7E', '#00f5d4', '#FFD166', '#00e5ff', '#B185DB', '#FF9F1C'];
    return colores[Math.abs(hash) % colores.length];
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
  }

  // Ayudante Global para Simular Mensajes de Prueba en Consola o Atajo Tecla
  let simCount = 0;
  window.simularMensajeKick = (texto, usuario) => {
    simCount++;
    const senders = [
      { name: "Luna", emoji: "🌙", isMe: false, text: "¡Hola! ¿Cómo estás hoy? ☁️" },
      { name: "Jikokun", emoji: "👑", isMe: true, text: "¡Hola chat! Las nubes flotan genial 🌤️" },
      { name: "Sol", emoji: "☀️", isMe: false, text: "Cada mensaje aparece como magia suave ✨" },
      { name: "Estrella", emoji: "⭐", isMe: false, text: "¡Me encanta el nuevo chat de nubes neón! ☁️" }
    ];
    const item = senders[simCount % senders.length];
    processMessage({
      user: { username: usuario || item.name, isSubscriber: true, color: item.isMe ? "#00e5ff" : "#FF5E7E" },
      messageText: texto || item.text,
      isMe: item.isMe,
      emoji: item.emoji,
      isBroadcaster: item.isMe
    });
  };

  // Atajo de teclado: presionar Ctrl + Shift + C inserta un mensaje de prueba
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
      window.simularMensajeKick();
    }
  });

  conectarConStreamerBot();
}

/* ==========================================================================
   5. WIDGET DE SPOTIFY DYNAMIC ISLAND (API PLAYER + VIBRANT.JS)
   ========================================================================== */
function initSpotifyWidget() {
  const wrapper = document.getElementById('spotify-wrapper');
  const urlParams = new URLSearchParams(window.location.search);
  const usuario = urlParams.get('user') || localStorage.getItem('spotify_user') || 'jikokun2';
  let access_token = urlParams.get('token') || localStorage.getItem('spotify_access_token') || '';
  const refresh_token = urlParams.get('refresh') || localStorage.getItem('spotify_refresh_token') || '';

  // Sincronización en vivo con Login de Spotify (BroadcastChannel)
  try {
    const spotifyBc = new BroadcastChannel("spotify_auth_channel");
    spotifyBc.onmessage = (e) => {
      if (e.data && e.data.access_token) {
        access_token = e.data.access_token;
        localStorage.setItem("spotify_access_token", access_token);
        checkSpotifyPlayer();
      }
    };
  } catch (e) {}

  let lastSongId = "";
  let isWidgetVisible = false;
  let pauseTimeout = null;
  let islandShrinkTimeout = null;
  let currentTrackId = null;

  function handlePause() {
    window.NavidadMusic?.pause();
    // Restablecer al giro neón blanco tradicional a tiempo estándar constante
    document.documentElement.style.setProperty('--dynamic-color', '#ffffff');
    document.documentElement.style.setProperty('--dynamic-rgb', '255, 255, 255');
    document.documentElement.style.setProperty('--stream-speed', '6.0s');
    document.documentElement.style.setProperty('--beat-duration', '1.5s');
    document.documentElement.style.setProperty('--spectral-easing', 'linear');
    document.documentElement.style.setProperty('--screen-stream-width', '1.5px');
    document.documentElement.style.setProperty('--screen-stream-opacity', '0.45');
    document.documentElement.classList.remove('music-playing');
    document.documentElement.classList.add('music-paused');
    currentTrackId = null;

    if (wrapper && !pauseTimeout && isWidgetVisible) {
      pauseTimeout = setTimeout(() => {
        wrapper.classList.add('hidden');
        isWidgetVisible = false;
      }, 10000);
    }

    // En escena_inicial.html: Ocultar el reproductor y mostrar el placeholder de música en reposo
    const initialPlayer = document.getElementById('initial-spotify-player');
    const initialIdle = document.getElementById('initial-music-idle');
    if (initialPlayer) initialPlayer.classList.add('hidden');
    if (initialIdle) initialIdle.classList.remove('hidden');
  }

  function handlePlay(data) {
    window.NavidadMusic?.update(data);
    document.documentElement.classList.remove('music-paused');
    document.documentElement.classList.add('music-playing');
    document.documentElement.style.setProperty('--screen-stream-width', '4.5px');
    document.documentElement.style.setProperty('--screen-stream-opacity', '1.0');

    if (pauseTimeout) {
      clearTimeout(pauseTimeout);
      pauseTimeout = null;
    }
    if (wrapper && !isWidgetVisible) {
      wrapper.classList.remove('hidden');
      isWidgetVisible = true;
    }

    // En escena_inicial.html: Mostrar el reproductor de música y ocultar el placeholder
    const initialPlayer = document.getElementById('initial-spotify-player');
    const initialIdle = document.getElementById('initial-music-idle');
    if (initialPlayer) initialPlayer.classList.remove('hidden');
    if (initialIdle) initialIdle.classList.add('hidden');

    // Al reanudar reproducción, reactivar el color y ritmo dinámico de la música activa
    if (data && data.item && currentTrackId !== data.item.id) {
      currentTrackId = data.item.id;
      const songName = data.item.name || "";
      const artistName = (data.item.artists && data.item.artists[0]) ? data.item.artists[0].name : "";
      const albumCoverUrl = (data.item.album && data.item.album.images) ? data.item.album.images[0].url : "";
      if (albumCoverUrl) applyDynamicColors(albumCoverUrl);
      syncTrackRhythm(data.item.id, songName, artistName);
    }
  }

  async function syncTrackRhythm(songId, songName = "", artistName = "") {
    let bpm = 120;
    let apiSuccess = false;

    // 1. Intentar consultar Spotify API Audio Features
    if (songId) {
      try {
        const res = await fetch(`https://api.spotify.com/v1/audio-features/${songId}`, {
          headers: { 'Authorization': `Bearer ${access_token}` }
        });
        if (res.status === 200) {
          const features = await res.json();
          if (features && features.tempo && features.tempo > 0) {
            bpm = Math.round(features.tempo);
            window.NavidadMusic?.rhythm(features.tempo, features.energy, songId);
            apiSuccess = true;
          }
        }
      } catch (e) {
        console.warn("[Jikokun Spotify] Estimando BPM por firmas acústicas...", e);
      }
    }

    // 2. Si la API de Spotify devuelve 403/no-200 o sin tempo, estimar el BPM real por firmas y keywords del tema
    if (!apiSuccess && (songName || artistName)) {
      bpm = estimarBPMAcustico(songName, artistName);
    }

    // 3. Aplicar velocidad y pulsación basadas en el BPM REAL
    const beatSeconds = 60 / bpm;
    let beatMultiplier = 3.5;
    let pulseMultiplier = 1.0;

    if (bpm >= 155) {
      // Metal, Power Metal, DnB, Hardstyle (155+ BPM): Ráfaga ultra-rápida y doble bombo
      beatMultiplier = 1.8;
      pulseMultiplier = 0.5;
    } else if (bpm >= 125) {
      // Rock, EDM, Fast Dance (125 - 154 BPM): Rápido energético
      beatMultiplier = 2.4;
      pulseMultiplier = 1.0;
    } else if (bpm >= 95) {
      // Pop, Hip-Hop (95 - 124 BPM): Ritmo medio
      beatMultiplier = 3.4;
      pulseMultiplier = 1.0;
    } else {
      // Baladas Lentas, Lo-Fi, Acústicos (< 95 BPM): Flujo suave y pausado
      beatMultiplier = 4.8;
      pulseMultiplier = 1.0;
    }

    const streamSpeed = (beatSeconds * beatMultiplier).toFixed(3);
    const beatDuration = (beatSeconds * pulseMultiplier).toFixed(3);

    document.documentElement.style.setProperty('--stream-speed', `${streamSpeed}s`);
    document.documentElement.style.setProperty('--beat-duration', `${beatDuration}s`);

    const bpmEl = document.getElementById('spotify-bpm');
    if (bpmEl) bpmEl.textContent = `${bpm} BPM`;

    const initialBpmEl = document.getElementById('initial-spotify-bpm');
    if (initialBpmEl) initialBpmEl.textContent = `${bpm} BPM`;

    console.log(`[Jikokun Spotify] 🎵 Canción: "${songName}" | BPM Real Detectado: ${bpm} | Velocidad Contorno: ${streamSpeed}s`);
  }

  function estimarBPMAcustico(songName, artistName) {
    const text = `${songName} ${artistName}`.toLowerCase();

    // Baladas Lentas, Lo-Fi, Acústicos (65 - 85 BPM)
    if (/(ballad|balada|slow|lenta|acoustic|acustico|chill|lofi|lo-fi|piano|sad|triste|love|soft|unplugged|quiet|sleep|ambient|night)/i.test(text)) {
      return 74;
    }
    // Rock Rápido, Power Metal, Speed Metal, DnB, Hardcore (155 - 195 BPM)
    if (/(metal|power|speed|thrash|dnb|drum|hard|fast|rapido|solo|heavy|rock|electro|edm|remix|dance|punk|fire|lightning|storm)/i.test(text)) {
      return 172;
    }
    // Estimación Hash Determinista realista entre 82 y 145 BPM
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
    return 82 + (Math.abs(hash) % 65);
  }

  function triggerIslandAnimation() {
    const island = document.getElementById('spotify-island');
    if (!island) return;
    island.classList.remove('closed');
    island.classList.add('expanding');
    setTimeout(() => island.classList.remove('expanding'), 650);

    if (islandShrinkTimeout) clearTimeout(islandShrinkTimeout);
    islandShrinkTimeout = setTimeout(() => {
      island.classList.add('closed');
    }, 8000);
  }

  function applyDynamicColors(imageUrl) {
    if (typeof Vibrant === 'undefined') return;
    Vibrant.from(imageUrl).getPalette().then(palette => {
      let colorHex = palette.Vibrant ? palette.Vibrant.getHex() : '#00f5d4';
      document.documentElement.style.setProperty('--dynamic-color', colorHex);

      let r = parseInt(colorHex.slice(1, 3), 16),
          g = parseInt(colorHex.slice(3, 5), 16),
          b = parseInt(colorHex.slice(5, 7), 16);
      document.documentElement.style.setProperty('--dynamic-rgb', `${r}, ${g}, ${b}`);
    }).catch(() => {
      document.documentElement.style.setProperty('--dynamic-color', '#00f5d4');
      document.documentElement.style.setProperty('--dynamic-rgb', '0, 245, 212');
    });
  }

  async function checkSpotifyPlayer() {
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing?additional_types=episode', {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });

      if (res.status === 401) {
        await refreshSpotifyToken();
        return;
      }

      if (res.status === 204) {
        handlePause();
        return;
      }

      if (res.status === 200) {
        const data = await res.json();
        if (!data.is_playing) {
          handlePause();
        } else {
          handlePlay(data);
          if (data.item && data.item.id !== lastSongId) {
            lastSongId = data.item.id;
            const songName = data.item.name || "Desconocido";
            const artistName = (data.item.artists && data.item.artists[0]) ? data.item.artists[0].name : "Artista";
            const albumCoverUrl = (data.item.album && data.item.album.images) ? data.item.album.images[0].url : "";

            const songEl = document.getElementById('spotify-song-name');
            const artistEl = document.getElementById('spotify-artist-name');
            const coverEl = document.getElementById('albumCover');

            const initialSongEl = document.getElementById('initial-song-name');
            const initialArtistEl = document.getElementById('initial-artist-name');
            const initialCoverEl = document.getElementById('initialAlbumCover');

            if (songEl) songEl.textContent = songName;
            if (artistEl) artistEl.textContent = artistName;
            if (coverEl && albumCoverUrl) coverEl.src = albumCoverUrl;

            if (initialSongEl) initialSongEl.textContent = songName;
            if (initialArtistEl) initialArtistEl.textContent = artistName;
            if (initialCoverEl && albumCoverUrl) initialCoverEl.src = albumCoverUrl;

            if (albumCoverUrl) applyDynamicColors(albumCoverUrl);
            syncTrackRhythm(data.item.id, songName, artistName);
            triggerIslandAnimation();
          }
        }
      }
    } catch (e) {
      console.error("Error consultando API Spotify:", e);
    }
  }

  let isRefreshing = false;
  async function refreshSpotifyToken() {
    if (isRefreshing) return false;
    isRefreshing = true;
    try {
      const res = await fetch(`https://sensunshopweb.web.app/spotify/refresh_token?user=${encodeURIComponent(usuario)}`, { cache: 'no-store' });
      if (res.ok) {
        const newToken = (await res.text()).trim();
        if (newToken && !newToken.includes("<") && newToken.length > 20) {
          access_token = newToken;
          localStorage.setItem("spotify_access_token", newToken);
          checkSpotifyPlayer();
          isRefreshing = false;
          return true;
        }
      }
    } catch (error) {
      console.error("[Modo Mimir] Error renovando token de Spotify:", error);
    } finally {
      isRefreshing = false;
    }
    return false;
  }

  checkSpotifyPlayer();
  setInterval(() => {
    if (!document.hidden) checkSpotifyPlayer();
  }, 3000);
}

/* ==========================================================================
   6. RELOJ EN TIEMPO REAL DE EL SALVADOR (MODO MIMIR)
   ========================================================================== */
function initMimirClock() {
  const time = document.getElementById('mimir-clock-time');
  const period = document.getElementById('mimir-clock-period');
  if (!time || !period) return;
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone:'America/El_Salvador', hour:'2-digit', minute:'2-digit', hour12:true });
  function update() {
    const parts = formatter.formatToParts(new Date());
    const part = type => parts.find(p => p.type === type)?.value || '';
    time.textContent = `${part('hour')}:${part('minute')}`;
    period.textContent = part('dayPeriod');
  }
  update();
  setInterval(update, 1000);
}

/* ==========================================================================
   7. ANIMACIÓN LETRA POR LETRA PARA EL TÍTULO INFERIOR (MODO MIMIR)
   ========================================================================== */
function initMimirLetterAnimation() {
  const lines = document.querySelectorAll('.mimir-line');
  lines.forEach(line => {
    const text = line.textContent.trim();
    if (!text) return;
    line.textContent = '';
    [...text].forEach((char, index) => {
      const span = document.createElement('span');
      span.className = 'mimir-char';
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.animationDelay = `${index * 0.07}s`;
      line.appendChild(span);
    });
  });
}

/* ==========================================================================
   8. EFECTO MÁGICO DE CAÍDA DE ESTRELLAS FUGACES (SHOOTING STARS)
   ========================================================================== */
function initShootingStars() {
  const stage = document.getElementById('overlay-stage');
  if (!stage) return;

  // El efecto de caída de estrellas fugaces es exclusivo del Modo Mimir
  const isModoMimir = stage.querySelector('.mimir-chat-card, .mimir-clock-widget, .mimir-bottom-title-container');
  if (!isModoMimir) return;

  let container = document.getElementById('shooting-stars-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'shooting-stars-container';
    container.className = 'shooting-stars-container';
    const bgVideo = stage.querySelector('.bg-video');
    if (bgVideo && bgVideo.nextSibling) {
      stage.insertBefore(container, bgVideo.nextSibling);
    } else {
      stage.appendChild(container);
    }
  }

  function spawnStar() {
    if (!container) return;

    const star = document.createElement('div');
    star.className = 'shooting-star';

    const startX = 500 + Math.random() * 1200;
    const startY = Math.random() * 350;
    const duration = 1.2 + Math.random() * 1.3;
    const size = 1.8 + Math.random() * 1.6;

    star.style.left = `${startX}px`;
    star.style.top = `${startY}px`;
    star.style.animationDuration = `${duration}s`;
    star.style.height = `${size}px`;

    container.appendChild(star);

    setTimeout(() => {
      if (star.parentNode) star.parentNode.removeChild(star);
    }, duration * 1000 + 100);

    const nextDelay = 1800 + Math.random() * 2800;
    setTimeout(spawnStar, nextDelay);
  }

  setTimeout(spawnStar, 800);
}

