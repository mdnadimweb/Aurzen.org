const test=require('node:test'),assert=require('node:assert/strict');
const {defaultSite,defaultContent,mergeSite,normalizeSiteSection,normalizeContentSection,siteSections,deliveryCharge,linkHref,renderMarkdown,activeAnnouncements}=require('@aurzen/shared/site');
test('every default settings section passes its own validation unchanged',()=>{
  for(const section of siteSections)assert.deepEqual(normalizeSiteSection(section,defaultSite[section]),defaultSite[section],section);
  for(const section of ['pages','faq','reviews'])assert.deepEqual(normalizeContentSection(section,defaultContent[section]),defaultContent[section],section);
});
test('saved sections merge over defaults; broken sections fall back',()=>{
  const site=mergeSite({general:{brand:'X'},footer:'broken'});
  assert.equal(site.general.brand,'X');assert.equal(site.general.tagline,defaultSite.general.tagline);
  assert.deepEqual(site.footer,defaultSite.footer);assert.deepEqual(mergeSite(null),defaultSite);
});
test('unsafe links and images are rejected',()=>{
  const bad={...defaultSite.navigation,items:[{id:'x',label:'X',link:{type:'url',value:'javascript:alert(1)'},hidden:false}]};
  assert.throws(()=>normalizeSiteSection('navigation',bad),/must start with/);
  assert.throws(()=>normalizeSiteSection('seo',{...defaultSite.seo,ogImage:'data:image/png;base64,AAA'}),/uploaded image or an HTTPS link/);
  assert.throws(()=>normalizeSiteSection('seo',{...defaultSite.seo,titleTemplate:'AURZÉN'}),/%s/);
  assert.throws(()=>normalizeContentSection('pages',[{...defaultContent.pages[0],slug:'admin'}]),/reserved/);
  assert.throws(()=>normalizeSiteSection('checkout',{...defaultSite.checkout,cod:false}),/at least one payment method/);
});
test('delivery charge uses area, free threshold and COD fee',()=>{
  const c={...defaultSite.checkout,freeThreshold:3000,codFee:20};
  assert.equal(deliveryCharge(c,'dhaka',1000),100);assert.equal(deliveryCharge(c,'outside',1000),170);assert.equal(deliveryCharge(c,'outside',3000),20);
  assert.equal(deliveryCharge(defaultSite.checkout,'dhaka',99999),80);
});
test('links resolve to shop addresses and markdown is escaped',()=>{
  const tree=[{name:'Ladies Fashion',slug:'ladies-fashion',parent:null,cover:null}];
  assert.equal(linkHref({type:'category',value:'Ladies Fashion'},tree),'/collections/ladies-fashion/');
  assert.equal(linkHref({type:'page',value:'returns'}),'/pages/returns/');
  const html=renderMarkdown('## Hi\n\n<script>x</script> **b** [ok](/shop/) [bad](javascript:alert(1))\n\n- one\n- two');
  assert(!html.includes('<script>'));assert(html.includes('<h2>Hi</h2>'));assert(html.includes('<strong>b</strong>'));
  assert(html.includes('<a href="/shop/">ok</a>'));assert(!html.includes('javascript:'));assert(html.includes('<ul><li>one</li><li>two</li></ul>'));
});
test('scheduled announcements show only inside their window',()=>{
  const site=mergeSite({announcement:{enabled:true,interval:5,items:[{id:'a',text:'Now',detail:'',link:null,active:true,startsAt:null,endsAt:null},{id:'b',text:'Later',detail:'',link:null,active:true,startsAt:'2999-01-01T00:00:00.000Z',endsAt:null},{id:'c',text:'Paused',detail:'',link:null,active:false,startsAt:null,endsAt:null}]}});
  assert.deepEqual(activeAnnouncements(site).map(a=>a.id),['a']);
});
const {normalizeCoupons,applyCoupon,cardLabel,orderFlags}=require('@aurzen/shared/site');
test('coupons validate and discount only eligible items',()=>{
  const [c]=normalizeCoupons([{code:'eid10',type:'percent',value:10,minOrder:1000,usageLimit:2,perCustomer:1,startsAt:null,endsAt:null,applies:{type:'category',value:'Ladies Fashion'},active:true}]);
  assert.equal(c.code,'EID10');
  const family=n=>n==='Ladies Fashion'?['Ladies Fashion','Abayas']:[n];
  const items=[{id:1,price:1000,qty:1,category:'Abayas'},{id:2,price:500,qty:1,category:'Mystery Box'}];
  assert.deepEqual(applyCoupon(c,{items,subtotal:1500,delivery:80,family,used:0,usedByPhone:0}),{discount:100,freeDelivery:false});
  assert.match(applyCoupon(c,{items,subtotal:900,delivery:80,family,used:0,usedByPhone:0}).error,/at least/);
  assert.match(applyCoupon(c,{items,subtotal:1500,delivery:80,family,used:2,usedByPhone:0}).error,/fully used/);
  assert.match(applyCoupon(c,{items,subtotal:1500,delivery:80,family,used:0,usedByPhone:1}).error,/already used/);
  assert.match(applyCoupon(undefined,{items,subtotal:1500,delivery:80,family,used:0,usedByPhone:0}).error,/not valid/);
  assert.throws(()=>normalizeCoupons([c,c]),/Two coupons/);
});
test('mystery box cards never ask for a size; duplicate orders are flagged',()=>{
  const tree=[{name:'Mystery Box',slug:'mystery-box',parent:null,cover:null},{name:"Men's collection",slug:'mens-collection',parent:null,cover:null}];
  const site=mergeSite({categories:{'mystery-box':{label:'size',description:'',seoTitle:'',seoDescription:''}}});
  assert.equal(cardLabel(site,tree,{category:'Mystery Box',stock:3},true),'Reveal your box');
  assert.equal(cardLabel(site,tree,{category:"Men's collection",stock:3},true),'Choose your size');
  assert.equal(cardLabel(site,tree,{category:"Men's collection",stock:0},true),'Currently unavailable');
  const a={id:'A',phone:'01711111111',date:'2026-01-01T10:00:00Z',status:'New'},b={...a,id:'B',date:'2026-01-01T12:00:00Z'};
  assert.equal(orderFlags(a,[a,b]).length,1);assert.equal(orderFlags(a,[a]).length,0);
});
const {saleOffer,appearanceCss,defaultAppearance,sizeGuideFor,giftEligible}=require('@aurzen/shared/site');
test('scheduled sales become offers; biggest running sale wins; future sales wait',()=>{
  const fam=n=>n==='Ladies Fashion'?['Ladies Fashion','Abayas']:[n];
  const now=Date.parse('2026-06-01T00:00:00Z');
  const sales=[{id:'a',name:'A',percent:10,target:'all',category:'',products:[],startsAt:null,endsAt:null,active:true},{id:'b',name:'B',percent:25,target:'category',category:'Ladies Fashion',products:[],startsAt:null,endsAt:'2026-07-01T00:00:00Z',active:true},{id:'c',name:'C',percent:50,target:'products',category:'',products:[9],startsAt:'2026-06-10T00:00:00Z',endsAt:null,active:true}];
  assert.equal(saleOffer(sales,{id:1,category:'Abayas'},fam,now).percent,25);
  assert.equal(saleOffer(sales,{id:2,category:'Mystery Box'},fam,now).percent,10);
  assert.equal(saleOffer(sales.slice(2),{id:9,category:'X'},fam,now).startsAt,'2026-06-10T00:00:00Z');
  assert.equal(saleOffer(sales.map(s=>({...s,active:false})),{id:1,category:'Abayas'},fam,now),null);
});
test('appearance CSS is empty by default and only uses validated values',()=>{
  assert.equal(appearanceCss(defaultAppearance),'');
  const css=appearanceCss(normalizeSiteSection('appearance',{...defaultAppearance,primary:'#112233',buttons:'square',showBadge:false,motion:'off'}));
  assert(css.includes('--plum:#112233'));assert(css.includes('border-radius:0'));assert(css.includes('.product .tag{display:none'));
  assert.throws(()=>normalizeSiteSection('appearance',{...defaultAppearance,primary:'red;}body{display:none'}),/colour/);
});
test('redirects are normalised and cannot hijack the studio',()=>{
  const r=normalizeSiteSection('redirects',{items:[{from:'https://x.com/old-page',to:'/shop/'}]});
  assert.deepEqual(r.items,[{from:'/old-page/',to:'/shop/'}]);
  assert.throws(()=>normalizeSiteSection('redirects',{items:[{from:'/admin/',to:'/shop/'}]}),/cannot be redirected/);
  assert.throws(()=>normalizeSiteSection('redirects',{items:[{from:'/a/',to:'javascript:alert(1)'}]}),/must start/);
});
test('size guides and gift options follow product, subcategory, then main category',()=>{
  const tree=[{name:'Ladies Fashion',slug:'ladies-fashion',parent:null,cover:null},{name:'Abayas',slug:'abayas',parent:'Ladies Fashion',cover:null},{name:'Love & Care',slug:'love-and-care',parent:null,cover:null}];
  const site=mergeSite({sizeGuides:{items:[{id:'a',name:'Main',columns:['S','C'],rows:[],note:'',categories:['ladies-fashion'],products:[]},{id:'b',name:'Product',columns:['S','C'],rows:[],note:'',categories:[],products:[7]}]}});
  assert.equal(sizeGuideFor(site,tree,{id:1,category:'Abayas'}).name,'Main');
  assert.equal(sizeGuideFor(site,tree,{id:7,category:'Abayas'}).name,'Product');
  assert.equal(sizeGuideFor(site,tree,{id:1,category:'Love & Care'}),null);
  assert.equal(giftEligible(site,tree,'Love & Care'),true);assert.equal(giftEligible(site,tree,'Abayas'),false);
  assert.equal(giftEligible(site,tree,'Abayas','on'),true);assert.equal(giftEligible(site,tree,'Love & Care','off'),false);assert.equal(giftEligible(site,tree,'Love & Care','auto'),true);
});
test('homepage sections keep every block once; older saved settings get new defaults',()=>{
  const home=normalizeSiteSection('home',{...defaultSite.home,order:['note','bogus','trust'],hidden:['mystery','mystery','x'],favourites:{...defaultSite.home.favourites,source:'manual',ids:[3,1]}});
  assert.deepEqual(home.order.slice(0,2),['note','trust']);assert.equal(home.order.length,defaultSite.home.order.length);
  assert.deepEqual(home.hidden,['mystery']);assert.deepEqual(home.favourites.ids,[3,1]);
  const old=mergeSite({home:{favourites:{hidden:false,eyebrow:'E',title:'T',cta:'C',count:8}}});
  assert.equal(old.home.favourites.source,'first');assert.equal(old.home.favourites.count,8);assert.deepEqual(old.home.order,defaultSite.home.order);
  assert.throws(()=>normalizeSiteSection('mysteryBox',{guaranteed:'',worth:-1,noSpoiler:'',steps:[]}),/Worth/);
});
const {normalizeHeroSlides}=require('@aurzen/shared/catalog');
test('hero slides accept a safe link and a schedule; banner settings are bounded',()=>{
  const slide={eyebrow:'',title:'Eid edit',emphasis:'',description:'',image:'box',alt:'Box',caption:'',note:'',category:'Ladies Fashion',cta:'Shop',tone:'rose'};
  const [s]=normalizeHeroSlides([{...slide,link:{type:'url',value:'/sale/'},startsAt:'2026-01-01T00:00:00Z',endsAt:'2026-02-01T00:00:00Z',hidden:true}]);
  assert.deepEqual(s.link,{type:'url',value:'/sale/'});assert.equal(s.hidden,true);assert.equal(s.endsAt,'2026-02-01T00:00:00.000Z');
  assert.throws(()=>normalizeHeroSlides([{...slide,link:{type:'url',value:'javascript:alert(1)'}}]),/must start with/);
  assert.throws(()=>normalizeHeroSlides([{...slide,startsAt:'2026-02-01T00:00:00Z',endsAt:'2026-01-01T00:00:00Z'}]),/after start/);
  assert.equal(normalizeHeroSlides([slide])[0].link,undefined);
  assert.deepEqual(normalizeSiteSection('banners',{enabled:false,interval:6,transition:'fade'}),{enabled:false,interval:6,transition:'fade'});
  assert.throws(()=>normalizeSiteSection('banners',{enabled:true,interval:1,transition:'fade'}),/2 to 20/);
});
test('WhatsApp: any number format becomes 8801…, links are encoded, bad numbers never make a link',()=>{
  const {formatWhatsAppNumber:f,whatsappLink,displayWhatsAppNumber,shopWhatsApp,extraMessageTemplates,fillTemplate}=require('@aurzen/shared/site');
  for(const input of ['01864568745','+8801864568745','8801864568745','+880 1864-568745','008801864568745','+880 01864568745','1864568745',' 018 6456 8745 '])
    assert.equal(f(input),'8801864568745',input);
  for(const input of ['','0186456874','018645687451','01264568745','abc','880123',undefined])assert.equal(f(input),'',String(input));
  assert.equal(f('+44 7700 900123'),'447700900123');
  assert.equal(displayWhatsAppNumber('01864568745'),'+880 1864-568745');
  assert.equal(whatsappLink(''),'');assert.equal(whatsappLink('undefined','hi'),'');
  const link=whatsappLink('01864568745','Hi & hello\nদাম: ৳1,200 #1');
  assert.equal(link,'https://wa.me/8801864568745?text='+encodeURIComponent('Hi & hello\nদাম: ৳1,200 #1'));
  assert.match(link,/%0A/);assert.doesNotMatch(link.split('?text=')[1],/[ &#\n]/);
  assert.equal(new URL(link).searchParams.get('text'),'Hi & hello\nদাম: ৳1,200 #1');
  // Saving settings normalises the number and refuses an invalid one with a clear message.
  assert.equal(normalizeSiteSection('general',{...defaultSite.general,whatsapp:'01864-568745'}).whatsapp,'8801864568745');
  assert.throws(()=>normalizeSiteSection('general',{...defaultSite.general,whatsapp:'0186456'}),/valid WhatsApp number/);
  // The button may be switched on before a number exists: it simply stays hidden.
  const i=normalizeSiteSection('integrations',{...defaultSite.integrations,whatsapp:{...defaultSite.integrations.whatsapp,enabled:true,number:''}});
  assert.equal(shopWhatsApp({...defaultSite,integrations:i}),'');
  assert.equal(shopWhatsApp({...defaultSite,general:{...defaultSite.general,whatsapp:'8801711111111'},integrations:{...i,whatsapp:{...i.whatsapp,number:'8801822222222'}}}),'8801711111111');
  assert.equal(shopWhatsApp({...defaultSite,integrations:{...i,whatsapp:{...i.whatsapp,number:'8801822222222'}}}),'8801822222222');
  // "Ask for details" is a valid template name with sensible default text.
  assert.equal(normalizeSiteSection('messages',{'Ask for details':'Hi {name}'})['Ask for details'],'Hi {name}');
  assert.match(fillTemplate(extraMessageTemplates['Ask for details'],{name:'Rina',order_id:'AZ-1',total:'৳500'}),/Rina.*AZ-1.*৳500/);
});
test('mystery box section: photos and seconds per photo are optional, validated and kept',()=>{
  const {mysteryImageLimit}=require('@aurzen/shared/site');
  const base=defaultSite.home;
  const old={...base,mystery:{...base.mystery}};delete old.mystery.images;delete old.mystery.interval;
  const upgraded=normalizeSiteSection('home',old).mystery;
  assert.deepEqual(upgraded.images,[]);assert.equal(upgraded.interval,5);
  const photos=['/media/3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f.webp','https://images.example.com/box.jpg'];
  const saved=normalizeSiteSection('home',{...base,mystery:{...base.mystery,images:photos,interval:8}}).mystery;
  assert.deepEqual(saved.images,photos);assert.equal(saved.interval,8);
  assert.throws(()=>normalizeSiteSection('home',{...base,mystery:{...base.mystery,images:['http://insecure.example.com/a.jpg']}}),/Mystery photo 1/);
  assert.throws(()=>normalizeSiteSection('home',{...base,mystery:{...base.mystery,images:Array(mysteryImageLimit+1).fill(photos[1])}}),/at most/);
  assert.throws(()=>normalizeSiteSection('home',{...base,mystery:{...base.mystery,interval:1}}),/Seconds per photo/);
});
