'use client';
import {useMemo,useState} from 'react';
import {deliveryFees,money,productOptions,productPricing,type Order,type Product} from '@aurzen/shared/catalog';
import Icon from '../admin-icons';
import StatusPill from './status-pill';

type Line={key:string;id:number;size:string;qty:number};
let nextKey=0;
const keyFor=()=>'line-'+(++nextKey);

/** Owner correction form for an unshipped order. The server re-validates everything and sets the final total. */
export default function OrderEditor({order,products,onSave,onCancel}:{order:Order;products:Product[];onSave:(data:Record<string,unknown>)=>Promise<void>;onCancel:()=>void}){
  const [name,setName]=useState(order.name),[phone,setPhone]=useState(order.phone),[address,setAddress]=useState(order.address),[area,setArea]=useState(order.area);
  const [lines,setLines]=useState<Line[]>(()=>order.items.map(item=>({key:keyFor(),id:item.id,size:item.size,qty:item.qty})));
  const [addId,setAddId]=useState(''),[addSize,setAddSize]=useState(''),[addQty,setAddQty]=useState(1);
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  const [now]=useState(()=>Date.now());

  const product=(id:number)=>products.find(p=>p.id===id);
  const originalQty=(id:number)=>order.items.filter(i=>i.id===id).reduce((n,i)=>n+i.qty,0);
  // Units available to this order: shelf stock plus what the order already holds.
  const available=(id:number)=>(product(id)?.stock??0)+originalQty(id);
  const unitPrice=(line:Pick<Line,'id'|'size'>)=>{
    const original=order.items.find(i=>i.id===line.id&&i.size===line.size)||order.items.find(i=>i.id===line.id);
    if(original)return original.price;const p=product(line.id);return p?productPricing(p,now).unitPrice:0;
  };
  const lineName=(id:number)=>order.items.find(i=>i.id===id)?.name||product(id)?.name||'Unavailable product';
  const totals=useMemo(()=>{
    const subtotal=lines.reduce((n,l)=>n+unitPrice(l)*l.qty,0);
    const delivery=area===order.area?order.delivery:deliveryFees[area];
    return {subtotal,delivery,total:subtotal+delivery};
  },[lines,area]);
  const perProduct=new Map<number,number>();for(const l of lines)perProduct.set(l.id,(perProduct.get(l.id)||0)+l.qty);
  const problems=[...perProduct].filter(([id,qty])=>{const p=product(id);return p?qty>available(id):qty>originalQty(id);});

  const update=(key:string,change:Partial<Line>)=>setLines(list=>list.map(l=>l.key===key?{...l,...change}:l));
  const addable=products.filter(p=>p.stock>0||originalQty(p.id)>0);
  const chosen=addId?product(Number(addId)):undefined;
  const addLine=()=>{if(!chosen||!addSize)return;setLines(list=>{const same=list.find(l=>l.id===chosen.id&&l.size===addSize);return same?list.map(l=>l===same?{...l,qty:Math.min(100,l.qty+addQty)}:l):[...list,{key:keyFor(),id:chosen.id,size:addSize,qty:addQty}];});setAddId('');setAddSize('');setAddQty(1);};

  return <form className="form-modal order-editor" aria-label={'Edit order '+order.id} onChange={()=>{if(error)setError('');}} onClick={event=>{if(error&&(event.target as HTMLElement).closest('button[type=button]'))setError('');}} onSubmit={async event=>{
    event.preventDefault();if(saving||problems.length)return;setSaving(true);setError('');
    try{await onSave({id:order.id,name,phone,address,area,items:lines.map(({id,size,qty})=>({id,size,qty}))});}
    catch(e){setError((e as Error).message);}finally{setSaving(false);}
  }}>
    <div className="form-modal__head"><div><div className="admin-eyebrow">Correct an order</div><h2>Edit order</h2><p className="order-editor__ref"><span className="admin-mono">{order.id}</span><StatusPill status={order.status}/></p></div><button type="button" aria-label="Close order editor" className="a-btn a-btn--icon close" disabled={saving} onClick={onCancel}><Icon name="close"/></button></div>
    <div className="form-modal__body">
      <div className="form-modal__main">
        <section className="form-section"><h3>Customer</h3>
          <label>Full name<input name="name" value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={100} autoComplete="off" autoFocus/></label>
          <label>Mobile number<input name="phone" type="tel" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} required minLength={11} maxLength={20} autoComplete="off" aria-describedby="order-phone-hint"/></label>
          <small id="order-phone-hint" className="order-editor__hint">Bangladesh mobile number, e.g. 01712345678 or +8801712345678. The customer tracks the order with this number.</small>
        </section>
        <section className="form-section"><h3>Delivery</h3>
          <label>Delivery area<select name="area" value={area} onChange={e=>setArea(e.target.value as Order['area'])}><option value="dhaka">Dhaka city — {money(deliveryFees.dhaka)}</option><option value="outside">Outside Dhaka — {money(deliveryFees.outside)}</option></select></label>
          <label>Delivery address<textarea name="address" value={address} onChange={e=>setAddress(e.target.value)} required minLength={10} maxLength={500} rows={4}/></label>
        </section>
      </div>
      <div className="form-modal__side">
        <section className="form-section"><h3>Items</h3>
          <ul className="order-lines">{lines.map(line=>{const p=product(line.id),options=p?productOptions(p):[line.size],over=(perProduct.get(line.id)||0)>(p?available(line.id):originalQty(line.id));
            return <li key={line.key} className={over?'is-over':''}>
              <div className="order-lines__name"><strong>{lineName(line.id)}</strong><small>{money(unitPrice(line))} each{!p?' · product removed':''}</small></div>
              <label className="order-lines__field">Size or style<select value={line.size} disabled={!p} onChange={e=>update(line.key,{size:e.target.value})} aria-label={'Size or style for '+lineName(line.id)}>{options.includes(line.size)?null:<option value={line.size}>{line.size}</option>}{options.map(o=><option key={o}>{o}</option>)}</select></label>
              <div className="order-lines__qty"><span className="order-lines__label">Qty</span><div className="quantity-controls order-stepper" role="group" aria-label={'Quantity for '+lineName(line.id)}>
                <button type="button" aria-label={'Decrease quantity for '+lineName(line.id)} disabled={line.qty<=1} onClick={()=>update(line.key,{qty:line.qty-1})}>−</button>
                <span aria-live="polite">{line.qty}</span>
                <button type="button" aria-label={'Increase quantity for '+lineName(line.id)} disabled={line.qty>=100||!p||(perProduct.get(line.id)||0)>=available(line.id)} onClick={()=>update(line.key,{qty:line.qty+1})}>+</button>
              </div></div>
              <strong className="order-lines__total">{money(unitPrice(line)*line.qty)}</strong>
              <button type="button" className="a-btn a-btn--danger-ghost a-btn--sm order-lines__remove" disabled={lines.length<=1} aria-label={'Remove '+lineName(line.id)+', '+line.size} onClick={()=>setLines(list=>list.filter(l=>l.key!==line.key))}><Icon name="trash"/></button>
              {over&&<p className="order-lines__warn" role="alert">{p?`Only ${available(line.id)} available for ${p.name}.`:'This product was removed; its quantity can only be reduced.'}</p>}
            </li>;})}</ul>
          {lines.length<=1&&<small className="order-editor__hint">An order needs at least one item. To remove everything, set the status to Cancelled instead.</small>}
          <div className="order-add"><h4>Add a product</h4>
            <div className="order-add__row">
              <label>Product<select value={addId} onChange={e=>{setAddId(e.target.value);const p=product(Number(e.target.value));setAddSize(p?productOptions(p)[0]:'');}}><option value="">Choose a product</option>{addable.map(p=><option key={p.id} value={p.id}>{p.name} — {money(productPricing(p,now).unitPrice)} ({available(p.id)-(perProduct.get(p.id)||0)} available)</option>)}</select></label>
              <label>Size or style<select value={addSize} disabled={!chosen} onChange={e=>setAddSize(e.target.value)}>{chosen?productOptions(chosen).map(o=><option key={o}>{o}</option>):<option value="">—</option>}</select></label>
              <label>Qty<input type="number" min={1} max={100} value={addQty} disabled={!chosen} onChange={e=>setAddQty(Math.max(1,Math.min(100,Math.floor(Number(e.target.value))||1)))}/></label>
              <button type="button" className="a-btn a-btn--secondary a-btn--sm" disabled={!chosen||!addSize} onClick={addLine}><Icon name="plus"/>Add</button>
            </div>
          </div>
        </section>
        <section className="form-section order-summary" aria-live="polite"><h3>New total</h3>
          <p><span>Items</span><strong>{money(totals.subtotal)}</strong></p>
          <p><span>Delivery</span><strong>{money(totals.delivery)}</strong></p>
          <p className="order-summary__total"><span>Total to collect</span><strong>{money(totals.total)}</strong></p>
          <small className="order-editor__hint">Was {money(order.total)}. Existing items keep their original price; added products use today&apos;s price. The server recalculates the final total and stock when you save.</small>
        </section>
      </div>
    </div>
    <div className="form-modal__foot">{error&&<p className="form-error" role="alert">{error}</p>}{problems.length>0&&<p className="form-error" role="alert">Reduce the highlighted quantities before saving.</p>}<div className="form-modal__buttons"><button type="button" className="a-btn a-btn--secondary" disabled={saving} onClick={onCancel}>Cancel</button><button className="a-btn a-btn--primary" disabled={saving||problems.length>0}>{saving?'Saving…':'Save changes'}</button></div></div>
  </form>;
}
