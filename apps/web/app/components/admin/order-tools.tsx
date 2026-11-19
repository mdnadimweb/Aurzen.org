'use client';
// Extra order tools: internal notes, status timeline, review flags, WhatsApp/SMS messages from
// templates, printable invoices/labels, bulk status changes and CSV export of the filtered list.
import {useMemo,useState} from 'react';
import {money,optionLabel,statusOptions,statuses,type Order} from '@aurzen/shared/catalog';
import {fillTemplate,orderFlags,whatsappLink,type CustomerInfo,type SiteSettings} from '@aurzen/shared/site';
import {csv,download} from './site-settings';

const paymentNames:Record<string,string>={cod:'Cash on delivery',bkash:'bKash',nagad:'Nagad',advance:'Advance payment'};
export const paymentName=(o:Order)=>paymentNames[o.paymentMethod||'cod'];
const intlPhone=(phone:string)=>'88'+phone.replace(/\D/g,'').replace(/^88/,'');
const esc=(s:string)=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));

export function OrderTools({order,orders,site,customer,onSave}:{order:Order;orders:Order[];site:SiteSettings;customer?:CustomerInfo;onSave:(data:Record<string,unknown>)=>Promise<void>}){
  const [notes,setNotes]=useState(order.notes||''),[busy,setBusy]=useState(false);
  const flags=useMemo(()=>orderFlags(order,orders),[order,orders]);
  const values={order_id:order.id,name:order.name,total:money(order.total),status:order.status,courier:order.courier||'our courier',tracking:order.trackingReference||'—'};
  const template=site.messages[order.status];
  const message=template?fillTemplate(template,values):'';
  return <details className="admin-delivery order-tools">
    <summary><span>Notes, history & messages</span>{(flags.length>0||customer?.blocked||customer?.tags.includes('Risky'))&&<span className="order-flag" title={flags.join('\n')}>⚑ Check</span>}{order.notes&&<span className="admin-delivery__state">Note</span>}</summary>
    <div className="order-tools__body">
      {flags.map(f=><p key={f} className="order-flag-text">⚑ {f}</p>)}
      {customer?.blocked&&<p className="order-flag-text">⚑ This phone number is blocked from ordering.</p>}
      {customer?.tags.length?<p className="hero-slide__hint">Customer tags: {customer.tags.join(', ')}</p>:null}
      <p className="hero-slide__hint">Payment: {paymentName(order)}{order.email?' · '+order.email:''}</p>
      {order.note&&<p><strong>Customer note:</strong> {order.note}</p>}
      {order.gift&&<p><strong>🎁 Gift:</strong> {order.gift.wrap?"Gift wrap ("+money(order.gift.price)+")":""}{order.gift.wrap&&order.gift.message?" · ":""}{order.gift.message?"Card: “"+order.gift.message+"”":""}</p>}
      {order.cancelReason&&<p><strong>Cancel reason:</strong> {order.cancelReason}</p>}
      <ol className="order-timeline">{(order.history?.length?order.history:[{status:'New',date:order.date}]).map((h,i)=><li key={i}><strong>{h.status}</strong> <small>{new Date(h.date).toLocaleString('en-BD')}</small></li>)}</ol>
      <label>Internal notes (only you see these)<textarea rows={3} maxLength={2000} value={notes} disabled={busy} onChange={e=>setNotes(e.target.value)}/></label>
      <div className="order-tools__actions">
        <button type="button" className="a-btn a-btn--secondary a-btn--sm" disabled={busy||notes===(order.notes||'')} onClick={async()=>{setBusy(true);try{await onSave({action:'orderNotes',id:order.id,notes});}finally{setBusy(false);}}}>Save notes</button>
        {message&&<a className="a-btn a-btn--secondary a-btn--sm" href={whatsappLink(intlPhone(order.phone),message)} target="_blank" rel="noopener noreferrer">WhatsApp “{order.status}” message</a>}
        {message&&<a className="a-btn a-btn--ghost a-btn--sm" href={'sms:'+order.phone+'?body='+encodeURIComponent(message)}>SMS</a>}
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={()=>printOrders([order],site,'invoice')}>Print invoice</button>
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={()=>printOrders([order],site,'label')}>Print label</button>
      </div>
      {!template&&<p className="hero-slide__hint">No message template for “{order.status}”. Add one in Settings → Order messages.</p>}
    </div>
  </details>;
}

/** Bulk status change, print and CSV export for the selected / filtered orders. */
export function OrderBulkBar({selected,filtered,site,onBulk,onClear}:{selected:Order[];filtered:Order[];site:SiteSettings;onBulk:(status:string,reason:string)=>Promise<void>;onClear:()=>void}){
  const [status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  // Only statuses every selected order may move to.
  const allowed=statuses.filter(s=>selected.length>0&&selected.every(o=>o.status!==s&&statusOptions(o.status).includes(s)));
  return <div className="order-bulk" role="region" aria-label="Bulk actions">
    <span>{selected.length?selected.length+' selected':'Select orders for bulk actions'}</span>
    <label className="sr-only" htmlFor="bulk-status">New status</label>
    <select id="bulk-status" value={status} disabled={!selected.length||busy} onChange={e=>setStatus(e.target.value)}><option value="">Change status to…</option>{allowed.map(s=><option key={s}>{s}</option>)}</select>
    <button type="button" className="a-btn a-btn--primary a-btn--sm" disabled={!status||busy} onClick={async()=>{
      const reason=status==='Cancelled'?prompt('Reason for cancelling (optional)'):'';if(reason===null)return;
      if(!confirm(`Change ${selected.length} order${selected.length===1?'':'s'} to ${status}?`))return;
      setBusy(true);try{await onBulk(status,reason);setStatus('');onClear();}finally{setBusy(false);}}}>{busy?'Updating…':'Apply'}</button>
    <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={!selected.length} onClick={()=>printOrders(selected,site,'invoice')}>Print invoices</button>
    <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={!selected.length} onClick={()=>printOrders(selected,site,'label')}>Print labels</button>
    <button type="button" className="a-btn a-btn--secondary a-btn--sm" disabled={!filtered.length} onClick={()=>download(`aurzen-orders-${new Date().toISOString().slice(0,10)}.csv`,csv([['Order','Date','Status','Name','Phone','Address','Area','Items','Subtotal','Delivery','Total','Payment','Courier','Tracking','Customer note','Internal notes'],...filtered.map(o=>[o.id,o.date,o.status,o.name,o.phone,o.address,o.area,o.items.map(i=>`${i.name} (${optionLabel(i)}) ×${i.qty}`).join('; '),o.total-o.delivery,o.delivery,o.total,paymentName(o),o.courier||'',o.trackingReference||'',o.note||'',o.notes||''])]))}>Export {filtered.length} to CSV</button>
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
