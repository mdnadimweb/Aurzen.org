// Customer reviews from product pages: saved hidden, phone kept private, verified buyers, limits.
require('../scripts/test-environment.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aurzen-reviews-'));
process.env.DATABASE_PATH=path.join(dir,'test.sqlite');
process.env.SEED_DEMO='true';
const {database,content,transaction}=require('../apps/api/dist/lib/database.js');
const {submitReview}=require('../apps/api/dist/lib/review-submit.js');
const {createManualOrder}=require('../apps/api/dist/lib/manual-order.js');
const {GET}=require('../apps/api/dist/app/api/content/route.js');

test.after(async()=>{(await database()).close();const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(dir));assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));fs.rmSync(dir,{recursive:true,force:true});});
const review=(changes={})=>submitReview({product:1,name:'Rina',phone:'01711111111',rating:5,text:'Beautiful fabric and a perfect fit.',...changes});

test('a customer review is saved hidden, marked from the shop, with the phone kept private',async()=>{
  const result=await review();
  assert.equal(result.ok,true);assert.equal(result.verified,false);
  const saved=(await content()).reviews.find(r=>r.name==='Rina');
  assert.equal(saved.approved,false);assert.equal(saved.fromCustomer,true);assert.equal(saved.phone,'01711111111');assert.equal(saved.product,1);
  const shop=await (await GET()).json();
  assert.ok(!shop.reviews.some(r=>r.id===saved.id),'not on the shop until approved');
  // Approve it: the shop then shows it, without the phone.
  const db=await database();const c=await content(db);c.reviews=c.reviews.map(r=>r.id===saved.id?{...r,approved:true}:r);
  await db.prepare("UPDATE settings SET value=? WHERE key='content'").run(JSON.stringify(c));
  const shown=(await (await GET()).json()).reviews.find(r=>r.id===saved.id);
  assert.ok(shown);assert.equal(shown.phone,undefined,'phone never reaches the shop');
});

test('one review per phone and product; bad input is refused',async()=>{
  await assert.rejects(review(),/already reviewed/);
  await assert.rejects(review({phone:'01722222222',rating:0}),/rating/);
  await assert.rejects(review({phone:'01722222222',text:'short'}),/at least/);
  await assert.rejects(review({phone:'12345'}),/Phone number|valid Bangladesh/);
  await assert.rejects(review({phone:'01722222222',product:99999}),/not available/);
});

test('a phone with a delivered order of the product is a verified buyer',async()=>{
  const o=await transaction(db=>createManualOrder(db,{key:randomUUID(),source:'phone',name:'Buyer',phone:'01733333333',address:'Dhanmondi, Dhaka',area:'dhaka',items:[{id:3,qty:1,size:'One size'}]}));
  const db=await database();o.status='Delivered';await db.prepare('UPDATE orders SET payload=? WHERE id=?').run(JSON.stringify(o),o.id);
  const result=await submitReview({product:3,name:'Buyer',phone:'01733333333',rating:4,text:'Soft and lovely colour.'});
  assert.equal(result.verified,true);
  assert.equal((await content()).reviews.find(r=>r.phone==='01733333333').verified,true);
});

test('each phone can post at most 3 reviews a day',async()=>{
  for(const product of [2,3,4])await submitReview({product,name:'Many',phone:'01744444444',rating:5,text:'Really nice, would buy again.'});
  await assert.rejects(submitReview({product:1,name:'Many',phone:'01744444444',rating:5,text:'Really nice, would buy again.'}),/Too many/);
});
