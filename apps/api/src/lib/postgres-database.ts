import pg from 'pg';
import type {Client,Transaction,InStatement,ResultSet,InValue} from '@libsql/client';

// BIGINT columns hold millisecond timestamps and counts; both fit safely in a JS number.
pg.types.setTypeParser(20,value=>Number(value));

// All write transactions take this lock first, so stock checks and deductions
// run one at a time, matching SQLite's single-writer behaviour.
const WRITE_LOCK=727001;

// Rewrites `?` placeholders (outside quoted text) to PostgreSQL's $1, $2, ...
export function toPostgres(sql:string){
  let out='',index=0,quote='';
  for(const char of sql){
    if(quote){if(char===quote)quote='';out+=char;continue;}
    if(char==="'"||char==='"'){quote=char;out+=char;continue;}
    out+=char==='?'?'$'+(++index):char;
  }
  return out;
}
const value=(arg:InValue)=>arg instanceof ArrayBuffer?Buffer.from(arg):arg instanceof Uint8Array?Buffer.from(arg.buffer,arg.byteOffset,arg.byteLength):typeof arg==='bigint'?arg.toString():arg;

type Queryable={query:(text:string,values?:unknown[])=>Promise<pg.QueryResult>};
async function execute(target:Queryable,statement:InStatement){
  const sql=typeof statement==='string'?statement:statement.sql;
  const args=typeof statement==='string'?[]:(statement.args||[]);
  if(!Array.isArray(args))throw new Error('Only positional database arguments are supported.');
  const result=await target.query(toPostgres(sql),args.map(value));
  return {rows:result.rows??[],rowsAffected:result.rowCount??0} as unknown as ResultSet;
}

// Exposes the small libSQL-style surface the rest of the API already uses.
export function postgresClient(url:string):Client{
  const pool=new pg.Pool({
    connectionString:url,
    max:Math.max(1,Number(process.env.DATABASE_POOL_MAX)||10),
    idleTimeoutMillis:30000,
    connectionTimeoutMillis:10000,
    application_name:'aurzen-api',
  });
  // An idle connection dropped by the server must not crash the API process.
  pool.on('error',error=>console.error('PostgreSQL connection error:',error.message));
  return {
    execute:(statement:InStatement)=>execute(pool,statement),
    async executeMultiple(sql:string){await pool.query(sql);},
    async transaction(mode='write'){
      const connection=await pool.connect();let closed=false;
      try{
        await connection.query('BEGIN');
        if(mode==='write')await connection.query('SELECT pg_advisory_xact_lock($1)',[WRITE_LOCK]);
      }catch(error){connection.release(true);throw error;}
      const check=()=>{if(closed)throw new Error('Transaction is closed.');};
      const finish=async(sql:string)=>{
        if(closed)return;closed=true;
        let failed=false;
        try{await connection.query(sql);}catch(error){failed=true;throw error;}finally{connection.release(failed);}
      };
      return {
        get closed(){return closed;},
        async execute(statement:InStatement){check();return execute(connection,statement);},
        async executeMultiple(sql:string){check();await connection.query(sql);},
        async batch(statements:InStatement[]){check();const results=[];for(const statement of statements)results.push(await execute(connection,statement));return results;},
        commit:()=>finish('COMMIT'),rollback:()=>finish('ROLLBACK'),
        close(){if(!closed){closed=true;connection.query('ROLLBACK').then(()=>connection.release(),()=>connection.release(true));}},
      } as unknown as Transaction;
    },
    close(){return pool.end();},
  } as unknown as Client;
}
