require('../scripts/test-environment.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aurzen-staff-'));
process.env.DATABASE_PATH=path.join(dir,'test.sqlite');process.env.ADMIN_PASSWORD='test-only-owner-password-123';process.env.COOKIE_SECURE='false';
const {requestContext}=require('../apps/api/dist/lib/cookies.js');
const auth=require('../apps/api/dist/lib/auth.js');
const {database}=require('../apps/api/dist/lib/database.js');
const admin=require('../apps/api/dist/app/api/admin/route.js');
const session=require('../apps/api/dist/app/api/admin/session/route.js');
test.after(async()=>{(await database()).close();fs.rmSync(dir,{recursive:true,force:true});});
// Runs a handler as a browser with the given cookie, returning the response and any cookie set.
async function call(handler,{method='POST',body,cookie=''}={}){
  const request=new Request('http://localhost/api/admin/',{method,headers:{'content-type':'application/json',origin:'http://localhost',host:'localhost',cookie},body:body?JSON.stringify(body):undefined});
  const context={request,setCookies:[]};
  const response=await requestContext.run(context,()=>handler(request));
  const set=context.setCookies.find(c=>c.startsWith('aurzen_admin='));
  return {response,json:await response.json(),cookie:set?set.split(';')[0]:cookie};
}
test('passwords are salted scrypt hashes and weak ones are refused',()=>{
  const stored=auth.hashPassword('a-good-password');
  assert.notEqual(stored,auth.hashPassword('a-good-password'));
  assert(auth.verifyPassword('a-good-password',stored));assert(!auth.verifyPassword('wrong-password',stored));
  assert.throws(()=>auth.checkNewPassword('short'),/10 to 200/);assert.throws(()=>auth.checkNewPassword('password123456'),/guessable/);
});
test('staff accounts: forced reset, limited actions, no price changes, disable ends access',async()=>{
  const owner=await call(session.POST,{body:{password:'test-only-owner-password-123'}});
  assert.equal(owner.response.status,200);
  const added=await call(admin.POST,{cookie:owner.cookie,body:{action:'saveUser',name:'Rina',username:'Rina',role:'staff',password:'temporary-pass-1'}});
  assert.equal(added.response.status,200,JSON.stringify(added.json));
  const account=added.json.users.find(u=>u.username==='rina');assert(account.mustReset);
  assert.equal((await call(session.POST,{body:{username:'rina',password:'nope-nope-nope'}})).response.status,401);
  const staff=await call(session.POST,{body:{username:'rina',password:'temporary-pass-1'}});
  assert.equal(staff.response.status,200);
  const blocked=await call(admin.POST,{cookie:staff.cookie,body:{action:'markRead',id:'AZ-000000'}});
  assert.equal(blocked.response.status,403);assert.match(blocked.json.error,/new password/);
  const changed=await call(admin.POST,{cookie:staff.cookie,body:{action:'changePassword',current:'temporary-pass-1',password:'my-own-password-9'}});
  assert.equal(changed.response.status,200,JSON.stringify(changed.json));assert.equal(changed.json.me.mustReset,false);
  assert.deepEqual(changed.json.coupons,[]);assert.deepEqual(changed.json.users,[]);
  const settings=await call(admin.POST,{cookie:staff.cookie,body:{action:'saveSite',section:'seo',value:{}}});
  assert.equal(settings.response.status,403);
  const product=changed.json.products[0];
  const price=await call(admin.POST,{cookie:staff.cookie,body:{action:'saveProduct',id:product.id,name:product.name,category:product.category,price:product.price+1,stock:product.stock}});
  assert.equal(price.response.status,403);assert.match(price.json.error,/prices/);
  const stock=await call(admin.POST,{cookie:staff.cookie,body:{action:'stock',id:product.id,stock:7}});
  assert.equal(stock.response.status,200);
  const log=(await call(admin.GET,{method:'GET',cookie:owner.cookie})).json.activity;
  assert(log.some(a=>a.actor==='Rina'&&/Stock/.test(a.detail)));
  await call(admin.POST,{cookie:owner.cookie,body:{action:'saveUser',id:account.id,name:'Rina',username:'rina',role:'staff',disabled:true}});
  assert.equal((await call(admin.GET,{method:'GET',cookie:staff.cookie})).response.status,401);
  assert.equal((await call(session.POST,{body:{username:'rina',password:'my-own-password-9'}})).response.status,401);
});
