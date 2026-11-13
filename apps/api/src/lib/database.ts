import {createClient,type Client,type InValue,type Transaction} from '@libsql/client/http';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {localClient} from './local-database';
import {postgresClient} from './postgres-database';
import {seed,type Product,type Order,type HeroSlide} from '@aurzen/shared/catalog';

export type Dialect='postgres'|'sqlite';
// Each write transaction gets its own handle; concurrent requests never share it.
export class Database {
  constructor(public connection:Client|Transaction,public dialect:Dialect='sqlite'){}
  prepare(sql:string){
    const execute=(args:InValue[])=>this.connection.execute({sql,args});
    return {
      get:async(...args:InValue[])=>(await execute(args)).rows[0],
      all:async(...args:InValue[])=>(await execute(args)).rows,
      run:async(...args:InValue[])=>{const result=await execute(args);return {changes:result.rowsAffected};},
    };
  }
  async exec(sql:string){await this.connection.executeMultiple(sql);}
  close():void|Promise<void>{return this.connection.close() as void|Promise<void>;}
}
const state=globalThis as typeof globalThis & {aurzenDatabase?:Promise<Database>};

const postgresSchema=`
  CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS categories(name TEXT PRIMARY KEY,position BIGSERIAL NOT NULL);
  CREATE TABLE IF NOT EXISTS images(id TEXT PRIMARY KEY,data BYTEA NOT NULL);
  CREATE TABLE IF NOT EXISTS products(id SERIAL PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>0),stock INTEGER NOT NULL CHECK(stock>=0),image TEXT NOT NULL,tag TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',images TEXT NOT NULL DEFAULT '[]',offer TEXT NOT NULL DEFAULT 'null');
  CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,idempotency TEXT NOT NULL UNIQUE,payload TEXT NOT NULL,created TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS orders_created ON orders(created);
  CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,expires BIGINT NOT NULL);
  CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires BIGINT NOT NULL);`;
const sqliteSchema=`
  CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS categories(name TEXT PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS images(id TEXT PRIMARY KEY,data BLOB NOT NULL);
  CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,category TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>0),stock INTEGER NOT NULL CHECK(stock>=0),image TEXT NOT NULL,tag TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,idempotency TEXT NOT NULL UNIQUE,payload TEXT NOT NULL,created TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);`;

// Products inserted with explicit IDs (demo seed, data import) must not collide with new ones.
export async function syncProductIds(db:Database){
  if(db.dialect==='postgres')await db.exec("SELECT setval(pg_get_serial_sequence('products','id'),COALESCE((SELECT max(id) FROM products),1),(SELECT count(*)>0 FROM products))");
}

async function initialize(){
  const postgres=process.env.DATABASE_URL,remote=process.env.TURSO_DATABASE_URL;
  let client:Client,dialect:Dialect='sqlite';
  if(postgres){
    if(!/^postgres(ql)?:\/\//.test(postgres))throw new Error('DATABASE_URL must be a postgres:// connection URL.');
    client=postgresClient(postgres);dialect='postgres';
  }else if(remote){
    if(!/^libsql:\/\//.test(remote))throw new Error('TURSO_DATABASE_URL must be a libsql:// database URL.');
    if(!process.env.TURSO_AUTH_TOKEN)throw new Error('Set TURSO_AUTH_TOKEN for the hosted database.');
    client=createClient({url:remote,authToken:process.env.TURSO_AUTH_TOKEN,intMode:'number'});
  }else{
    if(process.env.NETLIFY||process.env.VERCEL)throw new Error('Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the hosting environment. Local SQLite is not persistent on Netlify or Vercel.');
    const path=resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH||'data/aurzen.sqlite');
    mkdirSync(dirname(path),{recursive:true});
    client=localClient(path);
  }
  const local=!postgres&&!remote;
  try{
    if(local)await client.executeMultiple('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    const tx=await client.transaction('write');
    try{
      const db=new Database(tx,dialect);
      if(dialect==='postgres')await db.exec(postgresSchema);
      else{
        await db.exec(sqliteSchema);
        const columns=await db.prepare('PRAGMA table_info(products)').all();
        if(!columns.some(column=>column.name==='description'))await db.exec("ALTER TABLE products ADD COLUMN description TEXT NOT NULL DEFAULT ''");
        if(!columns.some(column=>column.name==='images'))await db.exec("ALTER TABLE products ADD COLUMN images TEXT NOT NULL DEFAULT '[]'");
        if(!columns.some(column=>column.name==='offer'))await db.exec("ALTER TABLE products ADD COLUMN offer TEXT NOT NULL DEFAULT 'null'");
      }
      if(!await db.prepare("SELECT value FROM settings WHERE key='initialized'").get()){
        // A hosted database starts empty: transfer the real catalog with the import script.
        if(!remote&&process.env.SEED_DEMO==='true'){
          for(const category of ['Clothing','Mystery Boxes','Accessories'])await db.prepare('INSERT INTO categories(name) VALUES(?) ON CONFLICT DO NOTHING').run(category);
          for(const p of seed)await db.prepare('INSERT INTO products(id,name,category,price,stock,image,tag) VALUES(?,?,?,?,?,?,?) ON CONFLICT DO NOTHING').run(p.id,p.name,p.category,p.price,p.stock,p.image,p.tag);
        }
        await db.prepare("INSERT INTO settings VALUES('initialized','1')").run();
      }
      await syncProductIds(db);
      await tx.commit();
    }catch(error){if(!tx.closed)await tx.rollback();throw error;}finally{tx.close();}
    return new Database(client,dialect);
  }catch(error){client.close();throw error;}
}
export function database(){
  if(!state.aurzenDatabase)state.aurzenDatabase=initialize().catch(error=>{delete state.aurzenDatabase;throw error;});
  return state.aurzenDatabase;
}
export async function catalog(connection?:Database){
  const db=connection||await database();
  const products=await db.prepare('SELECT * FROM products ORDER BY id').all();
  const categories=await db.prepare(`SELECT name FROM categories ORDER BY ${db.dialect==='postgres'?'position':'rowid'}`).all();
  // null until the owner saves slides; the storefront then shows its automatic defaults.
  const heroRow=await db.prepare("SELECT value FROM settings WHERE key='heroSlides'").get();
  const hero=heroRow?JSON.parse(String(heroRow.value)) as HeroSlide[]:null;
  return {products:products.map(p=>({...p,images:JSON.parse(String(p.images||'[]')),offer:JSON.parse(String(p.offer||'null'))})) as unknown as Product[],categories:categories.map(c=>String(c.name)),hero,serverNow:Date.now()};
}
export async function orders(){
  return (await (await database()).prepare('SELECT payload FROM orders ORDER BY created DESC').all()).map(o=>JSON.parse(String(o.payload)) as Order);
}
export async function transaction<T>(action:(db:Database)=>Promise<T>):Promise<T>{
  const db=await database(),tx=await (db.connection as Client).transaction('write');
  try{const result=await action(new Database(tx,db.dialect));await tx.commit();return result;}
  catch(error){if(!tx.closed)await tx.rollback();throw error;}finally{tx.close();}
}
