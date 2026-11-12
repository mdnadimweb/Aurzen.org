const {DatabaseSync}=require('node:sqlite');
const {existsSync,mkdirSync}=require('node:fs');
const {resolve,dirname}=require('node:path');
if(process.env.DATABASE_URL)throw new Error('This command backs up local SQLite only. Back up PostgreSQL with pg_dump (see README: Backups).');
if(process.env.TURSO_DATABASE_URL)throw new Error('This command backs up local SQLite only. Use hosted Turso backups/export for the remote database.');
const source=resolve(process.env.DATABASE_PATH||'data/aurzen.sqlite');
if(!existsSync(source))throw new Error('No database exists yet. Start the app first.');
const folder=resolve(dirname(source),'backups');mkdirSync(folder,{recursive:true});
const target=resolve(folder,`aurzen-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`);
const db=new DatabaseSync(source);try{db.exec('PRAGMA busy_timeout=5000');db.prepare('VACUUM INTO ?').run(target);console.log(`Consistent database snapshot saved to ${target}. Keep an additional copy outside this computer.`);}finally{db.close();}
