'use client';
import {useEffect,useMemo,useState} from 'react';
import {money,orderSources,productOptions,productColors,optionLabel,sameLine,productPricing,sizeAvailable,type OrderSource,type Product} from '@aurzen/shared/catalog';
import {deliveryCharge,type SiteSettings} from '@aurzen/shared/site';
import {normalizePhone} from '@aurzen/shared/phone';
import Icon from '../admin-icons';
import ProductPicker from './product-picker';
import {readDraft,saveDraft,clearDraft} from './order-draft';

type Line={key:string;id:number;size:string;color:string;qty:number};
const keyFor=()=>'new-line-'+Math.random().toString(36).slice(2);
const newReference=()=>typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
const sources=orderSources.filter(s=>s.id!=='website');
const payments=[['cod','Cash on delivery'],['bkash','bKash'],['nagad','Nagad'],['advance','Advance paid']] as const;
type Payment=typeof payments[number][0];
type Draft={reference:string;source:OrderSource;name:string;phone:string;address:string;area:'dhaka'|'outside';payment:Payment;note:string;lines:Line[];deliveryText:string|null;discountText:string};
const DRAFT_KEY='new';

/** "+ New order": an order taken on Facebook, WhatsApp, the phone or in person. The server checks stock, sets prices and the order ID.
 *  What is typed is kept as a draft in this browser, so closing the form by accident loses nothing. */
