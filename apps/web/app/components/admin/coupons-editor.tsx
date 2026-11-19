'use client';
import {money,type Category,type Order,type Product} from '@aurzen/shared/catalog';
import type {Coupon} from '@aurzen/shared/site';
import EditableCard,{EditableGroup} from './editable-card';

const blank=():Coupon=>({code:'NEW'+Math.random().toString(36).slice(2,6).toUpperCase(),type:'percent',value:10,minOrder:0,usageLimit:0,perCustomer:1,startsAt:null,endsAt:null,applies:{type:'all',value:''},active:false});
const describe=(c:Coupon)=>(c.type==='percent'?c.value+'% off':c.type==='fixed'?money(c.value)+' off':'Free delivery')+(c.minOrder?' · min '+money(c.minOrder):'')+(c.applies.type==='all'?'':' · '+(c.applies.type==='category'?c.applies.value:'one product'));
function local(value:string|null){return value?new Date(new Date(value).getTime()-new Date(value).getTimezoneOffset()*60000).toISOString().slice(0,16):'';}
/** Studio → Coupons. Usage counts come from orders that used the code (cancelled orders excluded). */
export default function CouponsEditor({coupons,orders,categories,products,onSave}:{coupons:Coupon[];orders:Order[];categories:Category[];products:Product[];onSave:(coupons:Coupon[])=>Promise<void>}){
  const used=(code:string)=>orders.filter(o=>o.coupon===code&&o.status!=='Cancelled');
  return <EditableGroup>
    <p className="hero-slide__hint">Customers enter the code at checkout. Codes are checked on the server and never shown publicly.</p>
    {!coupons.length&&<div className="admin-empty"><h3>No coupons yet.</h3></div>}
    {coupons.map((c,i)=>{const u=used(c.code);return <EditableCard key={c.code+i} title={c.code} summary={describe(c)+` · used ${u.length}${c.usageLimit?'/'+c.usageLimit:''} · ${money(u.reduce((s,o)=>s+(o.discount||0),0))} given`} badge={c.active?{text:'Active',tone:'on'}:{text:'Off',tone:'off'}} initial={c}
      actions={<><button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={()=>void onSave(coupons.map((x,j)=>j===i?{...x,active:!x.active}:x))}>{c.active?'Turn off':'Turn on'}</button><button type="button" className="a-btn a-btn--danger-ghost a-btn--sm" onClick={()=>{if(confirm('Delete coupon '+c.code+'?'))void onSave(coupons.filter((_,j)=>j!==i));}}>Delete</button></>}
      onSave={v=>onSave(coupons.map((x,j)=>j===i?{...v,code:v.code.trim().toUpperCase()}:x))}
      render={(d,set)=><>
        <div className="form-pair"><label>Code<input value={d.code} maxLength={30} onChange={e=>set({...d,code:e.target.value.toUpperCase()})}/></label>
          <label>Type<select value={d.type} onChange={e=>set({...d,type:e.target.value as Coupon['type'],value:e.target.value==='free'?0:d.value||10})}><option value="percent">Percent off</option><option value="fixed">Fixed amount off (৳)</option><option value="free">Free delivery</option></select></label></div>
        <div className="form-pair">{d.type!=='free'&&<label>{d.type==='percent'?'Percent (1–90)':'Amount (৳)'}<input type="number" min={1} value={d.value} onChange={e=>set({...d,value:Math.round(Number(e.target.value)||0)})}/></label>}
          <label>Minimum order (৳)<input type="number" min={0} value={d.minOrder} onChange={e=>set({...d,minOrder:Math.round(Number(e.target.value)||0)})}/></label></div>
        <div className="form-pair"><label>Total uses (0 = unlimited)<input type="number" min={0} value={d.usageLimit} onChange={e=>set({...d,usageLimit:Math.round(Number(e.target.value)||0)})}/></label>
          <label>Uses per customer phone (0 = unlimited)<input type="number" min={0} value={d.perCustomer} onChange={e=>set({...d,perCustomer:Math.round(Number(e.target.value)||0)})}/></label></div>
        <div className="form-pair"><label>Applies to<select value={d.applies.type} onChange={e=>{const type=e.target.value as Coupon['applies']['type'];set({...d,applies:{type,value:type==='category'?categories[0]?.name||'':type==='product'?String(products[0]?.id||''):''}});}}><option value="all">Whole order</option><option value="category">A category</option><option value="product">A product</option></select></label>
          {d.applies.type==='category'&&<label>Category<select value={d.applies.value} onChange={e=>set({...d,applies:{type:'category',value:e.target.value}})}>{categories.map(c=><option key={c.name} value={c.name}>{c.parent?c.parent+' › ':''}{c.name}</option>)}</select></label>}
          {d.applies.type==='product'&&<label>Product<select value={d.applies.value} onChange={e=>set({...d,applies:{type:'product',value:e.target.value}})}>{products.map(p=><option key={p.id} value={String(p.id)}>{p.name}</option>)}</select></label>}</div>
        <div className="form-pair"><label>Start (optional)<input type="datetime-local" value={local(d.startsAt)} onChange={e=>set({...d,startsAt:e.target.value?new Date(e.target.value).toISOString():null})}/></label>
          <label>End (optional)<input type="datetime-local" value={local(d.endsAt)} onChange={e=>set({...d,endsAt:e.target.value?new Date(e.target.value).toISOString():null})}/></label></div>
        <label className="ec-toggle"><input type="checkbox" checked={d.active} onChange={e=>set({...d,active:e.target.checked})}/><span>Active</span></label>
      </>}/>;})}
    <button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>void onSave([...coupons,blank()])}>+ Add coupon</button>
  </EditableGroup>;
}
