// Owner-editable storefront settings (one `site` settings row) and content lists.
// Defaults reproduce the storefront exactly as it was hard-coded, so nothing changes until
// the owner edits something. Saved values are merged over these defaults section by section,
// so adding a new setting later never breaks an older saved copy.
import {categoryPath,type Category} from './catalog';

// ---- Links: chosen from the shop's own pages so they cannot break ----
export const linkTypes=['home','shop','collections','sale','tracking','categories','category','product','page','faq','url'] as const;
export type SiteLink={type:typeof linkTypes[number];value:string};
export const linkTypeLabels:Record<SiteLink['type'],string>={home:'Home',shop:'Shop all',collections:'All categories',sale:'Sale',tracking:'Track order',categories:'Every main category (automatic)',category:'A category',product:'A product',page:'A page',faq:'FAQ',url:'Custom address'};
export function linkHref(link:SiteLink,categories:Category[]=[]):string{
  switch(link.type){
    case 'home':return '/';
    case 'shop':return '/shop/';
    case 'collections':case 'categories':return '/collections/';
    case 'sale':return '/sale/';
    case 'tracking':return '/tracking/';
    case 'faq':return '/faq/';
    case 'category':return categoryPath(categories,link.value);
    case 'product':return '/products/'+encodeURIComponent(link.value)+'/';
    case 'page':return '/pages/'+encodeURIComponent(link.value)+'/';
    case 'url':return link.value||'/';
  }
}
export type NavItem={id:string;label:string;link:SiteLink;hidden:boolean};
export type FooterColumn={id:string;title:string;hidden:boolean;links:NavItem[]};
export type Announcement={id:string;text:string;detail:string;link:SiteLink|null;active:boolean;startsAt:string|null;endsAt:string|null};
export const cardLabels=['auto','size','bag','reveal','available'] as const;
export const cardLabelText:Record<typeof cardLabels[number],string>={auto:'Automatic',size:'Choose your size',bag:'Add to bag',reveal:'Reveal your box',available:'Available'};
export type CategorySettings={label:typeof cardLabels[number];description:string;seoTitle:string;seoDescription:string};
export type Sale={id:string;name:string;percent:number;target:'all'|'category'|'products';category:string;products:number[];startsAt:string|null;endsAt:string|null;active:boolean};
export type Appearance={primary:string;accent:string;background:string;text:string;headingFont:'cormorant'|'georgia'|'system';bodyFont:'dm-sans'|'system';buttons:'pill'|'rounded'|'square';buttonFill:'filled'|'outline';imageRatio:'default'|'4/5'|'1/1';showBadge:boolean;showSaved:boolean;motion:'off'|'slow'|'normal';maintenance:boolean;maintenanceMessage:string;notFoundTitle:string;notFoundText:string};
export type SizeGuide={id:string;name:string;columns:string[];rows:string[][];note:string;categories:string[];products:number[]};
/** Homepage blocks below the hero, in the owner's order. */
/** Most photos the homepage mystery box section rotates through. */
export const mysteryImageLimit=8;
export const homeSections=['trust','collections','promos','favourites','categoryRows','mystery','testimonials','note'];
export const homeSectionLabels:Record<string,string>={trust:'Trust strip',collections:'Shop by collection',promos:'Promotion banners',favourites:'Favourites row',categoryRows:'Category rows',mystery:'Mystery box section',testimonials:'Customer reviews',note:'A note from the brand'};
export type TrustItem={id:string;icon:string;text:string;hidden:boolean};

export type SiteSettings={
  general:{brand:string;tagline:string;about:string;logo:string;logoDark:string;favicon:string;whatsapp:string;phone:string;email:string;messenger:string;address:string;hours:string;facebook:string;instagram:string;tiktok:string;youtube:string;businessInfo:string};
  announcement:{enabled:boolean;interval:number;items:Announcement[]};
  navigation:{items:NavItem[]};
  footer:{columns:FooterColumn[];bottomText:string;payments:string[];legal:NavItem[];newsletter:{enabled:boolean;title:string;text:string}};
  checkout:{dhaka:number;outside:number;freeThreshold:number;cod:boolean;codFee:number;bkash:{enabled:boolean;instructions:string};nagad:{enabled:boolean;instructions:string};advance:{enabled:boolean;instructions:string};minOrder:number;email:'hidden'|'optional'|'required';note:boolean;paymentNote:string;returnsNote:string;confirmTitle:string;confirmText:string;trackingIntro:string;estimate:string};
  home:{trust:TrustItem[];order:string[];hidden:string[];favourites:{hidden:boolean;eyebrow:string;title:string;cta:string;count:number;source:'first'|'newest'|'bestsellers'|'sale'|'category'|'manual';category:string;ids:number[]};mystery:{hidden:boolean;eyebrow:string;title:string;text:string;cta:string;small:string;/** Photos shown in turn instead of the box drawing; seconds per photo. */images:string[];interval:number};note:{hidden:boolean;eyebrow:string;title:string;emphasis:string;text:string}};
  seo:{title:string;titleTemplate:string;description:string;ogImage:string;indexing:boolean};
  integrations:{pixel:string;analytics:string;searchConsole:string;whatsapp:{enabled:boolean;number:string;message:string;position:'left'|'right'};messenger:{enabled:boolean;link:string}};
  popup:{enabled:boolean;title:string;text:string;image:string;cta:string;link:SiteLink|null;days:number;startsAt:string|null;endsAt:string|null};
  /** Per category, keyed by its URL slug (stable after renames). */
  categories:Record<string,CategorySettings>;
  /** WhatsApp/SMS message templates per order status. Placeholders: {order_id} {name} {total} {status} {courier} {tracking}. */
  messages:Record<string,string>;
  sales:{items:Sale[];page:{eyebrow:string;title:string;intro:string;banner:string}};
  appearance:Appearance;
  redirects:{items:{from:string;to:string}[]};
  sizeGuides:{items:SizeGuide[]};
  gifts:{wrap:boolean;wrapPrice:number;card:boolean;cardLimit:number;categories:string[]};
  mysteryBox:{guaranteed:string;worth:number;noSpoiler:string;steps:string[]};
  banners:{enabled:boolean;interval:number;transition:'slide'|'fade'};
};

