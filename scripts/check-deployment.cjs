const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process'),{once}=require('node:events'),{randomBytes}=require('node:crypto');
const assert=require('node:assert/strict');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aurzen-deployment-'));
const token=randomBytes(32).toString('hex'),password=randomBytes(24).toString('hex');
const base='http://127.0.0.1:3120',api='http://127.0.0.1:4120';
const children=[];let logs='';
function start(file,extra){const child=spawn(process.execPath,[file],{env:{...process.env,NODE_ENV:'production',SEED_DEMO:'false',NETLIFY:'',VERCEL:'',TURSO_DATABASE_URL:'',TURSO_AUTH_TOKEN:'',INTERNAL_API_TOKEN:token,ADMIN_PASSWORD:password,DATABASE_PATH:path.join(dir,'store.sqlite'),...extra},stdio:['ignore','pipe','pipe'],windowsHide:true});for(const pipe of [child.stdout,child.stderr])pipe.on('data',value=>logs+=value);children.push(child);return child;}
async function ready(url){for(let i=0;i<150;i++){if(children.some(child=>child.exitCode!==null))throw new Error(logs);try{if((await fetch(url)).ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Readiness timeout: '+logs);}
async function run(){
  const standalone=path.resolve('apps/web/.next/standalone/apps/web');
  for(const [source,destination]of [['apps/web/public',standalone+'/public'],['apps/web/.next/static',standalone+'/.next/static']])fs.cpSync(source,destination,{recursive:true});
  start('apps/api/dist/server.js',{PORT:'4120',HOST:'127.0.0.1',COOKIE_SECURE:'true'});
  await ready(api+'/healthz');
  start(standalone+'/server.js',{PORT:'3120',HOSTNAME:'127.0.0.1',INTERNAL_API_URL:api,CHECKOUT_ENABLED:'false'});
  await ready(base+'/healthz/');
  assert.equal((await fetch(api+'/api/catalog/')).status,401,'Direct API needs its internal credential');
  assert.equal((await fetch(api+'/api/catalog/',{headers:{'x-aurzen-internal-token':'forged'}})).status,401);
  assert.equal((await fetch(base+'/api/admin/')).status,401);
  const catalog=await(await fetch(base+'/api/catalog/')).json();assert.equal(catalog.products.length,0,'Production never seeds sample products');
  assert.equal((await fetch(base+'/api/orders/',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
  assert.equal((await fetch(base+'/api/orders/',{method:'POST',headers:{Origin:'https://attacker.example','Content-Type':'application/json','x-aurzen-internal-token':token},body:'{}'})).status,403);
  assert.equal((await fetch(base+'/api/not-a-route/')).status,404);
  const login=await fetch(base+'/api/admin/session/',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({password})});assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie');assert(cookie.includes('; Secure'));assert(cookie.includes('; HttpOnly'));assert(cookie.includes('SameSite=Strict'));assert(!cookie.includes('Domain='));
  const authenticated=await fetch(base+'/api/admin/',{headers:{Cookie:cookie.split(';')[0]}});assert.equal(authenticated.status,200);
  const first=await fetch(base+'/'),html=await first.text(),policy=first.headers.get('content-security-policy');
  assert(policy);const nonce=policy.match(/'nonce-([^']+)'/)[1];
  assert.match(first.headers.get('cache-control'),/no-store/);
  assert(!policy.includes('unsafe-eval'));assert(policy.includes("frame-ancestors 'none'"));
  const scripts=Array.from(html.matchAll(/<script\b([^>]*)>/g));assert(scripts.length>0);
  for(const script of scripts)assert(script[1].includes(`nonce="${nonce}"`),'Every framework script has the page nonce');
  const second=await fetch(base+'/');assert.notEqual(second.headers.get('content-security-policy'),policy,'Each page gets a fresh nonce');await second.text();
  assert(!html.includes(token));assert(!html.includes(password));
  for(const asset of ['/brand/aurzen-logo.png','/images/fashion-hero.jpeg'])assert.equal((await fetch(base+asset)).status,200);
  const chunk=html.match(/src="([^\"]*\/_next\/static\/[^\"]+\.js)"/);assert(chunk);assert.equal((await fetch(base+chunk[1])).status,200);
  const settings=await(await fetch(base+'/api/orders/')).json();assert.equal(settings.enabled,false);
  const {request}=require('node:http');
  const arbitraryHost=await new Promise((resolve,reject)=>{
    const req=request(base+'/api/admin/session/',{method:'POST',headers:{Host:'changed-domain.example',Origin:'http://changed-domain.example','Content-Type':'application/json'}},response=>{response.resume();response.on('end',()=>resolve(response.statusCode));});
    req.on('error',reject);req.end(JSON.stringify({password}));
  });assert.equal(arbitraryHost,200,'A changed public hostname works without a rebuild');
  const mutate=async data=>{
    const response=await fetch(base+'/api/admin/',{method:'POST',headers:{Origin:base,Cookie:cookie.split(';')[0],'Content-Type':'application/json'},body:JSON.stringify(data)});
    assert.equal(response.status,200);return response.json();
  };
  await mutate({action:'addCategory',name:'Restart verification'});
  await mutate({action:'saveProduct',name:'Persistent production fixture',category:'Restart verification',price:100,stock:2,image:'box'});
  const oldApi=children.shift(),stopped=once(oldApi,'exit');oldApi.kill();await stopped;
  start('apps/api/dist/server.js',{PORT:'4120',HOST:'127.0.0.1',COOKIE_SECURE:'true'});await ready(api+'/healthz');
  const restored=await(await fetch(base+'/api/catalog/')).json();assert(restored.products.some(product=>product.name==='Persistent production fixture'));
  assert.equal((await fetch(base+'/api/admin/',{headers:{Cookie:cookie.split(';')[0]}})).status,200,'Sessions persist across API restart');
  const {execFileSync}=require('node:child_process');
  execFileSync(process.execPath,['scripts/backup.cjs'],{env:{...process.env,DATABASE_PATH:path.join(dir,'store.sqlite'),TURSO_DATABASE_URL:''},stdio:'pipe',windowsHide:true});
  const snapshot=path.join(dir,'backups',fs.readdirSync(path.join(dir,'backups'))[0]);
  const {DatabaseSync}=require('node:sqlite'),backup=new DatabaseSync(snapshot,{readOnly:true});
  try{assert.equal(backup.prepare('SELECT count(*) AS count FROM products').get().count,1);}finally{backup.close();}
  console.log('PASS API restart retains products and sessions; consistent SQLite backup contains the saved product.');
  console.log('PASS production standalone frontend + independent API: readiness, empty persistent database, internal authentication, CSRF, secure cookies, CSP nonces, assets, no secret leakage and disabled checkout.');
}
run().catch(error=>{console.error(error);console.error(logs);process.exitCode=1;}).finally(async()=>{
  for(const child of children.reverse())if(child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}
  const relative=path.relative(os.tmpdir(),dir);assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));fs.rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:100});
});
