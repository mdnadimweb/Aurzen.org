export type Offer = {enabled:boolean;percent:number;startsAt:string|null;endsAt:string|null};
// sizes/colors: what the owner offers for this product. Empty or missing means the
// product has no such choice and the product page does not show a picker for it.
export type Product = {id:number;name:string;category:string;price:number;stock:number;image:string;images?:string[];tag:string;description?:string;offer?:Offer|null;sizes?:string[];colors?:string[];extra?:ProductExtra};
/** Studio-only product details. status: draft/hidden products never reach the shop. sizeStock: optional stock per size (then stock = their sum). */
export type ProductExtra={sku:string;material:string;care:string;status:'active'|'draft'|'hidden';featured:boolean;lowStock:number;sizeStock:Record<string,number>;seoTitle:string;seoDescription:string;related:number[]};
export const defaultProductExtra:ProductExtra={sku:'',material:'',care:'',status:'active',featured:false,lowStock:5,sizeStock:{},seoTitle:'',seoDescription:'',related:[]};
export function normalizeProductExtra(value:unknown,sizes:string[]):ProductExtra{
  if(value===undefined||value===null)return {...defaultProductExtra};
  if(typeof value!=='object'||Array.isArray(value))throw new Error('Invalid product details.');
  const v=value as Record<string,unknown>;
const text=(x:unknown,max:number,label:string,multi=false)=>{const s=typeof x==='string'?(multi?x.trim():x.split(/\s+/).join(' ').trim()):'';if(s.length>max)throw new Error(label+' must be at most '+max+' characters.');return s;};
  if(!['active','draft','hidden'].includes(v.status as string))throw new Error('Choose Active, Draft or Hidden.');
  const lowStock=v.lowStock===undefined?5:Number(v.lowStock);if(!Number.isSafeInteger(lowStock)||lowStock<0||lowStock>10000)throw new Error('Low-stock level must be a whole number.');
  const sizeStock:Record<string,number>={};
  for(const [size,n] of Object.entries((v.sizeStock&&typeof v.sizeStock==='object'?v.sizeStock:{}) as Record<string,unknown>)){
    if(n===''||n===null||n===undefined)continue;
    if(!sizes.includes(size))continue;
    if(!Number.isSafeInteger(n)||(n as number)<0||(n as number)>1000000)throw new Error('Stock for size '+size+' must be a whole number.');
    sizeStock[size]=n as number;
  }
  const related=Array.isArray(v.related)?Array.from(new Set(v.related.filter(n=>Number.isSafeInteger(n)&&(n as number)>0) as number[])).slice(0,8):[];
  return {sku:text(v.sku,60,'SKU'),material:text(v.material,200,'Fabric / material'),care:text(v.care,600,'Care instructions',true),status:v.status as ProductExtra['status'],featured:v.featured===true,lowStock,sizeStock,seoTitle:text(v.seoTitle,90,'SEO title'),seoDescription:text(v.seoDescription,170,'SEO description'),related};
}
/** Units available in one size: its own count when per-size stock is set, else the product total. */
export const sizeAvailable=(p:Pick<Product,'stock'|'extra'>,size:string)=>p.extra&&Object.keys(p.extra.sizeStock).length?(p.extra.sizeStock[size]??0):p.stock;
// color is omitted (or '') for products without colour choices.
export type CartItem = {id:number;qty:number;size:string;color?:string};
export type OrderItem = CartItem & {name:string;price:number};
export type CheckoutQuote={items:OrderItem[];subtotal:number;delivery:number;total:number;quote:string;serverNow:number;discount?:number;coupon?:string;couponError?:string;giftable?:boolean;gift?:OrderGift};
export type OrderGift={wrap:boolean;message:string;price:number};

// Whole taka throughout the store: round the discounted unit once, then multiply
// by quantity. Keep a positive minimum charge even for a very low base price.
export function productPricing(product:Product,now=Date.now()){
  const offer=product.offer;
  const active=!!offer&&offer.enabled===true&&Number.isInteger(offer.percent)&&offer.percent>=1&&offer.percent<=99&&
    (!offer.startsAt||Date.parse(offer.startsAt)<=now)&&(!offer.endsAt||now<Date.parse(offer.endsAt));
  const unitPrice=active?Math.max(1,Math.round(product.price*(100-offer!.percent)/100)):product.price;
  return {regular:product.price,unitPrice,savings:product.price-unitPrice,percent:active?offer!.percent:0,active};
}

