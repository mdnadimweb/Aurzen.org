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
