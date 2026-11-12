// Dry-run by default. Source database is opened read-only and never modified.
const fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {createClient}=require('@libsql/client/http');
const {createHash}=require('node:crypto');
const digest=data=>createHash('sha256').update(data).digest('hex');

async function transfer({source,client,apply=false,initialize}){
  if(!fs.existsSync(source))throw new Error('The local database does not exist. Start the local store first.');
  const local=new DatabaseSync(source,{readOnly:true});
  let data;
  try{
    local.exec('BEGIN');
    data=Object.fromEntries(['categories','products','images','orders'].map(table=>[table,local.prepare(`SELECT * FROM ${table}`).all()]));
    local.exec('COMMIT');
  }finally{local.close();}
  const summary=Object.fromEntries(Object.entries(data).map(([name,rows])=>[name,rows.length]));
  if(!apply)return summary;
  // Initialize the shared schema through the app, without inserting a sample hosted catalog.
  const {database}=require('../apps/api/dist/lib/database.js');
  const appDb=initialize?await initialize():await database();
  try{
    const check=await client.execute('SELECT (SELECT count(*) FROM products)+(SELECT count(*) FROM orders)+(SELECT count(*) FROM categories) AS count');
    if(Number(check.rows[0].count)!==0)throw new Error('Target catalog/orders are not empty. Import stopped without overwriting them.');
    // Stage images individually so a large catalog does not exceed one HTTP request limit.
    // Retry is safe: existing image IDs must contain exactly the same bytes.
    for(const image of data.images){
      const existing=await client.execute({sql:'SELECT data FROM images WHERE id=?',args:[image.id]});
      if(existing.rows.length){
        if(digest(Buffer.from(existing.rows[0].data))!==digest(image.data))throw new Error('An image ID already exists with different contents. Import stopped.');
      }else await client.execute({sql:'INSERT INTO images(id,data) VALUES(?,?)',args:[image.id,image.data]});
      const verified=await client.execute({sql:'SELECT data FROM images WHERE id=?',args:[image.id]});
      if(digest(Buffer.from(verified.rows[0].data))!==digest(image.data))throw new Error('Photo verification failed.');
    }
    const tx=await client.transaction('write');
    try{
      const current=await tx.execute('SELECT (SELECT count(*) FROM products)+(SELECT count(*) FROM orders)+(SELECT count(*) FROM categories) AS count');
      if(Number(current.rows[0].count)!==0)throw new Error('Target changed during import. Catalog import cancelled.');
      const statements=[];
      for(const row of data.categories)statements.push({sql:'INSERT INTO categories(name) VALUES(?)',args:[row.name]});
      for(const p of data.products)statements.push({sql:'INSERT INTO products(id,name,category,price,stock,image,tag,description,images,offer) VALUES(?,?,?,?,?,?,?,?,?,?)',args:[p.id,p.name,p.category,p.price,p.stock,p.image,p.tag,p.description||'',p.images||'[]',p.offer||'null']});
      for(const o of data.orders)statements.push({sql:'INSERT INTO orders(id,idempotency,payload,created) VALUES(?,?,?,?)',args:[o.id,o.idempotency,o.payload,o.created]});
      if(statements.length)await tx.batch(statements);
      for(const table of ['categories','products','orders']){
        const result=await tx.execute(`SELECT count(*) AS count FROM ${table}`);
        if(Number(result.rows[0].count)!==summary[table])throw new Error('Import row counts did not match.');
      }
      await tx.commit();
    }catch(error){if(!tx.closed)await tx.rollback();throw error;}finally{tx.close();}
    return summary;
  }finally{appDb.close();delete globalThis.aurzenDatabase;}
}
module.exports={transfer};
if(require.main===module){
  (async()=>{
    const apply=process.argv.includes('--apply');
    const source=path.resolve(process.env.DATABASE_PATH||'data/aurzen.sqlite');
    if(apply&&(!process.env.TURSO_DATABASE_URL||!process.env.TURSO_AUTH_TOKEN))throw new Error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in your private environment file.');
    const client=apply?createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN,intMode:'number'}):null;
    try{
      const summary=await transfer({source,client,apply});
      console.log(apply?'Transfer complete; counts and image contents verified.':'Dry run only; no hosted data changed.');
      console.log(summary);
      console.log('Admin sessions and login-attempt counters are intentionally not transferred.');
    }finally{client?.close();}
  })().catch(error=>{console.error('Transfer failed:',error.code||error.message);process.exitCode=1;});
}
