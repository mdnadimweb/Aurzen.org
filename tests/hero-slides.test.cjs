require('../scripts/test-environment.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'aurzen-hero-'));
process.env.DATABASE_PATH=path.join(directory,'test.sqlite');process.env.SEED_DEMO='true';
for(const name of ['TURSO_DATABASE_URL','TURSO_AUTH_TOKEN','DATABASE_URL','NETLIFY','VERCEL'])delete process.env[name];
const {normalizeHeroSlides}=require('@aurzen/shared/catalog');
const {database,catalog}=require('../apps/api/dist/lib/database.js');
const auth=require('../apps/api/dist/lib/auth.js');
const {POST}=require('../apps/api/dist/app/api/admin/route.js');
const request=data=>new Request('https://aurzen.netlify.app/api/admin/',{method:'POST',headers:{Origin:'https://aurzen.netlify.app','Content-Type':'application/json'},body:JSON.stringify(data)});
const slide=(extra={})=>({eyebrow:'NEW EDIT',title:'A new story,',emphasis:'just arrived.',description:'Fresh pieces.',image:'https://images.example.com/hero.jpg',alt:'Model in a linen dress',caption:'',note:'',category:'Clothing',cta:'Shop now',tone:'rose',...extra});
test.after(async()=>{
  (await database()).close();
  const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(directory));
  assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
  fs.rmSync(directory,{recursive:true,force:true});
});

test('slide validation trims text and rejects unsafe images, bad tones, missing fields and too many slides',()=>{
  const [result]=normalizeHeroSlides([slide({title:'  A   new story, ',extra:'ignored'})]);
  assert.equal(result.title,'A new story,');assert.equal(result.extra,undefined);
  for(const image of ['box','/media/0f8fad5b-d9cb-469f-a165-70867728950e.webp','/images/fashion-hero.jpeg'])assert.equal(normalizeHeroSlides([slide({image})])[0].image,image);
  for(const image of ['','http://example.com/a.jpg','javascript:alert(1)','/images/../secret.jpg','/media/x.webp','data:image/png;base64,AAAA'])
    assert.throws(()=>normalizeHeroSlides([slide({image})]),/Upload a photo/);
  assert.throws(()=>normalizeHeroSlides([slide({tone:'red'})]),/colour mood/);
  assert.throws(()=>normalizeHeroSlides([slide({title:' '})]),/Heading is required on slide 1/);
  assert.throws(()=>normalizeHeroSlides([slide(),slide({cta:'x'.repeat(41)})]),/Button text must be at most 40 characters on slide 2/);
  assert.throws(()=>normalizeHeroSlides([]),/1 to 6/);
  assert.throws(()=>normalizeHeroSlides(Array(7).fill(slide())),/1 to 6/);
  assert.throws(()=>normalizeHeroSlides('nope'),/1 to 6/);
});

test('saving slides requires admin, checks categories and photos, and reset restores the automatic slides',async()=>{
  const original=auth.requireAdmin;
  assert.equal((await catalog()).hero,null,'No custom slides until the owner saves');
  assert.equal((await POST(request({action:'saveHero',slides:[slide()]}))).status,401);
  assert.equal((await catalog()).hero,null);
  try{
    auth.requireAdmin=async()=>{};
    let response=await POST(request({action:'saveHero',slides:[slide({category:'Missing category'})]}));
    assert.equal(response.status,400);assert.match((await response.json()).error,/existing category for slide 1/);
    response=await POST(request({action:'saveHero',slides:[slide({image:'/media/0f8fad5b-d9cb-469f-a165-70867728950e.webp'})]}));
    assert.equal(response.status,400);assert.match((await response.json()).error,/photo on slide 1 is unavailable/);
    response=await POST(request({action:'saveHero',slides:[slide({tone:'neon'})]}));
    assert.equal(response.status,400);
    assert.equal((await catalog()).hero,null,'Rejected saves leave the storefront unchanged');

    const slides=[slide(),slide({title:'Gift box',image:'box',category:'Mystery Boxes',tone:'plum'})];
    response=await POST(request({action:'saveHero',slides}));
    assert.equal(response.status,200);
    assert.deepEqual((await response.json()).hero,slides,'The admin response carries the saved slides');
    assert.deepEqual((await catalog()).hero,slides);
    // Saving again replaces the setting rather than inserting a duplicate key.
    assert.equal((await POST(request({action:'saveHero',slides:[slides[1]]}))).status,200);
    assert.deepEqual((await catalog()).hero,[slides[1]]);

    assert.equal((await POST(request({action:'resetHero'}))).status,200);
    assert.equal((await catalog()).hero,null);
  }finally{auth.requireAdmin=original;}
});
