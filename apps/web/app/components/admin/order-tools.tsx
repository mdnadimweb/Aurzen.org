'use client';
// Extra order tools: internal notes, status timeline, review flags, WhatsApp/SMS messages from
// templates, printable invoices/labels and CSV export of the filtered list.
import {useMemo,useState,type ReactNode} from 'react';
import Icon from '../admin-icons';
import {money,optionLabel,type Order} from '@aurzen/shared/catalog';
import {fillTemplate,orderFlags,whatsappLink,formatWhatsAppNumber,extraMessageTemplates,type CustomerInfo,type SiteSettings} from '@aurzen/shared/site';

const paymentNames:Record<string,string>={cod:'Cash on delivery',bkash:'bKash',nagad:'Nagad',advance:'Advance payment'};
export const paymentName=(o:Order)=>paymentNames[o.paymentMethod||'cod'];
const esc=(s:string)=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));

type Save=(data:Record<string,unknown>)=>Promise<void>;

/** Status dropdown (passed as children) with two icon buttons beside it: delivery details and notes/history.
 *  The chosen panel opens underneath, full width of the cell. */
export function OrderActions({order,orders,site,customer,onSave,onOpen,children}:{order:Order;orders:Order[];site:SiteSettings;customer?:CustomerInfo;onSave:Save;onOpen:()=>void;children:ReactNode}){
  const [open,setOpen]=useState<''|'delivery'|'notes'>('');
  const flags=useMemo(()=>orderFlags(order,orders),[order,orders]);
  const check=flags.length>0||Boolean(customer?.blocked)||Boolean(customer?.tags.includes('Risky'));
  const filled=Boolean(order.courier&&order.trackingReference);
  const toggle=(panel:'delivery'|'notes')=>{setOpen(o=>o===panel?'':panel);if(open!==panel)onOpen();};
  const deliveryLabel='Delivery details: '+(filled?order.courier:'not added');
  const notesLabel='Notes, history & messages'+(check?' (needs a check)':'')+(order.notes?' (has a note)':'');
  return <div className="order-actions">
    <div className="order-actions__row">
      {children}
      <button type="button" className={'order-icon'+(open==='delivery'?' is-open':'')} aria-expanded={open==='delivery'} aria-label={deliveryLabel} title={deliveryLabel} onClick={()=>toggle('delivery')}><Icon name="truck"/>{filled&&<span className="order-icon__dot order-icon__dot--ok" aria-hidden="true"/>}</button>
      <button type="button" className={'order-icon'+(open==='notes'?' is-open':'')} aria-expanded={open==='notes'} aria-label={notesLabel} title={check?flags.join('\n')||notesLabel:notesLabel} onClick={()=>toggle('notes')}><Icon name="notes"/>{check?<span className="order-icon__dot order-icon__dot--alert" aria-hidden="true"/>:order.notes?<span className="order-icon__dot" aria-hidden="true"/>:null}</button>
    </div>
    {open==='delivery'&&<DeliveryForm key={(order.courier||'')+'-'+(order.trackingReference||'')} order={order} onSave={onSave}/>}
    {open==='notes'&&<OrderTools key={order.notes||''} order={order} flags={flags} site={site} customer={customer} onSave={onSave}/>}
  </div>;
}

function DeliveryForm({order,onSave}:{order:Order;onSave:Save}){
  const [saving,setSaving]=useState(false);
  return <form className="admin-delivery-form order-panel" onSubmit={async e=>{e.preventDefault();if(saving)return;const data=new FormData(e.currentTarget);setSaving(true);try{await onSave({action:'delivery',id:order.id,courier:data.get('courier'),trackingReference:data.get('trackingReference')});}finally{setSaving(false);}}}>
    <label>Courier<input name="courier" list="courier-names" defaultValue={order.courier||''} maxLength={80} disabled={saving} placeholder="Pathao, Steadfast, RedX…"/><datalist id="courier-names"><option value="Pathao"/><option value="Steadfast"/><option value="RedX"/><option value="Paperfly"/><option value="eCourier"/></datalist></label>
    <label>Tracking reference<input name="trackingReference" defaultValue={order.trackingReference||''} maxLength={120} disabled={saving} placeholder="Real courier reference"/></label>
    <small>Enter both fields to show delivery details to the customer. Clear both to remove them.</small>
    <button className="a-btn a-btn--primary a-btn--sm" disabled={saving}>{saving?'Saving delivery…':'Save delivery details'}</button>
  </form>;
}

