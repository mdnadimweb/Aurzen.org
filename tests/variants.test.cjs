// Owner-chosen sizes and colours: admin saving, storefront rules, checkout, order edits and tracking.
require('../scripts/test-environment.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'aurzen-variants-'));
process.env.DATABASE_PATH=path.join(directory,'test.sqlite');
process.env.CHECKOUT_ENABLED='true';process.env.SEED_DEMO='true';
for(const name of ['TURSO_DATABASE_URL','TURSO_AUTH_TOKEN','NETLIFY','VERCEL','INTERNAL_API_TOKEN'])delete process.env[name];
const shared=require('@aurzen/shared/catalog');
const {database,catalog,orders,transaction}=require('../apps/api/dist/lib/database.js');
const auth=require('../apps/api/dist/lib/auth.js');
const {POST}=require('../apps/api/dist/app/api/admin/route.js');
const {quoteOrder,placeOrder}=require('../apps/api/dist/lib/checkout.js');
const {editOrder}=require('../apps/api/dist/lib/order-edit.js');
const {publicOrder}=require('../apps/api/dist/lib/tracking.js');

// Seed product 3 is 'Soft Satin Scarf' (Accessories): no sizes or colours by default.
const base={action:'saveProduct',id:3,name:'Soft Satin Scarf',category:'Accessories',price:490,stock:30,image:'box',images:[],tag:'TEST'};
const request=data=>new Request('https://aurzen.netlify.app/api/admin/',{method:'POST',headers:{Origin:'https://aurzen.netlify.app','Content-Type':'application/json'},body:JSON.stringify(data)});
const product=async(id=3)=>(await catalog()).products.find(p=>p.id===id);
async function asAdmin(run){const original=auth.requireAdmin;auth.requireAdmin=async()=>({id:null,name:'Owner',role:'owner',mustReset:false});try{return await run();}finally{auth.requireAdmin=original;}}
const checkout=(items)=>({key:randomUUID(),name:'Variant Customer',phone:'01712345678',address:'House 10, Road 2, Dhaka',area:'dhaka',items});
async function order(items){const input=checkout(items);input.quote=(await quoteOrder(input)).quote;const receipt=await placeOrder(input);return (await orders()).find(o=>o.id===receipt.id);}
test.after(async()=>{(await database()).close();const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(directory));assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));fs.rmSync(directory,{recursive:true,force:true});});

test('shared rules: owner sizes win, no colours means no colour, lists are cleaned',()=>{
  assert.deepEqual(shared.productOptions({category:'Accessories'}),['One size']);
  assert.equal(shared.hasSizeChoice({category:'Accessories'}),false);
  assert.deepEqual(shared.productOptions({category:'Accessories',sizes:['S','M']}),['S','M']);
  assert.equal(shared.hasSizeChoice({category:'Accessories',sizes:['S']}),true);
  assert.deepEqual(shared.productOptions({category:'Clothing',sizes:[]}),['S','M','L','XL'],'older Clothing products keep their sizes');
  assert.equal(shared.validColor({},''),true);assert.equal(shared.validColor({},undefined),true);assert.equal(shared.validColor({},'Red'),false);
  assert.equal(shared.validColor({colors:['Red']},'Red'),true);assert.equal(shared.validColor({colors:['Red']},''),false);assert.equal(shared.validColor({colors:['Red']},'Blue'),false);
  assert.deepEqual(shared.normalizeVariants(['  M ','m','L','',' Off   white '],'size'),['M','L','Off white']);
  assert.deepEqual(shared.normalizeVariants(undefined,'size'),[]);
  assert.throws(()=>shared.normalizeVariants(['x'.repeat(31)],'colour'),/at most 30 characters/);
  assert.throws(()=>shared.normalizeVariants(Array.from({length:21},(_,i)=>'C'+i),'colour'),/at most 20 colours/);
  assert.throws(()=>shared.normalizeVariants('M,L','size'),/Invalid size list/);
  assert.equal(shared.optionLabel({size:'M',color:'Red'}),'M · Red');
  assert.equal(shared.optionLabel({size:'One size',color:'Red'}),'Red');
  assert.equal(shared.optionLabel({size:'One size'}),'One size');
  assert.equal(shared.sameLine({id:1,size:'M'},{id:1,size:'M',color:''}),true);
  assert.equal(shared.sameLine({id:1,size:'M',color:'Red'},{id:1,size:'M',color:'Blue'}),false);
});

