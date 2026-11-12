const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler, mergeBusiness } = require('./catalog');
function fixture(overrides = {}) {
  let saved = null;
  const handler = createHandler({ verifyToken: async () => ({ admin: true }), getWolfUser: async () => ({ email: 'TEST@EXAMPLE.COM', emailVerified: true }), getWolfRecord: async () => ({ catalogCode: 'WT-AbC123', catalogEmail: ' test@example.com ' }), saveBusiness: async (...args) => { saved = args; return {committed:true, conflict:false}; }, ...overrides });
  async function run(catalog, token = 'Bearer token', business = { title: 'Tienda' }, businessId = 'emp-002', createOnly = false) {
    const req = { method: 'POST', headers: { authorization: token }, body: { businessId, business, catalog, createOnly } };
    const res = { statusCode: 200, set() {}, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; }, send() { return this; } };
    await handler(req, res); return res;
  }
  return { run, get saved() { return saved; } };
}
test('validates matching verified account, preserving UID case', async () => {
 const f = fixture(); const r = await f.run({enabled: true, code: 'WT-AbC123', email: ' Test@Example.com '});
 assert.equal(r.statusCode, 200); assert.deepEqual(f.saved[2], {hasCatalog:true,catalogUid:'AbC123',catalogUrl:'https://multiideassv.com/wolftrack.html?uid=AbC123'});
});
test('allows Android business fields and reports exclusive creation conflicts', async () => {
 const f = fixture();
 const r = await f.run({enabled:false}, 'Bearer token', {whatsappMsg:'Hola', accentColor:'#123456'}, 'nuevo-1', true);
 assert.equal(r.statusCode, 200); assert.equal(f.saved[1].whatsappMsg, 'Hola'); assert.equal(f.saved[1].accentColor, '#123456'); assert.equal(f.saved[3], true);
 const existing = {title:'Anterior', hasCatalog:true, catalogUid:'abc'};
 assert.equal(mergeBusiness(existing, {title:'Cambio'}, {hasCatalog:false}, true), undefined);
 assert.deepEqual(mergeBusiness(null, {id:'nuevo-1'}, {hasCatalog:false}, true), {id:'nuevo-1', hasCatalog:false});
 const g = fixture({saveBusiness: async () => ({committed:false, conflict:true})});
 const conflict = await g.run({enabled:false}, 'Bearer token', {}, 'nuevo-1', true);
 assert.equal(conflict.statusCode, 409); assert.equal(conflict.body.error, 'Ya existe un negocio con ese identificador.');
 const invalid = await f.run({enabled:false}, 'Bearer token', {}, 'nuevo-1', 'true'); assert.equal(invalid.statusCode, 400);
});
test('preserves the exact business key and rejects protected fields and invalid UIDs', async () => {
 const f = fixture();
 assert.equal((await f.run({enabled:false}, 'Bearer token', {}, 'EMP-002')).statusCode, 200);
 assert.equal(f.saved[0], 'EMP-002');
 for (const field of ['catalogUid', 'catalogUrl', 'hasCatalog']) {
  const g = fixture(); const result = await g.run({enabled:false}, 'Bearer token', { [field]: 'malicious' });
  assert.equal(result.statusCode, 400); assert.equal(g.saved, null);
 }
 for (const code of ['WT-', 'WT-a/b', 'WT-a.b', 'WT-a#b', 'WT-a$b', 'WT-a[b]']) {
  const g = fixture(); const result = await g.run({enabled:true, code, email:'test@example.com'});
  assert.equal(result.statusCode, 400); assert.equal(g.saved, null);
 }
});
test('conservation requires an active structurally valid linkage', () => {
 const active = { hasCatalog:true, catalogUid:'AbC123', catalogUrl:'original', title:'Anterior' };
 assert.deepEqual(mergeBusiness(active, {title:'Nuevo'}, undefined), {...active, title:'Nuevo'});
 assert.equal(mergeBusiness(null, {}, undefined), undefined);
 assert.equal(mergeBusiness({...active, hasCatalog:false}, {}, undefined), undefined);
 assert.equal(mergeBusiness({...active, catalogUid:'bad/uid'}, {}, undefined), undefined);
 assert.deepEqual(mergeBusiness(active, {}, {hasCatalog:false}), {...active, hasCatalog:false});
});
test('upstream permission errors do not save the business', async () => {
 const f = fixture({getWolfRecord: async () => { throw new Error('permission denied'); }});
 const originalError = console.error; console.error = () => {};
 try {
  const result = await f.run({enabled:true, code:'WT-AbC123', email:'test@example.com'});
  assert.equal(result.statusCode, 500); assert.equal(f.saved, null);
 } finally { console.error = originalError; }
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

