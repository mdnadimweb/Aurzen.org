'use client';
import {useState} from 'react';
import {siteSections,type Content,type SiteSettings} from '@aurzen/shared/site';
import type {Category,Order,Product} from '@aurzen/shared/catalog';
import {csv,download} from './site-settings';

/** Download copies of the shop's data, and restore settings from a saved settings file. */
export default function Backup({products,categories,orders,site,content,onImport}:{products:Product[];categories:Category[];orders:Order[];site:SiteSettings;content:Content;onImport:(value:Partial<SiteSettings>)=>Promise<void>}){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const day=new Date().toISOString().slice(0,10);
  const customers=Array.from(new Set(orders.map(o=>o.phone))).map(phone=>{const list=orders.filter(o=>o.phone===phone);return [list[0].name,phone,list.length,list.reduce((s,o)=>s+o.total,0),list[list.length-1].date.slice(0,10)];});
  const items:[string,()=>void][]=[
    ['Products (CSV)',()=>download(`aurzen-products-${day}.csv`,csv([['ID','Name','Category','Price','Stock','Label','Sizes','Colours','Image'],...products.map(p=>[p.id,p.name,p.category,p.price,p.stock,p.tag,(p.sizes||[]).join(' | '),(p.colors||[]).join(' | '),p.image])]))],
    ['Categories (CSV)',()=>download(`aurzen-categories-${day}.csv`,csv([['Name','Parent','Address'],...categories.map(c=>[c.name,c.parent||'',c.slug])]))],
    ['Orders (CSV)',()=>download(`aurzen-orders-${day}.csv`,csv([['Order','Date','Status','Name','Phone','Address','Area','Items','Delivery','Total','Payment','Courier','Tracking'],...orders.map(o=>[o.id,o.date,o.status,o.name,o.phone,o.address,o.area,o.items.map(i=>`${i.name} (${i.size}${i.color?' · '+i.color:''}) ×${i.qty}`).join('; '),o.delivery,o.total,o.paymentMethod||'cod',o.courier||'',o.trackingReference||''])]))],
    ['Customers (CSV)',()=>download(`aurzen-customers-${day}.csv`,csv([['Name','Phone','Orders','Total spent','First order'],...customers]))],
    ['Settings & content (JSON)',()=>download(`aurzen-settings-${day}.json`,JSON.stringify({site,content},null,2),'application/json')],
  ];
  async function restore(file:File){
    setError('');setBusy(true);
    try{
      const data=JSON.parse(await file.text());
      const value=data?.site&&typeof data.site==='object'?data.site:data;
      const sections=Object.fromEntries(Object.entries(value).filter(([k])=>siteSections.includes(k as keyof SiteSettings)));
      if(!Object.keys(sections).length)throw new Error('This file has no AURZÉN settings.');
      if(!confirm(`Replace ${Object.keys(sections).length} settings sections with the ones in this file?`))return;
      await onImport(sections as Partial<SiteSettings>);
    }catch(e){setError(e instanceof SyntaxError?'This is not a valid settings file.':(e as Error).message);}
    finally{setBusy(false);}
  }
  return <section className="a-card p-5">
    <h2 className="mt-0">Backup & export</h2>
    <p className="hero-slide__hint">Downloads stay on this device. Keep them private: orders and customers contain phone numbers and addresses.</p>
    <div className="backup-grid">{items.map(([label,run])=><button key={label} type="button" className="a-btn a-btn--secondary" onClick={run}>Download {label}</button>)}</div>
    <h3>Restore settings</h3>
    <p className="hero-slide__hint">Choose a settings file downloaded above. Only storefront settings are restored (not products, orders or pages).</p>
    <input type="file" accept="application/json,.json" disabled={busy} onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)void restore(file);}}/>
    {busy&&<p role="status">Restoring…</p>}{error&&<p className="form-error" role="alert">{error}</p>}
  </section>;
}
