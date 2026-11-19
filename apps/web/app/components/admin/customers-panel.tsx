'use client';
import {useMemo,useState} from 'react';
import {money,type Order} from '@aurzen/shared/catalog';
import {customerTags,type CustomerInfo} from '@aurzen/shared/site';
import EditableCard,{EditableGroup} from './editable-card';
import {csv,download} from './site-settings';

/** Customers built from orders (grouped by phone), with private notes, tags and an order block. */
export default function CustomersPanel({orders,customers,onSave}:{orders:Order[];customers:Record<string,CustomerInfo>;onSave:(phone:string,info:CustomerInfo)=>Promise<void>}){
  const [query,setQuery]=useState(''),[tag,setTag]=useState('');
  const list=useMemo(()=>Array.from(new Set(orders.map(o=>o.phone))).map(phone=>{
    const own=orders.filter(o=>o.phone===phone).sort((a,b)=>b.date.localeCompare(a.date));
    const spent=own.filter(o=>o.status!=='Cancelled'&&o.status!=='Returned').reduce((s,o)=>s+o.total,0);
    return {phone,name:own[0].name,orders:own,spent,info:customers[phone]||{note:'',tags:[],blocked:false}};
  }).sort((a,b)=>b.spent-a.spent),[orders,customers]);
  const q=query.trim().toLowerCase();
  const shown=list.filter(c=>(!q||(c.name+' '+c.phone).toLowerCase().includes(q))&&(!tag||(tag==='Blocked'?c.info.blocked:c.info.tags.includes(tag))));
  if(!orders.length)return <section className="a-card"><div className="admin-empty"><h3>No customers yet.</h3><p>Customer profiles appear after your first order.</p></div></section>;
  return <EditableGroup>
    <div className="admin-filters">
      <label>Search customers<input type="search" value={query} placeholder="Name or phone" onChange={e=>setQuery(e.target.value)}/></label>
      <label>Tag<select value={tag} onChange={e=>setTag(e.target.value)}><option value="">All customers</option>{customerTags.map(t=><option key={t}>{t}</option>)}<option>Blocked</option></select></label>
      <button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>download(`aurzen-customers-${new Date().toISOString().slice(0,10)}.csv`,csv([['Name','Phone','Orders','Total spent','Last order','Tags','Blocked','Notes'],...shown.map(c=>[c.name,c.phone,c.orders.length,c.spent,c.orders[0].date.slice(0,10),c.info.tags.join(' | '),c.info.blocked?'yes':'',c.info.note])]))}>Export {shown.length} to CSV</button>
    </div>
    {shown.map(c=><EditableCard key={c.phone} title={c.name} summary={`${c.phone} · ${c.orders.length} order${c.orders.length===1?'':'s'} · ${money(c.spent)} spent`} initial={c.info}
      badge={c.info.blocked?{text:'Blocked',tone:'warn'}:c.info.tags.length?{text:c.info.tags.join(', '),tone:c.info.tags.includes('Risky')?'warn':'on'}:undefined}
      onSave={info=>onSave(c.phone,info)}
      render={(d,set)=><>
        <fieldset className="ec-tags"><legend>Tags</legend>{customerTags.map(t=><label key={t} className="ec-toggle"><input type="checkbox" checked={d.tags.includes(t)} onChange={e=>set({...d,tags:e.target.checked?[...d.tags,t]:d.tags.filter(x=>x!==t)})}/><span>{t}</span></label>)}</fieldset>
        <label>Private notes<textarea rows={3} maxLength={1000} value={d.note} onChange={e=>set({...d,note:e.target.value})}/></label>
        <label className="ec-toggle"><input type="checkbox" checked={d.blocked} onChange={e=>set({...d,blocked:e.target.checked})}/><span>Block this phone number from ordering</span></label>
        <h4>Order history</h4>
        <ul className="customer-orders">{c.orders.map(o=><li key={o.id}><span className="admin-mono">{o.id}</span> · {new Date(o.date).toLocaleDateString('en-BD')} · {o.status} · {money(o.total)}</li>)}</ul>
      </>}/>)}
    {!shown.length&&<p className="hero-slide__hint">No customers match.</p>}
  </EditableGroup>;
}
