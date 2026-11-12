// Copies the store catalog, photos and orders into PostgreSQL.
// Dry-run by default. The source is only read; the target must be empty.
//   node --env-file=.env scripts/migrate-postgres.cjs            (dry run)
//   node --env-file=.env scripts/migrate-postgres.cjs --apply
// Source: TURSO_DATABASE_URL/TURSO_AUTH_TOKEN when set, else the SQLite file at DATABASE_PATH.
// Target: DATABASE_URL (postgres://...).
const fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const digest=data=>createHash('sha256').update(Buffer.from(data)).digest('hex');
const TABLES={categories:'SELECT name FROM categories ORDER BY rowid',products:'SELECT * FROM products ORDER BY id',images:'SELECT id,data FROM images ORDER BY id',orders:'SELECT * FROM orders ORDER BY created'};

async function readSqlite(source){
  if(!fs.existsSync(source))throw new Error('The source SQLite database does not exist: '+source);
  const {DatabaseSync}=require('node:sqlite');
  const local=new DatabaseSync(source,{readOnly:true});
  try{
    local.exec('BEGIN');
    const data=Object.fromEntries(Object.entries(TABLES).map(([table,sql])=>[table,local.prepare(sql).all()]));
    local.exec('COMMIT');
    return data;
  }finally{local.close();}
}
async function readTurso(url,authToken){
  const {createClient}=require('@libsql/client/http');
  const client=createClient({url,authToken,intMode:'number'});
  try{
    const data={};
    for(const [table,sql] of Object.entries(TABLES))data[table]=(await client.execute(sql)).rows;
    return data;
  }finally{client.close();}
}

async function transfer({data,apply=false}){
  const summary=Object.fromEntries(Object.entries(data).map(([name,rows])=>[name,rows.length]));
  if(!apply)return summary;
  if(!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL||''))throw new Error('Set DATABASE_URL to the target postgres:// URL.');
  // Create the schema through the app itself, without inserting the demo catalog.
  const previousSeed=process.env.SEED_DEMO;process.env.SEED_DEMO='false';
  const {database,syncProductIds,transaction}=require('../apps/api/dist/lib/database.js');
  const db=await database();
  if(previousSeed===undefined)delete process.env.SEED_DEMO;else process.env.SEED_DEMO=previousSeed;
  try{
    const count='SELECT (SELECT count(*) FROM products)+(SELECT count(*) FROM orders)+(SELECT count(*) FROM categories) AS count';
    if(Number((await db.prepare(count).get()).count)!==0)throw new Error('Target catalog/orders are not empty. Import stopped without overwriting them.');
    // Photos go first, one by one, so a large catalog never needs one huge request.
    // Retrying is safe: an existing photo ID must already hold exactly the same bytes.
    for(const image of data.images){
      const existing=await db.prepare('SELECT data FROM images WHERE id=?').get(image.id);
      if(existing){if(digest(existing.data)!==digest(image.data))throw new Error('An image ID already exists with different contents. Import stopped.');}
      else await db.prepare('INSERT INTO images(id,data) VALUES(?,?)').run(image.id,Buffer.from(image.data));
      if(digest((await db.prepare('SELECT data FROM images WHERE id=?').get(image.id)).data)!==digest(image.data))throw new Error('Photo verification failed.');
    }
    await transaction(async tx=>{
      if(Number((await tx.prepare(count).get()).count)!==0)throw new Error('Target changed during import. Catalog import cancelled.');
      for(const row of data.categories)await tx.prepare('INSERT INTO categories(name) VALUES(?)').run(row.name);
      for(const p of data.products)await tx.prepare('INSERT INTO products(id,name,category,price,stock,image,tag,description,images,offer) VALUES(?,?,?,?,?,?,?,?,?,?)').run(p.id,p.name,p.category,p.price,p.stock,p.image,p.tag,p.description||'',p.images||'[]',p.offer||'null');
      for(const o of data.orders)await tx.prepare('INSERT INTO orders(id,idempotency,payload,created) VALUES(?,?,?,?)').run(o.id,o.idempotency,o.payload,o.created);
      await syncProductIds(tx);
      for(const table of ['categories','products','orders','images'])
        if(Number((await tx.prepare(`SELECT count(*) AS count FROM ${table}`).get()).count)<summary[table])throw new Error('Import row counts did not match.');
    });
    return summary;
  }finally{await db.close();delete globalThis.aurzenDatabase;}
}
module.exports={transfer,readSqlite,readTurso};
if(require.main===module){
  (async()=>{
    const apply=process.argv.includes('--apply');
    const turso=process.env.TURSO_DATABASE_URL;
    if(turso&&!process.env.TURSO_AUTH_TOKEN)throw new Error('Set TURSO_AUTH_TOKEN for the source Turso database.');
    const source=turso?'Turso '+new URL(turso).hostname:path.resolve(process.env.DATABASE_PATH||'data/aurzen.sqlite');
    console.log('Source:',source);
    const data=turso?await readTurso(turso,process.env.TURSO_AUTH_TOKEN):await readSqlite(source);
    const summary=await transfer({data,apply});
    console.log(apply?'Import complete; counts and photo contents verified.':'Dry run only; PostgreSQL was not changed. Re-run with --apply to import.');
    console.log(summary);
    console.log('Admin sessions and login-attempt counters are intentionally not transferred.');
  })().catch(error=>{console.error('Import failed:',error.code||error.message);process.exitCode=1;});
}