function OrderTools({order,flags,site,customer,onSave}:{order:Order;flags:string[];site:SiteSettings;customer?:CustomerInfo;onSave:Save}){
  const [notes,setNotes]=useState(order.notes||''),[busy,setBusy]=useState(false);
  const values={order_id:order.id,name:order.name,total:money(order.total),status:order.status,courier:order.courier||'our courier',tracking:order.trackingReference||'—'};
  // Saved templates plus "Ask for details" (default text when not customised); this order's status first.
  const templates:Record<string,string>={...extraMessageTemplates,...site.messages};
  const names=[...(templates[order.status]?[order.status]:[]),...Object.keys(templates).filter(k=>k!==order.status&&templates[k])];
  const [chosen,setChosen]=useState(names[0]||'');
  const [message,setMessage]=useState(chosen?fillTemplate(templates[chosen],values):'');
  const template=site.messages[order.status];
  const customerWa=whatsappLink(formatWhatsAppNumber(order.phone),message);
  return <div className="order-tools order-panel">
    <div className="order-tools__body">
      {flags.map(f=><p key={f} className="order-flag-text">⚑ {f}</p>)}
      {customer?.blocked&&<p className="order-flag-text">⚑ This phone number is blocked from ordering.</p>}
      {customer?.tags.length?<p className="hero-slide__hint">Customer tags: {customer.tags.join(', ')}</p>:null}
      <p className="hero-slide__hint">Payment: {paymentName(order)}{order.email?' · '+order.email:''}</p>
      {order.note&&<p><strong>Customer note:</strong> {order.note}</p>}
      {order.gift&&<p><strong>🎁 Gift:</strong> {order.gift.wrap?"Gift wrap ("+money(order.gift.price)+")":""}{order.gift.wrap&&order.gift.message?" · ":""}{order.gift.message?"Card: “"+order.gift.message+"”":""}</p>}
      {order.cancelReason&&<p><strong>Cancel reason:</strong> {order.cancelReason}</p>}
      <ol className="order-timeline">{(order.history?.length?order.history:[{status:'New',date:order.date}]).map((h,i)=><li key={i}><strong>{h.status}</strong> <small>{new Date(h.date).toLocaleString('en-BD')}</small></li>)}</ol>
      {names.length>0&&<div className="form-pair"><label>Message template<select value={chosen} onChange={e=>{setChosen(e.target.value);setMessage(fillTemplate(templates[e.target.value],values));}}>{names.map(n=><option key={n} value={n}>{n}</option>)}</select></label>
        <label>Message to the customer (edit before sending)<textarea rows={3} maxLength={1000} value={message} onChange={e=>setMessage(e.target.value)}/></label></div>}
      <label>Internal notes (only you see these)<textarea rows={3} maxLength={2000} value={notes} disabled={busy} onChange={e=>setNotes(e.target.value)}/></label>
      <div className="order-tools__actions">
        <button type="button" className="a-btn a-btn--secondary a-btn--sm" disabled={busy||notes===(order.notes||'')} onClick={async()=>{setBusy(true);try{await onSave({action:'orderNotes',id:order.id,notes});}finally{setBusy(false);}}}>Save notes</button>
        {customerWa?<a className="a-btn a-btn--secondary a-btn--sm" href={customerWa} target="_blank" rel="noopener noreferrer" aria-label={'WhatsApp '+order.name}>WhatsApp customer</a>:<span className="hero-slide__hint">No valid WhatsApp number for {order.phone}.</span>}
        {message.trim()&&<a className="a-btn a-btn--ghost a-btn--sm" href={'sms:'+order.phone+'?body='+encodeURIComponent(message)}>SMS</a>}
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={()=>printOrders([order],site,'invoice')}>Print invoice</button>
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={()=>printOrders([order],site,'label')}>Print label</button>
      </div>
      {!template&&<p className="hero-slide__hint">No message template for “{order.status}”. Add one in Settings → Order messages.</p>}
    </div>
  </div>;
}

