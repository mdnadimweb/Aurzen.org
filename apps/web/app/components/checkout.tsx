'use client';
import {trackEvent} from './site-extras';
import {useCallback,useEffect,useRef,useState,type FocusEvent,type InvalidEvent,type FormEvent} from 'react';
import Link from 'next/link';
import {api,useStore} from '../providers';
import {money,validOption,validColor,optionLabel,lineKey,productPricing,type CartItem,type CheckoutQuote} from '@aurzen/shared/catalog';
import {normalizePhone} from '@aurzen/shared/phone';
import ProductImage from './product-image';
import ProductPrice from './product-price';

type Field='name'|'phone'|'address';
type FieldErrors=Partial<Record<Field,string>>;
function fieldError(field:Field,value:string){
  const trimmed=value.trim();
  if(field==='name')return trimmed.length<2?'Enter your full name using at least 2 characters.':trimmed.length>100?'Use 100 characters or fewer.':'';
  if(field==='phone')return /^01[3-9]\d{8}$/.test(normalizePhone(value))?'':'Enter a valid Bangladesh mobile number, such as 01712345678.';
  return trimmed.length<10?'Enter your house, road, area and city using at least 10 characters.':trimmed.length>500?'Use 500 characters or fewer.':'';
}

export type DirectCheckout={item:CartItem|null;attempt:string};
export default function Checkout({directCheckout}:{directCheckout?:DirectCheckout}){
  const {cart:bag,setCart:setBag,products,ready,loaded,refresh,now,site}=useStore(),co=site.checkout;
  const methods=([['cod','Cash on delivery',co.cod?co.paymentNote:''],['bkash','bKash',co.bkash.instructions],['nagad','Nagad',co.nagad.instructions],['advance','Advance payment',co.advance.instructions]] as const).filter(([m])=>m==='cod'?co.cod:co[m].enabled);
  const [method,setMethod]=useState<string>(methods[0]?.[0]||'cod');
  useEffect(()=>{trackEvent('InitiateCheckout');},[]);
  const methodLabel=(id:string)=>methods.find(m=>m[0]===id)?.[1]||'Cash on delivery';
  const [directItems,setDirectItems]=useState<CartItem[]>(directCheckout?.item?[directCheckout.item]:[]);
  const [directReady,setDirectReady]=useState(!directCheckout);
  const cart=directCheckout?directItems:bag,setCart=directCheckout?setDirectItems:setBag;
  const [settings,setSettings]=useState<{enabled:boolean;dhaka:number;outside:number}|null>(null);
  const [area,setArea]=useState<'dhaka'|'outside'>('dhaka'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [fieldErrors,setFieldErrors]=useState<FieldErrors>({}),[receipt,setReceipt]=useState<{id:string;total:number}|null>(null);
  const [quote,setQuote]=useState<(CheckoutQuote&{requestKey:string})|null>(null),[checking,setChecking]=useState(false),[needsReview,setNeedsReview]=useState(false);
  const [quoteRefresh,setQuoteRefresh]=useState(0);
  const previousQuote=useRef<{selection:string;quote:string}|null>(null),quoteRequest=useRef(0);
  const key=useRef(''),submitting=useRef(false),feedback=useRef<HTMLParagraphElement>(null);
  useEffect(()=>{api('/api/orders/').then(setSettings).catch(e=>setError(e.message));},[]);
  useEffect(()=>{key.current=directCheckout?directCheckout.attempt+':'+area+':'+(cart[0]?.qty||0):'';},[cart,area,directCheckout]);
  useEffect(()=>{
    if(!directCheckout)return;
    try{
      const saved=JSON.parse(sessionStorage.getItem('aurzen-buy-receipt:'+directCheckout.attempt)||'null');
      if(saved&&typeof saved.id==='string'&&Number.isSafeInteger(saved.total))setReceipt(saved);
      const draft=JSON.parse(sessionStorage.getItem('aurzen-buy-draft:'+directCheckout.attempt)||'null');
      if(directCheckout.item&&draft&&draft.id===directCheckout.item.id&&draft.size===directCheckout.item.size&&(draft.color||'')===(directCheckout.item.color||'')&&Number.isSafeInteger(draft.qty)&&draft.qty>0&&draft.qty<=100){
        setDirectItems([{...directCheckout.item,qty:draft.qty}]);
        if(draft.area==='dhaka'||draft.area==='outside')setArea(draft.area);
      }
    }catch{}
    setDirectReady(true);
  },[directCheckout?.attempt]);
  useEffect(()=>{
    if(!directCheckout||!directReady)return;
    try{sessionStorage.setItem('aurzen-buy-draft:'+directCheckout.attempt,JSON.stringify({...directItems[0],area}));}catch{}
  },[directCheckout,directReady,directItems,area]);
  const [couponInput,setCouponInput]=useState(''),[appliedCoupon,setAppliedCoupon]=useState(''),[giftWrap,setGiftWrap]=useState(false);
  const selection=JSON.stringify({items:cart,area,...(appliedCoupon?{coupon:appliedCoupon}:{}),...(giftWrap?{gift:{wrap:true}}:{})});
  const prices=JSON.stringify(cart.map(item=>{const p=products.find(p=>p.id===item.id);return p?{id:p.id,price:productPricing(p,now).unitPrice,stock:p.stock}:null;}));
  const requestKey=selection+prices;
  const loadQuote=useCallback(async(forceReview=false)=>{
    const sequence=++quoteRequest.current;setChecking(true);
    try{
      const next=await api<CheckoutQuote>('/api/orders/',{method:'POST',body:JSON.stringify({action:'quote',...JSON.parse(selection)})});
      if(sequence!==quoteRequest.current)return;
      const previous=previousQuote.current;
      const displayed=JSON.parse(prices) as ({id:number;price:number;stock:number}|null)[];
      const changed=next.items.some((item,index)=>item.price!==displayed[index]?.price);
      setNeedsReview(current=>forceReview||changed||(previous?.selection===selection&&(current||previous.quote!==next.quote)));
      previousQuote.current={selection,quote:next.quote};setQuote({...next,requestKey});
      if(changed)void refresh();
    }catch(error){if(sequence===quoteRequest.current){setQuote(null);setError((error as Error).message);}}
    finally{if(sequence===quoteRequest.current)setChecking(false);}
  },[selection,requestKey,refresh]);
  useEffect(()=>{
    if(!ready||!directReady||!settings?.enabled||!cart.length||receipt)return;
    void loadQuote();
    return()=>{quoteRequest.current++;};
  },[ready,directReady,settings?.enabled,cart.length,receipt,loadQuote,quoteRefresh]);
  const quoteReady=!!quote&&quote.requestKey===requestKey&&!checking;
  const total=quote?.subtotal||0,delivery=quote?.delivery||0;
  const invalid=cart.some(c=>{const p=products.find(p=>p.id===c.id);return !p||!validOption(p,c.size)||!validColor(p,c.color)||cart.filter(x=>x.id===c.id).reduce((sum,x)=>sum+x.qty,0)>p.stock;});
  function updateQuantity(index:number,requested:number){
    if(!Number.isFinite(requested))return;
    setCart(items=>items.map((item,i)=>{
      if(i!==index)return item;
      const product=products.find(p=>p.id===item.id);
      if(!product||!validOption(product,item.size)||!validColor(product,item.color))return item;
      const other=items.reduce((sum,other,j)=>j!==index&&other.id===item.id?sum+other.qty:sum,0);
      const limit=Math.min(100,product.stock-other);
      return limit<1?item:{...item,qty:Math.max(1,Math.min(limit,Math.floor(requested)))};
    }));
  }
  function checkField(field:Field,value:string){setFieldErrors(current=>({...current,[field]:fieldError(field,value)}));}
  const fieldProps=(field:Field)=>({
    'aria-invalid':Boolean(fieldErrors[field]),
    'aria-describedby':`${field==='phone'?'checkout-phone-hint ':''}${fieldErrors[field]?'checkout-'+field+'-error':''}`.trim()||undefined,
    onBlur:(event:FocusEvent<HTMLInputElement|HTMLTextAreaElement>)=>checkField(field,event.currentTarget.value),
    onInvalid:(event:InvalidEvent<HTMLInputElement|HTMLTextAreaElement>)=>checkField(field,event.currentTarget.value),
    onInput:(event:FormEvent<HTMLInputElement|HTMLTextAreaElement>)=>{if(fieldErrors[field])checkField(field,event.currentTarget.value);},
  });
  const message=(field:Field)=>fieldErrors[field]&&<span className="field-error" id={'checkout-'+field+'-error'}>{fieldErrors[field]}</span>;

  if(!ready||!loaded||!directReady)return <main className="section empty" role="status">Loading your checkout…</main>;
  if(receipt)return <main className="section receipt"><div className="eyebrow">THANK YOU FOR CHOOSING {site.general.brand.toUpperCase()}</div><h1>{co.confirmTitle}</h1>{co.confirmText&&<p>{co.confirmText}</p>}<div className="panel"><strong className="order-reference">{receipt.id}</strong><p>{methodLabel(method)} · {money(receipt.total)}</p>{co.estimate&&<p>{co.estimate}</p>}</div><div className="receipt__actions"><Link className="primary" href="/shop/">Continue shopping ↗</Link><Link className="secondary-link" href={'/tracking/?reference='+encodeURIComponent(receipt.id)}>Track your order ↗</Link></div></main>;

  return <main className="section checkout"><div className="eyebrow">YOUR LITTLE FINDS</div><h1>{directCheckout?'Your checkout.':'Your shopping bag.'}</h1>{directCheckout&&<p>Review this item and place your cash-on-delivery order. Your shopping bag stays saved. <Link className="text-link" href="/cart/">View your bag</Link></p>}{!cart.length?<div className="empty"><h2>{directCheckout?'Choose a product to buy now.':'A little room for something lovely.'}</h2><Link className="primary" href="/shop">Explore the collection ↗</Link></div>:<div className="checkout-grid"><div className="checkout-items">{cart.map((c,i)=>{
    const product=products.find(p=>p.id===c.id),other=cart.reduce((sum,item,j)=>j!==i&&item.id===c.id?sum+item.qty:sum,0),limit=Math.min(100,Math.max(0,(product?.stock||0)-other));
    const optionAvailable=product&&validOption(product,c.size)&&validColor(product,c.color);
    const issue=!product?'This product is no longer available. Remove it to continue.':!optionAvailable?'This option is no longer available. Remove it and choose another option on the product page.':product.stock===0?'This product is currently out of stock. Remove it to continue.':c.qty+other>product.stock?`Only ${product.stock} available in total. Reduce quantities across the options in your bag.`:'';
    const label=(product?.name||'Unavailable item')+', '+optionLabel(c);
    return <article className="cart-row" key={lineKey(c)} aria-labelledby={'cart-item-'+i}>
      <div className="cart-thumb"><ProductImage sizes="120px" src={product?.image} alt={product?.name||'Unavailable product'} category={product?.category}/></div>
      <div className="cart-item-copy"><h3 id={'cart-item-'+i}>{product?<Link href={'/products/'+product.id+'/'}>{product.name}</Link>:'Unavailable product'}</h3><p>{optionLabel(c)}</p>{product&&<div className="cart-item-price">{quoteReady?<><ProductPrice product={product} chargedUnitPrice={quote!.items[i]?.price}/><span>{money((quote!.items[i]?.price||0)*c.qty)} for {c.qty}</span></>:<span>Checking price…</span>}</div>}{issue&&<p className="cart-item-issue" id={'cart-issue-'+i}>{issue}</p>}
      <button type="button" className="cart-item-remove text-link" disabled={busy} aria-label={'Remove '+label+' from your bag'} onClick={()=>setCart(items=>items.filter((_,j)=>j!==i))}>Remove</button></div>
      {product&&<div className="cart-item-quantity"><span className="cart-quantity-label" id={'cart-quantity-'+i}>Qty</span><div className="quantity-controls" role="group" aria-labelledby={'cart-quantity-'+i+' cart-item-'+i} aria-describedby={issue?'cart-issue-'+i:undefined}><button type="button" aria-label={'Decrease quantity for '+label} disabled={busy||!optionAvailable||c.qty<=1} onClick={()=>updateQuantity(i,c.qty-1)}>−</button><span className="cart-quantity-value" aria-live="polite">{c.qty}</span><button type="button" aria-label={'Increase quantity for '+label} disabled={busy||!optionAvailable||c.qty>=limit} onClick={()=>updateQuantity(i,c.qty+1)}>+</button></div></div>}
    </article>;
  })}</div><form className="panel checkout-form" method="post" action="/api/orders/" aria-busy={busy} onSubmit={async event=>{
    event.preventDefault();
    if(submitting.current||!settings?.enabled||invalid||!quoteReady||needsReview)return;
    const form=event.currentTarget,data=new FormData(form),errors:FieldErrors={};
    for(const field of ['name','phone','address'] as const){const message=fieldError(field,String(data.get(field)||''));if(message)errors[field]=message;}
    setFieldErrors(errors);
    const first=(['name','phone','address'] as const).find(field=>errors[field]);
    if(first){(form.elements.namedItem(first) as HTMLElement|null)?.focus();return;}
    submitting.current=true;setBusy(true);setError('');
    if(!key.current)key.current=crypto.randomUUID();
    try{
      const result=await api('/api/orders/',{method:'POST',body:JSON.stringify({paymentMethod:method,key:key.current,quote:quote!.quote,...(co.email!=='hidden'?{email:String(data.get('email')||'')}:{}),...(co.note?{note:String(data.get('note')||'')}:{}),name:data.get('name'),phone:normalizePhone(String(data.get('phone')||'')),address:data.get('address'),area,items:cart,...(appliedCoupon?{coupon:appliedCoupon}:{}),...(giftWrap||data.get('giftMessage')?{gift:{wrap:giftWrap,message:String(data.get('giftMessage')||'')}}:{})})});
      setReceipt(result);trackEvent('Purchase',{value:result.total,currency:'BDT'});
      if(directCheckout){try{sessionStorage.setItem('aurzen-buy-receipt:'+directCheckout.attempt,JSON.stringify({id:result.id,total:result.total}));}catch{}}
      else setBag([]);
      void refresh();
    }catch(error){setError((error as Error).message);if((error as Error&{status?:number}).status===409){setNeedsReview(true);setQuote(null);setQuoteRefresh(value=>value+1);}void refresh();requestAnimationFrame(()=>feedback.current?.focus());}
    finally{submitting.current=false;setBusy(false);}
  }}><h2>Order summary</h2><div className="summary"><span>Subtotal</span><b>{quoteReady?money(total):'Checking…'}</b></div>{quoteReady&&quote!.discount?<div className="summary"><span>Discount ({quote!.coupon})</span><b>−{money(quote!.discount)}</b></div>:null}{quoteReady&&quote!.gift?.price?<div className="summary"><span>Gift wrap</span><b>{money(quote!.gift.price)}</b></div>:null}<div className="summary"><span>Delivery</span><b>{quoteReady?delivery?money(delivery):'Free':'Checking…'}</b></div><div className="summary"><strong>Total</strong><strong>{quoteReady?money(quote!.total):'—'}</strong></div>
    {needsReview&&<div className="price-review my-4 rounded-[10px] border border-plum bg-blush p-3.5" role="alert"><p className="m-0">Prices or delivery charges changed. Review the updated items and total before placing your order.</p><button type="button" className="text-link font-semibold! underline" disabled={!quoteReady} onClick={()=>{setNeedsReview(false);setError('');}}>I’ve reviewed the updated total</button></div>}
    {quote?.giftable&&(site.gifts.wrap||site.gifts.card)&&<fieldset className="gift-options" disabled={busy}><legend>Make it a gift</legend>{site.gifts.wrap&&<label className="payment-method"><input type="checkbox" checked={giftWrap} onChange={e=>setGiftWrap(e.target.checked)}/><span>Gift wrap{site.gifts.wrapPrice?" (+"+money(site.gifts.wrapPrice)+")":" (free)"}</span></label>}{site.gifts.card&&<label htmlFor="checkout-gift">Message card (optional)<textarea id="checkout-gift" name="giftMessage" rows={2} maxLength={site.gifts.cardLimit} placeholder="We will handwrite it on a card"/></label>}</fieldset>}
    <section className="coupon-field"><label htmlFor="checkout-coupon">Discount code</label><div><input id="checkout-coupon" value={couponInput} maxLength={30} autoComplete="off" placeholder="Enter code" disabled={busy} onChange={e=>setCouponInput(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();setAppliedCoupon(couponInput.trim());}}}/>{appliedCoupon&&quote?.coupon===appliedCoupon?<button type="button" className="secondary-link" disabled={busy} onClick={()=>{setAppliedCoupon("");setCouponInput("");}}>Remove</button>:<button type="button" className="secondary-link" disabled={busy||!couponInput.trim()} onClick={()=>setAppliedCoupon(couponInput.trim())}>Apply</button>}</div>{quoteReady&&quote!.couponError&&appliedCoupon?<p className="field-error" role="alert">{quote!.couponError}</p>:quoteReady&&quote!.coupon?<p className="field-hint" role="status">Code {quote!.coupon} applied.</p>:null}</section>
    {invalid&&<p className="form-error" role="alert">Review the marked items in your bag before checkout.</p>}
    <label>Delivery area<select value={area} disabled={busy} onChange={e=>setArea(e.currentTarget.value as 'dhaka'|'outside')}><option value="dhaka">Dhaka city — {money(co.dhaka)}</option><option value="outside">Outside Dhaka — {money(co.outside)}</option></select></label>
    {!settings?.enabled&&<p className="availability-note">We’re preparing our collection. Ordering will open soon.</p>}
    <fieldset disabled={busy||!settings?.enabled}><label htmlFor="checkout-name">Full name<input id="checkout-name" name="name" required minLength={2} maxLength={100} autoComplete="name" enterKeyHint="next" {...fieldProps('name')}/>{message('name')}</label><label htmlFor="checkout-phone">Mobile number<input id="checkout-phone" name="phone" type="tel" inputMode="tel" required maxLength={20} autoComplete="tel" enterKeyHint="next" placeholder="01XXXXXXXXX" {...fieldProps('phone')}/><span id="checkout-phone-hint" className="field-hint">Use your Bangladesh mobile number. +880 format is also accepted.</span>{message('phone')}</label><label htmlFor="checkout-address">Delivery address<textarea id="checkout-address" name="address" required minLength={10} maxLength={500} rows={3} autoComplete="street-address" placeholder="House, road, area, city and postal code" {...fieldProps('address')}/>{message('address')}</label>{co.email!=="hidden"&&<label htmlFor="checkout-email">Email{co.email==="optional"?" (optional)":""}<input id="checkout-email" name="email" type="email" required={co.email==="required"} maxLength={120} autoComplete="email"/></label>}{co.note&&<label htmlFor="checkout-note">Order note (optional)<textarea id="checkout-note" name="note" maxLength={500} rows={2} placeholder="Anything we should know?"/></label>}</fieldset>
    {co.freeThreshold>0&&<p className="field-hint">Free delivery on orders of {money(co.freeThreshold)} or more.</p>}{co.minOrder>0&&<p className="field-hint">Minimum order {money(co.minOrder)}.</p>}{methods.length>1?<fieldset className="payment-methods"><legend>Payment</legend>{methods.map(([id,label,text])=><label key={id} className="payment-method"><input type="radio" name="paymentMethod" value={id} checked={method===id} disabled={busy} onChange={()=>setMethod(id)}/><span><strong>{label}</strong>{method===id&&text&&<><br/><span className="field-hint">{text}</span></>}</span></label>)}</fieldset>:<p><strong>{methods[0]?.[1]||"Cash on delivery"}</strong>{methods[0]?.[2]&&<><br/>{methods[0][2]}</>}</p>}{co.returnsNote&&<p>{co.returnsNote}</p>}{error&&<p ref={feedback} tabIndex={-1} className="form-error form-feedback" role="alert">{error}</p>}<button className="primary checkout-submit" disabled={busy||!settings?.enabled||invalid||!quoteReady||needsReview}>{busy?'Placing your order…':method==='cod'?'Place COD Order':'Place order'}</button><small>Your total and availability are checked again when you place your order.</small>
  </form></div>}</main>;
}