export function normalizeOffer(value:unknown):Offer|null{
  if(value===null)return null;
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid offer.');
  const o=value as Record<string,unknown>;
  if(typeof o.enabled!=='boolean')throw new Error('Enable offer must be true or false.');
  if(!Number.isInteger(o.percent)||Number(o.percent)<1||Number(o.percent)>99)throw new Error('Discount must be a whole percentage from 1 to 99.');
  const date=(input:unknown)=>{
    if(input===null||input===undefined||input==='')return null;
    if(typeof input!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(input)||!Number.isFinite(Date.parse(input)))throw new Error('Offer dates must be valid timestamps with an explicit timezone.');
    // Date.parse can normalize impossible calendar days; reject those explicitly.
    const [year,month,day]=input.slice(0,10).split('-').map(Number);
    const [,hours,minutes,seconds='0']=input.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/)!;
    const [hour,minute,second]=[hours,minutes,seconds].map(Number);
    if(hour>23||minute>59||second>=60)throw new Error('Offer date must use a valid time from 00:00 to 23:59.');
    const calendar=new Date(Date.UTC(year,month-1,day));
    if(calendar.getUTCFullYear()!==year||calendar.getUTCMonth()!==month-1||calendar.getUTCDate()!==day)throw new Error('Offer date is not a valid calendar date.');
    return new Date(input).toISOString();
  };
  const startsAt=date(o.startsAt),endsAt=date(o.endsAt);
  if(startsAt&&endsAt&&startsAt>=endsAt)throw new Error('Offer end must be after its start.');
  return {enabled:o.enabled,percent:Number(o.percent),startsAt,endsAt};
}

// Homepage carousel slides, edited from the owner studio. `image` is 'box' for the
// gift box illustration, an uploaded /media/ photo, or an HTTPS image URL.
export const heroTones=['rose','sand','plum'] as const;
export const maxHeroSlides=6;
export type HeroSlide={eyebrow:string;title:string;emphasis:string;description:string;image:string;alt:string;caption:string;note:string;category:string;cta:string;tone:typeof heroTones[number];
  /** Optional: where the button goes (else the category), and when the slide shows. */
  link?:{type:string;value:string}|null;startsAt?:string|null;endsAt?:string|null;hidden?:boolean};
