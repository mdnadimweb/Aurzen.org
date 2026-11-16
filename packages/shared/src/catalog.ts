export type Offer = {enabled:boolean;percent:number;startsAt:string|null;endsAt:string|null};
// sizes/colors: what the owner offers for this product. Empty or missing means the
// product has no such choice and the product page does not show a picker for it.
export type Product = {id:number;name:string;category:string;price:number;stock:number;image:string;images?:string[];tag:string;description?:string;offer?:Offer|null;sizes?:string[];colors?:string[]};
// color is omitted (or '') for products without colour choices.
export type CartItem = {id:number;qty:number;size:string;color?:string};
export type OrderItem = CartItem & {name:string;price:number};
export type CheckoutQuote={items:OrderItem[];subtotal:number;delivery:number;total:number;quote:string;serverNow:number};

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
export type HeroSlide={eyebrow:string;title:string;emphasis:string;description:string;image:string;alt:string;caption:string;note:string;category:string;cta:string;tone:typeof heroTones[number]};
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
    return {...slide,image,tone:s.tone} as HeroSlide;
  });
}
// Owner-edited storefront text and category cover photos. Stored as one settings row;
// null until the owner saves, so the storefront keeps its built-in defaults.
export type Storefront={announcement:{message:string;detail:string};covers:Record<string,number>};
export const defaultStorefront:Storefront={announcement:{message:'A little joy, delivered.',detail:'Thoughtfully selected in Bangladesh'},covers:{}};
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
  return {announcement:{message,detail},covers};
}
/** The product whose photo represents a category: the owner's choice if it still belongs there, else the first with a photo. */
export function categoryCover(category:string,products:Product[],covers:Record<string,number>={}){
  const chosen=products.find(p=>p.id===covers[category]&&p.category===category);
  return chosen||products.find(p=>p.category===category&&p.image&&p.image!=='box')||products.find(p=>p.category===category);
}
export const statuses = ['New','Confirmed','Processing','Shipped','Delivered','Cancelled','Returned'] as const;
/** Orders can be corrected by the owner until they ship. */
export const editableStatuses:readonly string[] = ['New','Confirmed','Processing'];
/** Cash-on-delivery charge per delivery area, in taka. */
export const deliveryFees = {dhaka:80,outside:150} as const;
export type Order = {paymentMethod?:'cod';id:string;name:string;phone:string;address:string;area:'dhaka'|'outside';items:OrderItem[];total:number;delivery:number;status:typeof statuses[number];date:string;history?:{status:typeof statuses[number];date:string}[];courier?:string;trackingReference?:string;editedAt?:string};
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
