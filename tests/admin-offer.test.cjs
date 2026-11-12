require('../scripts/test-environment.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'aurzen-admin-offer-'));
process.env.DATABASE_PATH=path.join(directory,'test.sqlite');
const {database,catalog}=require('../apps/api/dist/lib/database.js');
const auth=require('../apps/api/dist/lib/auth.js');
const {POST}=require('../apps/api/dist/app/api/admin/route.js');
const payload={action:'saveProduct',id:1,name:'Offer test product',category:'Clothing',price:1250,stock:10,image:'box',images:[],tag:'TEST'};
const request=data=>new Request('https://aurzen.netlify.app/api/admin/',{method:'POST',headers:{Origin:'https://aurzen.netlify.app','Content-Type':'application/json'},body:JSON.stringify(data)});
const current=async()=>(await catalog()).products.find(p=>p.id===1);
test.after(async()=>{
  (await database()).close();
  const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(directory));
  assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
  fs.rmSync(directory,{recursive:true,force:true});
});

test('offer writes require admin authorization; valid dates normalize to UTC and legacy edits preserve the offer',async()=>{
  const original=auth.requireAdmin;
  assert.equal((await POST(request({...payload,offer:{enabled:true,percent:20}}))).status,401);
  try{
    auth.requireAdmin=async()=>{};
    assert.equal((await current()).offer,null);
    const offer={enabled:true,percent:20,startsAt:'2026-11-08T12:00+06:00',endsAt:'2026-11-09T12:00+06:00'};
    assert.equal((await POST(request({...payload,offer}))).status,200);
    const expected={enabled:true,percent:20,startsAt:'2026-11-08T06:00:00.000Z',endsAt:'2026-11-09T06:00:00.000Z'};
    assert.deepEqual((await current()).offer,expected);
    assert.equal((await current()).price,1250,'Regular price stays the base price');
    assert.equal((await POST(request({...payload,name:'Legacy client edit'}))).status,200);
    assert.deepEqual((await current()).offer,expected);
    assert.equal((await POST(request({...payload,offer:{...offer,enabled:false}}))).status,200);
    assert.equal((await current()).offer.enabled,false);
    assert.equal((await POST(request({...payload,offer:null}))).status,200);
    assert.equal((await current()).offer,null);
  }finally{auth.requireAdmin=original;}
});

test('invalid offer percentages and schedules are rejected atomically on the server',async()=>{
  const original=auth.requireAdmin;
  try{
    auth.requireAdmin=async()=>{};
    const valid={enabled:true,percent:20,startsAt:null,endsAt:null};
    assert.equal((await POST(request({...payload,offer:valid}))).status,200);
    for(const offer of [
      {...valid,percent:0},{...valid,percent:100},{...valid,percent:1.5},{...valid,percent:'20'},
      {...valid,enabled:'true'},{...valid,enabled:false,percent:0},[],true,
      {...valid,startsAt:'2026-11-08T12:00'},
      {...valid,startsAt:'2026-02-30T12:00:00Z'},
      {...valid,startsAt:'2026-11-08T24:00:00Z'},
      {...valid,startsAt:'not a date'},
      {...valid,startsAt:'2026-11-09T12:00:00Z',endsAt:'2026-11-08T12:00:00Z'},
      {...valid,startsAt:'2026-11-09T12:00:00Z',endsAt:'2026-11-09T18:00:00+06:00'},
    ]){
      const response=await POST(request({...payload,name:'Must not persist',offer}));
      assert.equal(response.status,400,JSON.stringify(offer));
      assert.equal((await current()).name,payload.name);
      assert.deepEqual((await current()).offer,valid);
    }
  }finally{auth.requireAdmin=original;}
});
