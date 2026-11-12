const test = require('node:test');
const assert = require('node:assert/strict');
const { createPublicCatalogHandler, projectItems } = require('./public_catalog');

test('projects only public fields and applies availability rules', () => {
    const items = projectItems({
        key1: { id:'wrong', name:'Producto', type:'Producto', sellingPrice:0, quantity:3, trackStock:true, purchasePrice:9, catalogEmail:'secret', variants:[{name:'Grande',price:25,purchasePrice:4}], extras:[{name:'Extra',price:2,internal:'secret'}] },
        key2: { type:'Producto', trackStock:true, quantity:'bad' },
        key3: { type:'Producto', trackStock:false, quantity:0 },
        key4: { type:'Servicio', trackStock:true, quantity:0 },
        key5: { type:'Material', sellingPrice:3 }
    });
    assert.deepEqual(items[0], { id:'key1', name:'Producto', type:'Producto', description:'', sellingPrice:0, imageUrl:'', variants:[{name:'Grande',price:25}], extras:[{name:'Extra',price:2}], available:true });
    assert.deepEqual(items.map(item => item.available), [true, false, true, true]);
    assert.deepEqual(items[1].variants, []); assert.deepEqual(items[1].extras, []);
    assert.deepEqual(projectItems(null), []);
});

async function request(dependencies, businessId = 'emp-002') {
    const headers = {};
    const res = { statusCode:200, set(k,v){headers[k]=v;}, status(n){this.statusCode=n; return this;}, json(v){this.body=v; return this;}, send(v){this.body=v; return this;} };
    await createPublicCatalogHandler(dependencies)({method:'GET',query:{businessId}}, res);
    assert.match(headers['Cache-Control'], /no-store/);
    return res;
}
test('returns empty inventory and rejects missing, invalid or disabled business', async () => {
    const deps = {getBusiness:async () => ({hasCatalog:true,catalogUid:'AbC'}),getMaterials:async () => null};
    const ok = await request(deps); assert.equal(ok.statusCode,200); assert.deepEqual(ok.body, {businessId:'emp-002',items:[]});
    assert.equal((await request(deps,'bad/key')).statusCode,400);
    assert.equal((await request({...deps,getBusiness:async () => ({hasCatalog:false,catalogUid:'AbC'})})).statusCode,404);
});
test('does not return inventory if the binding changes while reading', async () => {
    let count=0;
    const res = await request({getBusiness:async () => ({hasCatalog:true,catalogUid:++count===1?'old':'new'}), getMaterials:async () => ({one:{type:'Producto'}})});
    assert.equal(res.statusCode,404); assert.equal(res.body.items,undefined);
});
test('distinguishes private inventory access errors from an empty inventory', async () => {
    const old=console.error; console.error=()=>{};
    try { const res=await request({getBusiness:async () => ({hasCatalog:true,catalogUid:'AbC'}),getMaterials:async () => {throw new Error('denied');}}); assert.equal(res.statusCode,500); assert.equal(res.body.items,undefined); }
    finally { console.error=old; }
});
test('returns a non-cacheable server error if a private read does not finish', async () => {
    const old=console.error; console.error=()=>{};
    try {
        const res=await request({getBusiness:async () => ({hasCatalog:true,catalogUid:'AbC'}),getMaterials:() => new Promise(() => {}),timeoutMs:10});
        assert.equal(res.statusCode,500); assert.equal(res.body.items,undefined);
    } finally { console.error=old; }
});
