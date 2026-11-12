require('../scripts/test-environment.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'aurzen-offers-'));
process.env.DATABASE_PATH=path.join(directory,'test.sqlite');
process.env.CHECKOUT_ENABLED='true';process.env.SEED_DEMO='true';
for(const name of ['TURSO_DATABASE_URL','TURSO_AUTH_TOKEN','NETLIFY','VERCEL','INTERNAL_API_TOKEN'])delete process.env[name];
const {DatabaseSync}=require('node:sqlite');
const legacy=new DatabaseSync(process.env.DATABASE_PATH);
legacy.exec('CREATE TABLE products(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,category TEXT NOT NULL,price INTEGER NOT NULL,stock INTEGER NOT NULL,image TEXT NOT NULL,tag TEXT NOT NULL)');
legacy.prepare('INSERT INTO products VALUES(?,?,?,?,?,?,?)').run(100,'Legacy offer fixture','Accessories',1250,30,'box','TEST');legacy.close();
const {productPricing,normalizeOffer}=require('@aurzen/shared/catalog');
const {database,catalog,orders}=require('../apps/api/dist/lib/database.js');
const {quoteOrder,placeOrder}=require('../apps/api/dist/lib/checkout.js');
const product={id:100,name:'Offer fixture',category:'Accessories',price:1250,stock:30,image:'box',tag:'TEST'};
const offer=(extra={})=>({enabled:true,percent:20,startsAt:null,endsAt:null,...extra});
const input=(extra={})=>({key:randomUUID(),name:'Offer Test',phone:'01712345678',address:'House 10, Road 2, Dhaka',area:'dhaka',items:[{id:100,qty:1,size:'One size'}],...extra});
async function saveOffer(value,price=1250){await(await database()).prepare('UPDATE products SET offer=?,price=? WHERE id=100').run(JSON.stringify(value),price);}
test.after(async()=>{(await database()).close();const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(directory));assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));fs.rmSync(directory,{recursive:true,force:true});});

test('offer pricing covers regular, active 20%, disabled, future and expired offers',()=>{
 const now=Date.parse('2030-01-01T00:00:00Z');
 for(const value of [undefined,null,offer({enabled:false}),offer({startsAt:'2030-01-02T00:00:00Z'}),offer({endsAt:'2030-01-01T00:00:00Z'})]){
  const result=productPricing({...product,offer:value},now);assert.equal(result.active,false);assert.equal(result.unitPrice,1250);assert.equal(result.savings,0);
 }
 const active=productPricing({...product,offer:offer({startsAt:'2030-01-01T00:00:00Z',endsAt:'2030-01-02T00:00:00Z'})},now);
 assert.equal(active.unitPrice,1000);assert.equal(active.savings,250);assert.equal(active.percent,20);assert.equal(active.active,true);
 assert.equal(productPricing({...product,offer:offer()},now).unitPrice,1000);
});

test('BDT rounds each discounted unit to whole taka with a positive minimum',()=>{
 for(const [price,percent,expected]of [[1250,20,1000],[1251,20,1001],[101,50,51],[99,50,50],[1,99,1]]){
  assert.equal(productPricing({...product,price,offer:offer({percent})}).unitPrice,expected);
 }
 const rounded=productPricing({...product,price:101,offer:offer({percent:50})}).unitPrice;
 assert.equal(rounded*3,153,'Round the unit once before multiplying quantity');
});

test('offer validation rejects invalid percentages, ambiguous dates and reversed ranges',()=>{
 assert.equal(normalizeOffer(null),null);
 for(const percent of [0,100,-1,20.5,'20',null])assert.throws(()=>normalizeOffer(offer({percent})));
 for(const invalid of [[],{},'sale',offer({enabled:1}),offer({startsAt:'2030-01-01T12:00'}),offer({endsAt:'not-a-date'}),offer({startsAt:'2030-02-30T12:00:00Z'}),offer({startsAt:'2030-01-02T00:00:00Z',endsAt:'2030-01-01T00:00:00Z'}),offer({startsAt:'2030-01-01T00:00:00Z',endsAt:'2030-01-01T00:00:00Z'})])assert.throws(()=>normalizeOffer(invalid));
 const normalized=normalizeOffer(offer({startsAt:'2030-01-01T12:00:00+06:00',endsAt:'2030-01-01T13:00:00+06:00'}));
 assert.equal(normalized.startsAt,'2030-01-01T06:00:00.000Z');assert.equal(normalized.endsAt,'2030-01-01T07:00:00.000Z');
 for(const startsAt of ['2030-01-01T24:00:00Z','2030-01-01T24:00+06:00','2030-01-01T12:60:00Z','2030-01-01T12:00:60Z'])assert.throws(()=>normalizeOffer(offer({startsAt})),startsAt);
});

