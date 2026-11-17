/* Convierte mensajes de Kick en una señal; no guarda ni muestra el texto del chat. */
(() => {
  'use strict';

  const BOTS = new Set(['botrix', 'kickbot', 'nightbot', 'lobito_mensajero', 'jikobot']);
  const CHAT_TYPES = new Set(['chatmessage', 'message', 'kick.chatmessage', 'kick.message']);
  const ID_LIFETIME = 15000;
  const MAX_IDS = 256;
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const firstText = values => values.find(value => typeof value === 'string' && value.trim()) || '';
  const lower = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
  const botFlag = value => value === true || value === 1 || lower(value) === 'true' || value === '1';

  function isBot(value) {
    if (typeof value === 'string') return BOTS.has(lower(value).replace(/^@/, ''));
    if (!record(value)) return false;
    if (botFlag(value.is_bot) || botFlag(value.isBot)) return true;
    const name = firstText([value.username, value.user_name, value.userName, value.login,
      value.name, value.displayName, value.display_name]);
    return BOTS.has(lower(name).replace(/^@/, ''));
  }

  function messageId(values) {
    for (const value of values) {
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
      if (typeof value === 'string' && value.trim() && value.length <= 256) return value.trim();
    }
    return '';
  }

  function inspect(packet, filterCommands) {
    if (!record(packet)) return null;
    const data = record(packet.data) ? packet.data : packet;
    const payloads = data === packet ? [packet] : [data, packet];
    const events = [packet.event, data.event];
    const eventObjects = events.filter(record);
    const type = lower(firstText([
      ...events.flatMap(event => record(event) ? [event.type, event.name] : [event]),
      packet.type, packet.eventType, packet.name, data.type, data.eventType, data.name
    ]));
    if (!CHAT_TYPES.has(type)) return null;

    const sources = [...eventObjects.map(event => event.source), packet.source, data.source]
      .filter(value => value !== undefined && value !== null && value !== '');
    // A qualified event identifies Kick when the source field is absent.
    if (sources.length ? sources.some(source => lower(source) !== 'kick') : !type.startsWith('kick.')) return null;

    const messages = payloads.map(payload => payload.message).filter(record);
    const text = firstText(payloads.flatMap(payload => {
      const message = payload.message;
      return [payload.messageText, typeof message === 'string' ? message : '',
        ...(record(message) ? [message.message, message.text, message.content] : []),
        payload.text, payload.content];
    }));
    if (!text || (filterCommands && /^[!\/]/.test(text.trim()))) return null;

    const people = [...payloads, ...messages];
    if (people.some(value => isBot(value) || isBot(value.user) || isBot(value.sender))) return null;

    return { id: messageId([
      ...messages.flatMap(message => [message.messageId, message.message_id, message.id]),
      ...payloads.flatMap(payload => [payload.messageId, payload.message_id]),
      // The outer WebSocket id can identify a request, rather than a chat message.
      data.id
    ]) };
  }

  function createHandler(onMessage, { filterCommands = true, now = Date.now } = {}) {
    if (typeof onMessage !== 'function') throw new TypeError('onMessage must be a function');
    const clock = typeof now === 'function' ? now : Date.now;
    const seen = new Map();

    return packet => {
      let message;
      try {
        message = inspect(packet, filterCommands);
      } catch {
        return false;
      }
      if (!message) return false;

      if (message.id) {
        const sampledTime = clock();
        const time = Number.isFinite(sampledTime) ? sampledTime : Date.now();
        for (const [id, receivedAt] of seen) {
          if (time < receivedAt || time - receivedAt >= ID_LIFETIME) seen.delete(id);
        }
        if (seen.has(message.id)) return false;
        if (seen.size >= MAX_IDS) seen.delete(seen.keys().next().value);
        seen.set(message.id, time);
      }

      // The caller only needs a pulse. No text, user data, or packet is retained.
      onMessage();
      return true;
    };
  }

  window.NavidadGameChat = Object.freeze({ createHandler });
})();