/** Opens a print-friendly page: A4 invoices or compact shipping labels, one per order. */
export function printOrders(list:Order[],site:SiteSettings,kind:'invoice'|'label'){
  const g=site.general;
  const contact=[g.phone,g.whatsapp&&'WhatsApp '+g.whatsapp,g.email].filter(Boolean).join(' · ');
  const page=(o:Order)=>kind==='label'
    ?`<section class="label"><h2>${esc(g.brand)}</h2><p><b>To:</b> ${esc(o.name)}<br>${esc(o.phone)}<br>${esc(o.address)}</p><p><b>Order:</b> ${esc(o.id)} · ${o.items.reduce((s,i)=>s+i.qty,0)} item(s)<br><b>${o.paymentMethod&&o.paymentMethod!=='cod'?'Paid / check payment':'Collect (COD): '+esc(money(o.total))}</b></p>${o.courier?`<p>${esc(o.courier)} · ${esc(o.trackingReference||'')}</p>`:''}<p class="small">From: ${esc(g.brand)}${contact?' · '+esc(contact):''}</p></section>`
    :`<section class="invoice"><header><h1>${esc(g.brand)}</h1><div>${esc(contact)}${g.address?'<br>'+esc(g.address).replace(/\n/g,'<br>'):''}</div></header><h2>Invoice ${esc(o.id)}</h2><p>${new Date(o.date).toLocaleDateString('en-BD')} · ${esc(o.status)} · ${esc(paymentName(o))}</p><p><b>${esc(o.name)}</b><br>${esc(o.phone)}<br>${esc(o.address)}</p><table><thead><tr><th>Item</th><th>Option</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${o.items.map(i=>`<tr><td>${esc(i.name)}</td><td>${esc(optionLabel(i))}</td><td>${i.qty}</td><td>${esc(money(i.price))}</td><td>${esc(money(i.price*i.qty))}</td></tr>`).join('')}</tbody><tfoot>${o.discount?`<tr><td colspan="4">Discount (${esc(o.coupon||"")})</td><td>−${esc(money(o.discount))}</td></tr>`:""}${o.gift?.wrap?`<tr><td colspan="4">Gift wrap</td><td>${esc(money(o.gift.price))}</td></tr>`:""}<tr><td colspan="4">Delivery</td><td>${esc(money(o.delivery))}</td></tr><tr><td colspan="4"><b>Total</b></td><td><b>${esc(money(o.total))}</b></td></tr></tfoot></table>${o.note?`<p><b>Note:</b> ${esc(o.note)}</p>`:''}${o.gift?.message?`<p><b>Gift card message:</b> ${esc(o.gift.message)}</p>`:""}<p class="small">Thank you for shopping with ${esc(g.brand)}.</p></section>`;
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${kind==='label'?'Labels':'Invoices'} · ${esc(g.brand)}</title><style>
body{font-family:Arial,sans-serif;color:#222;margin:0}section{page-break-after:always;padding:24px}section:last-child{page-break-after:auto}
.invoice header{display:flex;justify-content:space-between;border-bottom:2px solid #5b2a63;padding-bottom:10px}.invoice h1{margin:0;color:#5b2a63}
table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}
.label{width:100mm;min-height:70mm;border:1px dashed #999;margin:10px;padding:14px;box-sizing:border-box;page-break-inside:avoid}.label h2{margin:0 0 8px}.small{font-size:12px;color:#666}
</style></head><body>${list.map(page).join('')}</body></html>`;
  const w=window.open('','_blank');
  if(!w){alert('Allow pop-ups for the studio to print.');return;}
  // The new page inherits the studio's security policy, so printing is started from here.
  w.document.open();w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),300);
}
