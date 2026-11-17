// Categories with subcategories, featured categories, promotions, sale and unread orders.
require('../scripts/test-environment.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'aurzen-collections-'));
process.env.DATABASE_PATH=path.join(directory,'test.sqlite');
process.env.CHECKOUT_ENABLED='true';process.env.SEED_DEMO='true';
for(const name of ['TURSO_DATABASE_URL','TURSO_AUTH_TOKEN','NETLIFY','VERCEL','INTERNAL_API_TOKEN'])delete process.env[name];
// An older database: categories without parent/slug/cover columns.
const {DatabaseSync}=require('node:sqlite');
const legacy=new DatabaseSync(process.env.DATABASE_PATH);
legacy.exec('CREATE TABLE categories(name TEXT PRIMARY KEY)');legacy.prepare('INSERT INTO categories VALUES(?)').run("Women's Edit");legacy.close();
const shared=require('@aurzen/shared/catalog');
const {database,catalog,orders}=require('../apps/api/dist/lib/database.js');
const auth=require('../apps/api/dist/lib/auth.js');
const {POST}=require('../apps/api/dist/app/api/admin/route.js');
const {quoteOrder,placeOrder}=require('../apps/api/dist/lib/checkout.js');
const request=data=>new Request('https://aurzen.netlify.app/api/admin/',{method:'POST',headers:{Origin:'https://aurzen.netlify.app','Content-Type':'application/json'},body:JSON.stringify(data)});
async function admin(data){const original=auth.requireAdmin;auth.requireAdmin=async()=>{};try{const r=await POST(request(data));return {status:r.status,body:await r.json()};}finally{auth.requireAdmin=original;}}
const tree=async()=>(await catalog()).categoryDetails;
test.after(async()=>{(await database()).close();const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(directory));assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));fs.rmSync(directory,{recursive:true,force:true});});

test('older databases gain category columns and readable slugs',async()=>{
  const c=(await tree()).find(x=>x.name==="Women's Edit");
  assert.deepEqual(c,{name:"Women's Edit",slug:'womens-edit',parent:null,cover:null});
  assert.equal(shared.slugify('Bridal & Party'),'bridal-and-party');
  assert.equal(shared.slugify('  Mystery Boxes '),'mystery-boxes');
});

test('admins add main categories with covers and subcategories one level deep',async()=>{
  assert.equal((await POST(request({action:'addCategory',name:'Dresses',parent:'Clothing'}))).status,401,'requires admin');
  assert.equal((await admin({action:'addCategory',name:'Dresses',parent:'Clothing'})).status,200);
  assert.equal((await admin({action:'addCategory',name:'Evening',parent:'Clothing',cover:'https://example.com/ignored.jpg'})).status,200);
  let r=await admin({action:'addCategory',name:'Maxi',parent:'Dresses'});
  assert.equal(r.status,400);assert.match(r.body.error,/cannot have their own subcategories/);
  r=await admin({action:'addCategory',name:'dresses'});
  assert.equal(r.status,400);assert.match(r.body.error,/already exists/);
  r=await admin({action:'addCategory',name:'Sale Edit',cover:'http://insecure.example/x.jpg'});
  assert.equal(r.status,400);assert.match(r.body.error,/HTTPS/);
  r=await admin({action:'addCategory',name:'Sale Edit',cover:'/media/00000000-0000-0000-0000-000000000000.webp'});
  assert.equal(r.status,400);assert.match(r.body.error,/unavailable/);
  assert.equal((await admin({action:'addCategory',name:'Kids Corner',cover:'https://example.com/kids.jpg'})).status,200);
  const all=await tree();
  assert.deepEqual(all.find(c=>c.name==='Dresses'),{name:'Dresses',slug:'dresses',parent:'Clothing',cover:null});
  assert.equal(all.find(c=>c.name==='Evening').cover,null,'subcategories have no cover');
  assert.equal(all.find(c=>c.name==='Kids Corner').cover,'https://example.com/kids.jpg');
  assert.deepEqual(shared.categoryFamily(all,'Clothing'),['Clothing','Dresses','Evening']);
  assert.deepEqual(shared.categoryFamily(all,'Dresses'),['Dresses']);
  assert.equal(shared.categoryPath(all,'Dresses'),'/collections/clothing/dresses/');
  assert.deepEqual(shared.categoryFromSlugs(all,['clothing','dresses']).sub.name,'Dresses');
  assert.equal(shared.categoryFromSlugs(all,['clothing','missing']),null);
  assert.equal(shared.categoryFromSlugs(all,['dresses']),null,'subcategories only resolve under their parent');
});

