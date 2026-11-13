// Runs the storage, checkout and import paths against PostgreSQL.
// Uses TEST_DATABASE_URL when provided (CI runs a real PostgreSQL server); the test then
// works inside its own temporary schema and drops it afterwards. Otherwise it starts an
// in-process PGlite (PostgreSQL compiled to WebAssembly), which accepts one connection.
require('../scripts/test-environment.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {randomUUID}=require('node:crypto');

const external=process.env.TEST_DATABASE_URL;
const schema='aurzen_test_'+randomUUID().replace(/-/g,'').slice(0,12);
let pglite,server,admin,lib;
test.before(async()=>{
  let url;
  if(external){
    const pg=require('pg');
    admin=new pg.Client({connectionString:external});await admin.connect();
    await admin.query(`CREATE SCHEMA ${schema}`);
    const target=new URL(external);target.searchParams.set('options',`-c search_path=${schema}`);url=target.toString();
  }else{
    const {PGlite}=require('@electric-sql/pglite'),{PGLiteSocketServer}=require('@electric-sql/pglite-socket');
    pglite=await PGlite.create();
    server=new PGLiteSocketServer({db:pglite,port:0,host:'127.0.0.1'});
    await server.start();
    url=`postgres://postgres:postgres@127.0.0.1:${server.getServerConn().split(':').pop()}/postgres?sslmode=disable`;
    process.env.DATABASE_POOL_MAX='1';
  }
  Object.assign(process.env,{DATABASE_URL:url,CHECKOUT_ENABLED:'true',SEED_DEMO:'true'});
  lib={...require('../apps/api/dist/lib/database.js'),...require('../apps/api/dist/lib/checkout.js'),...require('../apps/api/dist/lib/auth.js')};
});
test.after(async()=>{
  try{await (await lib.database()).close();}catch{}
  if(admin){await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
  if(server)await server.stop();
  if(pglite)await pglite.close();
});
const order=async(extra={})=>{
  const request={key:randomUUID(),name:'Test Customer',phone:'01712345678',address:'House 10, Road 2, Dhaka',area:'dhaka',items:[{id:1,qty:1,size:'M'}],...extra};
  request.quote=(await lib.quoteOrder(request)).quote;
  return {request,receipt:await lib.placeOrder(request)};
};
// PGlite serves one socket at a time; give it a moment to release a closed pool's socket.
const released=()=>external?Promise.resolve():new Promise(resolve=>setTimeout(resolve,250));
const stock=async id=>Number((await (await lib.database()).prepare('SELECT stock FROM products WHERE id=?').get(id)).stock);

test('PostgreSQL schema initializes with the demo catalog and ordered categories',async()=>{
  const db=await lib.database();
  assert.equal(db.dialect,'postgres');
  const {products,categories}=await lib.catalog();
  assert.deepEqual(categories,['Clothing','Mystery Boxes','Accessories']);
  assert.deepEqual(products.map(p=>p.id),[1,2,3,4]);
  assert.equal(typeof products[0].price,'number');
  assert.deepEqual(products[0].images,[]);
  assert.equal(products[0].offer,null);
});

test('new products receive IDs after explicitly imported ones',async()=>{
  await lib.transaction(async db=>{
    await db.prepare('INSERT INTO products(name,category,price,stock,image,tag,description,images,offer) VALUES(?,?,?,?,?,?,?,?,?)').run('New item','Clothing',500,2,'box','NEW','','[]','null');
  });
  const created=(await lib.catalog()).products.find(p=>p.name==='New item');
  assert(created.id>4);
  await (await lib.database()).prepare('DELETE FROM products WHERE id=?').run(created.id);
});

test('checkout deducts stock once and retries return the original order',async()=>{
  const before=await stock(1);
  const {request,receipt}=await order();
  assert.match(receipt.id,/^AZ-/);
  assert.equal(receipt.total,1490+80);
  assert.deepEqual(await lib.placeOrder(request),receipt);
  assert.equal(await stock(1),before-1);
  const saved=(await lib.orders()).find(o=>o.id===receipt.id);
  assert.equal(saved.paymentMethod,'cod');
  assert.equal(saved.status,'New');
});

test('simultaneous checkouts cannot sell the same final unit twice',async()=>{
  await (await lib.database()).prepare('UPDATE products SET stock=1 WHERE id=4').run();
  const results=await Promise.allSettled(Array.from({length:5},()=>order({items:[{id:4,qty:1,size:'M'}]})));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(await stock(4),0);
});

test('an exception after a write rolls the transaction back',async()=>{
  const before=await stock(2);
  await assert.rejects(lib.transaction(async db=>{
    await db.prepare('UPDATE products SET stock=0 WHERE id=2').run();
    throw new Error('stop');
  }),/stop/);
  assert.equal(await stock(2),before);
});

test('stock can never go negative',async()=>{
  await assert.rejects((await lib.database()).prepare('UPDATE products SET stock=-1 WHERE id=3').run(),/check constraint/);
  // PGlite's test socket drops a connection after a failed query (real PostgreSQL does not);
  // let the pool replace it before the next test.
  if(!external)await (await lib.database()).prepare('SELECT 1').get().catch(()=>{});
});

test('login rate limits count attempts and reject the excess',async()=>{
  const key='pg-test-'+randomUUID();
  await lib.rateLimit(key,2,60000);await lib.rateLimit(key,2,60000);
  await assert.rejects(lib.rateLimit(key,2,60000),/Too many attempts/);
  assert.equal(Number((await (await lib.database()).prepare('SELECT count FROM rate_limits WHERE key=?').get(key)).count),3);
});

test('homepage slides save, replace and reset on PostgreSQL',async()=>{
  const auth=require('../apps/api/dist/lib/auth.js'),{POST}=require('../apps/api/dist/app/api/admin/route.js'),original=auth.requireAdmin;
  const request=data=>new Request('https://aurzen.netlify.app/api/admin/',{method:'POST',headers:{Origin:'https://aurzen.netlify.app','Content-Type':'application/json'},body:JSON.stringify(data)});
  const slide=title=>({eyebrow:'',title,emphasis:'',description:'',image:'box',alt:'Gift box',caption:'',note:'',category:'Mystery Boxes',cta:'Shop now',tone:'plum'});
  try{
    auth.requireAdmin=async()=>{};
    assert.equal((await POST(request({action:'saveHero',slides:[slide('First')]}))).status,200);
    assert.equal((await POST(request({action:'saveHero',slides:[slide('Second')]}))).status,200);
    assert.deepEqual((await lib.catalog()).hero,[slide('Second')]);
    assert.equal((await POST(request({action:'resetHero'}))).status,200);
    assert.equal((await lib.catalog()).hero,null);
  }finally{auth.requireAdmin=original;}
});

test('photo bytes and millisecond timestamps round-trip exactly',async()=>{
  const db=await lib.database(),bytes=Buffer.from([0,1,128,255,42]);
  await db.prepare('INSERT INTO images(id,data) VALUES(?,?)').run('pg-round-trip.webp',bytes);
  assert.deepEqual(Buffer.from((await db.prepare('SELECT data FROM images WHERE id=?').get('pg-round-trip.webp')).data),bytes);
  const expires=Date.now()+8*60*60*1000;
  await db.prepare('INSERT INTO sessions VALUES(?,?)').run('pg-session',expires);
  assert.equal((await db.prepare('SELECT expires FROM sessions WHERE token=?').get('pg-session')).expires,expires);
});

test('import copies a SQLite store into PostgreSQL and refuses to overwrite it',async()=>{
  const {transfer,readSqlite}=require('../scripts/migrate-postgres.cjs');
  const {DatabaseSync}=require('node:sqlite');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aurzen-pg-import-')),source=path.join(dir,'source.sqlite');
  const local=new DatabaseSync(source);
  local.exec(`CREATE TABLE categories(name TEXT PRIMARY KEY);
    CREATE TABLE products(id INTEGER PRIMARY KEY,name TEXT,category TEXT,price INTEGER,stock INTEGER,image TEXT,tag TEXT,description TEXT,images TEXT,offer TEXT);
    CREATE TABLE images(id TEXT PRIMARY KEY,data BLOB);
    CREATE TABLE orders(id TEXT PRIMARY KEY,idempotency TEXT,payload TEXT,created TEXT);`);
  for(const name of ['Sarees','Clothing'])local.prepare('INSERT INTO categories VALUES(?)').run(name);
  local.prepare('INSERT INTO images VALUES(?,?)').run('import.webp',Buffer.from([9,8,7,0,255]));
  local.prepare('INSERT INTO products VALUES(?,?,?,?,?,?,?,?,?,?)').run(41,'Real dress','Sarees',2290,6,'/media/import.webp','NEW','Actual description','["/media/import.webp"]','null');
  local.prepare('INSERT INTO orders VALUES(?,?,?,?)').run('AZ-import','import-key','{"id":"AZ-import","paymentMethod":"cod","total":2370}','2026-11-03T00:00:00.000Z');
  local.close();
  const data=await readSqlite(source);
  assert.deepEqual(await transfer({data}),{categories:2,products:1,images:1,orders:1},'Dry run reports counts');
  // Importing into the already-populated test database must be refused.
  await (await lib.database()).close();delete globalThis.aurzenDatabase;await released();
  await assert.rejects(transfer({data,apply:true}),/not empty/);await released();
  // Empty the store, then import for real.
  const db=await lib.database();
  await db.exec('DELETE FROM orders; DELETE FROM products; DELETE FROM categories;');
  await db.close();delete globalThis.aurzenDatabase;await released();
  await transfer({data,apply:true});await released();
  const {products,categories}=await lib.catalog();
  assert.deepEqual(categories,['Sarees','Clothing']);
  assert.equal(products.length,1);
  assert.equal(products[0].id,41);
  assert.deepEqual(products[0].images,['/media/import.webp']);
  assert.deepEqual(Buffer.from((await (await lib.database()).prepare('SELECT data FROM images WHERE id=?').get('import.webp')).data),Buffer.from([9,8,7,0,255]));
  assert.equal((await lib.orders())[0].id,'AZ-import');
  fs.rmSync(dir,{recursive:true,force:true});
});