const heroLinkTypes=['home','shop','collections','sale','tracking','category','product','page','faq','url'];
export const heroFieldLimits={eyebrow:40,title:60,emphasis:60,description:240,alt:160,caption:40,note:40,category:100,cta:40} as const;
const heroLabels:Record<keyof typeof heroFieldLimits,string>={eyebrow:'Eyebrow',title:'Heading',emphasis:'Heading highlight',description:'Description',alt:'Photo description',caption:'Photo caption',note:'Photo note',category:'Button category',cta:'Button text'};
const heroRequired=new Set(['title','category','cta','alt']);
export function normalizeHeroSlides(value:unknown):HeroSlide[]{
  if(!Array.isArray(value)||value.length<1||value.length>maxHeroSlides)throw new Error(`Use 1 to ${maxHeroSlides} homepage slides.`);
  return value.map((input,index)=>{
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid homepage slide.');
    const s=input as Record<string,unknown>,slide:Record<string,string>={},at=` on slide ${index+1}`;
    for(const [key,limit] of Object.entries(heroFieldLimits)){
      const text=typeof s[key]==='string'?(s[key] as string).replace(/\s+/g,' ').trim():'';
      const label=heroLabels[key as keyof typeof heroFieldLimits];
      if(heroRequired.has(key)&&!text)throw new Error(`${label} is required${at}.`);
      if(text.length>limit)throw new Error(`${label} must be at most ${limit} characters${at}.`);
      slide[key]=text;
    }
    const image=typeof s.image==='string'?s.image.trim():'';
    // Built-in storefront photos live under /images/ in the web app's public folder.
    let valid=image==='box'||/^\/media\/[a-f0-9-]{36}\.webp$/.test(image)||/^\/images\/[a-z0-9-]+\.(?:jpe?g|png|webp)$/.test(image);
    if(!valid&&image.length<=2000)try{valid=new URL(image).protocol==='https:';}catch{}
    if(!valid)throw new Error(`Upload a photo, use an HTTPS image URL or choose the gift box${at}.`);
    if(!heroTones.includes(s.tone as HeroSlide['tone']))throw new Error(`Choose a colour mood${at}.`);
    const l=s.link as Record<string,unknown>|null|undefined;
    let link:HeroSlide['link']=null;
    if(l&&typeof l==='object'){
      if(!heroLinkTypes.includes(l.type as string)||typeof l.value!=='string'||l.value.length>500)throw new Error('Choose where the button goes'+at+'.');
      const v=l.value.trim();
      if(l.type==='url'&&!((v.startsWith('/')&&!v.startsWith('//'))||v.startsWith('https://')))throw new Error('Button address must start with / or https://'+at+'.');
      link={type:l.type as string,value:v};
    }
    const when=(x:unknown,label:string)=>{if(x===null||x===undefined||x==='')return null;if(typeof x!=='string'||!Number.isFinite(Date.parse(x)))throw new Error(label+at+' must be a valid date.');return new Date(x).toISOString();};
    const startsAt=when(s.startsAt,'Start'),endsAt=when(s.endsAt,'End');
    if(startsAt&&endsAt&&startsAt>=endsAt)throw new Error('End must be after start'+at+'.');
    // Optional fields are stored only when used, so older slides keep exactly their shape.
    return {...slide,image,tone:s.tone,...(link?{link}:{}),...(startsAt?{startsAt}:{}),...(endsAt?{endsAt}:{}),...(s.hidden===true?{hidden:true}:{})} as HeroSlide;
  });
}
// Owner-edited storefront text and category cover photos. Stored as one settings row;
// null until the owner saves, so the storefront keeps its built-in defaults.
// featured: up to four main category names shown under the hero, in order. Empty = automatic.
export type Storefront={announcement:{message:string;detail:string};covers:Record<string,number>;featured?:string[]};
export const maxFeaturedCategories=4;
export const defaultStorefront:Storefront={announcement:{message:'A little joy, delivered.',detail:'Thoughtfully selected in Bangladesh'},covers:{},featured:[]};
export const storefrontLimits={message:80,detail:80} as const;
export function normalizeStorefront(value:unknown):Storefront{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid storefront settings.');
  const v=value as Record<string,unknown>,a=v.announcement as Record<string,unknown>|undefined;
  if(!a||typeof a!=='object'||Array.isArray(a))throw new Error('Invalid announcement.');
  const clean=(x:unknown)=>typeof x==='string'?x.replace(/\s+/g,' ').trim():'';
  const message=clean(a.message),detail=clean(a.detail);
  if(!message)throw new Error('Announcement message is required.');
  if(message.length>storefrontLimits.message)throw new Error(`Announcement message must be at most ${storefrontLimits.message} characters.`);
  if(detail.length>storefrontLimits.detail)throw new Error(`Announcement detail must be at most ${storefrontLimits.detail} characters.`);
  const input=v.covers??{};
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid category covers.');
  const entries=Object.entries(input as Record<string,unknown>);
  if(entries.length>50)throw new Error('Too many category covers.');
  const covers:Record<string,number>={};
  for(const [category,id] of entries){
    if(!category||category.length>100||!Number.isSafeInteger(id)||(id as number)<1)throw new Error('Choose a valid cover product.');
    covers[category]=id as number;
  }
  const featuredInput=v.featured??[];
  if(!Array.isArray(featuredInput)||featuredInput.length>maxFeaturedCategories)throw new Error(`Feature at most ${maxFeaturedCategories} categories.`);
  const featured:string[]=[];
  for(const name of featuredInput){
    if(typeof name!=='string'||!name.trim()||name.length>100)throw new Error('Choose a valid featured category.');
    if(!featured.includes(name.trim()))featured.push(name.trim());
  }
  return {announcement:{message,detail},covers,featured};
}
/** The product whose photo represents a category: the owner's choice if it still belongs there, else the first with a photo. */
export function categoryCover(category:string,products:Product[],covers:Record<string,number>={},family:string[]=[category]){
  const chosen=products.find(p=>p.id===covers[category]&&family.includes(p.category));
  return chosen||products.find(p=>family.includes(p.category)&&p.image&&p.image!=='box')||products.find(p=>family.includes(p.category));
}
export const statuses = ['New','Confirmed','Processing','Shipped','Delivered','Cancelled','Returned'] as const;
/** Orders can be corrected by the owner until they ship. */
export const editableStatuses:readonly string[] = ['New','Confirmed','Processing'];
/** Where an order may go next. Active orders can move forward (skipping steps) or straight to
 *  Delivered; Cancelled and Returned are final. Used by the API and the admin status menu. */