test('renaming keeps the URL and updates products, homepage settings and promotions; deletes are guarded',async()=>{
  const p=(await catalog()).products.find(x=>x.category==='Clothing');
  await admin({action:'saveProduct',id:p.id,name:p.name,category:'Dresses',price:p.price,stock:p.stock,image:p.image,tag:p.tag});
  await admin({action:'saveStorefront',storefront:{announcement:{message:'Hello',detail:''},covers:{},featured:['Clothing','Kids Corner']}});
  await admin({action:'savePromotions',promotions:[{id:'p-1',image:'https://example.com/a.jpg',mobileImage:'',headline:'New dresses',cta:'Shop',link:{type:'category',value:'Dresses'},startsAt:null,endsAt:null,hidden:false}]});
  assert.equal((await admin({action:'editCategory',original:'Dresses',name:'Day Dresses',parent:'Clothing'})).status,200);
  assert.equal((await admin({action:'editCategory',original:'Clothing',name:'Ready to Wear'})).status,200);
  const data=await catalog();
  assert.deepEqual(data.categoryDetails.find(c=>c.name==='Day Dresses'),{name:'Day Dresses',slug:'dresses',parent:'Ready to Wear',cover:null});
  assert.equal(data.categoryDetails.find(c=>c.name==='Ready to Wear').slug,'clothing','slug stays the same so shared links keep working');
  assert.equal(data.products.find(x=>x.id===p.id).category,'Day Dresses');
  assert.deepEqual(data.storefront.featured,['Ready to Wear','Kids Corner']);
  assert.equal(data.promotions[0].link.value,'Day Dresses');
  let r=await admin({action:'editCategory',original:'Ready to Wear',name:'Ready to Wear',parent:'Kids Corner'});
  assert.equal(r.status,400);assert.match(r.body.error,/has subcategories/);
  r=await admin({action:'saveStorefront',storefront:{announcement:{message:'Hello',detail:''},covers:{},featured:['Day Dresses']}});
  assert.equal(r.status,400);assert.match(r.body.error,/main category/);
  r=await admin({action:'saveStorefront',storefront:{announcement:{message:'Hello',detail:''},covers:{},featured:['A','B','C','D','E']}});
  assert.equal(r.status,400);assert.match(r.body.error,/at most 4/);
  r=await admin({action:'deleteCategory',name:'Ready to Wear'});
  assert.equal(r.status,400);assert.match(r.body.error,/products|subcategories/);
  assert.equal((await admin({action:'deleteCategory',name:'Kids Corner'})).status,200);
  assert.deepEqual((await catalog()).storefront.featured,['Ready to Wear'],'deleted categories leave the featured list');
});

test('promotions are validated, saved and filtered by schedule and visibility',async()=>{
  const base={id:'p-1',image:'https://example.com/a.jpg',mobileImage:'',headline:'Offers',cta:'Shop',link:{type:'sale',value:'ignored'},startsAt:null,endsAt:null,hidden:false};
  assert.deepEqual(shared.normalizePromotions([base])[0].link,{type:'sale',value:''});
  assert.throws(()=>shared.normalizePromotions([{...base,image:''}]),/main image/);
  assert.throws(()=>shared.normalizePromotions([{...base,startsAt:'2030-01-02T00:00:00Z',endsAt:'2030-01-01T00:00:00Z'}]),/End must be after start/);
  assert.throws(()=>shared.normalizePromotions([base,{...base}]),/Invalid promotion id/);
  let r=await admin({action:'savePromotions',promotions:[{...base,link:{type:'product',value:'99999'}}]});
  assert.equal(r.status,400);assert.match(r.body.error,/existing product/);
  const now=Date.parse('2030-01-01T12:00:00Z');
  const list=shared.normalizePromotions([base,{...base,id:'p-2',hidden:true},{...base,id:'p-3',startsAt:'2030-01-02T00:00:00Z'},{...base,id:'p-4',endsAt:'2030-01-01T06:00:00Z'},{...base,id:'p-5',startsAt:'2030-01-01T00:00:00+06:00',endsAt:'2030-01-03T00:00:00Z'}]);
  assert.deepEqual(shared.activePromotions(list,now).map(p=>p.id),['p-1','p-5']);
  assert.equal((await admin({action:'savePromotions',promotions:list})).status,200);
  assert.equal((await catalog()).promotions.length,5);
  assert.equal((await admin({action:'savePromotions',promotions:[]})).status,200);
  assert.deepEqual((await catalog()).promotions,[]);
});

