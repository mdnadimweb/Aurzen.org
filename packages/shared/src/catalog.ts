export type Offer = {enabled:boolean;percent:number;startsAt:string|null;endsAt:string|null};
export type Product = {id:number;name:string;category:string;price:number;stock:number;image:string;images?:string[];tag:string;description?:string;offer?:Offer|null};
export type CartItem = {id:number;qty:number;size:string};
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
export const statuses = ['New','Confirmed','Processing','Shipped','Delivered','Cancelled','Returned'] as const;
export type Order = {paymentMethod?:'cod';id:string;name:string;phone:string;address:string;area:'dhaka'|'outside';items:OrderItem[];total:number;delivery:number;status:typeof statuses[number];date:string;history?:{status:typeof statuses[number];date:string}[];courier?:string;trackingReference?:string};
export const photo=(id:string)=>`https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=85`;
export const money=(n:number)=>'৳'+n.toLocaleString('en-BD');
export const seed:Product[]=[
  {id:1,name:'The Everyday Co-ord',category:'Clothing',price:1490,stock:18,image:photo('photo-1539109136881-3be0616acf4b'),tag:'BESTSELLER'},
  {id:2,name:'Signature Mystery Box',category:'Mystery Boxes',price:1199,stock:24,image:'box',tag:'A LITTLE SURPRISE'},
  {id:3,name:'Soft Satin Scarf',category:'Accessories',price:490,stock:30,image:photo('photo-1601924994987-69e26d50dc26'),tag:'NEW ARRIVAL'},
  {id:4,name:'The Weekend Dress',category:'Clothing',price:1790,stock:12,image:photo('photo-1515372039744-b8f02a3ae446'),tag:'EDITOR’S PICK'},
];
export const styleOptions=['Everyday elegance','Soft & feminine','Bold & playful','Minimal & classic'];
export function validOption(p:Product,size:string){
  return p.category==='Clothing'?['S','M','L','XL'].includes(size):p.category==='Mystery Boxes'?styleOptions.includes(size):size==='One size';
}