export const statusTransitions:Record<string,readonly string[]> = {New:['Confirmed','Processing','Shipped','Delivered','Cancelled'],Confirmed:['Processing','Shipped','Delivered','Cancelled'],Processing:['Shipped','Delivered','Cancelled'],Shipped:['Delivered','Returned'],Delivered:['Returned'],Cancelled:[],Returned:[]};
/** The current status plus every status it may change to, in workflow order. */
export const statusOptions=(current:string)=>statuses.filter(s=>s===current||(statusTransitions[current]||[]).includes(s));
export function statusChangeError(from:string,to:string){
  const next=statusTransitions[from]||[];
  return 'An order that is '+from+' cannot be changed to '+to+'.'+(next.length?' It can be changed to: '+next.join(', ')+'.':' '+from+' is a final status.');
}
/** Cash-on-delivery charge per delivery area, in taka. */
export const deliveryFees = {dhaka:80,outside:150} as const;
export type Order = {paymentMethod?:'cod'|'bkash'|'nagad'|'advance';email?:string;note?:string;/** Studio-only notes, never shown to the customer. */notes?:string;cancelReason?:string;coupon?:string;discount?:number;gift?:OrderGift;id:string;name:string;phone:string;address:string;area:'dhaka'|'outside';items:OrderItem[];total:number;delivery:number;status:typeof statuses[number];date:string;history?:{status:typeof statuses[number];date:string}[];courier?:string;trackingReference?:string;editedAt?:string;readAt?:string};
export const photo=(id:string)=>`https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=85`;
export const money=(n:number)=>'৳'+n.toLocaleString('en-BD');
export const seed:Product[]=[
  {id:1,name:'The Everyday Co-ord',category:'Clothing',price:1490,stock:18,image:photo('photo-1539109136881-3be0616acf4b'),tag:'BESTSELLER'},
  {id:2,name:'Signature Mystery Box',category:'Mystery Boxes',price:1199,stock:24,image:'box',tag:'A LITTLE SURPRISE'},
  {id:3,name:'Soft Satin Scarf',category:'Accessories',price:490,stock:30,image:photo('photo-1601924994987-69e26d50dc26'),tag:'NEW ARRIVAL'},
  {id:4,name:'The Weekend Dress',category:'Clothing',price:1790,stock:12,image:photo('photo-1515372039744-b8f02a3ae446'),tag:'EDITOR’S PICK'},
];
export const styleOptions=['Everyday elegance','Soft & feminine','Bold & playful','Minimal & classic'];
/** Sizes the owner can add with one click in the studio. */
export const sizePresets=['XS','S','M','L','XL','XXL','3XL','Free size'];
export const variantLimits={count:20,length:30} as const;
/** The sizes or styles a customer can choose for a product. Owner-set sizes win;
 *  otherwise the older category rules apply ('One size' means no size choice). */