const nav=(id:string,label:string,type:SiteLink['type'],value=''):NavItem=>({id,label,link:{type,value},hidden:false});
export const defaultAppearance:Appearance={primary:'#432b3b',accent:'#b8925a',background:'#fbf9f5',text:'#302b2b',headingFont:'cormorant',bodyFont:'dm-sans',buttons:'pill',buttonFill:'filled',imageRatio:'default',showBadge:true,showSaved:true,motion:'normal',maintenance:false,maintenanceMessage:'We’re making a few little changes. Please visit again soon.',notFoundTitle:'This page is out of reach.',notFoundText:'The page or product may have moved.'};
export const defaultSite:SiteSettings={
  general:{brand:'AURZÉN',tagline:'A little elegance. A little unexpected.',about:'A little elegance for every day.\nThoughtfully selected in Bangladesh.',logo:'',logoDark:'',favicon:'',whatsapp:'',phone:'',email:'',messenger:'',address:'',hours:'',facebook:'',instagram:'',tiktok:'',youtube:'',businessInfo:''},
  announcement:{enabled:true,interval:5,items:[{id:'welcome',text:'A little joy, delivered.',detail:'Thoughtfully selected in Bangladesh',link:null,active:true,startsAt:null,endsAt:null}]},
  navigation:{items:[nav('home','Home','home'),nav('shop','Shop all','shop'),nav('categories','Categories','categories'),nav('sale','Sale','sale')]},
  footer:{
    columns:[
      {id:'shop',title:'Shop',hidden:false,links:[nav('categories','Categories','categories'),nav('sale','Sale','sale'),nav('all','All categories','collections')]},
      {id:'care',title:'Customer care',hidden:false,links:[nav('track','Track your order','tracking'),nav('delivery','Delivery info','page','delivery'),nav('returns','Returns & exchange','page','returns'),nav('size','Size guide','page','size-guide'),nav('faq','FAQ','faq')]},
    ],
    bottomText:'Made with a little love.',payments:['Cash on delivery'],
    legal:[nav('privacy','Privacy','page','privacy'),nav('terms','Terms','page','terms')],
    newsletter:{enabled:false,title:'A little news, now and then.',text:'New arrivals and quiet offers. No spam.'},
  },
  checkout:{dhaka:80,outside:150,freeThreshold:0,cod:true,codFee:0,bkash:{enabled:false,instructions:''},nagad:{enabled:false,instructions:''},advance:{enabled:false,instructions:''},minOrder:0,email:'hidden',note:false,
    paymentNote:'Pay the full order total, including delivery, when your parcel arrives. No online payment is required.',
    returnsNote:'Returns are accepted if the delivered item does not match your order.',
    confirmTitle:'Your order is received.',confirmText:'Keep this reference for your records. Our team will contact you to confirm delivery.',
    trackingIntro:'',estimate:''},
  home:{
    trust:[{id:'selected',icon:'♧',text:'Thoughtfully selected',hidden:false},{id:'premium',icon:'◇',text:'Premium, within reach',hidden:false},{id:'cod',icon:'▧',text:'Cash on delivery',hidden:false},{id:'love',icon:'♡',text:'Packed with a little love',hidden:false}],
    order:homeSections.slice(),hidden:[],
    favourites:{hidden:false,eyebrow:'LOVED FOR A REASON',title:'The current favourites.',cta:'Discover the edit ↗',count:4,source:'first',category:'',ids:[]},
    mystery:{hidden:false,eyebrow:'A SURPRISE WITH YOUR NAME ON IT',title:'Good things come\nin mystery boxes.',text:'Tell us a little about your style. We’ll take care of the surprise. A thoughtfully curated box of fashion and accessories, made to brighten your everyday.',cta:'Find your mystery box ↗',small:'Thoughtfully selected · Beautifully wrapped · Uniquely you',images:[],interval:5},
    note:{hidden:false,eyebrow:'A NOTE FROM AURZÉN',title:'Beautiful things.',emphasis:'Without the extraordinary price.',text:'We believe a little elegance belongs in every day. We’re building AURZÉN around pieces that feel special, thoughtful details, and the joy of finding something that feels like you.'},
  },
  seo:{title:'AURZÉN | A little elegance. A little unexpected.',titleTemplate:'%s | AURZÉN',description:'Discover thoughtfully selected fashion and Mystery Style Boxes from AURZÉN. Premium style for everyday moments, delivered across Bangladesh.',ogImage:'',indexing:true},
  integrations:{pixel:'',analytics:'',searchConsole:'',whatsapp:{enabled:false,number:'',message:'Hi AURZÉN, I have a question.',position:'right'},messenger:{enabled:false,link:''}},
  popup:{enabled:false,title:'',text:'',image:'',cta:'',link:null,days:7,startsAt:null,endsAt:null},
  categories:{},
  sales:{items:[],page:{eyebrow:'LIMITED-TIME OFFERS',title:'Sale',intro:'Current offers on AURZÉN pieces. Prices update automatically when an offer ends.',banner:''}},
  appearance:defaultAppearance,
  redirects:{items:[{from:'/collections/bridal-and-party/',to:'/collections/ladies-fashion/bridal-and-party/'},{from:'/collections/abayas/',to:'/collections/ladies-fashion/abayas/'}]},
  sizeGuides:{items:[{id:'clothing',name:'Clothing (inches)',columns:['Size','Chest','Waist','Length'],rows:[['S','36','30','27'],['M','38','32','28'],['L','40','34','29'],['XL','42','36','30'],['XXL','44','38','31']],note:'Measurements are in inches. Between sizes? Choose the larger one.',categories:[],products:[]}]},
  gifts:{wrap:false,wrapPrice:50,card:false,cardLimit:150,categories:[]},
  mysteryBox:{guaranteed:'',worth:0,noSpoiler:'',steps:[]},
  banners:{enabled:true,interval:4.5,transition:'slide'},
  messages:{Confirmed:'Hi {name}, your AURZÉN order {order_id} is confirmed. Total {total}. We will let you know when it ships.',Shipped:'Hi {name}, your AURZÉN order {order_id} is on its way with {courier} (tracking {tracking}).',Delivered:'Hi {name}, your AURZÉN order {order_id} has been delivered. Thank you for choosing us!',Cancelled:'Hi {name}, your AURZÉN order {order_id} has been cancelled. Reply if you have any questions.'},
};

