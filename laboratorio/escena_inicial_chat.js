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
      obj.profileImageUrl, obj.profile_image, obj.profile_image_url, obj.profile_pic, obj.profilepic, obj.profile_picture].map(safeAvatar).find(Boolean) || '';
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
      document.getElementById('chat-status').textContent = 'EN LÍNEA';
      document.getElementById('chat-panel').classList.add('connected');
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

        const isFollowEvent = eventName.includes('follow');

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
      document.getElementById('chat-status').textContent = 'CONECTANDO';
      document.getElementById('chat-panel').classList.remove('connected');
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

    const msgElement = document.createElement('div');
    msgElement.className = 'live-message';
    msgElement.style.setProperty('--user-color', userColor);
    const initial = Array.from(usernameRaw.trim())[0] || '?';
    msgElement.innerHTML = `
      <div class="avatar"><span>${escapeHTML(initial)}</span></div>
      <div class="message-text">
        <div class="message-header"><span class="username">${escapeHTML(usernameRaw)}</span><span class="badges">${badgesHtml}</span></div>
        <div class="content">${safeContent}</div>
      </div>`;
    appendMessage(msgElement);
    loadAvatar(msgElement.querySelector('.avatar'), usernameLower, avatarFrom(userObj) || avatarFrom(messageObj) || avatarFrom(data));

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
    msgElement.className = 'follow-alert';
    msgElement.innerHTML = `
      <div class="message-header">
        <span class="username">${escapeHTML(username)}</span>
      </div>
      <div class="content">¡Gracias por seguir el canal! ✨</div>
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
      { name:'Jikokun', isMe:true, text:'Ya casi empezamos. Bienvenidos a la manada!' },
      { name:'Luna', isMe:false, text:'Buenas! Lista para el directo de hoy.' },
      { name:'AquaViewer', isMe:false, text:'Se viene un buen stream [emote:37226:Hola]' },
      { name:'Estrella', isMe:false, text:'La rocola ya tiene ambiente. Vamos!'
      }
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
