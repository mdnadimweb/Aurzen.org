require('../scripts/test-environment.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {localClient}=require('../apps/api/dist/lib/local-database.js');
const {transfer}=require('../scripts/migrate-turso.cjs');

for(const withGallery of [false,true])test(`catalog transfer preserves ${withGallery?'ordered galleries':'legacy photos'}, IDs, prices, stock, orders and photo bytes; refuses overwrite`,async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aurzen-transfer-'));
 const source=path.join(dir,'source.sqlite'),target=path.join(dir,'target.sqlite');
 const db=new DatabaseSync(source);
 const schema=`CREATE TABLE categories(name TEXT PRIMARY KEY);
 CREATE TABLE products(id INTEGER PRIMARY KEY,name TEXT,category TEXT,price INTEGER,stock INTEGER,image TEXT,tag TEXT,description TEXT);
 CREATE TABLE images(id TEXT PRIMARY KEY,data BLOB);
 CREATE TABLE orders(id TEXT PRIMARY KEY,idempotency TEXT,payload TEXT,created TEXT);`;
 db.exec(schema);
 db.prepare('INSERT INTO categories VALUES(?)').run('Clothing');
 const bytes=Buffer.from([0,1,128,255,42]);
 db.prepare('INSERT INTO images VALUES(?,?)').run('test.webp',bytes);
 db.prepare('INSERT INTO products VALUES(?,?,?,?,?,?,?,?)').run(7,'Real dress','Clothing',1290,6,'/media/test.webp','NEW','Actual description');
 const gallery=['/media/test.webp','https://example.com/detail.webp'];
 const offer={enabled:true,percent:20,startsAt:'2030-01-01T00:00:00.000Z',endsAt:null};
 if(withGallery){
  db.exec("ALTER TABLE products ADD COLUMN images TEXT NOT NULL DEFAULT '[]'");
  db.exec("ALTER TABLE products ADD COLUMN offer TEXT NOT NULL DEFAULT 'null'");
  db.prepare('UPDATE products SET images=? WHERE id=?').run(JSON.stringify(gallery),7);
  db.prepare('UPDATE products SET offer=? WHERE id=?').run(JSON.stringify(offer),7);
 }
 db.prepare('INSERT INTO orders VALUES(?,?,?,?)').run('AZ-test','test-key','{"paymentMethod":"cod","total":1370}','2026-11-03');db.close();
 const client=localClient(target);
 try{
  await client.executeMultiple(schema);
  const initialize=async()=>{
   // Match the application's idempotent migration before importing either schema.
   const columns=(await client.execute('PRAGMA table_info(products)')).rows;
   if(!columns.some(column=>column.name==='images'))await client.executeMultiple("ALTER TABLE products ADD COLUMN images TEXT NOT NULL DEFAULT '[]'");
   if(!columns.some(column=>column.name==='offer'))await client.executeMultiple("ALTER TABLE products ADD COLUMN offer TEXT NOT NULL DEFAULT 'null'");
   return {close(){}};
  };
  const expected={categories:1,products:1,images:1,orders:1};
  assert.deepEqual(await transfer({source,client}),expected);
  assert.equal((await client.execute('SELECT count(*) AS n FROM products')).rows[0].n,0);
  assert.deepEqual(await transfer({source,client,apply:true,initialize}),expected);
  const product=(await client.execute('SELECT * FROM products')).rows[0];
  assert.equal(product.id,7);assert.equal(product.price,1290);assert.equal(product.stock,6);assert.equal(product.description,'Actual description');
  assert.equal(product.image,gallery[0]);
  assert.deepEqual(JSON.parse(product.images),withGallery?gallery:[]);
  assert.deepEqual(JSON.parse(product.offer),withGallery?offer:null);
  assert.deepEqual(Buffer.from((await client.execute('SELECT data FROM images')).rows[0].data),bytes);
  assert.equal((await client.execute('SELECT payload FROM orders')).rows[0].payload,'{"paymentMethod":"cod","total":1370}');
  await assert.rejects(transfer({source,client,apply:true,initialize}),/not empty/);
  const original=new DatabaseSync(source,{readOnly:true});
  try{
   assert.equal(original.prepare('SELECT stock FROM products WHERE id=7').get().stock,6);
   if(withGallery)assert.deepEqual(JSON.parse(original.prepare('SELECT images FROM products WHERE id=7').get().images),gallery);
   else assert.equal(original.prepare('PRAGMA table_info(products)').all().some(column=>column.name==='images'),false);
  }finally{original.close();}
 }finally{
  client.close();
  const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(dir));assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
