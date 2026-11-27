'use client';
import {useMemo,useState} from 'react';
import {money,orderSources,productOptions,productColors,optionLabel,sameLine,productPricing,sizeAvailable,type OrderSource,type Product} from '@aurzen/shared/catalog';
import {deliveryCharge,type SiteSettings} from '@aurzen/shared/site';
import Icon from '../admin-icons';

type Line={key:string;id:number;size:string;color:string;qty:number};
let nextKey=0;
const keyFor=()=>'new-line-'+(++nextKey);
const newReference=()=>typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
const sources=orderSources.filter(s=>s.id!=='website');
const payments=[['cod','Cash on delivery'],['bkash','bKash'],['nagad','Nagad'],['advance','Advance paid']] as const;

/** "+ New order": an order taken on Facebook, WhatsApp, the phone or in person. The server checks stock, sets prices and the order ID. */
export default function OrderCreate({products,checkout,onSave,onCancel}:{products:Product[];checkout:SiteSettings['checkout'];onSave:(data:Record<string,unknown>)=>Promise<void>;onCancel:()=>void}){
  const [source,setSource]=useState<OrderSource>('facebook');
  const [name,setName]=useState(''),[phone,setPhone]=useState(''),[address,setAddress]=useState(''),[area,setArea]=useState<'dhaka'|'outside'>('dhaka');
  const [payment,setPayment]=useState<typeof payments[number][0]>('cod'),[note,setNote]=useState('');
  const [lines,setLines]=useState<Line[]>([]);
  const [addId,setAddId]=useState(''),[addSize,setAddSize]=useState(''),[addColor,setAddColor]=useState(''),[addQty,setAddQty]=useState(1);
  const [deliveryText,setDeliveryText]=useState<string|null>(null),[discountText,setDiscountText]=useState('');
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  // One reference per form, so a double click or a retry never creates the order twice.
  const [reference]=useState(newReference),[now]=useState(()=>Date.now());

  const product=(id:number)=>products.find(p=>p.id===id);
  const unitPrice=(id:number)=>{const p=product(id);return p?productPricing(p,now).unitPrice:0;};
  const subtotal=lines.reduce((n,l)=>n+unitPrice(l.id)*l.qty,0);
  const autoDelivery=deliveryCharge(checkout,area,subtotal);
  const delivery=deliveryText===null||deliveryText===''?autoDelivery:Math.max(0,Math.floor(Number(deliveryText))||0);
  const discount=Math.max(0,Math.floor(Number(discountText))||0);
  const total=subtotal-Math.min(discount,subtotal)+delivery;

  // Stock problems, per size where the product tracks it and in total.
  const problems=useMemo(()=>{
    const out=new Map<string,string>(),perProduct=new Map<number,number>(),perSize=new Map<string,number>();
    for(const l of lines){perProduct.set(l.id,(perProduct.get(l.id)||0)+l.qty);const k=l.id+'|'+l.size;perSize.set(k,(perSize.get(k)||0)+l.qty);}
    for(const l of lines){const p=product(l.id);if(!p)continue;
      const sized=!!(p.extra&&Object.keys(p.extra.sizeStock).length);
      if(sized&&(perSize.get(l.id+'|'+l.size)||0)>sizeAvailable(p,l.size))out.set(l.key,`Only ${sizeAvailable(p,l.size)} left in ${l.size}.`);
      else if((perProduct.get(l.id)||0)>p.stock)out.set(l.key,`Only ${p.stock} left.`);}
    return out;
  },[lines,products]);
  const leftOf=(p:Product,size:string)=>{const used=lines.filter(l=>l.id===p.id&&(!(p.extra&&Object.keys(p.extra.sizeStock).length)||l.size===size)).reduce((n,l)=>n+l.qty,0);return sizeAvailable(p,size)-used;};

  const update=(key:string,change:Partial<Line>)=>setLines(list=>list.map(l=>l.key===key?{...l,...change}:l));
  const chosen=addId?product(Number(addId)):undefined;
  const addLine=()=>{if(!chosen||!addSize||(productColors(chosen).length>0&&!addColor))return;const line={id:chosen.id,size:addSize,color:addColor};setLines(list=>{const same=list.find(l=>sameLine(l,line));return same?list.map(l=>l===same?{...l,qty:Math.min(100,l.qty+addQty)}:l):[...list,{key:keyFor(),...line,qty:addQty}];});setAddId('');setAddSize('');setAddColor('');setAddQty(1);};
  const discountTooBig=discount>subtotal&&subtotal>0;
  const blocked=saving||!lines.length||problems.size>0||discountTooBig;

  return <form className="form-modal order-editor order-create" aria-label="New order" onChange={()=>{if(error)setError('');}} onSubmit={async event=>{
    event.preventDefault();if(blocked)return;setSaving(true);setError('');
    try{await onSave({key:reference,source,name,phone,address,area,paymentMethod:payment,...(note.trim()?{note}:{}),...(deliveryText!==null&&deliveryText!==''?{delivery}:{}),...(discount?{discount}:{}),items:lines.map(({id,size,color,qty})=>({id,size,...(color?{color}:{}),qty}))});}
    catch(e){setError((e as Error).message);}finally{setSaving(false);}
  }}>
    <div className="form-modal__head"><div><div className="admin-eyebrow">Order from messages or phone</div><h2>New order</h2><p className="order-editor__hint">The order ID is created automatically when you save.</p></div><button type="button" aria-label="Close new order" className="a-btn a-btn--icon close" disabled={saving} onClick={onCancel}><Icon name="close"/></button></div>
    <div className="form-modal__body">
      <div className="form-modal__main">
        <section className="form-section"><h3>Where did it come from?</h3>
          <div className="order-create__sources" role="radiogroup" aria-label="Order source">{sources.map(s=><label key={s.id} className={'order-create__source'+(source===s.id?' is-on':'')}><input type="radio" name="source" value={s.id} checked={source===s.id} onChange={()=>setSource(s.id)}/>{s.label}</label>)}</div>
        </section>
        <section className="form-section"><h3>Customer</h3>
          <label>Full name<input name="name" value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={100} autoComplete="off" autoFocus/></label>
          <label>Mobile number<input name="phone" type="tel" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} required minLength={11} maxLength={20} autoComplete="off" placeholder="01712345678" aria-describedby="new-order-phone-hint"/></label>
          <small id="new-order-phone-hint" className="order-editor__hint">The customer can track the order with this number and the order ID.</small>
        </section>
        <section className="form-section"><h3>Delivery</h3>
          <label>Delivery area<select name="area" value={area} onChange={e=>setArea(e.target.value as 'dhaka'|'outside')}><option value="dhaka">Dhaka city</option><option value="outside">Outside Dhaka</option></select></label>
          <label>Delivery address<textarea name="address" value={address} onChange={e=>setAddress(e.target.value)} required minLength={5} maxLength={500} rows={3}/></label>
          <label>Payment<select value={payment} onChange={e=>setPayment(e.target.value as typeof payment)}>{payments.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <label>Customer note <small>(optional)</small><textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={500} rows={2} placeholder="e.g. call before delivery"/></label>
        </section>
      </div>
      <div className="form-modal__side">
        <section className="form-section"><h3>Items</h3>
          {!lines.length&&<p className="order-editor__hint">No items yet. Add a product below.</p>}
          <ul className="order-lines">{lines.map(line=>{const p=product(line.id),warn=problems.get(line.key),label=p?.name||'Product';
            return <li key={line.key} className={warn?'is-over':''}>
              <div className="order-lines__name"><strong>{label}</strong><small>{money(unitPrice(line.id))} each</small></div>
              <label className="order-lines__field">Size or style<select value={line.size} onChange={e=>update(line.key,{size:e.target.value})} aria-label={'Size or style for '+label}>{(p?productOptions(p):[line.size]).map(o=><option key={o}>{o}</option>)}</select></label>
              {p&&productColors(p).length>0&&<label className="order-lines__field order-lines__field--color">Colour<select value={line.color} onChange={e=>update(line.key,{color:e.target.value})} aria-label={'Colour for '+label}>{productColors(p).map(c=><option key={c}>{c}</option>)}</select></label>}
              <div className="order-lines__qty"><span className="order-lines__label">Qty</span><div className="quantity-controls order-stepper" role="group" aria-label={'Quantity for '+label}>
                <button type="button" aria-label={'Decrease quantity for '+label} disabled={line.qty<=1} onClick={()=>update(line.key,{qty:line.qty-1})}>−</button>
                <span aria-live="polite">{line.qty}</span>
                <button type="button" aria-label={'Increase quantity for '+label} disabled={line.qty>=100||!p||leftOf(p,line.size)<=0} onClick={()=>update(line.key,{qty:line.qty+1})}>+</button>
              </div></div>
              <strong className="order-lines__total">{money(unitPrice(line.id)*line.qty)}</strong>
              <button type="button" className="a-btn a-btn--danger-ghost a-btn--sm order-lines__remove" aria-label={'Remove '+label+', '+optionLabel(line)} onClick={()=>setLines(list=>list.filter(l=>l.key!==line.key))}><Icon name="trash"/></button>
              {warn&&<p className="order-lines__warn" role="alert">{warn}</p>}
            </li>;})}</ul>
          <div className="order-add"><h4>Add a product</h4>
            <div className="order-add__row">
              <label>Product<select value={addId} onChange={e=>{setAddId(e.target.value);const p=product(Number(e.target.value));const first=p?productOptions(p).find(o=>sizeAvailable(p,o)>0)||productOptions(p)[0]:'';setAddSize(first);setAddColor(p?productColors(p)[0]||'':'');}}><option value="">Choose a product</option>{products.map(p=><option key={p.id} value={p.id} disabled={p.stock<=0}>{p.name} — {money(productPricing(p,now).unitPrice)}{p.stock<=0?' (sold out)':` (${p.stock} in stock)`}</option>)}</select></label>
              <label>Size or style<select value={addSize} disabled={!chosen} onChange={e=>setAddSize(e.target.value)}>{chosen?productOptions(chosen).map(o=>{const left=leftOf(chosen,o);return <option key={o} value={o} disabled={left<=0}>{o}{left<=0?' (sold out)':''}</option>;}):<option value="">—</option>}</select></label>
              {chosen&&productColors(chosen).length>0&&<label>Colour<select value={addColor} onChange={e=>setAddColor(e.target.value)}>{productColors(chosen).map(c=><option key={c}>{c}</option>)}</select></label>}
              <label>Qty<input type="number" min={1} max={100} value={addQty} disabled={!chosen} onChange={e=>setAddQty(Math.max(1,Math.min(100,Math.floor(Number(e.target.value))||1)))}/></label>
              <button type="button" className="a-btn a-btn--secondary a-btn--sm" disabled={!chosen||!addSize||leftOf(chosen,addSize)<addQty} onClick={addLine}><Icon name="plus"/>Add</button>
            </div>
          </div>
        </section>
        <section className="form-section order-summary" aria-live="polite"><h3>Total</h3>
          <p><span>Items</span><strong>{money(subtotal)}</strong></p>
          <label className="order-create__amount">Delivery (৳)<input type="number" min={0} max={100000} step={1} inputMode="numeric" value={deliveryText??''} placeholder={String(autoDelivery)} onChange={e=>setDeliveryText(e.target.value)}/></label>
          <small className="order-editor__hint">{deliveryText===null||deliveryText===''?'Your shop’s delivery charge for this area. Type another amount to change it (0 = free).':'Custom delivery charge.'}</small>
          <label className="order-create__amount">Discount (৳)<input type="number" min={0} max={subtotal} step={1} inputMode="numeric" value={discountText} placeholder="0" onChange={e=>setDiscountText(e.target.value)}/></label>
          {discountTooBig&&<p className="form-error" role="alert">The discount can&apos;t be more than the items total.</p>}
          <p className="order-summary__total"><span>Total to collect</span><strong>{money(total)}</strong></p>
          <small className="order-editor__hint">Prices are today&apos;s shop prices, including any sale. The server checks stock and the total again when you save.</small>
        </section>
      </div>
    </div>
    <div className="form-modal__foot">{error&&<p className="form-error" role="alert">{error}</p>}{problems.size>0&&<p className="form-error" role="alert">Reduce the highlighted quantities before saving.</p>}<div className="form-modal__buttons"><button type="button" className="a-btn a-btn--secondary" disabled={saving} onClick={onCancel}>Cancel</button><button className="a-btn a-btn--primary" disabled={blocked}>{saving?'Saving…':'Create order'}</button></div></div>
  </form>;
}