// ---- Validation helpers ----
class Invalid extends Error{}
const fail=(message:string):never=>{throw new Invalid(message);};
const obj=(v:unknown,label:string)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail('Invalid '+label+'.');return v as Record<string,unknown>;};
function str(v:unknown,max:number,label:string,{required=false,multiline=false}={}):string{
  if(v===undefined||v===null)v='';
  if(typeof v!=='string')fail(label+' must be text.');
  let s=(v as string).replace(/\r\n/g,'\n');
  s=multiline?s.split('\n').map(line=>line.replace(/[ \t]+/g,' ').trim()).join('\n').replace(/\n{3,}/g,'\n\n').trim():s.replace(/\s+/g,' ').trim();
  if(required&&!s)fail(label+' is required.');
  if(s.length>max)fail(`${label} must be at most ${max} characters.`);
  return s;
}
const bool=(v:unknown,label:string)=>{if(typeof v!=='boolean')fail(label+' must be on or off.');return v as boolean;};
function int(v:unknown,min:number,max:number,label:string){if(!Number.isSafeInteger(v)||(v as number)<min||(v as number)>max)fail(`${label} must be a whole number from ${min} to ${max}.`);return v as number;}
const id=(v:unknown)=>typeof v==='string'&&/^[a-z0-9-]{1,40}$/.test(v)?v:fail('Invalid item id.');
function date(v:unknown,label:string){
  if(v===null||v===undefined||v==='')return null;
  if(typeof v!=='string'||!Number.isFinite(Date.parse(v))||!/(Z|[+-]\d{2}:\d{2})$/.test(v))fail(label+' must be a valid date and time.');
  return new Date(v as string).toISOString();
}
function range(startsAt:unknown,endsAt:unknown,at:string){
  const s=date(startsAt,'Start'+at),e=date(endsAt,'End'+at);
  if(s&&e&&s>=e)fail('End must be after start'+at+'.');
  return {startsAt:s,endsAt:e};
}
/** Site-relative paths, own uploads or HTTPS images only. */
export function safeImage(v:unknown,label:string){
  const s=str(v,2000,label);
  if(!s||/^\/media\/[a-f0-9-]{36}\.webp$/.test(s)||/^\/(images|brand)\/[a-z0-9-]+\.(?:jpe?g|png|webp|svg|ico)$/.test(s))return s;
  try{if(new URL(s).protocol==='https:')return s;}catch{}
  return fail(label+' must be an uploaded image or an HTTPS link.');
}
/** http(s), mailto, tel or a site path starting with "/". Never javascript: or data:. */
export function safeUrl(v:unknown,label:string,max=500){
  const s=str(v,max,label);
  if(!s)return s;
  if(/^\/(?!\/)[^\s]*$/.test(s))return s;
  try{const u=new URL(s);if(['https:','http:','mailto:','tel:'].includes(u.protocol))return s;}catch{}
  return fail(label+' must start with https://, mailto:, tel: or /.');
}
export function normalizeLink(v:unknown,label:string):SiteLink{
  const l=obj(v,label);
  if(!linkTypes.includes(l.type as SiteLink['type']))fail('Choose where '+label+' goes.');
  const type=l.type as SiteLink['type'];
  const value=type==='url'?safeUrl(l.value,label):['category','product','page'].includes(type)?str(l.value,100,label,{required:true}):'';
  if(type==='product'&&!/^\d+$/.test(value))fail('Choose a product for '+label+'.');
  if(type==='page'&&!/^[a-z0-9-]{1,60}$/.test(value))fail('Choose a page for '+label+'.');
  if(type==='url'&&!value)fail('Enter an address for '+label+'.');
  return {type,value};
}
const optionalLink=(v:unknown,label:string)=>v===null||v===undefined?null:normalizeLink(v,label);
function navList(v:unknown,label:string,max:number):NavItem[]{
  if(!Array.isArray(v)||v.length>max)fail(`Use at most ${max} ${label} links.`);
  const ids=new Set<string>();
  return (v as unknown[]).map((input,i)=>{
    const n=obj(input,label+' link'),at=` (${label} link ${i+1})`;
    const itemId=id(n.id);if(ids.has(itemId))fail('Duplicate link'+at+'.');ids.add(itemId);
    return {id:itemId,label:str(n.label,40,'Label'+at,{required:true}),link:normalizeLink(n.link,'link'+at),hidden:n.hidden===true};
  });
}