export function productOptions(p:Pick<Product,'category'|'sizes'>):readonly string[]{
  if(p.sizes?.length)return p.sizes;
  return p.category==='Clothing'?['S','M','L','XL']:p.category==='Mystery Boxes'?styleOptions:['One size'];
}
export function validOption(p:Pick<Product,'category'|'sizes'>,size:string){
  return productOptions(p).includes(size);
}
/** True when the customer must pick a size (or style) on the product page. */
export const hasSizeChoice=(p:Pick<Product,'category'|'sizes'>)=>{const options=productOptions(p);return !(options.length===1&&options[0]==='One size');};
export const productColors=(p:Pick<Product,'colors'>):readonly string[]=>p.colors||[];
/** A product without colours only accepts "no colour"; otherwise one of its colours. */
export function validColor(p:Pick<Product,'colors'>,color:string|undefined){
  const colors=productColors(p);
  return colors.length?!!color&&colors.includes(color):!color;
}
/** Same product, size and colour = the same bag line. */
export const sameLine=(a:Pick<CartItem,'id'|'size'|'color'>,b:Pick<CartItem,'id'|'size'|'color'>)=>a.id===b.id&&a.size===b.size&&(a.color||'')===(b.color||'');
export const lineKey=(c:Pick<CartItem,'id'|'size'|'color'>)=>c.id+'-'+c.size+'-'+(c.color||'');
/** "M · Red", "Red", or "One size" for display. */
export function optionLabel(c:Pick<CartItem,'size'|'color'>){
  const parts=[c.size==='One size'&&c.color?'':c.size,c.color||''].filter(Boolean);
  return parts.join(' · ')||'One size';
}
/** Cleans the owner's size or colour list: trimmed, no duplicates, sensible limits. */
export function normalizeVariants(value:unknown,label:'size'|'colour'):string[]{
  if(value===undefined||value===null)return [];
  if(!Array.isArray(value))throw new Error(`Invalid ${label} list.`);
  const seen=new Set<string>(),list:string[]=[];
  for(const item of value){
    if(typeof item!=='string')throw new Error(`Invalid ${label}.`);
    const text=item.replace(/\s+/g,' ').trim();
    if(!text)continue;
    if(text.length>variantLimits.length)throw new Error(`Each ${label} must be at most ${variantLimits.length} characters.`);
    const key=text.toLowerCase();
    if(seen.has(key))continue;
    seen.add(key);list.push(text);
  }
  if(list.length>variantLimits.count)throw new Error(`Use at most ${variantLimits.count} ${label}s.`);
  return list;
}

// ---- Categories: one level of nesting (main categories and their subcategories) ----
// parent is null for a main category. slug is stored when the category is created and
// stays the same after a rename, so shared links keep working.
export type Category={name:string;slug:string;parent:string|null;cover:string|null};
export const categoryLimits={name:80} as const;
export function slugify(name:string){
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'collection';
}
/** Older catalogs only send names; treat every name as a main category. */
export function categoryList(details:Category[]|undefined,names:string[]):Category[]{
  if(details?.length)return details;
  return names.map(name=>({name,slug:slugify(name),parent:null,cover:null}));
}
export const mainCategories=(categories:Category[])=>categories.filter(c=>!c.parent);
export const subcategoriesOf=(categories:Category[],main:string)=>categories.filter(c=>c.parent===main);
/** A main category's own name plus its subcategories; a subcategory on its own. */
export function categoryFamily(categories:Category[],name:string):string[]{
  const category=categories.find(c=>c.name===name);
  if(!category||category.parent)return [name];
  return [name,...subcategoriesOf(categories,name).map(c=>c.name)];
}
/** Main category a product's category belongs to (itself when it is a main category). */
export function mainCategoryOf(categories:Category[],name:string){
  const category=categories.find(c=>c.name===name);
  return category?.parent||name;
}
export function categoryPath(categories:Category[],name:string){
  const category=categories.find(c=>c.name===name);
  if(!category)return '/shop/';
  const parent=category.parent?categories.find(c=>c.name===category.parent):null;
  return '/collections/'+(parent?parent.slug+'/':'')+category.slug+'/';
}
/** Resolves /collections/<main>[/<sub>] slugs to categories. */
export function categoryFromSlugs(categories:Category[],slugs:string[]){
  const main=categories.find(c=>!c.parent&&c.slug===slugs[0]);
  if(!main||slugs.length>2)return null;
  if(slugs.length===1)return {main,sub:null as Category|null};
  const sub=categories.find(c=>c.parent===main.name&&c.slug===slugs[1]);
  return sub?{main,sub}:null;
}
const photoOf=(p?:Product)=>p&&p.image&&p.image!=='box'?p.image:undefined;
/** Cover for a main category tile: uploaded cover, owner-chosen product, any product photo, else none (placeholder). */
export function categoryCoverImage(category:Category,categories:Category[],products:Product[],covers:Record<string,number>={}){
  if(category.cover)return category.cover;
  const family=categoryFamily(categories,category.name);
  const chosen=products.find(p=>p.id===covers[category.name]&&family.includes(p.category));
  return photoOf(chosen)||photoOf(products.find(p=>family.includes(p.category)&&photoOf(p)));
}
/** Up to four featured main categories: the owner's order, else the first main categories. */
export function featuredCategories(categories:Category[],featured:string[]|undefined){
  const mains=mainCategories(categories);
  const chosen=(featured||[]).map(name=>mains.find(c=>c.name===name)).filter((c):c is Category=>!!c);
  return (chosen.length?chosen:mains).slice(0,maxFeaturedCategories);
}
/** Products on sale right now, using the same offer rules as the product page and checkout. */
export const saleProducts=(products:Product[],now=Date.now())=>products.filter(p=>productPricing(p,now).active);

