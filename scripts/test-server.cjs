// Test-only: two HTTP services in one process so test teardown cannot orphan a server.
const path=require('node:path');
const {randomBytes}=require('node:crypto');
const {createServer}=require('node:http');
const port=Number(process.argv[2]||3101);
process.env.INTERNAL_API_TOKEN=randomBytes(32).toString('hex');
process.env.INTERNAL_API_URL=`http://127.0.0.1:${port+100}`;
process.env.PORT=String(port+100);
process.env.COOKIE_SECURE='false';
process.env.SEED_DEMO='true';
process.env.ADMIN_PASSWORD||=randomBytes(32).toString('hex');
process.env.NODE_ENV='test';
require('../apps/api/dist/server.js');
process.env.NODE_ENV='production';
const next=require('next')({dir:path.resolve('apps/web'),dev:false});
next.prepare().then(()=>createServer(next.getRequestHandler()).listen(port,'127.0.0.1',()=>console.log('Ready in test stack'))).catch(error=>{console.error(error);process.exit(1);});