/** Validates one section of the site settings. Throws Error with a message for the owner. */
export function normalizeSiteSection<K extends keyof SiteSettings>(section:K,value:unknown):SiteSettings[K]{
  try{return sectionNormalizers[section](value) as SiteSettings[K];}
  catch(error){if(error instanceof Invalid)throw new Error(error.message);throw error;}
}
const sectionNormalizers:{[K in keyof SiteSettings]:(v:unknown)=>SiteSettings[K]}={
  general(v){
    const g=obj(v,'general settings');
    const contact=(key:string,label:string,max=200)=>str(g[key],max,label);
    const typed=str(g.whatsapp,25,'WhatsApp number'),whatsapp=formatWhatsAppNumber(typed);
    if(typed&&!whatsapp)fail('Enter a valid WhatsApp number, e.g. 01XXXXXXXXX or 8801XXXXXXXXX (11 digits starting with 01 in Bangladesh).');
    const email=str(g.email,120,'Email');if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Enter a valid email address.');
    return {brand:str(g.brand,40,'Brand name',{required:true}),tagline:str(g.tagline,120,'Tagline'),about:str(g.about,300,'Footer text',{multiline:true}),
      logo:safeImage(g.logo,'Logo'),logoDark:safeImage(g.logoDark,'Light logo'),favicon:safeImage(g.favicon,'Favicon'),
      whatsapp,phone:contact('phone','Phone',30),email,messenger:safeUrl(g.messenger,'Messenger link'),address:str(g.address,300,'Address',{multiline:true}),hours:contact('hours','Support hours',120),
      facebook:safeUrl(g.facebook,'Facebook link'),instagram:safeUrl(g.instagram,'Instagram link'),tiktok:safeUrl(g.tiktok,'TikTok link'),youtube:safeUrl(g.youtube,'YouTube link'),
      businessInfo:str(g.businessInfo,300,'Business info',{multiline:true})};
  },
  announcement(v){
    const a=obj(v,'announcement');
    if(!Array.isArray(a.items)||a.items.length>10)fail('Use at most 10 announcement messages.');
    const ids=new Set<string>();
    const items=(a.items as unknown[]).map((input,i)=>{
      const m=obj(input,'announcement'),at=` on message ${i+1}`;
      const itemId=id(m.id);if(ids.has(itemId))fail('Duplicate message'+at+'.');ids.add(itemId);
      return {id:itemId,text:str(m.text,80,'Message'+at,{required:true}),detail:str(m.detail,80,'Detail'+at),link:optionalLink(m.link,'message '+(i+1)),active:m.active!==false,...range(m.startsAt,m.endsAt,at)};
    });
    return {enabled:bool(a.enabled,'Announcement bar'),interval:int(a.interval,3,20,'Seconds per message'),items};
  },
  navigation(v){const n=obj(v,'navigation');return {items:navList(n.items,'menu',12)};},
  footer(v){
    const f=obj(v,'footer');
    if(!Array.isArray(f.columns)||f.columns.length>4)fail('Use at most 4 footer columns.');
    const ids=new Set<string>();
    const columns=(f.columns as unknown[]).map((input,i)=>{
      const c=obj(input,'footer column');const colId=id(c.id);if(ids.has(colId))fail('Duplicate footer column.');ids.add(colId);
      return {id:colId,title:str(c.title,40,`Title of column ${i+1}`,{required:true}),hidden:c.hidden===true,links:navList(c.links,'column '+(i+1),12)};
    });
    if(!Array.isArray(f.payments)||f.payments.length>8)fail('Use at most 8 payment labels.');
    const payments=(f.payments as unknown[]).map((p,i)=>str(p,30,'Payment label '+(i+1),{required:true}));
    const nl=obj(f.newsletter,'newsletter');
    return {columns,bottomText:str(f.bottomText,120,'Bottom text'),payments,legal:navList(f.legal,'bottom bar',6),
      newsletter:{enabled:bool(nl.enabled,'Newsletter signup'),title:str(nl.title,80,'Newsletter title'),text:str(nl.text,160,'Newsletter text')}};
  },
  checkout(v){
    const c=obj(v,'checkout settings');
    const pay=(key:string,label:string)=>{const p=obj(c[key],label);return {enabled:bool(p.enabled,label),instructions:str(p.instructions,400,label+' instructions',{multiline:true})};};
    if(!['hidden','optional','required'].includes(c.email as string))fail('Choose how the email field works.');
    const result={dhaka:int(c.dhaka,0,5000,'Dhaka delivery charge'),outside:int(c.outside,0,5000,'Outside Dhaka delivery charge'),freeThreshold:int(c.freeThreshold,0,1000000,'Free delivery threshold'),
      cod:bool(c.cod,'Cash on delivery'),codFee:int(c.codFee,0,5000,'Cash on delivery fee'),bkash:pay('bkash','bKash'),nagad:pay('nagad','Nagad'),advance:pay('advance','Advance payment'),
      minOrder:int(c.minOrder,0,1000000,'Minimum order'),email:c.email as SiteSettings['checkout']['email'],note:bool(c.note,'Order note'),
      paymentNote:str(c.paymentNote,400,'Payment note',{multiline:true}),returnsNote:str(c.returnsNote,300,'Returns note',{multiline:true}),
      confirmTitle:str(c.confirmTitle,80,'Confirmation heading',{required:true}),confirmText:str(c.confirmText,400,'Confirmation text',{multiline:true}),
      trackingIntro:str(c.trackingIntro,300,'Tracking page text',{multiline:true}),estimate:str(c.estimate,120,'Delivery time text')};
    if(!result.cod&&!result.bkash.enabled&&!result.nagad.enabled&&!result.advance.enabled)fail('Keep at least one payment method on.');
    return result;
  },
  home(v){
    const h=obj(v,'homepage text');
    if(!Array.isArray(h.trust)||h.trust.length>6)fail('Use at most 6 trust strip items.');
    const trust=(h.trust as unknown[]).map((input,i)=>{const t=obj(input,'trust item');return {id:id(t.id),icon:str(t.icon,4,`Icon of item ${i+1}`),text:str(t.text,40,`Text of item ${i+1}`,{required:true}),hidden:t.hidden===true};});
    const fv=obj(h.favourites,'favourites'),my=obj(h.mystery,'mystery box section'),no=obj(h.note,'brand note');
    if(fv.count!==4&&fv.count!==8)fail('Show 4 or 8 favourites.');
    if(!['first','newest','bestsellers','sale','category','manual'].includes(fv.source as string))fail('Choose where the favourites come from.');
    if(!Array.isArray(fv.ids)||fv.ids.length>8)fail('Pick at most 8 favourites.');
    if(!Array.isArray(h.order)||!Array.isArray(h.hidden))fail('Invalid homepage sections.');
    const order=(h.order as unknown[]).filter((s):s is string=>homeSections.includes(s as string));
    for(const s of homeSections)if(!order.includes(s))order.push(s);
    const hidden=Array.from(new Set((h.hidden as unknown[]).filter((s):s is string=>homeSections.includes(s as string))));
    return {trust,order,hidden,
      favourites:{hidden:fv.hidden===true,eyebrow:str(fv.eyebrow,60,'Favourites eyebrow'),title:str(fv.title,80,'Favourites heading',{required:true}),cta:str(fv.cta,40,'Favourites button'),count:fv.count as number,source:fv.source as SiteSettings['home']['favourites']['source'],category:fv.source==='category'?str(fv.category,100,'Favourites category',{required:true}):'',ids:fv.source==='manual'?(fv.ids as unknown[]).map(n=>int(n,1,1e9,'Favourite product')):[]},
      mystery:{hidden:my.hidden===true,eyebrow:str(my.eyebrow,60,'Mystery eyebrow'),title:str(my.title,80,'Mystery heading',{required:true,multiline:true}),text:str(my.text,400,'Mystery text',{multiline:true}),cta:str(my.cta,40,'Mystery button'),small:str(my.small,120,'Mystery small print'),
        images:(()=>{const list=my.images===undefined?[]:my.images;if(!Array.isArray(list)||list.length>mysteryImageLimit)fail('Use at most '+mysteryImageLimit+' photos in the mystery box section.');return (list as unknown[]).map((x,i)=>safeImage(x,'Mystery photo '+(i+1))).filter(Boolean);})(),
        interval:my.interval===undefined?5:int(my.interval,2,30,'Seconds per photo')},
      note:{hidden:no.hidden===true,eyebrow:str(no.eyebrow,60,'Note eyebrow'),title:str(no.title,80,'Note heading',{required:true}),emphasis:str(no.emphasis,80,'Note highlight'),text:str(no.text,600,'Note text',{multiline:true})}};
  },
  seo(v){
    const s=obj(v,'SEO settings');const template=str(s.titleTemplate,80,'Title template',{required:true});
    if(!template.includes('%s'))fail('Title template must contain %s where the page name goes.');
    return {title:str(s.title,90,'Homepage title',{required:true}),titleTemplate:template,description:str(s.description,170,'Meta description',{required:true}),ogImage:safeImage(s.ogImage,'Social image'),indexing:bool(s.indexing,'Search engine indexing')};
  },
  integrations(v){
    const i=obj(v,'integrations'),w=obj(i.whatsapp,'WhatsApp button'),m=obj(i.messenger,'Messenger button');
    const pixel=str(i.pixel,20,'Meta Pixel ID');if(pixel&&!/^\d{8,20}$/.test(pixel))fail('Meta Pixel ID is a number of 8–20 digits.');
    const analytics=str(i.analytics,20,'Google Analytics ID');if(analytics&&!/^G-[A-Z0-9]{4,15}$/.test(analytics))fail('Google Analytics ID looks like G-XXXXXXXXXX.');
    const searchConsole=str(i.searchConsole,100,'Search Console code');if(searchConsole&&!/^[A-Za-z0-9_-]{10,100}$/.test(searchConsole))fail('Paste only the content value of the Search Console meta tag.');
    // The button uses the number in Contact & social; this older field is only a fallback.
    const typed=str(w.number,25,'WhatsApp button number'),number=formatWhatsAppNumber(typed);
    if(typed&&!number)fail('Enter a valid WhatsApp number, e.g. 01XXXXXXXXX or 8801XXXXXXXXX.');
    const enabled=bool(w.enabled,'WhatsApp button');
    if(w.position!=='left'&&w.position!=='right')fail('Choose the WhatsApp button side.');
    const link=safeUrl(m.link,'Messenger link');const mEnabled=bool(m.enabled,'Messenger button');if(mEnabled&&!/^https:\/\/(m\.me|www\.messenger\.com|messenger\.com)\//.test(link))fail('Messenger link must start with https://m.me/.');
    return {pixel,analytics,searchConsole,whatsapp:{enabled,number,message:str(w.message,200,'WhatsApp message'),position:w.position as 'left'|'right'},messenger:{enabled:mEnabled,link}};
  },
  popup(v){
    const p=obj(v,'popup');const enabled=bool(p.enabled,'Popup');
    const result={enabled,title:str(p.title,80,'Popup title',{required:enabled}),text:str(p.text,300,'Popup text',{multiline:true}),image:safeImage(p.image,'Popup image'),cta:str(p.cta,30,'Popup button'),link:optionalLink(p.link,'popup button'),days:int(p.days,1,365,'Show again after (days)'),...range(p.startsAt,p.endsAt,' on the popup')};
    if(result.cta&&!result.link)fail('Choose where the popup button goes.');
    return result;
  },
  categories(v){
    const c=obj(v,'category settings'),out:Record<string,CategorySettings>={};
    const entries=Object.entries(c);if(entries.length>200)fail('Too many categories.');
    for(const [slug,input] of entries){
      if(!/^[a-z0-9-]{1,60}$/.test(slug))fail('Invalid category address.');
      const s=obj(input,'category settings'),at=` for ${slug}`;
      if(!cardLabels.includes(s.label as CategorySettings['label']))fail('Choose a card button label'+at+'.');
      out[slug]={label:s.label as CategorySettings['label'],description:str(s.description,400,'Description'+at,{multiline:true}),seoTitle:str(s.seoTitle,90,'SEO title'+at),seoDescription:str(s.seoDescription,170,'SEO description'+at)};
    }
    return out;
  },
  sales(v){
    const s=obj(v,'sales'),p=obj(s.page,'sale page');
    if(!Array.isArray(s.items)||s.items.length>30)fail('Use at most 30 scheduled sales.');
    const ids=new Set<string>();
    const items=(s.items as unknown[]).map((input,i)=>{
      const x=obj(input,'sale'),at=` on sale ${i+1}`;const saleId=id(x.id);if(ids.has(saleId))fail('Duplicate sale'+at+'.');ids.add(saleId);
      if(!['all','category','products'].includes(x.target as string))fail('Choose what the sale covers'+at+'.');
      const target=x.target as Sale['target'];
      if(!Array.isArray(x.products)||x.products.length>500)fail('Choose at most 500 products'+at+'.');
      const products=(x.products as unknown[]).map(n=>int(n,1,1e9,'Product'+at));
      const category=target==='category'?str(x.category,100,'Category'+at,{required:true}):'';
      if(target==='products'&&!products.length)fail('Choose at least one product'+at+'.');
      return {id:saleId,name:str(x.name,60,'Name'+at,{required:true}),percent:int(x.percent,1,90,'Discount'+at),target,category,products:target==='products'?products:[],...range(x.startsAt,x.endsAt,at),active:x.active!==false};
    });
    return {items,page:{eyebrow:str(p.eyebrow,60,'Sale page eyebrow'),title:str(p.title,80,'Sale page title',{required:true}),intro:str(p.intro,300,'Sale page text',{multiline:true}),banner:safeImage(p.banner,'Sale banner')}};
  },
  appearance(v){
    const a=obj(v,'appearance');
    const color=(k:string,label:string)=>{const c=str(a[k],7,label,{required:true}).toLowerCase();if(!/^#[0-9a-f]{6}$/.test(c))fail(label+' must be a colour like #432b3b.');return c;};
    const pick=<T extends string>(k:string,options:readonly T[],label:string)=>options.includes(a[k] as T)?a[k] as T:fail('Choose '+label+'.');
    return {primary:color('primary','Main colour'),accent:color('accent','Accent colour'),background:color('background','Background colour'),text:color('text','Text colour'),
      headingFont:pick('headingFont',['cormorant','georgia','system'] as const,'a heading font'),bodyFont:pick('bodyFont',['dm-sans','system'] as const,'a body font'),
      buttons:pick('buttons',['pill','rounded','square'] as const,'a button shape'),buttonFill:pick('buttonFill',['filled','outline'] as const,'a button style'),
      imageRatio:pick('imageRatio',['default','4/5','1/1'] as const,'a photo shape'),showBadge:bool(a.showBadge,'Product badges'),showSaved:bool(a.showSaved,'Savings text'),
      motion:pick('motion',['off','slow','normal'] as const,'an animation speed'),maintenance:bool(a.maintenance,'Maintenance mode'),
      maintenanceMessage:str(a.maintenanceMessage,300,'Maintenance message',{multiline:true}),notFoundTitle:str(a.notFoundTitle,80,'Page-not-found title',{required:true}),notFoundText:str(a.notFoundText,300,'Page-not-found text',{multiline:true})};
  },
  redirects(v){
    const r=obj(v,'redirects');
    if(!Array.isArray(r.items)||r.items.length>300)fail('Use at most 300 redirects.');
    const seen=new Set<string>();
    return {items:(r.items as unknown[]).map((input,i)=>{
      const x=obj(input,'redirect'),at=` on redirect ${i+1}`;
      let from=str(x.from,300,'Old address'+at,{required:true});
      try{if(/^https?:/.test(from))from=new URL(from).pathname;}catch{}
      if(!/^\/[^\s?#]*$/.test(from))fail('Old address must be a path like /old-page/'+at+'.');
      if(/^\/(admin|api|_next|media)(\/|$)/.test(from)||from==='/')fail('That old address cannot be redirected'+at+'.');
      from=from.endsWith('/')?from:from+'/';
      if(seen.has(from))fail(`Two redirects start from ${from}.`);seen.add(from);
      const to=safeUrl(x.to,'New address'+at,300);if(!to)fail('New address is required'+at+'.');
      if(to===from)fail('A redirect cannot point to itself'+at+'.');
      return {from,to};
    })};
  },
  sizeGuides(v){
    const s=obj(v,'size guides');
    if(!Array.isArray(s.items)||s.items.length>20)fail('Use at most 20 size guides.');
    return {items:(s.items as unknown[]).map((input,i)=>{
      const g=obj(input,'size guide'),at=` in guide ${i+1}`;
      if(!Array.isArray(g.columns)||g.columns.length<2||g.columns.length>8)fail('Use 2–8 columns'+at+'.');
      const columns=(g.columns as unknown[]).map((c,j)=>str(c,30,`Column ${j+1}`+at,{required:true}));
      if(!Array.isArray(g.rows)||g.rows.length>30)fail('Use at most 30 rows'+at+'.');
      const rows=(g.rows as unknown[]).map((r,j)=>{if(!Array.isArray(r))fail('Invalid row'+at+'.');return columns.map((_,k)=>str((r as unknown[])[k],30,`Row ${j+1}`+at));});
      const list=(x:unknown,label:string)=>{if(!Array.isArray(x)||x.length>500)fail('Invalid '+label+at+'.');return x as unknown[];};
      return {id:id(g.id),name:str(g.name,60,'Guide name'+at,{required:true}),columns,rows,note:str(g.note,300,'Note'+at,{multiline:true}),
        categories:list(g.categories,'categories').map(c=>str(c,60,'Category'+at,{required:true})),products:list(g.products,'products').map(n=>int(n,1,1e9,'Product'+at))};
    })};
  },
  gifts(v){
    const g=obj(v,'gift options');
    if(!Array.isArray(g.categories)||g.categories.length>100)fail('Invalid gift categories.');
    return {wrap:bool(g.wrap,'Gift wrap'),wrapPrice:int(g.wrapPrice,0,5000,'Gift wrap price'),card:bool(g.card,'Message card'),cardLimit:int(g.cardLimit,20,500,'Message length'),categories:(g.categories as unknown[]).map(c=>str(c,60,'Category',{required:true}))};
  },
mysteryBox(v){    const m=obj(v,'mystery box details');    if(!Array.isArray(m.steps)||m.steps.length>6)fail('Use at most 6 steps.');    return {guaranteed:str(m.guaranteed,600,'What is guaranteed',{multiline:true}),worth:int(m.worth,0,1000000,'Worth at least'),noSpoiler:str(m.noSpoiler,300,'No-spoiler note',{multiline:true}),steps:(m.steps as unknown[]).map((s,i)=>str(s,160,'Step '+(i+1),{required:true}))};  },
banners(v){    const b=obj(v,'banner settings');    const interval=Number(b.interval);if(!Number.isFinite(interval)||interval<2||interval>20)fail('Seconds per banner must be from 2 to 20.');    if(b.transition!=='slide'&&b.transition!=='fade')fail('Choose slide or fade.');    return {enabled:bool(b.enabled,'Promotion banners'),interval:Math.round(interval*2)/2,transition:b.transition as 'slide'|'fade'};  },
  messages(v){
    const m=obj(v,'message templates'),out:Record<string,string>={};
    for(const [status,text] of Object.entries(m)){
      if(!['New','Confirmed','Processing','Shipped','Delivered','Cancelled','Returned',...Object.keys(extraMessageTemplates)].includes(status))fail('Unknown order status in message templates.');
      const t=str(text,500,status+' message',{multiline:true});if(t)out[status]=t;
    }
    return out;
  },
};
export const siteSections=Object.keys(defaultSite) as (keyof SiteSettings)[];

/** Saved sections over defaults. Unknown or broken saved sections fall back to defaults. */
export function mergeSite(saved:unknown):SiteSettings{
  const s=(saved&&typeof saved==='object'?saved:{}) as Record<string,unknown>;
  const out={} as Record<string,unknown>;
  for(const key of siteSections){
    const value=s[key];
    const base=defaultSite[key] as Record<string,unknown>;
    if(!value||typeof value!=='object'||Array.isArray(value)){out[key]=base;continue;}
    // One level deeper too, so settings added later (e.g. home.favourites.source) get their defaults.
    const merged:Record<string,unknown>={...base,...value};
    for(const [k,v] of Object.entries(base))if(v&&typeof v==='object'&&!Array.isArray(v)&&merged[k]&&typeof merged[k]==='object'&&!Array.isArray(merged[k])&&key!=='categories'&&key!=='messages')merged[k]={...v,...(merged[k] as object)};
    out[key]=merged;
  }
  return out as SiteSettings;
}
const inWindow=(x:{startsAt:string|null;endsAt:string|null},now:number)=>(!x.startsAt||Date.parse(x.startsAt)<=now)&&(!x.endsAt||now<Date.parse(x.endsAt));
export const activeAnnouncements=(site:SiteSettings,now=Date.now())=>site.announcement.enabled?site.announcement.items.filter(a=>a.active&&inWindow(a,now)):[];
export const popupActive=(site:SiteSettings,now=Date.now())=>site.popup.enabled&&inWindow(site.popup,now);
/** Delivery charge for an order: area charge, free above the threshold, plus any COD fee. */
export function deliveryCharge(checkout:SiteSettings['checkout'],area:'dhaka'|'outside',subtotal:number){
  const base=checkout.freeThreshold>0&&subtotal>=checkout.freeThreshold?0:checkout[area];
  return base+(checkout.cod?checkout.codFee:0);
}
export const pageTitle=(site:SiteSettings,name:string)=>site.seo.titleTemplate.replace('%s',name);
/**
 * Any way a number is typed (01XXXXXXXXX, +880 1XXX-XXXXXX, 8801XXXXXXXXX, 008801…) → digits for wa.me: 8801XXXXXXXXX.
 * Returns '' when it can't be a valid number, so callers can hide the link instead of rendering a broken one.
 */
export function formatWhatsAppNumber(input:unknown){
  if(typeof input!=='string')return '';
  let d=input.replace(/\D/g,'');
  if(d.startsWith('00'))d=d.slice(2);
  if(/^8800\d{10}$/.test(d))d='880'+d.slice(4); // +880 01XXXXXXXXX
  if(/^01\d{9}$/.test(d))d='88'+d;          // 01XXXXXXXXX
  else if(/^1[3-9]\d{8}$/.test(d))d='880'+d; // 1XXXXXXXXX (leading 0 dropped)
  if(d.startsWith('880'))return /^8801[3-9]\d{8}$/.test(d)?d:''; // Bangladesh mobile: 13 digits
  return /^[1-9]\d{7,14}$/.test(d)?d:'';
}
/** 8801XXXXXXXXX → +880 1XXX-XXXXXX for display. */
export const displayWhatsAppNumber=(number:string)=>{const d=formatWhatsAppNumber(number);return /^880\d{10}$/.test(d)?'+880 '+d.slice(3,7)+'-'+d.slice(7):d?'+'+d:'';};
/** https://wa.me/<number>?text=<encoded message>; '' when the number is missing or invalid. */
export function whatsappLink(number:string,message=''){
  const d=formatWhatsAppNumber(number);
  return d?'https://wa.me/'+d+(message.trim()?'?text='+encodeURIComponent(message):''):'';
}
/** The shop's WhatsApp number: Settings → Contact & social (older chat-button number as a fallback). */
export const shopWhatsApp=(site:SiteSettings)=>formatWhatsAppNumber(site.general.whatsapp)||formatWhatsAppNumber(site.integrations.whatsapp.number);
/** Extra message templates that are not tied to an order status. */
export const extraMessageTemplates={'Ask for details':'Hi {name}, this is AURZÉN about your order {order_id} ({total}). Could you please confirm your full delivery address and a good time to deliver? Thank you!'};

// ---- Content pages, FAQ and reviews (separate rows: larger, not needed on every page) ----
export type ContentPage={slug:string;title:string;body:string;seoTitle:string;seoDescription:string;published:boolean};
export type FaqGroup={id:string;title:string;hidden:boolean;items:{id:string;q:string;a:string;hidden:boolean}[]};
export type Review={id:string;name:string;rating:number;text:string;photo:string;product:number|null;date:string;approved:boolean};
export type Content={pages:ContentPage[];faq:FaqGroup[];reviews:Review[]};
export const reservedPageSlugs=['admin','api','shop','sale','cart','tracking','products','collections','pages','faq'];
const page=(slug:string,title:string,body:string):ContentPage=>({slug,title,body,seoTitle:'',seoDescription:'',published:true});
export const defaultContent:Content={
  pages:[
    page('delivery','Delivery info','## Delivery charges\nDhaka city ৳80 · Outside Dhaka ৳150.\n\n## Payment\nCash on delivery. Pay the full order total, including delivery, when your parcel arrives.\n\n## Tracking\nUse **Track your order** with your order reference and phone number.'),
    page('returns','Returns & exchange','Returns are accepted if the delivered item does not match your order.\n\nPlease contact us as soon as your parcel arrives so we can make it right.'),
    page('size-guide','Size guide','Our clothing is offered in S, M, L and XL.\n\nIf you are between sizes, choose the larger one for a relaxed fit.'),
    page('about','About AURZÉN','We believe a little elegance belongs in every day. We’re building AURZÉN around pieces that feel special, thoughtful details, and the joy of finding something that feels like you.'),
    page('privacy','Privacy policy','We use your name, phone number and address only to deliver your order and contact you about it. We never sell your details.'),
    page('terms','Terms','Orders are confirmed by our team by phone. Prices are in Bangladeshi taka and include VAT where applicable.'),
  ],
  faq:[{id:'orders',title:'Orders & delivery',hidden:false,items:[
    {id:'cod',q:'How do I pay?',a:'Cash on delivery. Pay the full total, including delivery, when your parcel arrives.',hidden:false},
    {id:'charge',q:'How much is delivery?',a:'Dhaka city ৳80, outside Dhaka ৳150.',hidden:false},
    {id:'track',q:'How can I track my order?',a:'Open Track your order and enter your order reference and phone number.',hidden:false},
  ]}],
  reviews:[],
};
export function mergeContent(saved:unknown):Content{
  const s=(saved&&typeof saved==='object'?saved:{}) as Partial<Content>;
  return {pages:Array.isArray(s.pages)?s.pages:defaultContent.pages,faq:Array.isArray(s.faq)?s.faq:defaultContent.faq,reviews:Array.isArray(s.reviews)?s.reviews:defaultContent.reviews};
}
export function normalizeContentSection<K extends keyof Content>(section:K,value:unknown):Content[K]{
  try{
    if(section==='pages'){
      if(!Array.isArray(value)||value.length>40)fail('Use at most 40 pages.');
      const slugs=new Set<string>();
      return (value as unknown[]).map((input,i)=>{
        const p=obj(input,'page'),at=` on page ${i+1}`;
        const slug=str(p.slug,60,'Address'+at,{required:true});
        if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))fail('Page address may use lowercase letters, numbers and dashes'+at+'.');
        if(reservedPageSlugs.includes(slug))fail(`"${slug}" is reserved; choose another page address.`);
        if(slugs.has(slug))fail(`Two pages use the address "${slug}".`);slugs.add(slug);
        return {slug,title:str(p.title,90,'Title'+at,{required:true}),body:str(p.body,20000,'Content'+at,{multiline:true}),seoTitle:str(p.seoTitle,90,'SEO title'+at),seoDescription:str(p.seoDescription,170,'SEO description'+at),published:p.published!==false};
      }) as Content[K];
    }
    if(section==='faq'){
      if(!Array.isArray(value)||value.length>20)fail('Use at most 20 FAQ groups.');
      return (value as unknown[]).map((input,i)=>{
        const g=obj(input,'FAQ group');
        if(!Array.isArray(g.items)||g.items.length>40)fail('Use at most 40 questions per group.');
        return {id:id(g.id),title:str(g.title,80,`Group ${i+1} title`,{required:true}),hidden:g.hidden===true,items:(g.items as unknown[]).map((q,j)=>{const x=obj(q,'question'),at=` (group ${i+1}, question ${j+1})`;return {id:id(x.id),q:str(x.q,200,'Question'+at,{required:true}),a:str(x.a,2000,'Answer'+at,{required:true,multiline:true}),hidden:x.hidden===true};})};
      }) as Content[K];
    }
    if(!Array.isArray(value)||value.length>500)fail('Use at most 500 reviews.');
    const ids=new Set<string>();
    return (value as unknown[]).map((input,i)=>{
      const r=obj(input,'review'),at=` on review ${i+1}`;const reviewId=id(r.id);if(ids.has(reviewId))fail('Duplicate review'+at+'.');ids.add(reviewId);
      const product=r.product===null||r.product===undefined||r.product===''?null:int(r.product,1,1e9,'Product'+at);
      const when=date(r.date,'Date'+at)||new Date().toISOString();
      return {id:reviewId,name:str(r.name,60,'Name'+at,{required:true}),rating:int(r.rating,1,5,'Rating'+at),text:str(r.text,1000,'Review'+at,{required:true,multiline:true}),photo:safeImage(r.photo,'Photo'+at),product,date:when,approved:r.approved===true};
    }) as Content[K];
  }catch(error){if(error instanceof Invalid)throw new Error(error.message);throw error;}
}
/** Tiny safe Markdown: ## headings, **bold**, [text](link), lists and paragraphs. Escapes everything else. */
export function renderMarkdown(source:string):string{
  const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const inline=(s:string)=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(_m,text:string,href:string)=>{
    const raw=href.replace(/&amp;/g,'&');
    const ok=/^\/(?!\/)/.test(raw)||/^(https?:|mailto:|tel:)/i.test(raw);
    return ok?`<a href="${esc(raw)}"${/^https?:/i.test(raw)?' rel="noopener noreferrer" target="_blank"':''}>${text}</a>`:text;
  });
  return source.split(/\n{2,}/).map(block=>{
    const lines=block.split('\n');
    if(/^#{2,3} /.test(block))return lines.map(l=>{const m=/^(#{2,3}) (.*)$/.exec(l);return m?`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`:`<p>${inline(l)}</p>`;}).join('');
    if(lines.every(l=>/^[-*] /.test(l)))return '<ul>'+lines.map(l=>'<li>'+inline(l.slice(2))+'</li>').join('')+'</ul>';
    return '<p>'+lines.map(inline).join('<br>')+'</p>';
  }).join('');
}
/** Mystery Box categories (and their subcategories) never ask for a size. */
export function isMystery(categories:Category[],name:string){
  const c=categories.find(x=>x.name===name);
  const main=c?.parent||name;
  return /mystery/i.test(main)||/mystery/i.test(name);
}
/** Card button text for a product: subcategory setting, else its main category, else automatic. */
export function cardLabel(site:SiteSettings,categories:Category[],product:{category:string;stock:number;sizes?:string[]},sizeChoice:boolean){
  if(product.stock===0)return 'Currently unavailable';
  const c=categories.find(x=>x.name===product.category),main=c?.parent?categories.find(x=>x.name===c.parent):undefined;
  const chosen=[c,main].map(x=>x&&site.categories[x.slug]?.label).find(l=>l&&l!=='auto');
  const mystery=isMystery(categories,product.category);
  const label=chosen||(mystery?'reveal':sizeChoice?'size':'available');
  // Mystery Box products never say "Choose your size", whatever the setting.
  return cardLabelText[mystery&&label==='size'?'reveal':label as Exclude<typeof label,'auto'>];
}
/** Fills {order_id} {name} {total} {status} {courier} {tracking} in a message template. */
export function fillTemplate(template:string,values:Record<string,string>){
  return template.replace(/\{(\w+)\}/g,(m,key:string)=>key in values?values[key]:m);
}

// ---- Customers (private: stored in the `customers` settings row, never in the public catalog) ----
export const customerTags=['VIP','Risky','Wholesale','Repeat'] as const;
export type CustomerInfo={note:string;tags:string[];blocked:boolean};
export function normalizeCustomer(value:unknown):CustomerInfo{
  try{
    const c=obj(value,'customer');
    if(!Array.isArray(c.tags)||c.tags.length>8)fail('Use at most 8 tags.');
    const tags=Array.from(new Set((c.tags as unknown[]).map((t,i)=>str(t,20,'Tag '+(i+1),{required:true}))));
    return {note:str(c.note,1000,'Customer note',{multiline:true}),tags,blocked:c.blocked===true};
  }catch(error){if(error instanceof Invalid)throw new Error(error.message);throw error;}
}
/** Orders worth a second look: several orders from one phone within a day, or a history of cancellations. */
export function orderFlags(order:{id:string;phone:string;date:string;status:string},all:{id:string;phone:string;date:string;status:string}[]){
  const same=all.filter(o=>o.phone===order.phone);
  const flags:string[]=[];
  const day=86400000,t=Date.parse(order.date);
  if(same.some(o=>o.id!==order.id&&Math.abs(Date.parse(o.date)-t)<day&&o.status!=='Cancelled'))flags.push('Possible duplicate: another order from this phone within 24 hours');
  const cancelled=same.filter(o=>o.status==='Cancelled'||o.status==='Returned').length;
  if(cancelled>=2)flags.push(`${cancelled} cancelled or returned orders from this phone`);
  return flags;
}

// ---- Coupons (private: `coupons` settings row, checked only by the server) ----
export type Coupon={code:string;type:'percent'|'fixed'|'free';value:number;minOrder:number;usageLimit:number;perCustomer:number;startsAt:string|null;endsAt:string|null;applies:{type:'all'|'category'|'product';value:string};active:boolean};
export function normalizeCoupons(value:unknown):Coupon[]{
  try{
    if(!Array.isArray(value)||value.length>200)fail('Use at most 200 coupons.');
    const codes=new Set<string>();
    return (value as unknown[]).map((input,i)=>{
      const c=obj(input,'coupon'),at=` on coupon ${i+1}`;
      const code=str(c.code,30,'Code'+at,{required:true}).toUpperCase();
      if(!/^[A-Z0-9_-]{3,30}$/.test(code))fail('Codes use 3–30 letters, numbers, - or _'+at+'.');
      if(codes.has(code))fail(`Two coupons use the code ${code}.`);codes.add(code);
      if(!['percent','fixed','free'].includes(c.type as string))fail('Choose the discount type'+at+'.');
      const type=c.type as Coupon['type'];
      const v=type==='free'?0:type==='percent'?int(c.value,1,90,'Percent'+at):int(c.value,1,100000,'Amount'+at);
      const a=obj(c.applies,'coupon target');
      if(!['all','category','product'].includes(a.type as string))fail('Choose what the coupon applies to'+at+'.');
      const applies={type:a.type as Coupon['applies']['type'],value:a.type==='all'?'':str(a.value,100,'Target'+at,{required:true})};
      return {code,type,value:v,minOrder:int(c.minOrder,0,1000000,'Minimum order'+at),usageLimit:int(c.usageLimit,0,1000000,'Usage limit'+at),perCustomer:int(c.perCustomer,0,1000,'Per-customer limit'+at),...range(c.startsAt,c.endsAt,at),applies,active:c.active!==false};
    });
  }catch(error){if(error instanceof Invalid)throw new Error(error.message);throw error;}
}
/** Discount for a coupon on these items. Returns an error message instead when it cannot be used. */
export function applyCoupon(coupon:Coupon|undefined,{items,subtotal,delivery,family,used,usedByPhone,now=Date.now()}:{items:{id:number;price:number;qty:number;category:string}[];subtotal:number;delivery:number;family:(category:string)=>string[];used:number;usedByPhone:number;now?:number}):{discount:number;freeDelivery:boolean}|{error:string}{
  if(!coupon||!coupon.active)return {error:'This code is not valid.'};
  if(coupon.startsAt&&Date.parse(coupon.startsAt)>now)return {error:'This code is not active yet.'};
  if(coupon.endsAt&&now>=Date.parse(coupon.endsAt))return {error:'This code has expired.'};
  if(coupon.usageLimit&&used>=coupon.usageLimit)return {error:'This code has been fully used.'};
  if(coupon.perCustomer&&usedByPhone>=coupon.perCustomer)return {error:'You have already used this code.'};
  if(subtotal<coupon.minOrder)return {error:`This code needs an order of at least ৳${coupon.minOrder.toLocaleString('en-BD')}.`};
  const eligible=items.filter(i=>coupon.applies.type==='all'||(coupon.applies.type==='product'?String(i.id)===coupon.applies.value:family(coupon.applies.value).includes(i.category)));
  if(!eligible.length)return {error:'This code does not apply to the items in your bag.'};
  const base=eligible.reduce((s,i)=>s+i.price*i.qty,0);
  if(coupon.type==='free')return {discount:0,freeDelivery:delivery>0};
  const discount=coupon.type==='percent'?Math.round(base*coupon.value/100):Math.min(base,coupon.value);
  return {discount,freeDelivery:false};
}

/** Scheduled sales as product offers: a product's own enabled offer wins, else the biggest running sale. */
export function saleOffer(sales:Sale[],product:{id:number;category:string},family:(name:string)=>string[],now=Date.now()){
  const covering=sales.filter(s=>s.active&&(!s.endsAt||now<Date.parse(s.endsAt))&&(s.target==='all'||(s.target==='products'?s.products.includes(product.id):family(s.category).includes(product.category))));
  // A sale that has not started yet is still sent, so the storefront switches on time without a reload.
  const running=covering.filter(s=>!s.startsAt||Date.parse(s.startsAt)<=now).sort((a,b)=>b.percent-a.percent);
  const best=running[0]||covering.sort((a,b)=>Date.parse(a.startsAt||'')-Date.parse(b.startsAt||''))[0];
  return best?{enabled:true,percent:best.percent,startsAt:best.startsAt,endsAt:best.endsAt}:null;
}
/** The size guide for a product: product-specific, else its subcategory, else its main category (slugs). */
export function sizeGuideFor(site:SiteSettings,categories:Category[],product:{id:number;category:string}){
  const c=categories.find(x=>x.name===product.category),main=c?.parent?categories.find(x=>x.name===c.parent):undefined;
  const g=site.sizeGuides.items;
  return g.find(x=>x.products.includes(product.id))||(c&&g.find(x=>x.categories.includes(c.slug)))||(main&&g.find(x=>x.categories.includes(main.slug)))||null;
}
/** Gift options apply to the chosen categories, or by default to Mystery Box and Love & Care. */
/** Whether a product gets gift options: its own On/Off setting wins; otherwise the category rule. */
export function giftEligible(site:SiteSettings,categories:Category[],category:string,own:'auto'|'on'|'off'='auto'){
  if(own==='on')return true;
  if(own==='off')return false;
  const c=categories.find(x=>x.name===category),main=c?.parent?categories.find(x=>x.name===c.parent):c;
  const slugs=[c?.slug,main?.slug].filter(Boolean) as string[];
  return site.gifts.categories.length?slugs.some(s=>site.gifts.categories.includes(s)):/mystery|love/i.test(main?.name||category);
}
/** CSS overrides for Studio → Appearance. Empty when everything is the default look. */
export function appearanceCss(a:Appearance){
  const d=defaultAppearance,css:string[]=[],root:string[]=[];
  if(a.primary!==d.primary)root.push('--plum:'+a.primary);
  if(a.accent!==d.accent)root.push('--gold:'+a.accent);
  if(a.background!==d.background)root.push('--ivory:'+a.background);
  if(a.text!==d.text)root.push('--ink:'+a.text);
  if(a.headingFont==='georgia')root.push("--font-heading:Georgia,'Times New Roman',serif");
  if(a.headingFont==='system')root.push('--font-heading:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif');
  if(a.bodyFont==='system')root.push('--font-body:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif');
  if(root.length)css.push(':root{'+root.join(';')+'}');
  if(a.background!==d.background)css.push('body{background:var(--ivory)}');
  if(a.buttons!=='pill')css.push(`.primary,.secondary-link,.checkout-submit{border-radius:${a.buttons==='rounded'?'10px':'0'}!important}`);
  if(a.buttonFill==='outline')css.push('.primary{background:transparent!important;color:var(--plum)!important;box-shadow:inset 0 0 0 1.5px var(--plum)}.primary:hover{background:var(--plum)!important;color:#fff!important}');
  if(a.imageRatio!=='default')css.push(`.product-image{aspect-ratio:${a.imageRatio}!important;height:auto!important}`);
  if(!a.showBadge)css.push('.product .tag{display:none!important}');
  if(!a.showSaved)css.push('.product .product-price .block{display:none!important}');
  if(a.motion==='off')css.push('[data-fade],[data-fade-media]{opacity:1!important;transform:none!important;clip-path:none!important;transition:none!important}');
  if(a.motion==='slow')css.push('[data-fade].is-visible,[data-fade].is-visible [data-fade-media]{transition-duration:1.4s!important}');
  return css.join('\n');
}