// ---- Homepage promotions banner ----
export type PromotionLink={type:'product'|'category'|'sale';value:string};
export type Promotion={id:string;image:string;mobileImage:string;headline:string;cta:string;link:PromotionLink;startsAt:string|null;endsAt:string|null;hidden:boolean};
export const maxPromotions=8;
export const promotionLimits={headline:90,cta:30} as const;
const promotionImage=(image:string,label:string)=>{
  if(/^\/media\/[a-f0-9-]{36}\.webp$/.test(image))return image;
  if(image.length<=2000){try{if(new URL(image).protocol==='https:')return image;}catch{}}
  throw new Error(label);
};
export function normalizePromotions(value:unknown):Promotion[]{
  if(!Array.isArray(value)||value.length>maxPromotions)throw new Error(`Use at most ${maxPromotions} promotion slides.`);
  const ids=new Set<string>();
  return value.map((input,index)=>{
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid promotion slide.');
    const s=input as Record<string,unknown>,at=` on promotion ${index+1}`;
    const text=(x:unknown)=>typeof x==='string'?x.replace(/\s+/g,' ').trim():'';
    const id=typeof s.id==='string'&&/^[a-z0-9-]{1,40}$/.test(s.id)?s.id:'';
    if(!id||ids.has(id))throw new Error('Invalid promotion id'+at+'.');
    ids.add(id);
    const headline=text(s.headline),cta=text(s.cta);
    if(!headline)throw new Error('Headline is required'+at+'.');
    if(headline.length>promotionLimits.headline)throw new Error(`Headline must be at most ${promotionLimits.headline} characters${at}.`);
    if(!cta)throw new Error('Button label is required'+at+'.');
    if(cta.length>promotionLimits.cta)throw new Error(`Button label must be at most ${promotionLimits.cta} characters${at}.`);
    const image=promotionImage(text(s.image),'Upload a main image'+at+'.');
    const mobileRaw=text(s.mobileImage);
    const mobileImage=mobileRaw?promotionImage(mobileRaw,'Upload a valid mobile image'+at+'.'):'';
    const l=s.link as Record<string,unknown>|undefined;
    if(!l||!['product','category','sale'].includes(l.type as string))throw new Error('Choose where the button goes'+at+'.');
    const linkValue=l.type==='sale'?'':text(l.value);
    if(l.type!=='sale'&&(!linkValue||linkValue.length>100))throw new Error('Choose a product or category for the button'+at+'.');
    const date=(x:unknown,label:string)=>{
      if(x===null||x===undefined||x==='')return null;
      if(typeof x!=='string'||!Number.isFinite(Date.parse(x))||!/(Z|[+-]\d{2}:\d{2})$/.test(x))throw new Error(label+at+' must be a valid date and time.');
      return new Date(x).toISOString();
    };
    const startsAt=date(s.startsAt,'Start'),endsAt=date(s.endsAt,'End');
    if(startsAt&&endsAt&&startsAt>=endsAt)throw new Error('End must be after start'+at+'.');
    return {id,image,mobileImage,headline,cta,link:{type:l.type as PromotionLink['type'],value:linkValue},startsAt,endsAt,hidden:s.hidden===true};
  });
}
/** Slides customers see now: not hidden and within their optional schedule. */
export const activePromotions=(promotions:Promotion[]|null|undefined,now=Date.now())=>(promotions||[]).filter(p=>!p.hidden&&(!p.startsAt||Date.parse(p.startsAt)<=now)&&(!p.endsAt||now<Date.parse(p.endsAt)));
