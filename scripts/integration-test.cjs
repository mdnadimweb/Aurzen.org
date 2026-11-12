const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const {randomBytes,randomUUID}=require('node:crypto');
const {once}=require('node:events');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aurzen-integration-'));
const password=randomBytes(24).toString('hex');
const base='http://localhost:3101';
const child=spawn(process.execPath,['scripts/test-server.cjs','3101'],{env:{...process.env,TURSO_DATABASE_URL:"",TURSO_AUTH_TOKEN:"",NETLIFY:"",ADMIN_PASSWORD:password,DATABASE_PATH:path.join(dir,'test.sqlite'),CHECKOUT_ENABLED:'true',SEED_DEMO:'true'},stdio:['ignore','pipe','pipe'],windowsHide:true});
let logs='';child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
let cookie='';
async function request(url,{method='GET',data,auth=false,origin=base}={}){
  const r=await fetch(base+url,{method,headers:{...(method!=='GET'?{'Content-Type':'application/json',Origin:origin}:{}),...(auth?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});
  return {status:r.status,data:await r.json(),response:r};
}
async function main(){
  let ready=false;
  for(let i=0;i<100;i++){if(child.exitCode!==null)throw new Error(logs);if(logs.includes('Ready in')){ready=true;break;}await new Promise(r=>setTimeout(r,200));}
  assert(ready,'Test server did not become ready.');
  assert.equal((await request('/api/admin/')).status,401);
  assert.equal((await request('/api/admin/',{method:'POST',data:{action:'addCategory',name:'Denied'}})).status,401);
  const redirect=await fetch(base+'/admin/',{redirect:'manual'});const redirectHtml=await redirect.text();assert([200,307].includes(redirect.status));assert((redirect.headers.get('location')||redirectHtml).includes('/admin/login'));assert(!redirectHtml.includes('Welcome to your studio'));
  assert.equal((await request('/api/admin/session/',{method:'POST',data:{password:'wrong'}})).status,401);
  const login=await request('/api/admin/session/',{method:'POST',data:{password}});assert.equal(login.status,200);
  const setCookie=login.response.headers.get('set-cookie');assert(setCookie.includes('HttpOnly'));assert(/SameSite=strict/i.test(setCookie));assert(!setCookie.includes('; Secure'));cookie=setCookie.split(';')[0];
  assert.equal((await request('/api/admin/',{auth:true})).status,200);
  async function upload(bytes,type='image/jpeg',authenticated=true,origin=base){
    const form=new FormData();form.append('photo',new Blob([bytes],{type}),'product.jpg');
    const r=await fetch(base+'/api/admin/images/',{method:'POST',headers:{Origin:origin,Connection:'close',...(authenticated?{Cookie:cookie}:{})},body:form});return {status:r.status,data:await r.json()};
  }
  const logo=fs.readFileSync('apps/web/public/brand/aurzen-logo.png');
  // Rejection tests need only a tiny body: the server rejects before consuming the upload.
  assert.equal((await upload(Buffer.from('denied'),'image/png',false)).status,401);
  assert.equal((await upload(Buffer.from('denied'),'image/png',false,'https://aurzen.netlify.app')).status,403);
  assert.equal((await upload(Buffer.from('denied'),'image/png',true,'https://attacker.example')).status,403);
  assert.equal((await upload(Buffer.from('not an image'))).status,400);
  assert.equal((await upload(Buffer.from('<svg/>'),'image/svg+xml')).status,400);
  assert.equal((await upload(Buffer.alloc(4*1024*1024+1))).status,413);
  const uploaded=await upload(logo,'image/png',true,base);assert.equal(uploaded.status,201);assert(uploaded.data.url.startsWith('/media/'));
  const image=await fetch(base+uploaded.data.url);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/webp');assert(image.headers.get('cache-control').includes('immutable'));assert((await image.arrayBuffer()).byteLength>0);
  assert.equal((await fetch(base+'/media/00000000-0000-0000-0000-000000000000.webp')).status,404);
  assert.equal((await fetch(base+'/brand/aurzen-logo.png')).status,200);
  const mutate=data=>request('/api/admin/',{method:'POST',data,auth:true});
  assert.equal((await request('/api/admin/',{method:'POST',data:{action:'addCategory',name:'Denied'},auth:true,origin:'https://attacker.example'})).status,403);
  assert.equal((await mutate({action:'addCategory',name:'Test Category'})).status,200);
  assert.equal((await mutate({action:'saveProduct',name:'Invalid',category:'Test Category',price:-1,stock:4,image:'box'})).status,400);
  assert.equal((await mutate({action:'saveProduct',name:'Missing photo',category:'Test Category',price:200,stock:2,image:'/media/00000000-0000-0000-0000-000000000000.webp'})).status,400);
  const saved=await mutate({action:'saveProduct',name:'Integration Product',category:'Test Category',price:200,stock:2,image:uploaded.data.url});assert.equal(saved.status,200);const product=saved.data.products.find(p=>p.name==='Integration Product');assert(product);assert.equal(product.image,uploaded.data.url);
  const edit={action:'saveProduct',id:product.id,name:product.name,category:product.category,price:product.price,stock:product.stock,image:product.image,tag:product.tag};
  // Old single-photo clients retain their cover before and after gallery adoption.
  const legacyEdit=await mutate({...edit,name:'Integration Product'});assert.equal(legacyEdit.status,200);assert.equal(legacyEdit.data.products.find(p=>p.id===product.id).image,product.image);
  const secondPhoto=await upload(logo,'image/png');assert.equal(secondPhoto.status,201);
  const photos=[secondPhoto.data.url,uploaded.data.url];
  const gallery=await mutate({...edit,images:photos});assert.equal(gallery.status,200);assert.deepEqual(gallery.data.products.find(p=>p.id===product.id).images,photos);assert.equal(gallery.data.products.find(p=>p.id===product.id).image,photos[0]);
  const reordered=await mutate({...edit,images:[...photos].reverse()});assert.equal(reordered.status,200);assert.equal(reordered.data.products.find(p=>p.id===product.id).image,photos[1]);
  const oldClientEdit=await mutate({...edit,name:'Integration Product'});assert.equal(oldClientEdit.status,200);assert.deepEqual(oldClientEdit.data.products.find(p=>p.id===product.id).images,[...photos].reverse());
  const eightPhotos=[...photos,...Array.from({length:6},(_,i)=>`https://example.com/gallery-${i}.jpg`)];
  assert.equal((await mutate({...edit,images:eightPhotos})).status,200);
  assert.equal((await mutate({...edit,images:[...eightPhotos,'https://example.com/ninth.jpg']})).status,400);
  assert.equal((await mutate({...edit,images:[photos[0],photos[0]]})).status,400);
  assert.equal((await mutate({...edit,images:['/media/00000000-0000-0000-0000-000000000000.webp']})).status,400);
  assert.equal((await mutate({...edit,images:['javascript:alert(1)']})).status,400);
  const preservedGallery=(await request('/api/admin/',{auth:true})).data.products.find(p=>p.id===product.id);assert.deepEqual(preservedGallery.images,eightPhotos);assert.equal(preservedGallery.image,eightPhotos[0]);
  assert.equal((await mutate({...edit,images:photos})).status,200);
  // Removing a photo reference must leave its stored asset usable elsewhere.
  assert.equal((await fetch(base+photos[0])).status,200);
  const checkout={key:randomUUID(),name:'Test Customer',phone:'01712345678',address:'House 10, Road 2, Dhaka',area:'outside',items:[{id:product.id,qty:1,size:'One size'}],total:1};
  const quote=await request('/api/orders/',{method:'POST',data:{action:'quote',items:checkout.items,area:checkout.area}});assert.equal(quote.status,200);checkout.quote=quote.data.quote;
  const first=await request('/api/orders/',{method:'POST',data:checkout});assert.equal(first.status,201);assert.equal(first.data.total,350);
  const retry=await request('/api/orders/',{method:'POST',data:checkout});assert.deepEqual(retry.data,first.data);
  const state=await request('/api/admin/',{auth:true});assert.equal(state.data.orders.length,1);assert.equal(state.data.products.find(p=>p.id===product.id).stock,1);assert.equal(state.data.orders[0].area,'outside');
  assert.deepEqual(state.data.orders[0].history,[{status:'New',date:state.data.orders[0].date}]);
  const lookup=(reference=first.data.id,phone='+8801712345678')=>request('/api/tracking/',{method:'POST',data:{reference,phone}});
  const tracked=await lookup();assert.equal(tracked.status,200);assert.equal(tracked.data.id,first.data.id);assert.equal(tracked.data.status,'New');assert.deepEqual(tracked.data.items,[{name:product.name,qty:1,size:'One size'}]);assert(tracked.response.headers.get('cache-control').includes('no-store'));
  for(const field of ['phone','name','address','total','delivery','paymentMethod'])assert.equal(tracked.data[field],undefined);
  const wrongPhone=await lookup(first.data.id,'01812345678'),wrongReference=await lookup('AZ-not-an-order');assert.equal(wrongPhone.status,404);assert.equal(wrongReference.status,404);assert.deepEqual(wrongPhone.data,wrongReference.data);assert(!JSON.stringify(wrongPhone.data).includes(checkout.phone));assert(wrongPhone.response.headers.get('cache-control').includes('no-store'));
  assert.equal((await request('/api/tracking/',{method:'POST',data:{reference:first.data.id,phone:checkout.phone},origin:'https://attacker.example'})).status,403);
  assert.equal(tracked.data.courier,undefined);assert.equal(tracked.data.trackingReference,undefined);
  assert.equal((await mutate({action:'delivery',id:first.data.id,courier:'Integration Courier',trackingReference:''})).status,400);
  assert.equal((await mutate({action:'delivery',id:first.data.id,courier:'Integration Courier',trackingReference:'TEST-TRACK-001'})).status,200);
  const deliveryTracking=await lookup();assert.equal(deliveryTracking.data.courier,'Integration Courier');assert.equal(deliveryTracking.data.trackingReference,'TEST-TRACK-001');
  const statusStarted=Date.now();
  const confirmed=await mutate({action:'status',id:first.data.id,status:'Confirmed'});assert.equal(confirmed.status,200);const confirmedOrder=confirmed.data.orders.find(o=>o.id===first.data.id);assert.equal(confirmedOrder.history.length,2);assert.equal(confirmedOrder.history[1].status,'Confirmed');assert(Date.parse(confirmedOrder.history[1].date)>=statusStarted-1000);
  const reconfirmed=await mutate({action:'status',id:first.data.id,status:'Confirmed'});assert.equal(reconfirmed.status,200);assert.deepEqual(reconfirmed.data.orders.find(o=>o.id===first.data.id).history,confirmedOrder.history);assert.equal((await lookup()).data.status,'Confirmed');
  const oversold=await request('/api/orders/',{method:'POST',data:{...checkout,key:randomUUID(),items:[{id:product.id,qty:2,size:'One size'}]}});assert.equal(oversold.status,409);
  assert.equal((await mutate({action:'status',id:first.data.id,status:'Delivered'})).status,400);
  const cancelled=await mutate({action:'status',id:first.data.id,status:'Cancelled'});assert.equal(cancelled.status,200);assert.equal(cancelled.data.products.find(p=>p.id===product.id).stock,2);
  const recancel=await mutate({action:'status',id:first.data.id,status:'Cancelled'});assert.equal(recancel.data.products.find(p=>p.id===product.id).stock,2);
  const cancelledOrder=cancelled.data.orders.find(o=>o.id===first.data.id);assert.deepEqual(cancelledOrder.history.map(event=>event.status),['New','Confirmed','Cancelled']);assert.deepEqual(recancel.data.orders.find(o=>o.id===first.data.id).history,cancelledOrder.history);
  const cancelledTracking=await lookup();assert.equal(cancelledTracking.data.status,'Cancelled');assert.deepEqual(cancelledTracking.data.history,cancelledOrder.history);
  assert.equal((await mutate({action:'status',id:first.data.id,status:'Confirmed'})).status,400);
  const offer={enabled:true,percent:20,startsAt:null,endsAt:null};
  for(const invalid of [{...offer,percent:0},{...offer,percent:100},{...offer,percent:20.5},{...offer,startsAt:'2030-01-01T12:00'},{...offer,startsAt:'2030-02-01T00:00Z',endsAt:'2030-01-01T00:00Z'}])assert.equal((await mutate({...edit,offer:invalid})).status,400);
  assert.equal((await mutate({...edit,price:1250,stock:5,offer})).status,200);
  const reviewed=await request('/api/orders/',{method:'POST',data:{action:'quote',items:checkout.items,area:checkout.area}});
  assert.equal(reviewed.status,200);assert.equal(reviewed.data.items[0].price,1000);assert.equal(reviewed.data.total,1150);assert.match(reviewed.response.headers.get('cache-control'),/no-store/);
  assert.equal((await mutate({...edit,price:1250,stock:5,offer:{...offer,enabled:false}})).status,200);
  const stale=await request('/api/orders/',{method:'POST',data:{...checkout,key:randomUUID(),quote:reviewed.data.quote}});assert.equal(stale.status,409);
  const rejectedState=(await request('/api/admin/',{auth:true})).data;assert.equal(rejectedState.orders.length,1);assert.equal(rejectedState.products.find(p=>p.id===product.id).stock,5);
  const updated=await request('/api/orders/',{method:'POST',data:{action:'quote',items:checkout.items,area:checkout.area}});assert.equal(updated.data.items[0].price,1250);assert.equal(updated.data.total,1400);
  assert.equal((await mutate({...edit,price:1250,stock:5,offer})).status,200);
  const active=await request('/api/orders/',{method:'POST',data:{action:'quote',items:checkout.items,area:checkout.area}});
  const discounted=await request('/api/orders/',{method:'POST',data:{...checkout,key:randomUUID(),quote:active.data.quote}});assert.equal(discounted.status,201);assert.equal(discounted.data.total,1150);
  assert.equal((await mutate({...edit,price:1250,stock:4,offer:null})).status,200);
  const past=(await request('/api/admin/',{auth:true})).data.orders.find(o=>o.id===discounted.data.id);assert.equal(past.items[0].price,1000);assert.equal(past.total,1150);
  assert.equal((await mutate({action:'deleteCategory',name:'Test Category'})).status,400);
  assert.equal((await mutate({action:'deleteProduct',id:product.id})).status,200);
  assert.equal((await mutate({action:'deleteCategory',name:'Test Category'})).status,200);
  for(const url of ['/','/shop/','/cart/','/products/1/','/tracking/','/admin/login/']){
    const r=await fetch(base+url);assert.equal(r.status,200,`${url} should load`);const html=await r.text();assert(html.includes('/brand/aurzen-logo.png'));if(url==='/products/1/'){assert(html.includes('The Everyday Co-ord'));assert(html.indexOf('product-page')<html.indexOf('<footer'));}assert.equal(r.headers.get('x-content-type-options'),'nosniff');
  }
  const trackingHtml=await (await fetch(base+'/tracking/')).text();assert(trackingHtml.includes('noindex'));assert(trackingHtml.includes('Track your little finds.'));
  const missing=await fetch(base+'/products/99999/');assert([200,404].includes(missing.status));const missingHtml=await missing.text();assert(missingHtml.includes('This page is out of reach.'));assert(missingHtml.includes('noindex'));
  assert.equal((await request('/api/admin/session/',{method:'DELETE',auth:true})).status,200);assert.equal((await request('/api/admin/',{auth:true})).status,401);
  console.log('Integration checks passed: authenticated uploads, gallery compatibility, protected admin, private tracking, order history, offer validation, no-store quotes, stale-price rejection without writes, saved discounted prices, checkout and inventory.');
}
main().catch(e=>{console.error(e);console.error(logs);process.exitCode=1;}).finally(async()=>{
  if(child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}
  const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(dir));assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));fs.rmSync(dir,{recursive:true,force:true});
});