test('admin saves sizes and colours; leaving them out keeps them; [] turns them off',async()=>{
  assert.equal((await POST(request({...base,sizes:['S']}))).status,401,'requires admin');
  await asAdmin(async()=>{
    assert.equal((await POST(request({...base,sizes:[' S','M','m'],colors:['Red','Black']}))).status,200);
    let p=await product();assert.deepEqual(p.sizes,['S','M']);assert.deepEqual(p.colors,['Red','Black']);
    assert.equal((await POST(request({...base,name:'Soft Satin Scarf'}))).status,200);
    p=await product();assert.deepEqual(p.sizes,['S','M']);assert.deepEqual(p.colors,['Red','Black'],'older clients keep variants');
    const bad=await POST(request({...base,colors:['x'.repeat(40)]}));
    assert.equal(bad.status,400);assert.match((await bad.json()).error,/at most 30 characters/);
    assert.deepEqual((await product()).colors,['Red','Black'],'rejected save changes nothing');
    assert.equal((await POST(request({...base,sizes:[],colors:[]}))).status,200);
    p=await product();assert.deepEqual(p.sizes,[]);assert.deepEqual(p.colors,[]);
    const created=await POST(request({...base,id:undefined,name:'Variant Tee',sizes:['XL'],colors:['White']}));
    assert.equal(created.status,200);
    const tee=(await catalog()).products.find(x=>x.name==='Variant Tee');assert.deepEqual(tee.sizes,['XL']);assert.deepEqual(tee.colors,['White']);
  });
});

test('checkout requires a listed size and colour and keeps colours as separate lines',async()=>{
  await asAdmin(()=>POST(request({...base,sizes:['S','M'],colors:['Red','Black']})));
  await assert.rejects(quoteOrder(checkout([{id:3,qty:1,size:'S'}])),/Choose a colour for Soft Satin Scarf/);
  await assert.rejects(quoteOrder(checkout([{id:3,qty:1,size:'XL',color:'Red'}])),/valid product size/);
  await assert.rejects(quoteOrder(checkout([{id:3,qty:1,size:'One size',color:'Red'}])),/valid product size/);
  await assert.rejects(quoteOrder(checkout([{id:3,qty:1,size:'S',color:'Green'}])),/Choose a colour/);
  const placed=await order([{id:3,qty:1,size:'S',color:'Red'},{id:3,qty:2,size:'S',color:'Black'}]);
  assert.deepEqual(placed.items.map(i=>[i.size,i.color,i.qty]),[['S','Red',1],['S','Black',2]]);
  // Products without colours reject a colour and store none.
  await asAdmin(()=>POST(request({...base,sizes:[],colors:[]})));
  await assert.rejects(quoteOrder(checkout([{id:3,qty:1,size:'One size',color:'Red'}])),/Invalid product colour/);
  const plain=await order([{id:3,qty:1,size:'One size'}]);
  assert.equal('color' in plain.items[0],false);
  // Tracking shows the colour only when there is one.
  assert.deepEqual(publicOrder(placed).items,[{name:'Soft Satin Scarf',qty:1,size:'S',color:'Red'},{name:'Soft Satin Scarf',qty:2,size:'S',color:'Black'}]);
  assert.deepEqual(publicOrder(plain).items,[{name:'Soft Satin Scarf',qty:1,size:'One size'}]);
});

test('owner order edits can change the colour, and a removed colour stays valid on its old line',async()=>{
  await asAdmin(()=>POST(request({...base,sizes:['S','M'],colors:['Red','Black']})));
  const placed=await order([{id:3,qty:1,size:'M',color:'Red'}]);
  const edit=items=>transaction(db=>editOrder(db,{id:placed.id,name:placed.name,phone:placed.phone,address:placed.address,area:placed.area,items}));
  let saved=await edit([{id:3,qty:1,size:'M',color:'Black'}]);
  assert.equal(saved.items[0].color,'Black');
  await assert.rejects(edit([{id:3,qty:1,size:'M',color:'Purple'}]),/valid colour/);
  await asAdmin(()=>POST(request({...base,sizes:['S','M'],colors:['Red']})));
  saved=await edit([{id:3,qty:2,size:'M',color:'Black'}]);
  assert.equal(saved.items[0].color,'Black');assert.equal(saved.items[0].qty,2);
});
