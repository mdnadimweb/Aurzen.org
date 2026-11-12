// Run after npm run build. Uses an installed Chrome; no browser/test packages required.
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aurzen-intro-'));
const base='http://localhost:3102';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser,server,socket,seq=0;
const pending=new Map(),listeners=[];
async function poll(check,timeout=10000){const deadline=Date.now()+timeout;while(Date.now()<deadline){const value=await check();if(value)return value;await pause(20);}throw new Error('Browser check timed out.');}
function command(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});}
const trace=`window.__intro={seen:false,events:[],focusBlocked:false};
document.addEventListener('animationstart',e=>{if(e.animationName.startsWith('brand-intro'))window.__intro.events.push(e.animationName);});
new MutationObserver(()=>{const overlay=document.querySelector('.brand-intro');if(overlay){window.__intro.seen=true;window.__intro.focusBlocked=document.querySelector('[data-brand-content]').inert;}}).observe(document,{childList:true,subtree:true});`;

async function page({url='/',reduced=false,imageFailure=false,stalled=false,storageBlocked=false,noJs=false}={}){
  const {targetId}=await command('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await command('Target.attachToTarget',{targetId,flatten:true});
  const send=(method,params)=>command(method,params,sessionId);
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Network.setBlockedURLs',{urls:['*://images.unsplash.com/*','*://fonts.googleapis.com/*','*://fonts.gstatic.com/*']});
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  if(reduced)await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:trace+(storageBlocked?`Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Blocked','SecurityError')}});`:'')});
  if(imageFailure||stalled){
    await send('Fetch.enable',{patterns:[{urlPattern:base+'/aurzen-logo.png'}]});
    listeners.push(async event=>{if(event.sessionId===sessionId&&event.method==='Fetch.requestPaused'&&!stalled)await send('Fetch.failRequest',{requestId:event.params.requestId,errorReason:'Failed'});});
  }
  if(noJs)await send('Emulation.setScriptExecutionDisabled',{value:true});
  await send('Page.navigate',{url:base+url});
  return {send,evaluate,targetId,close:()=>command('Target.closeTarget',{targetId})};
}

async function run(){
  let output='';server=spawn(process.execPath,['scripts/test-server.cjs','3102'],{env:{...process.env,TURSO_DATABASE_URL:"",TURSO_AUTH_TOKEN:"",NETLIFY:"",DATABASE_PATH:path.join(dir,'test.sqlite'),CHECKOUT_ENABLED:'false',SEED_DEMO:'true'},stdio:['ignore','pipe','pipe'],windowsHide:true});
  server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
  await poll(()=>{if(server.exitCode!==null)throw new Error(output);return output.includes('Ready in');});
  const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
  browser=spawn(chrome,['--headless=new','--remote-debugging-port=0',`--user-data-dir=${path.join(dir,'profile')}`,'--no-first-run','--no-default-browser-check','--disable-background-networking','about:blank'],{stdio:'ignore',windowsHide:true});
  const portFile=path.join(dir,'profile','DevToolsActivePort');await poll(()=>fs.existsSync(portFile));
  const [port,endpoint]=fs.readFileSync(portFile,'utf8').trim().split('\n');
  socket=new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);await once(socket,'open');
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const waiter=pending.get(message.id);if(waiter){pending.delete(message.id);message.error?waiter.reject(new Error(JSON.stringify(message.error))):waiter.resolve(message.result);}}else for(const listener of listeners)Promise.resolve(listener(message)).catch(console.error);});

  const first=await page();
  await poll(()=>first.evaluate('!!document.querySelector(".brand-intro--playing")'));
  assert(await first.evaluate(`document.querySelector('[data-brand-content]').inert`));
  assert(await first.evaluate(`document.activeElement===document.querySelector('.brand-intro')`));
  const style=await first.evaluate(`(()=>{const e=document.querySelector('.brand-intro');const logo=e.querySelector('img');return {background:getComputedStyle(e).backgroundColor,width:logo.getBoundingClientRect().width,mask:getComputedStyle(e.querySelector('.brand-intro__mask')).maskImage};})()`);
  assert.equal(style.background,'rgb(18, 16, 18)');assert(style.width>=560&&style.width<=720);assert(style.mask.includes('/aurzen-logo.png'));
  await first.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert(await first.evaluate(`document.activeElement===document.querySelector('.brand-intro')`));
  await poll(()=>first.evaluate('window.__intro.seen&&!document.querySelector(".brand-intro")'));
  const events=await first.evaluate('window.__intro.events');assert.equal(events.filter(e=>e==='brand-intro-shine').length,1);assert.equal(events.filter(e=>e==='brand-intro-exit').length,1);
  assert(await first.evaluate(`!document.querySelector('main').closest('[inert]')&&document.body.style.overflow===''&&document.documentElement.style.overflow===''`));
  await first.send('Page.reload');await pause(800);assert.equal(await first.evaluate('window.__intro.events.includes("brand-intro-shine")'),false);
  await first.send('Page.navigate',{url:base+'/shop/'});await pause(800);assert.equal(await first.evaluate('window.__intro.events.includes("brand-intro-shine")'),false);await first.close();
  console.log('PASS first visit: one shine, correct mask/size/background, blocked focus, restored scroll; refresh/navigation skip.');

  const admin=await page({url:'/admin/'});await pause(800);
  assert.equal(await admin.evaluate('window.__intro.seen'),false);assert.equal(await admin.evaluate(`sessionStorage.getItem('aurzen-brand-intro-seen')`),null);await admin.close();
  console.log('PASS direct admin route and its login redirect skip the introduction.');

  for(const [label,options] of [['reduced motion',{reduced:true}],['missing image',{imageFailure:true}],['unavailable storage',{storageBlocked:true}],['stalled image',{stalled:true}]]){
    const current=await page(options);
    if(label==='reduced motion'){await pause(700);assert(await current.evaluate('!document.querySelector(".brand-intro")'));}
    else{await poll(()=>current.evaluate('window.__intro.seen'));await poll(()=>current.evaluate('!document.querySelector(".brand-intro")'),3200);}
    assert(await current.evaluate(`!document.querySelector('main').closest('[inert]')&&document.body.style.overflow===''`));
    await current.close();console.log('PASS '+label+'.');
  }
  const html=await (await fetch(base+'/')).text();
  assert(html.includes('class="brand-intro"'));
  assert(html.indexOf('class="brand-intro"')>=0);
  console.log('PASS initial HTML includes the preloader before hydration.');
  const noJs=await page({noJs:true});await pause(700);
  assert(await noJs.evaluate(`!!document.querySelector('main')&&getComputedStyle(document.querySelector('.brand-intro')).display==='none'&&!document.querySelector('main').closest('[inert]')`));await noJs.close();
  console.log('PASS disabled JavaScript leaves the website unblocked.');
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(socket){try{await command('Browser.close');}catch{}socket.close();}
  for(const child of [browser,server])if(child&&child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}
  const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(dir));assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
  try{fs.rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{console.log('Temporary browser profile remains at '+dir);}
});
