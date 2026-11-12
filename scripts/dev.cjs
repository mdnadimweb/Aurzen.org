const path=require('node:path');
const {createServer}=require('node:http');
process.env.NODE_ENV='development';
process.env.PORT=String(process.env.API_PORT||4000);
require('../apps/api/dist/server.js');
// This Next.js version's Turbopack dev client can loop on HMR hash mismatches
// with the custom server. Webpack preserves Fast Refresh without full reloads.
const next=require('next')({dir:path.resolve('apps/web'),dev:true,webpack:true});
next.prepare().then(()=>createServer(next.getRequestHandler()).listen(Number(process.env.WEB_PORT||3000),'127.0.0.1',()=>console.log('Store: http://localhost:'+(process.env.WEB_PORT||3000)))).catch(error=>{console.error(error);process.exit(1);});
