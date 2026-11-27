'use client';
import {useEffect,useMemo,useState} from 'react';
import {money,productOptions,productColors,optionLabel,sameLine,productPricing,sizeAvailable,type Order,type Product} from '@aurzen/shared/catalog';
import {deliveryCharge,type SiteSettings} from '@aurzen/shared/site';
import Icon from '../admin-icons';
import StatusPill from './status-pill';
import ProductPicker from './product-picker';
import {readDraft,saveDraft,clearDraft} from './order-draft';

type EditDraft={name:string;phone:string;address:string;area:Order['area'];lines:Line[];deliveryText:string;basedOn:string};

type Line={key:string;id:number;size:string;color:string;qty:number};
let nextKey=0;
const keyFor=()=>'line-'+(++nextKey);

/** Owner correction form for an unshipped order. The server re-validates everything and sets the final total.
 *  Unsaved changes are kept as a draft for this order, so closing the form by accident loses nothing. */
export default function OrderEditor({order,products,checkout,onSave,onCancel}:{order:Order;products:Product[];checkout:SiteSettings['checkout'];onSave:(data:Record<string,unknown>)=>Promise<void>;onCancel:()=>void}){
  // A draft only counts while the order is unchanged on the server since the draft was made.
  const basedOn=order.editedAt||order.date,draftKey='edit:'+order.id;
  const [draft]=useState(()=>{const d=readDraft<EditDraft>(draftKey);return d&&d.basedOn===basedOn?d:null;});
  const [name,setName]=useState(draft?.name??order.name),[phone,setPhone]=useState(draft?.phone??order.phone),[address,setAddress]=useState(draft?.address??order.address),[area,setArea]=useState<Order['area']>(draft?.area??order.area);
  const [lines,setLines]=useState<Line[]>(()=>draft?.lines?.length?draft.lines:order.items.map(item=>({key:keyFor(),id:item.id,size:item.size,color:item.color||'',qty:item.qty})));
  const [deliveryText,setDeliveryText]=useState(draft?.deliveryText??'');
  const [saving,setSaving]=useState(false),[error,setError]=useState(''),[restored,setRestored]=useState(!!draft);
  const [now]=useState(()=>Date.now());

  const product=(id:number)=>products.find(p=>p.id===id);
  const originalQty=(id:number)=>order.items.filter(i=>i.id===id).reduce((n,i)=>n+i.qty,0);
  // Units available to this order: shelf stock plus what the order already holds.
  const available=(id:number)=>(product(id)?.stock??0)+originalQty(id);
  const unitPrice=(line:Pick<Line,'id'|'size'|'color'>)=>{
    const original=order.items.find(i=>sameLine(i,line))||order.items.find(i=>i.id===line.id);
    if(original)return original.price;const p=product(line.id);return p?productPricing(p,now).unitPrice:0;
  };
  const lineName=(id:number)=>order.items.find(i=>i.id===id)?.name||product(id)?.name||'Unavailable product';
  const totals=useMemo(()=>{
    const subtotal=lines.reduce((n,l)=>n+unitPrice(l)*l.qty,0);
    // Same area keeps the charge; a new area uses the shop's charge from Settings; a typed amount wins.
    const autoDelivery=area===order.area?order.delivery:deliveryCharge(checkout,area,subtotal);
    const delivery=deliveryText===''?autoDelivery:Math.max(0,Math.floor(Number(deliveryText))||0);
    const discount=Math.min(order.discount||0,subtotal),gift=order.gift?.wrap?order.gift.price||0:0;
    return {subtotal,autoDelivery,delivery,discount,gift,total:subtotal-discount+delivery+gift};
  },[lines,area,deliveryText]);
  const perProduct=new Map<number,number>();for(const l of lines)perProduct.set(l.id,(perProduct.get(l.id)||0)+l.qty);
  // Stock per size (where the product tracks it): what is on the shelf plus what this order already holds in that size.
  const sized=(p?:Product)=>!!(p?.extra&&Object.keys(p.extra.sizeStock).length);
  const originalSizeQty=(id:number,size:string)=>order.items.filter(i=>i.id===id&&i.size===size).reduce((n,i)=>n+i.qty,0);
  const sizeQty=(id:number,size:string)=>lines.filter(l=>l.id===id&&l.size===size).reduce((n,l)=>n+l.qty,0);
  const sizeLeft=(id:number,size:string)=>{const p=product(id);return p&&sized(p)?sizeAvailable(p,size)+originalSizeQty(id,size)-sizeQty(id,size):Infinity;};
  const sizeOver=(line:Line)=>sizeLeft(line.id,line.size)<0;
  const problems=[...[...perProduct].filter(([id,qty])=>{const p=product(id);return p?qty>available(id):qty>originalQty(id);}),...lines.filter(sizeOver).map(l=>[l.id,l.qty] as [number,number])];

  const update=(key:string,change:Partial<Line>)=>setLines(list=>list.map(l=>l.key===key?{...l,...change}:l));
  // How many more of a product (and size) can be added: shelf stock plus what this order already holds.
  const leftFor=(p:Product,size:string)=>Math.min(available(p.id)-(perProduct.get(p.id)||0),sizeLeft(p.id,size));
  const addLine=(p:Product,size:string,color:string)=>{setError('');const line={id:p.id,size,color};setLines(list=>{const same=list.find(l=>sameLine(l,line));return same?list.map(l=>l===same?{...l,qty:Math.min(100,l.qty+1)}:l):[...list,{key:keyFor(),...line,qty:1}];});};
  const original=JSON.stringify({name:order.name,phone:order.phone,address:order.address,area:order.area,lines:order.items.map(i=>[i.id,i.size,i.color||'',i.qty]),deliveryText:''});
  const changed=JSON.stringify({name,phone,address,area,lines:lines.map(l=>[l.id,l.size,l.color,l.qty]),deliveryText})!==original;
  useEffect(()=>{if(changed)saveDraft<EditDraft>(draftKey,{name,phone,address,area,lines,deliveryText,basedOn});else clearDraft(draftKey);},[name,phone,address,area,lines,deliveryText,changed]);
  const discardChanges=()=>{clearDraft(draftKey);setName(order.name);setPhone(order.phone);setAddress(order.address);setArea(order.area);setLines(order.items.map(item=>({key:keyFor(),id:item.id,size:item.size,color:item.color||'',qty:item.qty})));setDeliveryText('');setRestored(false);setError('');};

  return <form className="form-modal order-editor" aria-label={'Edit order '+order.id} onChange={()=>{if(error)setError('');}} onClick={event=>{if(error&&(event.target as HTMLElement).closest('button[type=button]'))setError('');}} onSubmit={async event=>{
    event.preventDefault();if(saving)return;
    if(problems.length){setError('Reduce the highlighted quantities: not enough stock.');return;}
    setSaving(true);setError('');
    try{await onSave({id:order.id,name,phone,address,area,...(deliveryText!==''?{delivery:totals.delivery}:{}),items:lines.map(({id,size,color,qty})=>({id,size,...(color?{color}:{}),qty}))});clearDraft(draftKey);}
    catch(e){setError((e as Error).message);}finally{setSaving(false);}
  }}>
    <div className="form-modal__head"><div><div className="admin-eyebrow">Correct an order</div><h2>Edit order</h2><p className="order-editor__ref"><span className="admin-mono">{order.id}</span><StatusPill status={order.status}/></p>{restored&&<p className="order-editor__hint"><strong>Your unsaved changes were restored.</strong> <button type="button" className="text-link" onClick={discardChanges}>Discard them</button></p>}</div><button type="button" aria-label="Close order editor (unsaved changes are kept)" className="a-btn a-btn--icon close" disabled={saving} onClick={onCancel}><Icon name="close"/></button></div>
    <div className="form-modal__body">
      <div className="form-modal__main">
        <section className="form-section"><h3>Customer</h3>
          <label>Full name<input name="name" value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={100} autoComplete="off" autoFocus={!restored}/></label>
          <label>Mobile number<input name="phone" type="tel" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} required minLength={11} maxLength={20} autoComplete="off" aria-describedby="order-phone-hint"/></label>
          <small id="order-phone-hint" className="order-editor__hint">Bangladesh mobile number, e.g. 01712345678 or +8801712345678. The customer tracks the order with this number.</small>
        </section>
        <section className="form-section"><h3>Delivery</h3>
          <label>Delivery area<select name="area" value={area} onChange={e=>setArea(e.target.value as Order['area'])}><option value="dhaka">Dhaka city — {money(checkout.dhaka)}</option><option value="outside">Outside Dhaka — {money(checkout.outside)}</option></select></label>
          <label>Delivery address<textarea name="address" value={address} onChange={e=>setAddress(e.target.value)} required minLength={5} maxLength={500} rows={4}/></label>
        </section>
      </div>
      <div className="form-modal__side">
        <section className="form-section"><h3>Items</h3>
          <ul className="order-lines">{lines.map(line=>{const p=product(line.id),options=p?productOptions(p):[line.size],overSize=sizeOver(line),over=overSize||(perProduct.get(line.id)||0)>(p?available(line.id):originalQty(line.id));
            return <li key={line.key} className={over?'is-over':''}>
              <div className="order-lines__name"><strong>{lineName(line.id)}</strong><small>{money(unitPrice(line))} each{!p?' · product removed':''}</small></div>
              <label className="order-lines__field">Size or style<select value={line.size} disabled={!p} onChange={e=>update(line.key,{size:e.target.value})} aria-label={'Size or style for '+lineName(line.id)}>{options.includes(line.size)?null:<option value={line.size}>{line.size}</option>}{options.map(o=><option key={o}>{o}</option>)}</select></label>
              {(()=>{const colors=p?productColors(p):[];if(!colors.length&&!line.color)return null;return <label className="order-lines__field order-lines__field--color">Colour<select value={line.color} disabled={!p} onChange={e=>update(line.key,{color:e.target.value})} aria-label={'Colour for '+lineName(line.id)}>{line.color&&!colors.includes(line.color)?<option value={line.color}>{line.color}</option>:null}{!colors.length&&<option value="">No colour</option>}{colors.map(c=><option key={c}>{c}</option>)}</select></label>;})()}
              <div className="order-lines__qty"><span className="order-lines__label">Qty</span><div className="quantity-controls order-stepper" role="group" aria-label={'Quantity for '+lineName(line.id)}>
                <button type="button" aria-label={'Decrease quantity for '+lineName(line.id)} disabled={line.qty<=1} onClick={()=>update(line.key,{qty:line.qty-1})}>−</button>
                <span aria-live="polite">{line.qty}</span>
                <button type="button" aria-label={'Increase quantity for '+lineName(line.id)} disabled={line.qty>=100||!p||(perProduct.get(line.id)||0)>=available(line.id)||sizeLeft(line.id,line.size)<=0} onClick={()=>update(line.key,{qty:line.qty+1})}>+</button>
              </div></div>
              <strong className="order-lines__total">{money(unitPrice(line)*line.qty)}</strong>
              <button type="button" className="a-btn a-btn--danger-ghost a-btn--sm order-lines__remove" disabled={lines.length<=1} aria-label={'Remove '+lineName(line.id)+', '+optionLabel(line)} onClick={()=>setLines(list=>list.filter(l=>l.key!==line.key))}><Icon name="trash"/></button>
              {over&&<p className="order-lines__warn" role="alert">{p&&overSize?`Only ${sizeAvailable(p,line.size)+originalSizeQty(line.id,line.size)} available in ${line.size}.`:p?`Only ${available(line.id)} available for ${p.name}.`:'This product was removed; its quantity can only be reduced.'}</p>}
            </li>;})}</ul>
          {lines.length<=1&&<small className="order-editor__hint">An order needs at least one item. To remove everything, set the status to Cancelled instead.</small>}
          <ProductPicker products={products.filter(p=>p.stock>0||originalQty(p.id)>0)} left={leftFor} onAdd={addLine} now={now}/>
        </section>
        <section className="form-section order-summary" aria-live="polite"><h3>New total</h3>
          <p><span>Items</span><strong>{money(totals.subtotal)}</strong></p>
          {totals.discount>0&&<p><span>Discount{order.coupon?' ('+order.coupon+')':''}</span><strong>−{money(totals.discount)}</strong></p>}
          {totals.gift>0&&<p><span>Gift wrap</span><strong>{money(totals.gift)}</strong></p>}
          <label className="order-create__amount">Delivery (৳)<input type="number" min={0} max={100000} step={1} inputMode="numeric" value={deliveryText} placeholder={String(totals.autoDelivery)} onChange={e=>setDeliveryText(e.target.value)}/></label>
          <small className="order-editor__hint">{deliveryText!==''?'Custom delivery charge.':area===order.area?'The charge on this order. Type another amount to change it (0 = free).':'Your shop’s charge for the new area. Type another amount to change it.'}</small>
          <p className="order-summary__total"><span>Total to collect</span><strong>{money(totals.total)}</strong></p>
          <small className="order-editor__hint">Was {money(order.total)}. Existing items keep their original price; added products use today&apos;s price. The server recalculates the final total and stock when you save.</small>
        </section>
      </div>
    </div>
    <div className="form-modal__foot">{error&&<p className="form-error" role="alert">{error}</p>}<div className="form-modal__buttons"><button type="button" className="a-btn a-btn--secondary" disabled={saving} onClick={onCancel}>Cancel</button><button className="a-btn a-btn--primary" disabled={saving}>{saving?'Saving…':'Save changes'}</button></div></div>
  </form>;
}
