import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const code = await readFile(new URL('../../overley_navideños/chat_juego.js', import.meta.url), 'utf8');

function chat(options = {}) {
  let time = 0;
  const calls = [];
  // No DOM, network, timer, or storage APIs are supplied to the helper.
  const context = { window: {} };
  vm.runInNewContext(code, context);
  const handler = context.window.NavidadGameChat.createHandler((...args) => calls.push(args), {
    now: () => time,
    ...options
  });
  return { handler, calls, api: context.window.NavidadGameChat, at(value) { time = value; } };
}

const packet = (data, type = 'ChatMessage') => ({ event: { source: 'Kick', type }, data });

test('acepta las formas de texto y usuario de Streamer.bot y solo entrega una señal sin contenido', () => {
  const { handler, calls, api } = chat();
  const shapes = [
    packet({ message: 'hola', user: { username: 'persona' } }),
    packet({ message: { message: 'hola', user: { name: 'persona' } } }),
    packet({ message: { text: 'hola', sender: { displayName: 'Persona' } } }),
    packet({ message: { content: '[emote:1:hola]', sender: 'persona' } }),
    packet({ messageText: 'hola', sender: { user_name: 'persona' } }),
    packet({ text: 'hola', user: 'persona' }),
    packet({ content: '<img src=x onerror=alert(1)>', username: 'persona' }),
    { source: 'KICK', event: 'Message', message: 'hola' },
    { type: 'Kick.ChatMessage', data: { content: 'hola' } },
    { data: { event: { source: 'kick', name: 'Message' }, message: 'hola' } },
    { source: 'Kick', eventType: 'message', text: 'hola' },
    { event: 'kick.message', content: 'hola' },
    packet({ messageText: ' ', message: { text: 'hola' } }),
    { event: { source: 'Kick', type: 'Message' }, data: {}, message: 'hola' }
  ];
  shapes.forEach((value, index) => assert.equal(handler(value), true, `forma ${index}`));
  assert.equal(calls.length, shapes.length);
  assert(calls.every(args => args.length === 0));
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['createHandler']);
});

test('exige metadatos de chat de Kick y descarta actividad aunque contenga texto', () => {
  const { handler, calls } = chat();
  const ignored = [
    { event: { source: 'Spotify', type: 'Message' }, data: { message: 'hola' } },
    { event: { source: 'General', type: 'Custom' }, data: { message: 'hola' } },
    packet({ message: 'te sigue' }, 'Follow'),
    packet({ message: 'se suscribió' }, 'Subscription'),
    packet({ message: 'hola' }, 'Unknown'),
    { event: { type: 'ChatMessage' }, data: { message: 'hola' } },
    { source: 'Kick', message: 'hola' },
    { message: 'hola' },
    { event: { source: 'General', type: 'Kick.Message' }, data: { message: 'hola' } },
    { event: { source: 'Kick', type: 'Message' }, source: 'Spotify', data: { message: 'hola' } },
    { event: { source: 3, type: 'Kick.Message' }, data: { message: 'hola' } },
    { request: 'Subscribe', id: 'status', status: 'ok', data: { message: 'Subscribed' } }
  ];
  ignored.forEach((value, index) => assert.equal(handler(value), false, `paquete ${index}`));
  assert.equal(calls.length, 0);
});

test('filtra bots conocidos en los campos de usuario y remitente, y respeta is_bot', () => {
  const { handler, calls } = chat();
  for (const name of ['botrix', 'kickbot', 'nightbot', 'lobito_mensajero', 'jikobot']) {
    for (const fields of [
      { user: name }, { sender: { username: ` ${name.toUpperCase()} ` } },
      { user: { name } }, { user: { displayName: name } },
      { username: name }, { user_name: name },
      { message: { text: 'hola', sender: { userName: name } } },
      { message: { text: 'hola', user: `@${name}` } }
    ]) assert.equal(handler(packet({ message: 'hola', ...fields })), false);
  }
  for (const fields of [
    { is_bot: true }, { is_bot: 1 }, { is_bot: 'true' },
    { user: { username: 'robot', is_bot: true } },
    { sender: { username: 'robot', isBot: true } },
    { message: { text: 'hola', is_bot: true } },
    { message: { text: 'hola', user: { username: 'robot', is_bot: true } } }
  ]) assert.equal(handler(packet({ message: 'hola', ...fields })), false);
  assert.equal(calls.length, 0);
  assert.equal(handler(packet({ message: 'hola', user: { username: 'persona', is_bot: false } })), true);
  assert.equal(handler(packet({ message: 'hola', user: { username: 'persona', is_bot: 'false' } })), true);
  assert.equal(calls.length, 2);
});

