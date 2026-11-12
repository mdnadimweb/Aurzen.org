// Run after npm run build. Uses installed Chrome and an isolated local SQLite store.
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {randomBytes}=require('node:crypto');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aurzen-commerce-'));
const base='http://localhost:3103',pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser,server,socket,sequence=0;
const pending=new Map();
async function poll(check,timeout=12000){const end=Date.now()+timeout;while(Date.now()<end){const value=await check();if(value)return value;await pause(30);}throw new Error('Browser check timed out.');}
function command(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timed out: '+method));},10000);pending.set(id,{resolve:result=>{clearTimeout(timer);resolve(result);},reject:error=>{clearTimeout(timer);reject(error);}});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});}
async function page(){
  const {targetId}=await command('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await command('Target.attachToTarget',{targetId,flatten:true});
  const send=(method,params)=>command(method,params,sessionId);
  const evaluate=async expression=>{const response=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.exceptionDetails)throw new Error(JSON.stringify(response.exceptionDetails));return response.result.value;};
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Network.setBlockedURLs',{urls:['*://images.unsplash.com/*','*://fonts.googleapis.com/*','*://fonts.gstatic.com/*']});
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`sessionStorage.setItem('aurzen-brand-intro-seen','1');window.__errors=[];window.addEventListener('error',event=>window.__errors.push(event.message));`});
  async function navigate(url){await send('Page.navigate',{url:base+url});await poll(()=>evaluate(`document.readyState==='complete'&&!!document.querySelector(${JSON.stringify(url.startsWith('/admin')?'.admin':'header .bag')})&&!document.querySelector('.brand-intro')`));await pause(250);}
  async function click(selector){await evaluate(`(()=>{const button=document.querySelector(${JSON.stringify(selector)});if(!button)throw new Error('Missing selector: '+${JSON.stringify(selector)});button.focus();button.click();})()`);await pause(100);}
  async function escape(){await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await pause(80);}
  return {send,evaluate,navigate,click,escape,close:()=>command('Target.closeTarget',{targetId})};
}
async function run(){
  // Seed through the app's real schema initializer. Never load .env.local or contact Turso.
  process.env.SEED_DEMO='true';process.env.DATABASE_PATH=path.join(dir,'test.sqlite');process.env.TURSO_DATABASE_URL='';process.env.TURSO_AUTH_TOKEN='';process.env.NETLIFY='';
  const {database}=require('../apps/api/dist/lib/database.js'),db=await database();
  await db.prepare('UPDATE products SET image=?,images=?,stock=? WHERE id=1').run('/images/fashion-hero.jpeg',JSON.stringify(['/images/fashion-hero.jpeg','/brand/aurzen-logo.png']),3);
  await db.prepare('UPDATE products SET image=?,images=? WHERE id=3').run('/brand/aurzen-logo.png','[]');
  const oldOrder={id:'AZ-browser-check',name:'Private test name',phone:'01712345678',address:'Private test address',area:'dhaka',items:[{id:1,name:'The Everyday Co-ord',price:1490,qty:1,size:'M'}],total:1570,delivery:80,status:'Cancelled',date:'2024-01-01T00:00:00.000Z'};
  await db.prepare('INSERT INTO orders VALUES(?,?,?,?)').run(oldOrder.id,'browser-check',JSON.stringify(oldOrder),oldOrder.date);
  db.close();delete globalThis.aurzenDatabase;
  const adminPassword=randomBytes(32).toString('hex');
  let output='';server=spawn(process.execPath,['scripts/test-server.cjs','3103'],{env:{...process.env,CHECKOUT_ENABLED:'true',SEED_DEMO:'true',ADMIN_PASSWORD:adminPassword},stdio:['ignore','pipe','pipe'],windowsHide:true});
  server.stdout.on('data',chunk=>output+=chunk);server.stderr.on('data',chunk=>output+=chunk);
  await poll(()=>{if(server.exitCode!==null)throw new Error(output);return output.includes('Ready in');});
  browser=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--remote-debugging-port=0',`--user-data-dir=${path.join(dir,'profile')}`,'--no-first-run','--no-default-browser-check','--disable-background-networking','about:blank'],{stdio:'ignore',windowsHide:true});
  const portFile=path.join(dir,'profile','DevToolsActivePort');await poll(()=>{if(browser.exitCode!==null)throw new Error('Headless Chrome exited before remote debugging became available.');return fs.existsSync(portFile);});
  const [port,endpoint]=fs.readFileSync(portFile,'utf8').trim().split('\n');socket=new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);await Promise.race([once(socket,'open'),pause(10000).then(()=>{throw new Error('Headless Chrome remote debugging did not connect.');})]);
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const waiter=pending.get(message.id);if(waiter){pending.delete(message.id);message.error?waiter.reject(new Error(JSON.stringify(message.error))):waiter.resolve(message.result);}}});

  const current=await page();await current.navigate('/products/1/');
  const screenshot=async name=>{const {data}=await current.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const folder=path.resolve('data');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,name),Buffer.from(data,'base64'));};
  await current.evaluate(`localStorage.removeItem('aurzen-cart');`);await current.navigate('/products/1/');
  // The shorter mobile header means the purchase button can remain visible at
  // the end of the page. Check the initial gallery view, where it is offscreen.
  await current.evaluate(`window.scrollTo(0,0)`);
  await poll(()=>current.evaluate(`!!document.querySelector('.mobile-purchase')&&getComputedStyle(document.querySelector('.mobile-purchase')).position==='fixed'`));
  await screenshot('qa-commerce-mobile.png');
  await current.click('.mobile-purchase button');
  assert(await current.evaluate(`!document.querySelector('.bag-drawer[open]')&&document.activeElement.id==='product-options'&&document.querySelector('.toast').textContent.includes('choose a size')`));
  await current.evaluate(`Array.from(document.querySelectorAll('#product-options button')).find(button=>button.textContent==='M').click()`);
  await current.click('.detail-copy button.primary');
  await poll(()=>current.evaluate(`!!document.querySelector('.bag-drawer[open]')`));
  assert(await current.evaluate(`document.querySelector('.drawer-item').textContent.includes('M')&&document.body.style.overflow==='hidden'&&document.querySelector('.bag-drawer').contains(document.activeElement)`));
  for(let i=0;i<18;i++)await current.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert(await current.evaluate(`document.querySelector('.bag-drawer').contains(document.activeElement)`));
  await current.escape();
  assert(await current.evaluate(`!document.querySelector('.bag-drawer[open]')&&document.activeElement===document.querySelector('.detail-copy button.primary')&&document.body.style.overflow===''&&document.documentElement.style.overflow===''`));
  console.log('PASS mobile sticky bar, required clothing option, Add to Bag, focus trap, Escape and focus/scroll restoration.');

  await current.click('header .bag');await current.click('.quantity-controls button[aria-label^="Increase"]');await current.click('.quantity-controls button[aria-label^="Increase"]');
  assert(await current.evaluate(`document.querySelector('.quantity-controls button[aria-label^="Increase"]').disabled&&JSON.parse(localStorage.getItem('aurzen-cart'))[0].qty===3`));
  await current.click('.quantity-controls button[aria-label^="Decrease"]');
  assert(await current.evaluate(`JSON.parse(localStorage.getItem('aurzen-cart'))[0].qty===2`));
  await current.escape();await current.navigate('/products/1/');await current.click('header .bag');
  assert(await current.evaluate(`document.querySelector('.quantity-controls span').textContent==='2'&&!!document.querySelector('.drawer-summary a[href="/cart/"]')`));
  // The persisted schema is the same id/qty/size object used before this change.
  await current.escape();await current.evaluate(`localStorage.setItem('aurzen-cart',JSON.stringify([{id:1,qty:1,size:'S'},{id:9999,qty:1,size:'One size'}]))`);await current.navigate('/products/1/');await current.click('header .bag');
  assert(await current.evaluate(`document.querySelectorAll('.drawer-item').length===2&&document.querySelector('.drawer-items').textContent.includes('Unavailable product')&&!Array.from(document.querySelectorAll('.drawer-summary a')).some(a=>a.textContent.includes('Proceed'))`));
  await current.click('.drawer-item:nth-child(2) .quantity-controls .text-link');
  assert(await current.evaluate(`document.querySelectorAll('.drawer-item').length===1`));
  await current.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await screenshot('qa-commerce-drawer.png');
  await current.send('Input.dispatchMouseEvent',{type:'mousePressed',x:20,y:300,button:'left',clickCount:1});await current.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:20,y:300,button:'left',clickCount:1});
  await poll(()=>current.evaluate(`!document.querySelector('.bag-drawer[open]')`));
  console.log('PASS bag quantities, stock cap, persistence and legacy carts, removed product handling, checkout link, desktop backdrop dismissal.');

  await current.navigate('/products/2/');
  await current.evaluate(`(()=>{const select=document.querySelector('#product-options select');select.value='Bold & playful';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);await pause(80);
  await current.click('.detail-copy button.primary');
  assert(await current.evaluate(`document.querySelector('.drawer-items').textContent.includes('Bold & playful')&&JSON.parse(localStorage.getItem('aurzen-cart')).some(item=>item.id===2&&item.size==='Bold & playful')`));await current.escape();
  console.log('PASS Mystery Box selected style is preserved in the bag.');

  await current.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await current.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await current.navigate('/products/1/');await poll(()=>current.evaluate(`!!document.querySelector('.gallery-main img')&&document.querySelector('.gallery-main img').complete`));
  assert(await current.evaluate(`document.querySelectorAll('.gallery-thumbnails button').length===2&&document.querySelector('.gallery-main').getBoundingClientRect().height>100`));
  await current.click('.product-gallery > .gallery-arrows button[aria-label="Next photo"]');
  assert(await current.evaluate(`document.querySelectorAll('.gallery-thumbnails button')[1].getAttribute('aria-pressed')==='true'`));
  await current.click('.gallery-expand');await poll(()=>current.evaluate(`!!document.querySelector('.image-viewer[open]')`));
  await current.click('.viewer-toolbar button[aria-label="Zoom in"]');
  assert(await current.evaluate(`document.querySelector('.viewer-toolbar').textContent.includes('150%')`));
  await current.evaluate(`document.querySelector('.viewer-stage').focus()`);await current.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});
  assert(await current.evaluate(`document.querySelector('.viewer-stage > div').style.transform.includes('40px')`));
  await current.click('.viewer-toolbar button[aria-label="Zoom out"]');
  await current.evaluate(`document.querySelector('.viewer-stage').focus()`);
  await current.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  assert(await current.evaluate(`document.querySelector('.image-viewer .gallery-arrows span').textContent==='1 / 2'`));
  const stage=await current.evaluate(`(()=>{const rect=document.querySelector('.viewer-stage').getBoundingClientRect();return {x:rect.left+rect.width*.6,y:rect.top+rect.height*.5};})()`);
  await current.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stage.x,y:stage.y}]});
  await current.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:stage.x-150,y:stage.y}]});
  await current.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(80);
  assert(await current.evaluate(`document.querySelector('.image-viewer .gallery-arrows span').textContent==='2 / 2'`));
  await current.escape();assert(await current.evaluate(`document.activeElement===document.querySelector('.gallery-expand')`));
  await current.navigate('/products/3/');assert(await current.evaluate(`!!document.querySelector('.gallery-main img')&&!document.querySelector('.gallery-thumbnails')&&!document.querySelector('.gallery-arrows')`));
  console.log('PASS multiple/single photo layouts, thumbnails, viewer, zoom, keyboard pan/navigation, swipe and focus restoration.');

  await current.navigate('/tracking/?reference=AZ-browser-check');
  const tracking=await current.evaluate(`({reference:document.querySelector('input[name="reference"]').value,method:document.querySelector('form').method,noindex:document.querySelector('meta[name="robots"]').content.includes('noindex'),linked:!!document.querySelector('footer a[href="/tracking/"]')})`);
  assert.deepEqual(tracking,{reference:'AZ-browser-check',method:'post',noindex:true,linked:true});
  await current.evaluate(`(()=>{document.querySelector('input[name="phone"]').value='01812345678';document.querySelector('form').requestSubmit();})()`);
  await poll(()=>current.evaluate(`!!document.querySelector('form .form-error')`));
  assert(await current.evaluate(`document.querySelector('form .form-error').textContent.includes('could not find an order matching those details')&&!document.querySelector('.tracking-result')`));
  await current.evaluate(`(()=>{document.querySelector('input[name="phone"]').value='+8801712345678';document.querySelector('form').requestSubmit();})()`);
  await poll(()=>current.evaluate(`!!document.querySelector('.tracking-result')`));
  assert(await current.evaluate(`(()=>{const result=document.querySelector('.tracking-result');return result.textContent.includes('Cancelled')&&!result.textContent.includes('Private test')&&!result.textContent.includes('01712345678')&&!result.querySelector('ol')&&!location.search.includes('phone');})()`));
  assert.deepEqual(await current.evaluate('window.__errors'),[]);
  await current.evaluate(`window.__cspViolations=[];document.addEventListener('securitypolicyviolation',event=>window.__cspViolations.push(event.effectiveDirective));const injected=document.createElement('button');injected.setAttribute('onclick','window.__untrustedHandlerRan=true');document.body.appendChild(injected);injected.click();injected.remove();`);
  await poll(()=>current.evaluate('window.__cspViolations.length>0'));
  assert.equal(await current.evaluate('window.__untrustedHandlerRan===undefined'),true);
  assert((await current.evaluate('window.__cspViolations')).includes('script-src-attr'));
  console.log('PASS enforced production CSP blocks an injected inline event handler while legitimate shopping/admin scripts work.');
  console.log('PASS public tracking link, reference prefill, POST privacy, noindex, incorrect details, normalized correct lookup, older cancelled order without fabricated history.');

  assert.equal(await current.evaluate(`fetch('/api/admin/session/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:${JSON.stringify(adminPassword)}})}).then(response=>response.status)`),200);
  await current.navigate('/admin/');
  await current.evaluate(`Array.from(document.querySelectorAll('.admin aside button')).find(button=>button.textContent.includes('Products')).click()`);await pause(100);
  await current.click('.admin-main tbody tr:first-child button.text-link');
  await poll(()=>current.evaluate(`!!document.querySelector('input[type="file"]')`));
  const setInput=async(name,value)=>current.evaluate(`(()=>{const input=document.querySelector('input[name="'+${JSON.stringify(name)}+'"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await setInput('price','1250');await current.click('input[name="offerEnabled"]');
  await setInput('offerPercent','20');
  assert(await current.evaluate(`(()=>{const preview=document.querySelector('.offer-preview').textContent;return preview.includes('1,250')&&preview.includes('1,000')&&preview.includes('250 (20%)')&&document.querySelector('#offer-timezone').textContent.includes('Asia/Dhaka');})()`));
  await setInput('offerPercent','100');
  assert.equal(await current.evaluate(`document.querySelector('input[name="offerPercent"]').checkValidity()`),false);
  await setInput('offerPercent','20');
  await setInput('offerStart','2030-01-02T12:00');await setInput('offerEnd','2030-01-01T12:00');
  assert(await current.evaluate(`!!document.querySelector('#offer-range-error')`));
  await setInput('offerStart','');await setInput('offerEnd','');
  await current.click('button[aria-label="Remove photo 1"]');await current.click('button[aria-label="Remove photo 1"]');
  fs.writeFileSync(path.join(dir,'not-an-image.txt'),'invalid upload test');
  async function upload(files){const {root}=await current.send('DOM.getDocument');const {nodeId}=await current.send('DOM.querySelector',{nodeId:root.nodeId,selector:'input[type="file"]'});await current.send('DOM.setFileInputFiles',{nodeId,files});await poll(()=>current.evaluate(`!document.querySelector('input[type="file"]').disabled`));await pause(100);}
  await upload([path.resolve('apps/web/public/images/fashion-hero.jpeg'),path.resolve('apps/web/public/brand/aurzen-logo.png'),path.join(dir,'not-an-image.txt')]);
  assert(await current.evaluate(`JSON.parse(document.querySelector('input[name="images"]').value).length===2&&document.querySelector('.photo-field').textContent.includes('successful photos are kept')`));
  await current.evaluate(`Array.from(document.querySelectorAll('.photo-field button')).find(button=>button.textContent==='Retry unsuccessful uploads').click()`);await pause(100);
  assert(await current.evaluate(`JSON.parse(document.querySelector('input[name="images"]').value).length===2&&document.querySelector('.photo-field .form-error').textContent.includes('not-an-image.txt')`));
  await current.evaluate(`Array.from(document.querySelectorAll('.photo-field button')).find(button=>button.textContent==='Dismiss unsuccessful uploads').click()`);
  const before=await current.evaluate(`JSON.parse(document.querySelector('input[name="images"]').value)`);
  await current.click('button[aria-label="Make photo 2 the cover"]');
  assert.equal(await current.evaluate(`document.querySelector('input[name="image"]').value`),before[1]);
  await current.click('button[aria-label="Move photo 1 later"]');
  assert.deepEqual(await current.evaluate(`JSON.parse(document.querySelector('input[name="images"]').value)`),before);
  await current.click('button[aria-label="Remove photo 2"]');
  assert.equal(await current.evaluate(`JSON.parse(document.querySelector('input[name="images"]').value).length`),1);
  await upload([path.resolve('apps/web/public/brand/aurzen-logo.png')]);
  const savedImages=await current.evaluate(`JSON.parse(document.querySelector('input[name="images"]').value)`);
  await current.evaluate(`document.querySelector('.form-modal').requestSubmit()`);await poll(()=>current.evaluate(`!document.querySelector('.form-modal')`));
  const saved=await current.evaluate(`fetch('/api/catalog/').then(response=>response.json()).then(catalog=>catalog.products.find(product=>product.id===1))`);
  assert.deepEqual(saved.images,savedImages);assert.equal(saved.image,savedImages[0]);
  assert.equal(saved.price,1250);assert.equal(saved.offer.percent,20);assert.equal(saved.offer.enabled,true);
  assert.deepEqual(await current.evaluate('window.__errors'),[]);
  console.log('PASS authenticated admin multiple upload, partial failure preservation, retry/dismiss, cover/reorder/remove and saved gallery persistence.');

  const saveFixtureOffer=async offer=>current.evaluate(`fetch('/api/admin/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...${JSON.stringify(saved)},action:'saveProduct',offer:${JSON.stringify(offer)}})}).then(r=>{if(!r.ok)throw new Error('Offer fixture failed');})`);
  const activeOffer={enabled:true,percent:20,startsAt:null,endsAt:null};
  for(const offer of [null,{...activeOffer,enabled:false},{...activeOffer,startsAt:'2099-01-01T00:00:00Z'},{...activeOffer,endsAt:'2000-01-01T00:00:00Z'},activeOffer]){
    await saveFixtureOffer(offer);await current.navigate('/shop/');
    const active=offer===activeOffer;
    assert.equal(await current.evaluate(`!!document.querySelector('.product-image[href="/products/1/"] .offer-badge')`),active);
    assert(await current.evaluate(`(()=>{const card=document.querySelector('.product-image[href="/products/1/"]').closest('.product');return ${active?"card.textContent.includes('1,000')&&card.textContent.includes('250 saved')&&!!card.querySelector('del')":"card.textContent.includes('1,250')&&!card.querySelector('del')"};})()`));
  }
  for(const width of [390,1280]){
    await current.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
    await current.navigate('/shop/');
    assert(await current.evaluate(`(()=>{const image=document.querySelector('.product-image[href="/products/1/"]'),badge=image.querySelector('.offer-badge'),b=badge.getBoundingClientRect(),i=image.getBoundingClientRect(),t=image.querySelector('.tag').getBoundingClientRect();return badge.textContent==='20% OFF'&&b.left>=i.left&&b.top>=i.top&&b.right<=i.right&&b.bottom<t.top&&parseFloat(getComputedStyle(badge).fontSize)>=12&&document.documentElement.scrollWidth<=innerWidth;})()`));
    await current.navigate('/products/1/');
    assert(await current.evaluate(`(()=>{const badge=document.querySelector('.product-gallery-offer .offer-badge').getBoundingClientRect(),control=document.querySelector('.gallery-expand').getBoundingClientRect();return badge.bottom<control.top&&document.querySelector('.detail-copy .product-price').textContent.includes('250 saved');})()`));
    await screenshot('qa-offer-'+width+'.png');
  }
  await saveFixtureOffer({...activeOffer,endsAt:new Date(Date.now()+3000).toISOString()});await current.navigate('/products/1/');
  assert(await current.evaluate(`!!document.querySelector('.offer-badge')`));
  await poll(()=>current.evaluate(`!document.querySelector('.offer-badge')&&!document.querySelector('.detail-copy del')&&document.querySelector('.detail-copy .product-price').textContent.includes('1,250')`));
  await saveFixtureOffer(activeOffer);
  console.log('PASS admin offer preview/validation, saved percentage, absent/disabled/future/expired/active cards, mobile/desktop badge placement and live expiry without reload.');

  await current.evaluate(`localStorage.setItem('aurzen-cart','[]')`);await current.navigate('/products/1/');
  await current.evaluate(`Array.from(document.querySelectorAll('#product-options button')).find(b=>b.textContent==='M').click()`);
  await current.click('.purchase-actions button:first-child');
  await poll(()=>current.evaluate(`!!document.querySelector('.bag-drawer[open]')`));
  assert(await current.evaluate(`(()=>{const drawer=document.querySelector('.bag-drawer');return drawer.textContent.includes('1,000 each')&&drawer.textContent.includes('250 saved')&&drawer.querySelector('del').textContent.includes('1,250')&&drawer.querySelector('.drawer-summary').textContent.includes('1,000');})()`));
  await current.escape();await current.navigate('/cart/');
  await poll(()=>current.evaluate(`!!document.querySelector('.checkout-submit')&&!document.querySelector('.checkout-submit').disabled`));
  const discountedBagTotal=await current.evaluate(`document.querySelector('.checkout-form .summary:last-of-type strong:last-child').textContent`);
  assert.equal(discountedBagTotal,'৳1,080');

  // Buy Now uses the real checkout/API and an isolated database; the saved bag
  // must survive navigation, abandonment, receipt refresh, and both product types.
  const savedBag=[{id:3,qty:2,size:'One size'}];
  await current.evaluate(`localStorage.setItem('aurzen-cart',${JSON.stringify(JSON.stringify(savedBag))})`);
  const bagUnchanged=async()=>assert.deepEqual(await current.evaluate(`JSON.parse(localStorage.getItem('aurzen-cart'))`),savedBag);
  const savedOrders=()=>current.evaluate(`fetch('/api/admin/').then(r=>r.json()).then(d=>d.orders)`);
  const initialOrders=(await savedOrders()).length;
  await current.navigate('/products/2/');
  await current.click('.purchase-actions button:last-child');
  assert(await current.evaluate(`location.pathname==='/products/2/'&&document.querySelector('#product-option-error').textContent.includes('choose a style')`));
  await current.evaluate(`(()=>{const select=document.querySelector('#product-options select');select.value='Minimal & classic';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);await pause(80);
  await current.click('.purchase-actions button:last-child');
  await poll(()=>current.evaluate(`!!document.querySelector('.checkout-form')`));
  assert(await current.evaluate(`document.querySelectorAll('.cart-row').length===1&&document.querySelector('.cart-row').textContent.includes('Minimal & classic')`));
  await bagUnchanged();await current.navigate('/shop/');await bagUnchanged();
  assert.equal((await savedOrders()).length,initialOrders,'Abandoned checkout does not create an order');

  for(const [id,option]of [[1,'M'],[2,'Bold & playful']]){
    await current.navigate('/products/'+id+'/');
    if(id===1)await current.evaluate(`Array.from(document.querySelectorAll('#product-options button')).find(b=>b.textContent==='M').click()`);
    else await current.evaluate(`(()=>{const select=document.querySelector('#product-options select');select.value='Bold & playful';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await pause(80);await current.click('.purchase-actions button:last-child');
    await poll(()=>current.evaluate(`!!document.querySelector('.checkout-form')`));
    assert(await current.evaluate(`document.querySelectorAll('.cart-row').length===1&&document.querySelector('.cart-row').textContent.includes(${JSON.stringify(option)})&&document.querySelector('.cart-item-quantity input').value==='1'`));
    await bagUnchanged();
    const checkoutUrl=await current.evaluate(`location.pathname+location.search`);
    await poll(()=>current.evaluate(`!document.querySelector('.checkout-submit').disabled`));
    if(id===1)assert.equal(await current.evaluate(`document.querySelector('.checkout-form .summary:last-of-type strong:last-child').textContent`),discountedBagTotal,'Bag and Buy Now show the same discounted total');
    await current.evaluate(`(()=>{const form=document.querySelector('.checkout-form');form.elements.namedItem('name').value='Buy Now Test';form.elements.namedItem('phone').value='01712345678';form.elements.namedItem('address').value='House 10, Road 2, Dhaka';form.requestSubmit();form.requestSubmit();})()`);
    await poll(()=>current.evaluate(`!!document.querySelector('.receipt')`));
    const receipt=await current.evaluate(`document.querySelector('.order-reference').textContent`);
    await bagUnchanged();
    const orders=await savedOrders(),order=orders.find(o=>o.id===receipt);
    assert.equal(order.items.length,1);assert.equal(order.items[0].id,id);assert.equal(order.items[0].size,option);assert.equal(order.items[0].qty,1);
    assert.equal(order.total,order.items[0].price+80);assert.equal(order.paymentMethod,'cod');
    if(id===1){assert.equal(order.items[0].price,1000);assert.equal(order.total,1080);}
    await current.navigate(checkoutUrl);await poll(()=>current.evaluate(`!!document.querySelector('.receipt')`));
    assert.equal(await current.evaluate(`document.querySelector('.order-reference').textContent`),receipt);
    assert.equal((await savedOrders()).length,orders.length);await bagUnchanged();
  }
  assert.equal((await savedOrders()).length,initialOrders+2);
  // Delay an actual order request past the offer boundary. Quote refresh must
  // recover after 409 even if the live clock already changed the rendered price.
  await current.evaluate(`(async()=>{const data=await(await fetch('/api/admin/')).json(),p=data.products.find(p=>p.id===1);const r=await fetch('/api/admin/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...p,action:'saveProduct',price:1250,offer:{enabled:true,percent:20,startsAt:null,endsAt:new Date(Date.now()+5000).toISOString()}})});if(!r.ok)throw new Error('Offer fixture failed');})()`);
  await current.navigate('/products/1/');
  await current.evaluate(`Array.from(document.querySelectorAll('#product-options button')).find(b=>b.textContent==='M').click()`);
  await current.click('.purchase-actions button:last-child');
  await poll(()=>current.evaluate(`!!document.querySelector('.checkout-submit')&&!document.querySelector('.checkout-submit').disabled`));
  const countBeforeExpiry=(await savedOrders()).length;
  await current.evaluate(`(()=>{const nativeFetch=window.fetch;window.fetch=async function(url,options){if(String(url).includes('/api/orders/')&&options?.body&&JSON.parse(options.body).key)await new Promise(resolve=>setTimeout(resolve,5500));return nativeFetch.call(this,url,options);};const form=document.querySelector('.checkout-form');form.elements.namedItem('name').value='Offer Expiry Test';form.elements.namedItem('phone').value='01712345678';form.elements.namedItem('address').value='House 10, Road 2, Dhaka';form.requestSubmit();})()`);
  await poll(()=>current.evaluate(`!!document.querySelector('.price-review')&&!document.querySelector('.price-review button').disabled&&!document.querySelector('.checkout-submit').textContent.includes('Placing')`));
  assert.equal((await savedOrders()).length,countBeforeExpiry,'Expired review creates no order');
  assert(await current.evaluate(`document.querySelector('.cart-item-price').textContent.includes('1,250')&&document.querySelector('.checkout-form').textContent.includes('1,330')&&document.querySelector('.checkout-submit').disabled`));
  await current.click('.price-review button');await current.click('.checkout-submit');
  await poll(()=>current.evaluate(`!!document.querySelector('.receipt')`));
  const expiryReceipt=await current.evaluate(`document.querySelector('.order-reference').textContent`),expiryOrder=(await savedOrders()).find(o=>o.id===expiryReceipt);
  assert.equal(expiryOrder.items[0].price,1250);assert.equal(expiryOrder.total,1330);await bagUnchanged();
  console.log('PASS offer expiry during delayed submission: no stale order, authoritative row/summary refresh, mandatory review, saved current unit price and untouched bag.');
  await current.evaluate(`fetch('/api/admin/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'stock',id:2,stock:0})})`);
  await current.navigate('/products/2/');
  assert(await current.evaluate(`Array.from(document.querySelectorAll('.purchase-actions button')).every(b=>b.disabled)`));
  await current.navigate('/cart/?buy=invalid');
  assert(await current.evaluate(`!document.querySelector('.checkout-form')&&document.querySelector('main').textContent.includes('Choose a product')`));
  await bagUnchanged();
  console.log('PASS Buy Now clothing/Mystery Box selection, isolated items, abandoned checkout, saved COD orders, double submit, receipt refresh, unchanged bag, sold-out controls and malformed checkout.');
  await current.close();
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(socket){if(socket.readyState===WebSocket.OPEN){try{await command('Browser.close');}catch{}}socket.close();}
  for(const child of [browser,server])if(child&&child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}
  const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(dir));assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
  try{fs.rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{console.log('Temporary browser profile remains at '+dir);}
});
