// Run after npm run build. Uses installed Chrome and an isolated catalog on port 3104.
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {randomBytes}=require('node:crypto');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aurzen-presentation-'));
const base='http://localhost:3104',pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser,server,socket,sequence=0;
const pending=new Map();
async function poll(check,timeout=12000){const end=Date.now()+timeout;while(Date.now()<end){const value=await check();if(value)return value;await pause(30);}throw new Error('Presentation browser check timed out.');}
function command(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timed out: '+method));},10000);pending.set(id,{resolve:result=>{clearTimeout(timer);resolve(result);},reject:error=>{clearTimeout(timer);reject(error);}});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});}
async function page(){
  const {targetId}=await command('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await command('Target.attachToTarget',{targetId,flatten:true});
  const send=(method,params)=>command(method,params,sessionId);
  const evaluate=async expression=>{const response=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.exceptionDetails)throw new Error(JSON.stringify(response.exceptionDetails));return response.result.value;};
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Network.setBlockedURLs',{urls:['*://images.unsplash.com/*','*://fonts.googleapis.com/*','*://fonts.gstatic.com/*']});
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`sessionStorage.setItem('aurzen-brand-intro-seen','1');window.__errors=[];window.addEventListener('error',event=>window.__errors.push(event.message));`});
  async function viewport(width){await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await send('Emulation.setTouchEmulationEnabled',{enabled:width<768,maxTouchPoints:1});}
  async function navigate(url){await send('Page.navigate',{url:base+url});await poll(()=>evaluate(`document.readyState==='complete'&&!!document.querySelector(${JSON.stringify(url.startsWith('/admin')?'.admin':'header .bag')})&&!document.querySelector('.brand-intro')`));await pause(180);}
  async function click(selector){await evaluate(`(()=>{const button=document.querySelector(${JSON.stringify(selector)});if(!button)throw new Error('Missing selector: '+${JSON.stringify(selector)});button.focus();button.click();})()`);await pause(80);}
  async function screenshot(name){const {data}=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const folder=path.resolve('data');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'presentation-'+name+'.png'),Buffer.from(data,'base64'));}
  async function fits(label){const metrics=await evaluate(`({viewport:window.innerWidth,width:document.documentElement.scrollWidth,body:document.body.scrollWidth})`);assert(metrics.width<=metrics.viewport+1,label+' has document overflow: '+JSON.stringify(metrics));assert.deepEqual(await evaluate('window.__errors'),[],label+' has browser errors');}
  return {send,evaluate,viewport,navigate,click,screenshot,fits,close:()=>command('Target.closeTarget',{targetId})};
}
async function run(){
  process.env.SEED_DEMO='true';process.env.DATABASE_PATH=path.join(dir,'test.sqlite');process.env.TURSO_DATABASE_URL='';process.env.TURSO_AUTH_TOKEN='';process.env.NETLIFY='';
  const {database}=require('../apps/api/dist/lib/database.js'),db=await database();
  const longName='An exceptionally long product name to verify every small screen remains comfortable and easy to browse';
  await db.prepare('UPDATE products SET name=?,image=?,images=?,description=? WHERE id=1').run(longName,'/images/fashion-hero.jpeg',JSON.stringify(['/images/fashion-hero.jpeg','/brand/aurzen-logo.png']),'Local presentation fixture. Product details supplied by the owner appear here.');
  await db.prepare('UPDATE products SET image=?,images=?,stock=0 WHERE id=3').run('','[]');
  await db.prepare('UPDATE products SET image=?,images=? WHERE id=4').run('/images/qa-not-found.webp','[]');
  db.close();delete globalThis.aurzenDatabase;
  const adminPassword=randomBytes(32).toString('hex');let output='';
  server=spawn(process.execPath,['scripts/test-server.cjs','3104'],{env:{...process.env,CHECKOUT_ENABLED:'true',SEED_DEMO:'true',ADMIN_PASSWORD:adminPassword},stdio:['ignore','pipe','pipe'],windowsHide:true});
  server.stdout.on('data',chunk=>output+=chunk);server.stderr.on('data',chunk=>output+=chunk);
  await poll(()=>{if(server.exitCode!==null)throw new Error(output);return output.includes('Ready in');});
  browser=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--remote-debugging-port=0',`--user-data-dir=${path.join(dir,'profile')}`,'--no-first-run','--no-default-browser-check','--disable-background-networking','about:blank'],{stdio:'ignore',windowsHide:true});
  const portFile=path.join(dir,'profile','DevToolsActivePort');await poll(()=>{if(browser.exitCode!==null)throw new Error('Headless Chrome exited before remote debugging became available.');return fs.existsSync(portFile);});
  const [port,endpoint]=fs.readFileSync(portFile,'utf8').trim().split('\n');socket=new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);await Promise.race([once(socket,'open'),pause(10000).then(()=>{throw new Error('Headless Chrome remote debugging did not connect.');})]);
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const waiter=pending.get(message.id);if(waiter){pending.delete(message.id);message.error?waiter.reject(new Error(JSON.stringify(message.error))):waiter.resolve(message.result);}}});

  const current=await page();
  await current.viewport(390);await current.navigate('/');
  await current.evaluate(`localStorage.setItem('aurzen-cart',JSON.stringify([{id:1,qty:1,size:'M'}]))`);
  const pages=[['home','/'],['shop','/shop/'],['product','/products/1/'],['cart','/cart/'],['tracking','/tracking/']];
  for(const width of [360,390,768,1440]){
    await current.viewport(width);
    for(const [name,url] of pages){
      await current.navigate(url);
      if(name==='shop'){
        const columns=await current.evaluate(`getComputedStyle(document.querySelector('.product-grid')).gridTemplateColumns.split(' ').filter(Boolean).length`);
        if(width<768)assert.equal(columns,2,'Phone shop must have two columns at '+width);
        assert(await current.evaluate(`Array.from(document.querySelectorAll('.product h3')).every(title=>title.scrollWidth<=title.clientWidth+1)`),'Product title overflows at '+width);
      }
      await current.fits(width+' '+name);await current.screenshot(width+'-'+name);
    }
    console.log('PASS '+width+'px home/shop/product/cart/tracking: no horizontal document overflow, readable wrapping and phone grid.');
  }

  await current.viewport(390);await current.navigate('/shop/');
  await current.evaluate(`(async()=>{for(const product of document.querySelectorAll('.product')){product.scrollIntoView({block:'center'});await new Promise(resolve=>setTimeout(resolve,120));}window.scrollTo(0,0);})()`);await pause(200);
  const cards=await current.evaluate(`Array.from(document.querySelectorAll('.product')).map(product=>({soldout:product.classList.contains('product--sold-out'),states:Array.from(product.querySelectorAll('.product-media')).map(frame=>frame.dataset.state),secondary:product.querySelectorAll('.product-media__secondary').length}))`);
  assert(cards.some(card=>card.soldout),'Sold-out product lacks its state');
  assert(cards.some(card=>card.states.includes('missing')),'Missing image lacks its fallback');
  assert(cards.some(card=>card.states.includes('error')),'Broken image lacks its fallback');
  assert(cards.every(card=>card.secondary===0),'Touch cards fetched secondary images before any desktop hover');
  const mobileMain=await current.evaluate(`document.querySelector('.product-media__main')?.getAttribute('src')`);
  await current.evaluate(`document.querySelector('.product-media').dispatchEvent(new PointerEvent('pointerover',{pointerType:'touch',isPrimary:true,bubbles:true}))`);await pause(80);
  assert.equal(await current.evaluate(`document.querySelector('.product-media__main')?.getAttribute('src')`),mobileMain);
  assert.equal(await current.evaluate(`document.querySelectorAll('.product-media__secondary').length`),0);
  console.log('PASS sold-out, missing-image and broken-image cards, reserved frames and stable touch cover images.');

  const menuExists=await current.evaluate(`!!document.querySelector('.mobile-menu-toggle,.store-menu-button')`);
  assert(menuExists,'Mobile menu toggle is missing');await current.click('.mobile-menu-toggle,.store-menu-button');
  assert(await current.evaluate(`document.querySelector('.mobile-menu-toggle,.store-menu-button').getAttribute('aria-expanded')==='true'&&!!document.querySelector('.mobile-nav[open]')&&document.querySelector('.mobile-nav').contains(document.activeElement)`));
  for(let i=0;i<12;i++)await current.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert(await current.evaluate(`document.querySelector('.mobile-nav').contains(document.activeElement)`));
  await current.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await pause(80);
  assert(await current.evaluate(`document.querySelector('.mobile-menu-toggle,.store-menu-button').getAttribute('aria-expanded')==='false'&&document.activeElement===document.querySelector('.mobile-menu-toggle,.store-menu-button')`));
  await current.click('.mobile-menu-toggle,.store-menu-button');
  await current.send('Input.dispatchMouseEvent',{type:'mousePressed',x:389,y:300,button:'left',clickCount:1});await current.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:389,y:300,button:'left',clickCount:1});
  await poll(()=>current.evaluate(`!document.querySelector('.mobile-nav[open]')`));
  const targets=await current.evaluate(`Array.from(document.querySelectorAll('header button,.product-image')).filter(element=>{const rect=element.getBoundingClientRect();return rect.width&&rect.height&&getComputedStyle(element).visibility!=='hidden';}).map(element=>({label:element.textContent.trim(),width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height}))`);
  assert(targets.every(target=>target.width>=44&&target.height>=44),'Small mobile target: '+JSON.stringify(targets));
  await current.evaluate(`document.activeElement.blur()`);await current.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert(await current.evaluate(`(()=>{const style=getComputedStyle(document.activeElement);return document.activeElement!==document.body&&(style.outlineStyle!=='none'||style.boxShadow!=='none');})()`),'Keyboard focus indicator is missing');
  await current.click('.mobile-menu-toggle,.store-menu-button');await current.click('.mobile-nav a[href="/tracking/"]');
  await poll(()=>current.evaluate(`location.pathname==='/tracking/'&&!document.querySelector('.mobile-nav[open]')&&!!document.querySelector('.tracking-form')`));
  console.log('PASS mobile menu, focus trapping/restoration, Escape/backdrop dismissal, link navigation, 44px interactive targets and keyboard focus visibility.');

  await current.evaluate(`(()=>{const input=document.querySelector('#tracking-phone');input.focus();input.value='123';input.dispatchEvent(new Event('input',{bubbles:true}));input.blur();})()`);await pause(80);
  assert(await current.evaluate(`document.querySelector('#tracking-phone').getAttribute('aria-invalid')==='true'&&!!document.querySelector('#tracking-phone-error')`));
  await current.evaluate(`(()=>{const input=document.querySelector('#tracking-phone');input.focus();input.value='+8801712345678';input.dispatchEvent(new Event('input',{bubbles:true}));input.blur();document.querySelector('.tracking-form').requestSubmit();})()`);await pause(80);
  assert(await current.evaluate(`document.querySelector('#tracking-phone').getAttribute('aria-invalid')==='false'&&document.querySelector('#tracking-reference').validity.valueMissing&&!!document.querySelector('#tracking-reference-error')`));
  await current.navigate('/cart/');await poll(()=>current.evaluate(`!!document.querySelector('.checkout-form')&&!document.querySelector('.checkout-form fieldset').disabled`));
  await current.click('#checkout-phone');await current.send('Input.insertText',{text:'123'});await current.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await pause(80);
  const checkoutPhone=await current.evaluate(`({value:document.querySelector('#checkout-phone').value,invalid:document.querySelector('#checkout-phone').getAttribute('aria-invalid'),error:document.querySelector('#checkout-phone-error')?.textContent})`);
  assert(checkoutPhone.invalid==='true'&&checkoutPhone.error,'Checkout blur feedback: '+JSON.stringify(checkoutPhone));
  await current.evaluate(`(()=>{const input=document.querySelector('#checkout-phone');input.focus();input.value='+8801712345678';input.dispatchEvent(new Event('input',{bubbles:true}));input.blur();document.querySelector('.checkout-form').requestSubmit();})()`);await pause(80);
  assert(await current.evaluate(`document.querySelector('#checkout-phone').getAttribute('aria-invalid')==='false'&&document.querySelector('#checkout-name').validity.valueMissing&&!!document.querySelector('#checkout-name-error')`));
  await current.screenshot('390-checkout-validation');
  console.log('PASS checkout/tracking invalid phone feedback, +880 correction and native required-field inline errors; no order submitted.');

  await current.navigate('/shop/');
  async function search(value){await current.evaluate(`(()=>{const input=document.querySelector('[aria-label="Search products"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);await pause(80);}
  await search('exceptionally');assert.equal(await current.evaluate(`document.querySelectorAll('.product').length`),1);
  await search('no such product here');assert(await current.evaluate(`document.querySelectorAll('.product').length===0&&document.querySelector('.shop .empty').textContent.includes('No pieces found')`));
  await search('');await current.evaluate(`Array.from(document.querySelectorAll('.shop-toolbar .chips button')).find(button=>button.textContent==='Clothing').click()`);await pause(80);
  assert.equal(await current.evaluate(`document.querySelectorAll('.product').length`),2);
  await current.evaluate(`Array.from(document.querySelectorAll('.shop-toolbar .chips button')).find(button=>button.textContent==='All').click()`);await pause(80);
  await current.evaluate(`(()=>{const select=document.querySelector('[aria-label="Sort products"]');select.value='price-asc';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);await pause(80);
  assert(await current.evaluate(`document.querySelector('.product-image').getAttribute('href')==='/products/3/'`));
  await current.click('.product-image');await poll(()=>current.evaluate(`location.pathname==='/products/3/'&&!!document.querySelector('.detail-copy button.primary')`));
  assert(await current.evaluate(`document.querySelector('.detail-copy button.primary').disabled`));
  console.log('PASS search, empty search results, category filtering, price sorting and sold-out product link navigation.');

  await current.viewport(1440);await current.navigate('/shop/');
  const hover=await current.evaluate(`matchMedia('(hover:hover) and (pointer:fine)').matches`);assert(hover,'Desktop pointer emulation lacks hover');
  const first=await current.evaluate(`(()=>{const rect=document.querySelector('.product-image').getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2};})()`);
  await current.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:first.x,y:first.y});
  await poll(()=>current.evaluate(`!!document.querySelector('.product-media__secondary')`));
  await poll(()=>current.evaluate(`!!document.querySelector('.product-media--preview')`));
  assert.equal(await current.evaluate(`document.querySelectorAll('.product-media__secondary').length`),1);
  await current.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:10,y:10});await pause(100);
  assert(await current.evaluate(`!document.querySelector('.product-media--preview')`));
  console.log('PASS desktop secondary photo loads only for a real hover and returns to the selected cover.');

  assert.equal(await current.evaluate(`fetch('/api/admin/session/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:${JSON.stringify(adminPassword)}})}).then(response=>response.status)`),200);
  for(const width of [360,390,768,1440]){
    await current.viewport(width);await current.navigate('/admin/');
    await current.evaluate(`Array.from(document.querySelectorAll('.admin aside button')).find(button=>button.textContent.includes('Products')).click()`);await pause(80);
    await current.click('.admin-main tbody tr:first-child button.text-link');
    await poll(()=>current.evaluate(`!!document.querySelector('.form-modal')`));
    await current.fits(width+' admin product form');await current.screenshot(width+'-admin-form');
    assert(await current.evaluate(`(()=>{const rect=document.querySelector('.form-modal').getBoundingClientRect();return rect.width<=window.innerWidth;})()`),'Admin form exceeds viewport at '+width);
    for(let i=0;i<20;i++)await current.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert(await current.evaluate(`document.querySelector('.admin-edit-dialog').contains(document.activeElement)`));
    await current.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await pause(80);
    assert(await current.evaluate(`!document.querySelector('.admin-edit-dialog[open]')&&document.activeElement===document.querySelector('.admin-main tbody tr:first-child button.text-link')`));
  }
  console.log('PASS 360/390/768/1440px authenticated admin product forms: no horizontal document overflow, focus trap, Escape and focus restoration.');
  await current.close();
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(socket){if(socket.readyState===WebSocket.OPEN){try{await command('Browser.close');}catch{}}socket.close();}
  for(const child of [browser,server])if(child&&child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}
  const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(dir));assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
  try{fs.rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{console.log('Temporary browser profile remains at '+dir);}
});