test('filtra comandos ! y / por defecto y puede incluirlos sin quitar el filtro de bots', () => {
  const filtered = chat();
  for (const text of ['!hola', '/comando', ' \n !puntos', '\t /ban']) {
    assert.equal(filtered.handler(packet({ message: text })), false);
  }
  assert.equal(filtered.handler(packet({ message: 'hola !puntos' })), true);
  assert.equal(filtered.calls.length, 1);

  const unfiltered = chat({ filterCommands: false });
  assert.equal(unfiltered.handler(packet({ message: '!puntos' })), true);
  assert.equal(unfiltered.handler(packet({ message: ' /comando' })), true);
  assert.equal(unfiltered.handler(packet({ message: '!puntos', user: 'botrix' })), false);
  assert.equal(unfiltered.calls.length, 2);
});

test('deduplica IDs explícitos entre ChatMessage y Message durante 15 segundos', () => {
  const { handler, calls, at } = chat();
  assert.equal(handler(packet({ message: { id: 'shared', content: 'hola' } })), true);
  at(1000);
  assert.equal(handler(packet({ messageId: 'shared', message: 'hola' }, 'Message')), false);
  at(14999);
  assert.equal(handler(packet({ message_id: 'shared', text: 'hola' }, 'Message')), false);
  at(15000);
  assert.equal(handler(packet({ id: 'shared', message: 'hola' })), true);
  assert.equal(calls.length, 2);

  assert.equal(handler(packet({ message: { messageId: 0, text: 'hola' } })), true);
  assert.equal(handler(packet({ message: { message_id: '0', text: 'otra entrega' } })), false);
});

test('no deduplica texto ni IDs de usuarios o de solicitudes WebSocket', () => {
  const { handler, calls } = chat();
  for (let index = 0; index < 8; index++) {
    assert.equal(handler({ ...packet({ message: 'hola', user: { id: 'same-user' } }), id: 'same-request' }), true);
  }
  assert.equal(handler(packet({ id: 'one', message: 'hola' })), true);
  assert.equal(handler(packet({ id: 'two', message: 'hola' })), true);
  assert.equal(calls.length, 10);
});

test('la caché está limitada a 256 IDs y cada instancia mantiene sus propios IDs', () => {
  const first = chat();
  for (let index = 0; index < 257; index++) {
    assert.equal(first.handler(packet({ message: { id: `id-${index}`, text: 'hola' } })), true);
  }
  assert.equal(first.handler(packet({ messageId: 'id-256', text: 'hola' })), false);
  assert.equal(first.handler(packet({ messageId: 'id-0', text: 'hola' })), true);
  assert.equal(first.calls.length, 258);
  assert.equal(chat().handler(packet({ messageId: 'id-256', text: 'hola' })), true);
});

test('ignora paquetes vacíos o malformados sin mutarlos ni reservar sus IDs', () => {
  const { handler, calls } = chat();
  const broken = { event: { source: 'Kick', type: 'Message' }, get data() { throw new Error('bad getter'); } };
  for (const value of [null, undefined, 1, true, 'hola', [], broken,
    packet(null), packet([]), packet({}), packet({ message: null }),
    packet({ message: {} }), packet({ message: [] }), packet({ message: 123 }),
    packet({ message: { text: {} } }), packet({ message: '  \n\t' }),
    packet({ id: 'later', message: '' }), packet({ id: 'later', message: '!cmd' })]) {
    assert.doesNotThrow(() => assert.equal(handler(value), false));
  }
  assert.equal(calls.length, 0);
  const message = Object.freeze({ id: 'later', text: 'hola', user: Object.freeze({ username: 'persona' }) });
  const data = Object.freeze({ message });
  const frozen = Object.freeze({ event: Object.freeze({ source: 'Kick', type: 'Message' }), data });
  assert.equal(handler(frozen), true);
  assert.equal(handler(frozen), false);
  assert.equal(frozen.data.message, message);
  assert.equal(calls.length, 1);
});

test('un reloj que retrocede no deja IDs bloqueados indefinidamente', () => {
  const { handler, at, calls } = chat();
  at(9000);
  assert.equal(handler(packet({ messageId: 'id', message: 'hola' })), true);
  at(1000);
  assert.equal(handler(packet({ messageId: 'id', message: 'hola' })), true);
  assert.equal(handler(packet({ messageId: 'id', message: 'hola' })), false);
  assert.equal(calls.length, 2);
});
