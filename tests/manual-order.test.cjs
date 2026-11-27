// Manual orders (Facebook, WhatsApp, phone, walk-in): ID, source, prices, stock, delivery, discount, retries.
require('../scripts/test-environment.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aurzen-manual-order-'));
process.env.DATABASE_PATH=path.join(dir,'test.sqlite');
// Manual orders work even while website ordering is switched off.
process.env.CHECKOUT_ENABLED='false';
process.env.SEED_DEMO='true';
const {database,transaction,orders}=require('../apps/api/dist/lib/database.js');
const {createManualOrder}=require('../apps/api/dist/lib/manual-order.js');

test.after(async()=>{(await database()).close();const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(dir));assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));fs.rmSync(dir,{recursive:true,force:true});});
const stock=async id=>Number((await (await database()).prepare('SELECT stock FROM products WHERE id=?').get(id)).stock);
const add=changes=>transaction(db=>createManualOrder(db,{key:randomUUID(),source:'whatsapp',name:'Inbox Customer',phone:'01812345678',address:'Mirpur 10, Dhaka',area:'dhaka',items:[{id:1,qty:2,size:'M'}],...changes}));

test('creates a New order with an MO- ID, its source, server prices and reduced stock',async()=>{
  const before=await stock(1);
  const o=await add({items:[{id:1,qty:2,size:'M',price:1}]});
  assert.match(o.id,/^MO-\d{6}$/,'outside orders use MO-, website orders AZ-');
  assert.equal(o.source,'whatsapp');assert.equal(o.status,'New');assert.ok(o.readAt,'added by the owner, so already read');
  assert.equal(o.items[0].price,1490,'price comes from the server, never the form');
  assert.equal(o.delivery,80);assert.equal(o.total,1490*2+80);
  assert.equal(await stock(1),before-2);
  assert.ok((await orders()).some(x=>x.id===o.id),'saved with the other orders');
});

test('every manual order gets its own ID; a retried save does not create a second order',async()=>{
  const a=await add({}),b=await add({});
  assert.notEqual(a.id,b.id);
  const key=randomUUID(),count=(await orders()).length,before=await stock(1);
  const first=await add({key}),again=await add({key});
  assert.equal(first.id,again.id);
  assert.equal((await orders()).length,count+1);
  assert.equal(await stock(1),before-2,'stock taken once');
});

test('custom delivery and discount set the total; a too-large discount is refused',async()=>{
  const o=await add({area:'outside',delivery:0,discount:200,paymentMethod:'bkash',note:'Call first'});
  assert.equal(o.delivery,0);assert.equal(o.discount,200);assert.equal(o.total,1490*2-200);
  assert.equal(o.paymentMethod,'bkash');assert.equal(o.note,'Call first');
  await assert.rejects(add({discount:1490*2+1}),/Discount/);
});

test('refuses short stock, unknown sources, bad phones and blocked customers without changing stock',async()=>{
  const before=await stock(1);
  await assert.rejects(add({items:[{id:1,qty:100,size:'M'}]}),/only .* available/);
  await assert.rejects(add({source:'website'}),/where the order came from/);
  await assert.rejects(add({phone:'12345'}),/Phone number|valid Bangladesh/);
  const db=await database();
  await db.prepare("INSERT INTO settings(key,value) VALUES('customers',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify({'01812345678':{note:'',tags:[],blocked:true}}));
  await assert.rejects(add({}),/blocked/);
  await db.prepare("DELETE FROM settings WHERE key='customers'").run();
  assert.equal(await stock(1),before);
});

test('customers can track an MO- order with or without the prefix',async()=>{
  const {trackOrder}=require('../apps/api/dist/lib/tracking.js');
  const o=await add({});
  assert.equal((await trackOrder(o.id,'01812345678')).id,o.id);
  assert.equal((await trackOrder(o.id.toLowerCase().replace('-',''),'01812345678')).id,o.id);
  assert.equal((await trackOrder(o.id.slice(3),'01812345678')).id,o.id,'digits only');
  await assert.rejects(trackOrder(o.id,'01712345678'),/could not find/);
});
