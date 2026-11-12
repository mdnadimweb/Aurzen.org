import {DatabaseSync} from 'node:sqlite';
import type {Client,Transaction,InStatement,ResultSet,InValue} from '@libsql/client';

// Keep the existing local SQLite files usable without loading a native libSQL binary.
export function localClient(path:string):Client{
  const db=new DatabaseSync(path);
  let tail=Promise.resolve();
  async function lock(){let release:()=>void;const next=new Promise<void>(resolve=>{release=resolve;});const previous=tail;tail=next;await previous;return release!;}
  function execute(statement:InStatement):ResultSet{
    const sql=typeof statement==='string'?statement:statement.sql;
    const values=typeof statement==='string'?[]:(statement.args||[]);
    if(!Array.isArray(values))throw new Error('Only positional SQLite arguments are supported.');
    const args=values.map((value:InValue)=>value instanceof ArrayBuffer?new Uint8Array(value):value) as (string|number|bigint|Uint8Array|null)[];
    const prepared=db.prepare(sql),columns=prepared.columns();
    if(columns.length)return {rows:prepared.all(...args),rowsAffected:0} as unknown as ResultSet;
    const result=prepared.run(...args);return {rows:[],rowsAffected:Number(result.changes)} as unknown as ResultSet;
  }
  return {
    async execute(statement:InStatement){const release=await lock();try{return execute(statement);}finally{release();}},
    async executeMultiple(sql:string){const release=await lock();try{db.exec(sql);}finally{release();}},
    async transaction(mode='write'){
      const release=await lock();let closed=false;
      const finish=async(sql:string)=>{if(closed)return;try{db.exec(sql);}finally{closed=true;release();}};
      try{db.exec(mode==='write'?'BEGIN IMMEDIATE':'BEGIN');}catch(error){release();throw error;}
      const check=()=>{if(closed)throw new Error('Transaction is closed.');};
      return {
        get closed(){return closed;},
        async execute(statement:InStatement){check();return execute(statement);},
        async executeMultiple(sql:string){check();db.exec(sql);},
        async batch(statements:InStatement[]){check();return statements.map(execute);},
        commit:()=>finish('COMMIT'),rollback:()=>finish('ROLLBACK'),
        close(){if(!closed){try{db.exec('ROLLBACK');}finally{closed=true;release();}}},
      } as Transaction;
    },
    close(){db.close();},
  } as Client;
}