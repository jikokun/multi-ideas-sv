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
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      previous.forEach(([node, top]) => {
        if (!node.isConnected) return;
        const scale = chatContainer.getBoundingClientRect().height / chatContainer.offsetHeight || 1;
        const offset = (top - node.getBoundingClientRect().top) / scale;
        if (offset) {
          const animation = node.animate([{ translate:`0 ${offset}px` }, { translate:'0 0' }], { duration:420, easing:'cubic-bezier(.22,1,.36,1)' });
          animation.finished.then(pruneInvisibleMessages, () => {});
        }
      });
    }
    pruneInvisibleMessages();
  }

  function pruneInvisibleMessages() {
    // Keep the partially visible oldest entry. Only discard entries fully above the viewport.
    while (chatContainer.children.length > 1) {
      const first = chatContainer.firstElementChild;
      if (first.getBoundingClientRect().bottom > chatContainer.getBoundingClientRect().top) break;
      first.remove();
    }
  }
  new ResizeObserver(pruneInvisibleMessages).observe(chatContainer);

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
          "Kick": ["*"]
        }
      };
      ws.send(JSON.stringify(payloadSuscripcion));
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

        const source = String(eventObj.source || rawPayload.source || payload.source || '').toLowerCase();
        if (source && source !== 'kick') return;
        // Dispatch by event metadata before reading text: subscription messages can include a message.
        if (processActivity(eventName, payload, rawPayload)) return;
        if (eventName && !['chatmessage', 'message', 'kick.chatmessage', 'kick.message'].includes(eventName)) return;

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

  }

  const recentActivity = new Map();
  function userName(candidate) {
    if (typeof candidate === 'string') return candidate.trim();
    if (!candidate || typeof candidate !== 'object') return '';
    return String(candidate.displayName || candidate.display_name || candidate.username || candidate.userName || candidate.user_name || candidate.name || '').trim();
  }
  function positiveNumber(...values) {
    for (const value of values) {
      if (typeof value !== 'number' && typeof value !== 'string') continue;
      const number = Number(value);
      if (Number.isFinite(number) && number > 0) return number;
    }
    return null;
  }
  function processActivity(eventName, data, envelope = {}) {
    const type = eventName.replace(/^kick[.:_-]/, '').replace(/[^a-z0-9]/g, '');
    // Never interpret ordinary chat content or a username as an activity type.
    if (!type || type === 'chatmessage' || type === 'message') return false;
    let kind;
    if (/follow/.test(type) && !/unfollow/.test(type)) kind = 'follow';
    else if (/kicks|giftedkick|rewardgift|cheer|token/.test(type) ||
      (type === 'gift' && (data.kicks != null || data.gifted_kicks != null || data.giftedKicks != null))) kind = 'kicks';
    else if (/subbomb|giftsub|subscriptiongift|membershipgift|massgift/.test(type) || type === 'gift') kind = 'gift';
    else if (/subscription|resub|^sub$/.test(type)) kind = 'sub';
    else if (/raid/.test(type)) kind = 'raid';
    else if (/donation|tip/.test(type)) kind = 'tip';
    else return false;

    // IDs are event IDs, not user IDs. Keep a bounded cache to ignore replayed packets.
    const eventId = data.eventId || data.event_id || data.messageId || data.message_id || data.id || envelope.id;
    if (eventId) {
      const key = `${kind}:${eventId}`;
      if (recentActivity.has(key)) return true;
      recentActivity.set(key, true);
      if (recentActivity.size > 300) recentActivity.delete(recentActivity.keys().next().value);
    }
    const sender = data.gifter || data.sender || data.user || data.follower || data.subscriber || data.donor || data;
    const name = userName(sender) || userName(data) || 'Alguien de la manada';
    const recipient = userName(data.recipient || data.recipientUser || data.recipient_name);
    const amount = positiveNumber(data.kicks, data.gifted_kicks, data.giftedKicks, data.tokens, data.amount, data.bits, data.quantity);
    const count = positiveNumber(data.gifts, data.totalGifts, data.giftCount, data.sub_count, data.count, data.quantity,
      Array.isArray(data.recipients) ? data.recipients.length : null);
    const months = positiveNumber(data.months, data.duration, data.cumulativeMonths, data.totalMonths);
    const viewers = positiveNumber(data.viewers, data.viewerCount, data.viewer_count, data.count);
    const number = value => value.toLocaleString('es-SV');
    const details = {
      follow: ['NUEVO SEGUIDOR', 'Se ha unido a la manada.', '✦'],
      kicks: ['KICKS', amount ? `Envió ${number(amount)} Kicks. ¡Gracias por el apoyo!` : 'Envió Kicks. ¡Gracias por el apoyo!', '◆'],
      sub: ['SUSCRIPCIÓN', months ? `Se suscribió por ${number(months)} ${months === 1 ? 'mes' : 'meses'}.` : '¡Gracias por suscribirte al canal!', '★'],
      gift: ['SUBS REGALADAS', count && count > 1 ? `Regaló ${number(count)} suscripciones a la comunidad.` : recipient ? `Regaló una suscripción a ${recipient}.` : 'Regaló una suscripción a la comunidad.', '🎁'],
      raid: ['RAID', viewers ? `Llegó con ${number(viewers)} personas. ¡Bienvenidos!` : 'Llegó con su comunidad. ¡Bienvenidos!', '↗'],
      tip: ['APOYO', data.formatted_amount || data.formattedAmount ? `Envió ${String(data.formatted_amount || data.formattedAmount)}. ¡Gracias!` : amount ? `Envió ${number(amount)}${data.currency ? ' ' + String(data.currency) : ''}. ¡Gracias!` : '¡Gracias por apoyar el canal!', '♥']
    }[kind];
    const element = document.createElement('div');
    element.className = `chat-activity activity-${kind}`;
    const note = typeof data.message === 'string' ? data.message : typeof data.subMessage === 'string' ? data.subMessage : '';
    element.innerHTML = `<div class="activity-top"><span class="activity-icon" aria-hidden="true">${details[2]}</span><span class="activity-label">${details[0]}</span></div>
      <div class="activity-user">${escapeHTML(name)}</div>
      <div class="activity-description">${escapeHTML(details[1])}</div>
      ${note ? `<div class="activity-note">${escapeHTML(note)}</div>` : ''}`;
    appendMessage(element);
    return true;
  }

  // Preview uses the same event parser as the WebSocket; it never sends an action to Kick.
  window.simularAlertaKick = (type = 'Follow', data = {}) => processActivity(String(type).toLowerCase(), {
    user: { username: 'Luna' }, ...data
  });

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