export default function OrderCreate({products,checkout,onSave,onCancel}:{products:Product[];checkout:SiteSettings['checkout'];onSave:(data:Record<string,unknown>)=>Promise<void>;onCancel:()=>void}){
  const [draft]=useState(()=>readDraft<Draft>(DRAFT_KEY));
  const [source,setSource]=useState<OrderSource>(draft?.source||'facebook');
  const [name,setName]=useState(draft?.name||''),[phone,setPhone]=useState(draft?.phone||''),[address,setAddress]=useState(draft?.address||''),[area,setArea]=useState<'dhaka'|'outside'>(draft?.area||'dhaka');
  const [payment,setPayment]=useState<Payment>(draft?.payment||'cod'),[note,setNote]=useState(draft?.note||'');
  // Lines for products that no longer exist are dropped from a restored draft.
  const [lines,setLines]=useState<Line[]>(()=>(draft?.lines||[]).filter(l=>products.some(p=>p.id===l.id)));
  const [deliveryText,setDeliveryText]=useState<string|null>(draft?.deliveryText??null),[discountText,setDiscountText]=useState(draft?.discountText||'');
  const [saving,setSaving]=useState(false),[tried,setTried]=useState(false),[serverError,setServerError]=useState(''),[restored,setRestored]=useState(!!draft);
  // One reference per order, kept with the draft, so a double click or a retry never creates the order twice.
  const [reference,setReference]=useState(()=>draft?.reference||newReference()),[now]=useState(()=>Date.now());

  const empty=!name&&!phone&&!address&&!note&&!lines.length&&!discountText&&(deliveryText===null||deliveryText==='');
  useEffect(()=>{if(empty)clearDraft(DRAFT_KEY);else saveDraft<Draft>(DRAFT_KEY,{reference,source,name,phone,address,area,payment,note,lines,deliveryText,discountText});},[reference,source,name,phone,address,area,payment,note,lines,deliveryText,discountText,empty]);
  const startOver=()=>{clearDraft(DRAFT_KEY);setSource('facebook');setName('');setPhone('');setAddress('');setArea('dhaka');setPayment('cod');setNote('');setLines([]);setDeliveryText(null);setDiscountText('');setTried(false);setServerError('');setRestored(false);setReference(newReference());};

  const product=(id:number)=>products.find(p=>p.id===id);
  const unitPrice=(id:number)=>{const p=product(id);return p?productPricing(p,now).unitPrice:0;};
  const subtotal=lines.reduce((n,l)=>n+unitPrice(l.id)*l.qty,0);
  const autoDelivery=deliveryCharge(checkout,area,subtotal);
  const delivery=deliveryText===null||deliveryText===''?autoDelivery:Math.max(0,Math.floor(Number(deliveryText))||0);
  const discount=Math.max(0,Math.floor(Number(discountText))||0);
  const total=subtotal-Math.min(discount,subtotal)+delivery;

  const tracked=(p:Product)=>!!(p.extra&&Object.keys(p.extra.sizeStock).length);
  // How many more of this product (and size, where stock is per size) can still be added.
  const left=(p:Product,size:string)=>{const used=lines.filter(l=>l.id===p.id&&(!tracked(p)||l.size===size)).reduce((n,l)=>n+l.qty,0);return sizeAvailable(p,size)-used;};
  const problems=useMemo(()=>{
    const out=new Map<string,string>();
    for(const l of lines){const p=product(l.id);if(!p)continue;if(left(p,l.size)<0)out.set(l.key,tracked(p)?`Only ${sizeAvailable(p,l.size)} left in ${l.size}.`:`Only ${p.stock} left.`);}
    return out;
  },[lines,products]);
  const update=(key:string,change:Partial<Line>)=>setLines(list=>list.map(l=>l.key===key?{...l,...change}:l));
  const add=(p:Product,size:string,color:string)=>{setServerError('');setLines(list=>{const line={id:p.id,size,color};const same=list.find(l=>sameLine(l,line));return same?list.map(l=>l===same?{...l,qty:Math.min(100,l.qty+1)}:l):[...list,{key:keyFor(),...line,qty:1}];});};

  function missing(){
    const out:string[]=[];
    if(name.trim().length<2)out.push('Enter the customer’s name.');
    if(!/^01[3-9]\d{8}$/.test(normalizePhone(phone)))out.push('Enter a valid Bangladesh mobile number (e.g. 01712345678).');
    if(address.trim().length<5)out.push('Enter the delivery address.');
    if(!lines.length)out.push('Add at least one product (search above the total).');
    if(problems.size)out.push('Reduce the highlighted quantities: not enough stock.');
    if(discount>subtotal&&subtotal>0)out.push('The discount can’t be more than the items total.');
    return out;
  }
  // After the first Create click, the list of what is missing updates as each thing is fixed.
  const errors=[...(tried?missing():[]),...(serverError?[serverError]:[])];

  return <form noValidate className="form-modal order-editor order-create" aria-label="New order" onSubmit={async event=>{
    event.preventDefault();if(saving)return;
    setTried(true);setServerError('');if(missing().length)return;
    setSaving(true);
    try{await onSave({key:reference,source,name,phone,address,area,paymentMethod:payment,...(note.trim()?{note}:{}),...(deliveryText!==null&&deliveryText!==''?{delivery}:{}),...(discount?{discount}:{}),items:lines.map(({id,size,color,qty})=>({id,size,...(color?{color}:{}),qty}))});clearDraft(DRAFT_KEY);}
    catch(e){setServerError((e as Error).message);}finally{setSaving(false);}
  }}>
    <div className="form-modal__head"><div><div className="admin-eyebrow">Order from messages or phone</div><h2>New order</h2><p className="order-editor__hint">The order ID is created automatically when you save.{restored&&<> · <strong>Draft restored.</strong> <button type="button" className="text-link" onClick={startOver}>Start over</button></>}</p></div><button type="button" aria-label="Close new order (your draft is kept)" className="a-btn a-btn--icon close" disabled={saving} onClick={onCancel}><Icon name="close"/></button></div>
    <div className="form-modal__body">
      <div className="form-modal__main">
        <section className="form-section"><h3>Where did it come from?</h3>
          <div className="order-create__sources" role="radiogroup" aria-label="Order source">{sources.map(s=><label key={s.id} className={'order-create__source'+(source===s.id?' is-on':'')}><input type="radio" name="source" value={s.id} checked={source===s.id} onChange={()=>setSource(s.id)}/>{s.label}</label>)}</div>
        </section>
        <section className="form-section"><h3>Customer</h3>
          <label>Full name<input name="name" value={name} onChange={e=>setName(e.target.value)} maxLength={100} autoComplete="off" autoFocus={!restored}/></label>
          <label>Mobile number<input name="phone" type="tel" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={20} autoComplete="off" placeholder="01712345678" aria-describedby="new-order-phone-hint"/></label>
          <small id="new-order-phone-hint" className="order-editor__hint">The customer can track the order with this number and the order ID.</small>
        </section>
        <section className="form-section"><h3>Delivery</h3>
          <label>Delivery area<select name="area" value={area} onChange={e=>setArea(e.target.value as 'dhaka'|'outside')}><option value="dhaka">Dhaka city — {money(checkout.dhaka)}</option><option value="outside">Outside Dhaka — {money(checkout.outside)}</option></select></label>
          <label>Delivery address<textarea name="address" value={address} onChange={e=>setAddress(e.target.value)} maxLength={500} rows={3}/></label>
          <label>Payment<select value={payment} onChange={e=>setPayment(e.target.value as Payment)}>{payments.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <label>Customer note <small>(optional)</small><textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={500} rows={2} placeholder="e.g. call before delivery"/></label>
        </section>
      </div>
      <div className="form-modal__side">
        <section className="form-section"><h3>Items</h3>
          <ProductPicker products={products} left={left} onAdd={add} now={now}/>
          {!lines.length&&<p className="order-create__empty">No products yet. Search above and pick a size to add it.</p>}
          <ul className="order-lines">{lines.map(line=>{const p=product(line.id),warn=problems.get(line.key),label=p?.name||'Product';
            return <li key={line.key} className={warn?'is-over':''}>
              <div className="order-lines__name"><strong>{label}</strong><small>{money(unitPrice(line.id))} each</small></div>
              <label className="order-lines__field">Size or style<select value={line.size} onChange={e=>update(line.key,{size:e.target.value})} aria-label={'Size or style for '+label}>{(p?productOptions(p):[line.size]).map(o=><option key={o}>{o}</option>)}</select></label>
              {p&&productColors(p).length>0&&<label className="order-lines__field order-lines__field--color">Colour<select value={line.color} onChange={e=>update(line.key,{color:e.target.value})} aria-label={'Colour for '+label}>{productColors(p).map(c=><option key={c}>{c}</option>)}</select></label>}
              <div className="order-lines__qty"><span className="order-lines__label">Qty</span><div className="quantity-controls order-stepper" role="group" aria-label={'Quantity for '+label}>
                <button type="button" aria-label={'Decrease quantity for '+label} disabled={line.qty<=1} onClick={()=>update(line.key,{qty:line.qty-1})}>−</button>
                <span aria-live="polite">{line.qty}</span>
                <button type="button" aria-label={'Increase quantity for '+label} disabled={line.qty>=100||!p||left(p,line.size)<=0} onClick={()=>update(line.key,{qty:line.qty+1})}>+</button>
              </div></div>
              <strong className="order-lines__total">{money(unitPrice(line.id)*line.qty)}</strong>
              <button type="button" className="a-btn a-btn--danger-ghost a-btn--sm order-lines__remove" aria-label={'Remove '+label+', '+optionLabel(line)} onClick={()=>setLines(list=>list.filter(l=>l.key!==line.key))}><Icon name="trash"/></button>
              {warn&&<p className="order-lines__warn" role="alert">{warn}</p>}
            </li>;})}</ul>
        </section>
        <section className="form-section order-summary" aria-live="polite"><h3>Total</h3>
          <p><span>Items</span><strong>{money(subtotal)}</strong></p>
          <label className="order-create__amount">Delivery (৳)<input type="number" min={0} max={100000} step={1} inputMode="numeric" value={deliveryText??''} placeholder={String(autoDelivery)} onChange={e=>setDeliveryText(e.target.value)}/></label>
          <small className="order-editor__hint">{deliveryText===null||deliveryText===''?'Your shop’s delivery charge for this area. Type another amount to change it (0 = free).':'Custom delivery charge.'}</small>
          <label className="order-create__amount">Discount (৳)<input type="number" min={0} step={1} inputMode="numeric" value={discountText} placeholder="0" onChange={e=>setDiscountText(e.target.value)}/></label>
          <p className="order-summary__total"><span>Total to collect</span><strong>{money(total)}</strong></p>
          <small className="order-editor__hint">Prices are today&apos;s shop prices, including any sale. The server checks stock and the total again when you save.</small>
        </section>
      </div>
    </div>
    <div className="form-modal__foot">{errors.length>0&&<div className="form-error" role="alert">{errors.length===1?<p>{errors[0]}</p>:<><p>Before creating the order:</p><ul>{errors.map(e=><li key={e}>{e}</li>)}</ul></>}</div>}<div className="form-modal__buttons"><button type="button" className="a-btn a-btn--secondary" disabled={saving} onClick={onCancel}>Close</button><button className="a-btn a-btn--primary" disabled={saving}>{saving?'Saving…':'Create order'}</button></div></div>
  </form>;
}
