(function (root, factory) {
  const Queue = factory();
  if (typeof module === 'object' && module.exports) module.exports = Queue;
  else root.JikoRewardQueue = Queue;
})(globalThis, function () {
  'use strict';
  const prefix = 'jiko_obs_reward_v1:';
  const streamKey = 'jiko_obs_reward_stream_v1';
  const activityPrefix = 'jiko_obs_activity_v1:';
  return class JikoRewardQueue {
    constructor(storage) { this.storage = storage; }
    get streamId() { return this.storage.getItem(streamKey); }
    set streamId(id) {
      if (id) this.storage.setItem(streamKey, id);
      else this.storage.removeItem(streamKey);
    }
    read(key) {
      try { return JSON.parse(this.storage.getItem(key)); }
      catch { return null; }
    }
    lastActivity(key, streamId) {
      const saved = this.read(activityPrefix + key);
      return saved?.streamId === streamId ? saved.timestamp : null;
    }
    saveActivity(key, streamId, timestamp) {
      this.storage.setItem(activityPrefix + key, JSON.stringify({ streamId, timestamp }));
    }
    enqueue(event) {
      const key = prefix + event.id;
      const saved = this.read(key);
      if (saved) return saved;
      this.storage.setItem(key, JSON.stringify(event));
      return event;
    }
    pending(now) {
      const keys = Array.from({ length: this.storage.length }, (_, i) => this.storage.key(i));
      const events = [];
      for (const key of keys) {
        if (key?.startsWith(activityPrefix) && this.read(key)?.timestamp < now - 86400000) this.storage.removeItem(key);
        if (!key?.startsWith(prefix)) continue;
        const event = this.read(key);
        if (!event) continue;
        if (!event.settled) events.push(event);
        else if (event.settled < now - (event.kind === 'attendance' ? 86400000 : 180000)) this.storage.removeItem(key);
      }
      return events.sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
    }
    confirmedAttendance() {
      const records = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (!key?.startsWith(prefix + 'asistencia:')) continue;
        const event = this.read(key);
        if (event?.settled && event.streamId === this.streamId && event.record) records.push(event.record);
      }
      return records;
    }
    settle(event, record, now) {
      this.storage.setItem(prefix + event.id, JSON.stringify({ ...event, settled: now, record }));
    }
    static confirmation(change) {
      if (!change.key?.startsWith(prefix) || !change.newValue) return null;
      try {
        const event = JSON.parse(change.newValue);
        return event.kind === 'attendance' && event.settled ? event.record : null;
      } catch { return null; }
    }
  };
});
