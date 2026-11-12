const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('./catalog');
function fixture(overrides = {}) {
  let saved = null;
  const handler = createHandler({ verifyToken: async () => ({ admin: true }), getWolfUser: async () => ({ email: 'TEST@EXAMPLE.COM', emailVerified: true }), getWolfRecord: async () => ({ catalogCode: 'WT-AbC123', catalogEmail: ' test@example.com ' }), saveBusiness: async (...args) => { saved = args; return true; }, ...overrides });
  async function run(catalog, token = 'Bearer token') {
    const req = { method: 'POST', headers: { authorization: token }, body: { businessId: 'emp-002', business: { title: 'Tienda' }, catalog } };
    const res = { statusCode: 200, set() {}, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; }, send() { return this; } };
    await handler(req, res); return res;
  }
  return { run, get saved() { return saved; } };
}
test('validates matching verified account, preserving UID case', async () => {
 const f = fixture(); const r = await f.run({enabled: true, code: 'WT-AbC123', email: ' Test@Example.com '});
 assert.equal(r.statusCode, 200); assert.deepEqual(f.saved[2], {hasCatalog:true,catalogUid:'AbC123',catalogUrl:'https://multiideassv.com/wolftrack.html?uid=AbC123'});
});
test('rejects unauthorized, mismatched or unverified accounts without writing', async () => {
 for (const overrides of [{verifyToken: async () => ({uid:'anonymous'})}, {getWolfRecord: async () => ({catalogCode:'WT-abc123',catalogEmail:'test@example.com'})}, {getWolfUser: async () => ({email:'test@example.com',emailVerified:false})}, {getWolfUser: async () => ({email:'other@example.com',emailVerified:true})}]) {
  const f=fixture(overrides); const r=await f.run({enabled:true,code:'WT-AbC123',email:'test@example.com'}); assert.ok(r.statusCode >= 400); assert.equal(f.saved,null);
 }
});
test('rejects invalid code and handles disable without replacing UID', async () => {
 const f=fixture(); let r=await f.run({enabled:true,code:'wt-AbC123',email:'test@example.com'}); assert.equal(r.statusCode,400); assert.equal(f.saved,null);
 r=await f.run({enabled:false}); assert.equal(r.statusCode,200); assert.deepEqual(f.saved[2],{hasCatalog:false});
});