test('legacy migration keeps existing regular prices and defaults to no offer',async()=>{
 const migrated=(await catalog()).products.find(p=>p.id===100);
 assert.equal(migrated.price,1250);assert.equal(migrated.stock,30);assert.equal(migrated.offer,null);
 assert((await(await database()).prepare('PRAGMA table_info(products)').all()).some(c=>c.name==='offer'));
});

test('admin offer updates require authentication, validate server-side and preserve old-client edits',async()=>{
 const auth=require('../apps/api/dist/lib/auth.js'),original=auth.requireAdmin;
 const {POST}=require('../apps/api/dist/app/api/admin/route.js');
 const payload={action:'saveProduct',...product};
 const request=data=>new Request('https://store.example/api/admin/',{method:'POST',headers:{Origin:'https://store.example','Content-Type':'application/json'},body:JSON.stringify(data)});
 try{
  assert.equal((await POST(request({...payload,offer:offer()}))).status,401);
  auth.requireAdmin=async()=>{};
  for(const value of [offer({percent:0}),offer({percent:100}),offer({percent:1.2}),offer({startsAt:'2030-01-01T12:00'}),offer({startsAt:'2030-01-02T00:00Z',endsAt:'2030-01-01T00:00Z'})])assert.equal((await POST(request({...payload,offer:value}))).status,400);
  assert.equal((await POST(request({...payload,offer:offer()}))).status,200);
  assert.equal((await POST(request({...payload,name:'Legacy edit without offer'}))).status,200);
  assert.deepEqual((await catalog()).products.find(p=>p.id===100).offer,offer());
  assert.equal((await POST(request({...payload,offer:null}))).status,200);
  assert.equal((await catalog()).products.find(p=>p.id===100).offer,null);
 }finally{auth.requireAdmin=original;}
});

test('quotes price identical bag and Buy Now items and orders retain actual charged unit prices',async()=>{
 await saveOffer(offer());
 const request=input({items:[{id:100,qty:2,size:'One size'}]});
 const bag=await quoteOrder(request),buyNow=await quoteOrder({...request,source:'buy-now'});
 assert.equal(bag.items[0].price,1000);assert.equal(bag.subtotal,2000);assert.equal(bag.delivery,80);assert.equal(bag.total,2080);assert.equal(buyNow.total,bag.total);assert.equal(buyNow.quote,bag.quote);
 const receipt=await placeOrder({...request,quote:bag.quote,total:1});
 await saveOffer(null,1500);
 const saved=(await orders()).find(o=>o.id===receipt.id);
 assert.equal(saved.items[0].price,1000);assert.equal(saved.total,2080);
 assert.deepEqual(await placeOrder({...request,quote:bag.quote}),receipt,'A retry returns the original saved order after an offer changes');
});

test('missing and stale quote reviews cannot create orders or deduct stock',async()=>{
 const originalNow=Date.now,start=Date.parse('2030-01-01T00:00:00Z');
 try{
  Date.now=()=>start;
  await saveOffer(offer({endsAt:new Date(start+1000).toISOString()}));
  const request=input(),reviewed=await quoteOrder(request),stock=(await catalog()).products.find(p=>p.id===100).stock,count=(await orders()).length;
  assert.equal(reviewed.items[0].price,1000);
  await assert.rejects(placeOrder(request),error=>error.status===409);
  Date.now=()=>start+1000;
  await assert.rejects(placeOrder({...request,quote:reviewed.quote}),error=>error.status===409);
  assert.equal((await orders()).length,count);assert.equal((await catalog()).products.find(p=>p.id===100).stock,stock);
  const updated=await quoteOrder(request);assert.equal(updated.items[0].price,1250);assert.notEqual(updated.quote,reviewed.quote);
  const receipt=await placeOrder({...request,quote:updated.quote});assert.equal(receipt.total,1330);
  assert.equal((await orders()).length,count+1);assert.equal((await catalog()).products.find(p=>p.id===100).stock,stock-1);
 }finally{Date.now=originalNow;}
});
