// Owner order edits: validation, stock movement, quoted prices, totals and locking.
require('../scripts/test-environment.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aurzen-order-edit-'));
process.env.DATABASE_PATH=path.join(dir,'test.sqlite');
process.env.CHECKOUT_ENABLED='true';
process.env.SEED_DEMO='true';
const {placeOrder,quoteOrder}=require('../apps/api/dist/lib/checkout.js');
const {database,transaction,orders}=require('../apps/api/dist/lib/database.js');
const {editOrder}=require('../apps/api/dist/lib/order-edit.js');

test.after(async()=>{(await database()).close();const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(dir));assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));fs.rmSync(dir,{recursive:true,force:true});});
const stock=async id=>Number((await (await database()).prepare('SELECT stock FROM products WHERE id=?').get(id)).stock);
async function order(items=[{id:1,qty:3,size:'M'}],area='dhaka'){
  const request={key:randomUUID(),name:'Test Customer',phone:'01712345678',address:'House 10, Road 2, Dhaka',area,items};
  request.quote=(await quoteOrder(request)).quote;
  const receipt=await placeOrder(request);
  return (await orders()).find(o=>o.id===receipt.id);
}
const edit=(o,changes)=>transaction(db=>editOrder(db,{id:o.id,name:o.name,phone:o.phone,address:o.address,area:o.area,items:o.items.map(({id,qty,size})=>({id,qty,size})),...changes}));
const setStatus=(id,status)=>(async()=>{const db=await database();const row=await db.prepare('SELECT payload FROM orders WHERE id=?').get(id);const o=JSON.parse(row.payload);o.status=status;await db.prepare('UPDATE orders SET payload=? WHERE id=?').run(JSON.stringify(o),id);})();

test('reducing quantity returns stock and recalculates the total',async()=>{
  const o=await order([{id:1,qty:3,size:'M'}]);const before=await stock(1);
  const saved=await edit(o,{items:[{id:1,qty:1,size:'M'}]});
  assert.equal(await stock(1),before+2);
  assert.equal(saved.items[0].qty,1);assert.equal(saved.total,1490+80);
  assert.ok(saved.editedAt);
  assert.deepEqual((await orders()).find(x=>x.id===o.id).items[0].qty,1,'edit is saved');
});

test('increasing quantity takes stock and is refused when stock is short',async()=>{
  const o=await order([{id:4,qty:1,size:'M'}]);const before=await stock(4);
  await edit(o,{items:[{id:4,qty:3,size:'M'}]});
  assert.equal(await stock(4),before-2);
  const current=(await orders()).find(x=>x.id===o.id);
  await assert.rejects(edit(current,{items:[{id:4,qty:3+before,size:'M'}]}),/only .* more available/);
  assert.equal(await stock(4),before-2,'a refused edit changes nothing');
});

test('removing an item restocks it; adding a product uses the current server price',async()=>{
  const o=await order([{id:1,qty:1,size:'S'},{id:3,qty:2,size:'One size'}]);
  const scarf=await stock(3),dress=await stock(4);
  await (await database()).prepare('UPDATE products SET price=? WHERE id=1').run(9999);
  const saved=await edit(o,{items:[{id:1,qty:1,size:'S'},{id:4,qty:1,size:'L',price:1}]});
  assert.equal(await stock(3),scarf+2);assert.equal(await stock(4),dress-1);
  assert.equal(saved.items.find(i=>i.id===1).price,1490,'existing line keeps the quoted price');
  assert.equal(saved.items.find(i=>i.id===4).price,1790,'new line uses the server price, never a client price');
  assert.equal(saved.total,1490+1790+80);
  await (await database()).prepare('UPDATE products SET price=? WHERE id=1').run(1490);
});

test('changing size keeps the product price; duplicate lines are merged',async()=>{
  const o=await order([{id:1,qty:1,size:'M'}]);const before=await stock(1);
  const saved=await edit(o,{items:[{id:1,qty:1,size:'L'},{id:1,qty:2,size:'L'}]});
  assert.equal(saved.items.length,1);assert.equal(saved.items[0].size,'L');assert.equal(saved.items[0].qty,3);
  assert.equal(saved.items[0].price,1490);assert.equal(await stock(1),before-2);
});

test('customer details and delivery area are validated and saved',async()=>{
  const o=await order([{id:3,qty:1,size:'One size'}],'dhaka');
  const saved=await edit(o,{name:'Corrected Name',phone:'+8801812345678',address:'Flat 3B, Agrabad, Chattogram',area:'outside'});
  assert.equal(saved.name,'Corrected Name');assert.equal(saved.phone,'01812345678');assert.equal(saved.area,'outside');
  assert.equal(saved.delivery,150);assert.equal(saved.total,490+150);
  for(const bad of [{phone:'12345'},{address:'short'},{name:'x'},{area:'mars'},{items:[]},{items:[{id:1,qty:0,size:'M'}]},{items:[{id:1,qty:1,size:'XXL'}]},{items:[{id:9999,qty:1,size:'M'}]}])
    await assert.rejects(edit(saved,bad));
});

test('shipped, delivered, cancelled and returned orders are locked',async()=>{
  for(const status of ['Shipped','Delivered','Cancelled','Returned']){
    const o=await order([{id:3,qty:1,size:'One size'}]);await setStatus(o.id,status);const before=await stock(3);
    await assert.rejects(edit(o,{items:[{id:3,qty:2,size:'One size'}]}),/Only New, Confirmed or Processing/);
    assert.equal(await stock(3),before);
  }
  const confirmed=await order([{id:3,qty:1,size:'One size'}]);await setStatus(confirmed.id,'Processing');
  assert.equal((await edit(confirmed,{items:[{id:3,qty:2,size:'One size'}]})).items[0].qty,2,'processing orders can still be corrected');
});
