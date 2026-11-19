require('../scripts/test-environment.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'aurzen-storefront-'));
process.env.DATABASE_PATH=path.join(directory,'test.sqlite');process.env.SEED_DEMO='true';
for(const name of ['TURSO_DATABASE_URL','TURSO_AUTH_TOKEN','DATABASE_URL','NETLIFY','VERCEL'])delete process.env[name];
const {normalizeStorefront,categoryCover,defaultStorefront}=require('@aurzen/shared/catalog');
const {database,catalog}=require('../apps/api/dist/lib/database.js');
const auth=require('../apps/api/dist/lib/auth.js');
const {POST}=require('../apps/api/dist/app/api/admin/route.js');
const request=data=>new Request('https://aurzen.netlify.app/api/admin/',{method:'POST',headers:{Origin:'https://aurzen.netlify.app','Content-Type':'application/json'},body:JSON.stringify(data)});
const settings=(extra={})=>({announcement:{message:'Eid edit is here.',detail:'Free gift wrap this week'},covers:{},...extra});
test.after(async()=>{
  (await database()).close();
  const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(directory));
  assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
  fs.rmSync(directory,{recursive:true,force:true});
});

test('storefront validation trims text and rejects missing, long or malformed values',()=>{
  const result=normalizeStorefront({...settings({announcement:{message:'  Eid   edit ',detail:' '},covers:{Clothing:1}}),extra:'ignored'});
  assert.deepEqual(result,{announcement:{message:'Eid edit',detail:''},covers:{Clothing:1},featured:[]});
  assert.throws(()=>normalizeStorefront(settings({announcement:{message:' ',detail:''}})),/message is required/);
  assert.throws(()=>normalizeStorefront(settings({announcement:{message:'x'.repeat(81),detail:''}})),/at most 80/);
  assert.throws(()=>normalizeStorefront(settings({announcement:{message:'Hi',detail:'x'.repeat(81)}})),/detail must be at most 80/);
  for(const covers of [{Clothing:'1'},{Clothing:0},{Clothing:1.5},{'':1},[1]])assert.throws(()=>normalizeStorefront(settings({covers})));
  assert.throws(()=>normalizeStorefront(null),/Invalid storefront/);
  assert.throws(()=>normalizeStorefront({covers:{}}),/Invalid announcement/);
});

test('category cover uses the owner choice only while it still belongs to that category',()=>{
  const products=[{id:1,category:'Clothing',image:'box'},{id:2,category:'Clothing',image:'/a.jpg'},{id:3,category:'Accessories',image:'/b.jpg'}];
  assert.equal(categoryCover('Clothing',products).id,2,'Automatic prefers a real photo');
  assert.equal(categoryCover('Clothing',products,{Clothing:1}).id,1);
  assert.equal(categoryCover('Clothing',products,{Clothing:3}).id,2,'A product moved to another category is ignored');
  assert.equal(categoryCover('Clothing',products,{Clothing:99}).id,2,'A deleted product is ignored');
  assert.equal(categoryCover('Shoes',products),undefined);
});

test('saving storefront requires admin, checks categories and covers, and replaces the setting',async()=>{
  const original=auth.requireAdmin;
  assert.equal((await catalog()).storefront,null,'Built-in text until the owner saves');
  assert.equal((await POST(request({action:'saveStorefront',storefront:settings()}))).status,401);
  try{
    auth.requireAdmin=async()=>{};
    const {products}=await catalog(),clothing=products.find(p=>p.category==='Clothing'),other=products.find(p=>p.category!=='Clothing');
    let response=await POST(request({action:'saveStorefront',storefront:settings({covers:{'Missing category':clothing.id}})}));
    assert.equal(response.status,400);assert.match((await response.json()).error,/no longer exists/);
    response=await POST(request({action:'saveStorefront',storefront:settings({covers:{Clothing:other.id}})}));
    assert.equal(response.status,400);assert.match((await response.json()).error,/cover product from Clothing/);
    response=await POST(request({action:'saveStorefront',storefront:settings({announcement:{message:'',detail:''}})}));
    assert.equal(response.status,400);
    assert.equal((await catalog()).storefront,null,'Rejected saves leave the storefront unchanged');

    const saved={...settings({covers:{Clothing:clothing.id}}),featured:[]};
    response=await POST(request({action:'saveStorefront',storefront:saved}));
    assert.equal(response.status,200);
    assert.deepEqual((await response.json()).storefront,saved,'The admin response carries the saved settings');
    assert.deepEqual((await catalog()).storefront,saved);
    const replacement={announcement:defaultStorefront.announcement,covers:{},featured:[]};
    assert.equal((await POST(request({action:'saveStorefront',storefront:replacement}))).status,200);
    assert.deepEqual((await catalog()).storefront,replacement,'Saving again replaces the single settings row');
  }finally{auth.requireAdmin=original;}
});
