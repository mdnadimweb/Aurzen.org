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
export type TrustItem={id:string;icon:string;text:string;hidden:boolean};

export type SiteSettings={
  general:{brand:string;tagline:string;about:string;logo:string;logoDark:string;favicon:string;whatsapp:string;phone:string;email:string;messenger:string;address:string;hours:string;facebook:string;instagram:string;tiktok:string;youtube:string;businessInfo:string};
  announcement:{enabled:boolean;interval:number;items:Announcement[]};
  navigation:{items:NavItem[]};
  footer:{columns:FooterColumn[];bottomText:string;payments:string[];legal:NavItem[];newsletter:{enabled:boolean;title:string;text:string}};
  checkout:{dhaka:number;outside:number;freeThreshold:number;cod:boolean;codFee:number;bkash:{enabled:boolean;instructions:string};nagad:{enabled:boolean;instructions:string};advance:{enabled:boolean;instructions:string};minOrder:number;email:'hidden'|'optional'|'required';note:boolean;paymentNote:string;returnsNote:string;confirmTitle:string;confirmText:string;trackingIntro:string;estimate:string};
  home:{trust:TrustItem[];favourites:{hidden:boolean;eyebrow:string;title:string;cta:string;count:number};mystery:{hidden:boolean;eyebrow:string;title:string;text:string;cta:string;small:string};note:{hidden:boolean;eyebrow:string;title:string;emphasis:string;text:string}};
  seo:{title:string;titleTemplate:string;description:string;ogImage:string;indexing:boolean};
  integrations:{pixel:string;analytics:string;searchConsole:string;whatsapp:{enabled:boolean;number:string;message:string;position:'left'|'right'};messenger:{enabled:boolean;link:string}};
  popup:{enabled:boolean;title:string;text:string;image:string;cta:string;link:SiteLink|null;days:number;startsAt:string|null;endsAt:string|null};
};

const nav=(id:string,label:string,type:SiteLink['type'],value=''):NavItem=>({id,label,link:{type,value},hidden:false});
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
    favourites:{hidden:false,eyebrow:'LOVED FOR A REASON',title:'The current favourites.',cta:'Discover the edit ↗',count:4},
    mystery:{hidden:false,eyebrow:'A SURPRISE WITH YOUR NAME ON IT',title:'Good things come\nin mystery boxes.',text:'Tell us a little about your style. We’ll take care of the surprise. A thoughtfully curated box of fashion and accessories, made to brighten your everyday.',cta:'Find your mystery box ↗',small:'Thoughtfully selected · Beautifully wrapped · Uniquely you'},
    note:{hidden:false,eyebrow:'A NOTE FROM AURZÉN',title:'Beautiful things.',emphasis:'Without the extraordinary price.',text:'We believe a little elegance belongs in every day. We’re building AURZÉN around pieces that feel special, thoughtful details, and the joy of finding something that feels like you.'},
  },
  seo:{title:'AURZÉN | A little elegance. A little unexpected.',titleTemplate:'%s | AURZÉN',description:'Discover thoughtfully selected fashion and Mystery Style Boxes from AURZÉN. Premium style for everyday moments, delivered across Bangladesh.',ogImage:'',indexing:true},
  integrations:{pixel:'',analytics:'',searchConsole:'',whatsapp:{enabled:false,number:'',message:'Hi AURZÉN, I have a question.',position:'right'},messenger:{enabled:false,link:''}},
  popup:{enabled:false,title:'',text:'',image:'',cta:'',link:null,days:7,startsAt:null,endsAt:null},
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
    const whatsapp=str(g.whatsapp,20,'WhatsApp number').replace(/[^\d+]/g,'');
    if(whatsapp&&!/^\+?\d{8,15}$/.test(whatsapp))fail('WhatsApp number must be 8–15 digits, e.g. 8801XXXXXXXXX.');
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
    return {trust,
      favourites:{hidden:fv.hidden===true,eyebrow:str(fv.eyebrow,60,'Favourites eyebrow'),title:str(fv.title,80,'Favourites heading',{required:true}),cta:str(fv.cta,40,'Favourites button'),count:fv.count as number},
      mystery:{hidden:my.hidden===true,eyebrow:str(my.eyebrow,60,'Mystery eyebrow'),title:str(my.title,80,'Mystery heading',{required:true,multiline:true}),text:str(my.text,400,'Mystery text',{multiline:true}),cta:str(my.cta,40,'Mystery button'),small:str(my.small,120,'Mystery small print')},
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
    const number=str(w.number,20,'WhatsApp button number').replace(/[^\d]/g,'');
    const enabled=bool(w.enabled,'WhatsApp button');if(enabled&&!/^\d{8,15}$/.test(number))fail('Enter the WhatsApp number with country code, e.g. 8801XXXXXXXXX.');
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
};
export const siteSections=Object.keys(defaultSite) as (keyof SiteSettings)[];

/** Saved sections over defaults. Unknown or broken saved sections fall back to defaults. */
export function mergeSite(saved:unknown):SiteSettings{
  const s=(saved&&typeof saved==='object'?saved:{}) as Record<string,unknown>;
  const out={} as Record<string,unknown>;
  for(const key of siteSections){
    const value=s[key];
    out[key]=value&&typeof value==='object'&&!Array.isArray(value)?{...defaultSite[key],...value}:defaultSite[key];
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
export const whatsappLink=(number:string,message='')=>'https://wa.me/'+number.replace(/[^\d]/g,'')+(message?'?text='+encodeURIComponent(message):'');

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
