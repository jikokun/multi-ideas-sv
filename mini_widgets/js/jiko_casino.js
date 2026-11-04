/* Shared command and turn coordinator, independent of the games' renderers. */
(function (global) {
  'use strict';
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^@/, '').trim().toLowerCase();
  const aliases = new Map([
    ['!ruleta', 'ruleta'], ['!ruletas', 'ruleta'], ['!roulette', 'ruleta'],
    ['!slot', 'tragamonedas'], ['!slots', 'tragamonedas'], ['!tragamoneda', 'tragamonedas'], ['!tragamonedas', 'tragamonedas']
  ]);
  const spins = new Set(['!girar', '!giro', '!spin']);
  const exits = new Set(['!salir', '!cerrar']);

  class CasinoController {
    constructor({ sync, ready = Promise.resolve(), onChange = () => {}, onError = console.error, now = Date.now } = {}) {
      this.sync = sync;
      this.ready = ready;
      this.onChange = onChange;
      this.onError = onError;
      this.now = now;
      this.games = new Map();
      this.context = new Map();
      this.recent = new Map();
      this.ids = new Map();
      this.tail = Promise.resolve();
      this.order = 0;
      this.holdsLock = false;
      this.lastHeartbeat = 0;
      this.queueListeners = new Set();
    }

    register(name, adapter) {
      this.games.set(name, { adapter, owner: '', queue: [], order: 0 });
    }

    externalBusy() {
      if (!this.sync) return false;
      const lock = this.sync.getActiveLock();
      return !!lock && !(this.holdsLock && lock.widget === 'casino');
    }

    isBusy(name, user) {
      const game = this.games.get(name);
      return this.externalBusy() || !!(game && game.owner && game.owner !== normalize(user));
    }

    acquire(name, user) {
      const game = this.games.get(name);
      if (!game || this.isBusy(name, user)) return false;
      if (!game.owner) game.order = ++this.order;
      game.owner = normalize(user);
      this.heartbeat();
      this.changed();
      return true;
    }

    release(name) {
      const game = this.games.get(name);
      if (game) game.owner = '';
      if (![...this.games.values()].some(item => item.owner) && this.holdsLock) {
        this.sync?.release('casino');
        this.holdsLock = false;
      }
      this.changed();
    }

    heartbeat() {
      if (!this.sync || ![...this.games.values()].some(item => item.owner)) return;
      if (!this.holdsLock || this.now() - this.lastHeartbeat > 10000) {
        this.sync.acquire('casino', 'casino', 60000);
        this.holdsLock = true;
        this.lastHeartbeat = this.now();
      }
    }

    changed() {
      for (const callback of this.queueListeners) callback();
      this.onChange(this.snapshot());
    }

    snapshot() {
      return [...this.games].map(([name, game]) => ({
        name, owner: game.owner, order: game.order,
        queue: game.queue.map(item => ({ ...item })),
        ...game.adapter.status()
      }));
    }

    enqueue(name, user, text) {
      const game = this.games.get(name);
      if (!game) return;
      const sender = normalize(user);
      if (!game.queue.some(item => item.sender === sender)) {
        if (game.queue.length >= 6) return;
        game.queue.push({ sender, text, timestamp: this.now(), widget: name });
      }
      this.changed();
    }

    serialize(callback) {
      const task = this.tail.then(() => this.ready).then(callback);
      this.tail = task.catch(error => this.onError(error));
      return this.tail;
    }

    command(text, sender, source = 'local', messageId) {
      if (sender && typeof sender === 'object') sender = sender.username || sender.login || sender.userName || sender.user_name || sender.name || sender.displayName;
      const user = normalize(sender);
      const raw = String(text || '').trim();
      const first = raw.split(/\s+/)[0].toLowerCase();
      if (!user || !(aliases.has(first) || spins.has(first) || exits.has(first) || first === '!apostar' || first === '!bet')) return Promise.resolve();
      const now = this.now();
      for (const [key, entry] of this.recent) if (now - entry.time > 5000) this.recent.delete(key);
      for (const [key, time] of this.ids) if (now - time > 60000) this.ids.delete(key);
      const idKey = messageId ? user + '|' + String(messageId) : '';
      if (idKey && this.ids.has(idKey)) return Promise.resolve();
      const fingerprint = user + '|' + raw.toLowerCase();
      const previous = this.recent.get(fingerprint);
      if (previous && previous.source !== source && now - previous.time < 1800) {
        if (idKey) this.ids.set(idKey, now);
        return Promise.resolve();
      }
      this.recent.set(fingerprint, { source, time: now });
      if (idKey) this.ids.set(idKey, now);
      return this.serialize(() => this.route(raw, user));
    }

    async route(text, user) {
      const [rawCommand, ...params] = text.split(/\s+/);
      const cmd = rawCommand.toLowerCase();
      const explicit = aliases.get(cmd);
      const closing = exits.has(cmd) || ((explicit || spins.has(cmd) || cmd === '!apostar' || cmd === '!bet') && /^(salir|cerrar)$/i.test(params[0] || ''));
      const name = explicit || this.context.get(user);
      const game = this.games.get(name);
      if (!game) return;
      if (closing) {
        game.queue = game.queue.filter(item => item.sender !== user);
        if (game.owner === user) await this.close(name);
        this.changed();
        return;
      }
      if (explicit) {
        this.context.set(user, name);
        return this.start(name, user, params);
      }
      if (game.owner !== user) return;
      if (cmd === '!apostar' || cmd === '!bet') {
        if (name === 'ruleta') await game.adapter.command('!apostar ' + params.join(' '), user);
      } else if (spins.has(cmd)) {
        await game.adapter.command('!girar' + (params.length ? ' ' + params.join(' ') : ''), user);
      }
      this.changed();
    }

    async start(name, user, params = [], fromQueue = false) {
      const game = this.games.get(name);
      if (!game) return false;
      if (game.owner === user && game.adapter.status().spinning) return true;
      const other = [...this.games].find(([key, item]) => key !== name && item.owner === user);
      const otherBusy = other && (other[1].adapter.status().spinning || other[1].adapter.status().pending);
      if (this.isBusy(name, user) || otherBusy || (!fromQueue && !game.owner && game.queue.length)) {
        this.enqueue(name, user, (name === 'ruleta' ? '!ruleta' : '!slot') + (params.length ? ' ' + params.join(' ') : ''));
        return false;
      }
      // Finish the previous session and its refunds before opening the next game for this user.
      if (other) await this.close(other[0]);
      const command = name === 'ruleta' ? '!ruleta' : '!slot';
      await game.adapter.command(command + (params.length ? ' ' + params.join(' ') : ''), user);
      this.changed();
      return game.owner === user;
    }

    async close(name) {
      const game = this.games.get(name);
      if (!game) return false;
      const status = game.adapter.status();
      if (status.spinning || status.pending) return false;
      await game.adapter.close();
      this.release(name);
      return true;
    }

    tick() {
      return this.serialize(async () => {
        const now = this.now();
        for (const [name, game] of this.games) {
          game.queue = game.queue.filter(item => now - item.timestamp < 180000 && this.context.get(item.sender) === name);
          if (!game.owner && game.queue.length && !this.externalBusy()) {
            const next = game.queue[0];
            const params = next.text.split(/\s+/).slice(1);
            if (await this.start(name, next.sender, params, true)) game.queue.shift();
          }
        }
        this.heartbeat();
        this.changed();
      });
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { CasinoController, normalize };
  else global.CasinoController = CasinoController;
})(typeof window !== 'undefined' ? window : globalThis);
