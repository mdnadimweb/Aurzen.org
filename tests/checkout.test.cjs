require('../scripts/test-environment.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
// Compile the real TypeScript server modules with the project's installed compiler.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurzen-checkout-'));
process.env.DATABASE_PATH = path.join(dir, 'test.sqlite');
process.env.CHECKOUT_ENABLED = 'true';
process.env.SEED_DEMO='true';
delete process.env.TURSO_DATABASE_URL;
delete process.env.TURSO_AUTH_TOKEN;
delete process.env.NETLIFY;
const { DatabaseSync } = require('node:sqlite');
const legacy = new DatabaseSync(process.env.DATABASE_PATH);
legacy.exec("CREATE TABLE products(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,category TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>0),stock INTEGER NOT NULL CHECK(stock>=0),image TEXT NOT NULL,tag TEXT NOT NULL)");
legacy.close();
const { placeOrder: submitOrder, quoteOrder } = require('../apps/api/dist/lib/checkout.js');
// Legitimate test clients review server pricing once and retain it for retries.
async function placeOrder(request){
  if(!request.quote)request.quote=(await quoteOrder(request)).quote;
  return submitOrder(request);
}
const { catalog, database, orders } = require('../apps/api/dist/lib/database.js');
const input = (extra = {}) => ({ key: randomUUID(), name: 'Test Customer', phone: '01712345678', address: 'House 10, Road 2, Dhaka', area: 'dhaka', items: [{ id: 1, qty: 1, size: 'M' }], ...extra });
test.after(async () => { (await database()).close(); const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(dir)); assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative)); fs.rmSync(dir, { recursive: true, force: true }); });
test('a legacy SQLite catalog upgrades without losing its products', async()=>{
 const db=await database(),before=await catalog();
 await db.prepare('UPDATE products SET description=? WHERE id=?').run('Migration verified',1);
 assert.equal((await catalog()).products.find(p=>p.id===1).description,'Migration verified');
 assert.equal((await catalog()).products.length,before.products.length);
 await db.prepare('UPDATE products SET description=? WHERE id=?').run('',1);
});
test('server prices override tampered totals and Dhaka delivery costs 80', async () => {
    const before = (await catalog()).products.find(p => p.id === 1).stock;
    const receipt = await placeOrder(input({ total: 1, items: [{ id: 1, qty: 1, size: 'M', price: 1 }] }));
    assert.equal(receipt.total, 1490 + 80);
    assert.equal((await catalog()).products.find(p => p.id === 1).stock, before - 1);
});
test('outside Dhaka delivery costs 150, even for a large order', async () => {
    assert.equal((await placeOrder(input({ area: 'outside', items: [{ id: 1, qty: 2, size: 'L' }] }))).total, 1490 * 2 + 150);
});
test('retries do not create duplicate orders or reduce inventory twice', async () => {
    const request = input(), first = await placeOrder(request), stock = (await catalog()).products.find(p => p.id === 1).stock, count = (await orders()).length;
    assert.deepEqual(await placeOrder(request), first);
    assert.equal((await orders()).length, count);
    assert.equal((await catalog()).products.find(p => p.id === 1).stock, stock);
});
test('stock is checked across sizes and failed checkout changes nothing', async () => {
    const stock = (await catalog()).products.find(p => p.id === 1).stock, count = (await orders()).length;
    await assert.rejects(async () => await placeOrder(input({ items: [{ id: 1, qty: stock, size: 'S' }, { id: 1, qty: 1, size: 'XL' }] })), /only/);
    assert.equal((await orders()).length, count);
    assert.equal((await catalog()).products.find(p => p.id === 1).stock, stock);
});
test('invalid phone, area, options, quantities and products are rejected', async () => {
    for (const extra of [{ phone: '12345678901' }, { area: 'elsewhere' }, { items: [] }, { items: [null] }, { items: [{ id: 9999, qty: 1, size: 'M' }] }, { items: [{ id: 1, qty: -1, size: 'M' }] }, { items: [{ id: 1, qty: 1.5, size: 'M' }] }, { items: [{ id: 1, qty: 1, size: 'XXXL' }] }, { items: [{ id: 3, qty: 1, size: 'M' }] }])
        await assert.rejects(async () => await placeOrder(input(extra)));
});
test('Bangladesh international mobile format is normalized', async () => {
    const receipt = await placeOrder(input({ phone: '+8801712345678' }));
    assert.equal((await orders()).find(o => o.id === receipt.id).phone, '01712345678');
});
test('launch switch blocks new orders', async () => {
    process.env.CHECKOUT_ENABLED = 'false';
    await assert.rejects(async () => await placeOrder(input()), /open soon/);
    process.env.CHECKOUT_ENABLED = 'true';
process.env.SEED_DEMO='true';
});
test('cash on delivery is stored and unsupported payment methods cannot create orders', async () => {
    const receipt = await placeOrder(input({ paymentMethod: 'cod' }));
    assert.equal((await orders()).find(o => o.id === receipt.id).paymentMethod, 'cod');
    const count = (await orders()).length, stock = (await catalog()).products.find(p => p.id === 1).stock;
    await assert.rejects(async () => await placeOrder(input({ paymentMethod: 'card' })), /Only cash on delivery/);
    assert.equal((await orders()).length, count);
    assert.equal((await catalog()).products.find(p => p.id === 1).stock, stock);
});

test('simultaneous checkouts cannot sell the same final unit twice', async()=>{
 const db=await database();
 await db.prepare('UPDATE products SET stock=1 WHERE id=4').run();
 const count=(await orders()).length;
 const results=await Promise.allSettled([
  placeOrder(input({items:[{id:4,qty:1,size:'M'}]})),
  placeOrder(input({items:[{id:4,qty:1,size:'L'}]})),
 ]);
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
 assert.equal((await catalog()).products.find(p=>p.id===4).stock,0);
 assert.equal((await orders()).length,count+1);
});

test('simultaneous retries create one order and deduct stock once', async()=>{
 const request=input(),before=(await catalog()).products.find(p=>p.id===1).stock,count=(await orders()).length;
 const [first,second]=await Promise.all([placeOrder(request),placeOrder(request)]);
 assert.deepEqual(first,second);
 assert.equal((await orders()).length,count+1);
 assert.equal((await catalog()).products.find(p=>p.id===1).stock,before-1);
});

test('an exception after a database write rolls back the transaction', async()=>{
 const {transaction}=require('../apps/api/dist/lib/database.js');
 const before=(await catalog()).products.find(p=>p.id===1).stock;
 await assert.rejects(transaction(async db=>{
  await db.prepare('UPDATE products SET stock=0 WHERE id=1').run();
  throw new Error('rollback probe');
 }),/rollback probe/);
 assert.equal((await catalog()).products.find(p=>p.id===1).stock,before);
});