test('sale lists only products with an active offer, matching checkout pricing',async()=>{
  const now=Date.parse('2030-06-01T00:00:00Z');
  const products=[{id:1,price:1000,offer:{enabled:true,percent:20,startsAt:null,endsAt:null}},{id:2,price:1000,offer:{enabled:true,percent:20,startsAt:null,endsAt:'2030-05-01T00:00:00Z'}},{id:3,price:1000,offer:{enabled:false,percent:20,startsAt:null,endsAt:null}},{id:4,price:1000,offer:null}];
  assert.deepEqual(shared.saleProducts(products,now).map(p=>p.id),[1]);
  assert.equal(shared.productPricing(products[0],now).unitPrice,800);
});

test('opening an order marks it read without changing its fulfilment status, and it stays read',async()=>{
  const p=(await catalog()).products.find(x=>x.stock>0);
  const input={key:randomUUID(),name:'Read Status',phone:'01712345678',address:'House 10, Road 2, Dhaka',area:'dhaka',items:[{id:p.id,qty:1,size:shared.productOptions(p)[0]}]};
  input.quote=(await quoteOrder(input)).quote;
  const {id}=await placeOrder(input);
  let order=(await orders()).find(o=>o.id===id);
  assert.equal(order.readAt,undefined,'new orders start unread');
  assert.equal((await POST(request({action:'markRead',id}))).status,401,'requires admin');
  assert.equal((await admin({action:'markRead',id})).status,200);
  order=(await orders()).find(o=>o.id===id);
  assert.ok(order.readAt);assert.equal(order.status,'New');
  const first=order.readAt;
  assert.equal((await admin({action:'markRead',id})).status,200);
  assert.equal((await orders()).find(o=>o.id===id).readAt,first,'marking again keeps the first read time');
  assert.equal((await admin({action:'markRead',id:'AZ-missing'})).status,404);
});

test('owners can mark an active order Delivered directly; final statuses stay final with a clear message',async()=>{
  const p=(await catalog()).products.find(x=>x.stock>0);
  const place=async()=>{const input={key:randomUUID(),name:'Status Flow',phone:'01712345678',address:'House 10, Road 2, Dhaka',area:'dhaka',items:[{id:p.id,qty:1,size:shared.productOptions(p)[0]}]};input.quote=(await quoteOrder(input)).quote;return (await placeOrder(input)).id;};
  const id=await place();
  assert.deepEqual(shared.statusOptions('New'),['New','Confirmed','Processing','Shipped','Delivered','Cancelled']);
  let r=await admin({action:'status',id,status:'Delivered'});
  assert.equal(r.status,200,'New -> Delivered without courier details');
  assert.equal((await orders()).find(o=>o.id===id).status,'Delivered');
  const cancelled=await place();
  assert.equal((await admin({action:'status',id:cancelled,status:'Cancelled'})).status,200);
  r=await admin({action:'status',id:cancelled,status:'Delivered'});
  assert.equal(r.status,400);assert.match(r.body.error,/Cancelled cannot be changed to Delivered\. Cancelled is a final status/);
  assert.deepEqual(shared.statusOptions('Cancelled'),['Cancelled']);
});

test('a main category can become a subcategory; products move in bulk; a subcategory is required when one exists',async()=>{
  assert.equal((await admin({action:'addCategory',name:'Love & Care'})).status,200,'main categories can still be added');
  assert.equal((await admin({action:'editCategory',original:'Mystery Boxes',name:'Mystery Boxes',parent:'Love & Care'})).status,200);
  assert.equal(shared.categoryPath((await tree()),'Mystery Boxes'),'/collections/love-and-care/mystery-boxes/');
  const box=(await catalog()).products.find(p=>p.category==='Mystery Boxes');
  assert.equal((await admin({action:'addCategory',name:'Self-care',parent:'Love & Care'})).status,200);
  assert.equal((await admin({action:'moveProducts',ids:[box.id],category:'Self-care'})).status,200);
  const moved=(await catalog()).products.find(p=>p.id===box.id);
  assert.equal(moved.category,'Self-care');assert.equal(moved.price,box.price);assert.equal(moved.stock,box.stock);
  const r=await admin({action:'saveProduct',id:box.id,name:box.name,category:'Love & Care',price:box.price,stock:box.stock,image:box.image,tag:box.tag});
  assert.equal(r.status,400);assert.match(r.body.error,/Choose a subcategory of Love & Care/);
  assert.equal((await admin({action:'moveProducts',ids:[box.id],category:'Missing'})).status,400);
});
