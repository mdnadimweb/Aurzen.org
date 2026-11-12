// Used against Docker Compose in CI; all writes target the isolated CI volume.
const assert=require('node:assert/strict');
const base=process.env.SMOKE_URL||'http://127.0.0.1:3000';
(async()=>{
  for(let i=0;i<120;i++){
    try{if((await fetch(base+'/healthz/')).ok)break;}catch{}
    if(i===119)throw new Error('Container readiness timeout');
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  const page=await fetch(base+'/');assert.equal(page.status,200);assert(page.headers.has('content-security-policy'));await page.text();
  const response=await fetch(base+'/api/catalog/');assert.equal(response.status,200);assert(Array.isArray((await response.json()).products));
  assert.equal((await fetch(base+'/api/admin/')).status,401);
  const login=await fetch(base+'/api/admin/session/',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({password:process.env.ADMIN_PASSWORD})});assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const change=async data=>{const response=await fetch(base+'/api/admin/',{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(data)});assert.equal(response.status,200);return response.json();};
  await change({action:'addCategory',name:'Container Test'});
  const data=await change({action:'saveProduct',name:'Persistent container fixture',category:'Container Test',price:100,stock:2,image:'box'});
  assert(data.products.some(product=>product.name==='Persistent container fixture'));
  console.log('PASS Docker HTTP, CSP, API proxy, admin login and persistent database writes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
