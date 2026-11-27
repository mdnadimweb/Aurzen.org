'use client';
import {money,type Order,type Product} from '@aurzen/shared/catalog';

const counted=(o:Order)=>o.status!=='Cancelled'&&o.status!=='Returned';
/** Today / 7 / 30 days, pending work, top sellers, low stock and subscribers (Asia/Dhaka days). */
export default function OverviewExtras({orders,products,subscribers,onOrders,onProduct}:{orders:Order[];products:Product[];subscribers:number;onOrders:()=>void;onProduct:(p:Product)=>void}){
  const today=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Dhaka'}));today.setHours(0,0,0,0);
  const offset=new Date().getTime()-new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Dhaka'})).getTime();
  const since=(days:number)=>today.getTime()+offset-(days-1)*86400000;
  const period=(days:number)=>{const list=orders.filter(o=>counted(o)&&Date.parse(o.date)>=since(days));return {count:list.length,revenue:list.reduce((s,o)=>s+o.total,0)};};
  const periods:[string,number][]=[['Today',1],['Last 7 days',7],['Last 30 days',30]];
  const pending=orders.filter(o=>['New','Confirmed','Processing'].includes(o.status)).length;
  const sold=new Map<number,{name:string;qty:number}>();
  for(const o of orders)if(counted(o)&&Date.parse(o.date)>=since(30))for(const i of o.items)sold.set(i.id,{name:i.name,qty:(sold.get(i.id)?.qty||0)+i.qty});
  const top=[...sold.entries()].sort((a,b)=>b[1].qty-a[1].qty).slice(0,5);
  const low=products.filter(p=>p.stock<=5).sort((a,b)=>a.stock-b.stock).slice(0,6);
  return <section className="ov-extras" aria-label="At a glance">
    {periods.map(([label,days])=>{const p=period(days);return <div key={label} className="a-card ov-extras__stat"><small>{label}</small><strong>{p.count} order{p.count===1?'':'s'}</strong><span>{money(p.revenue)}</span></div>;})}
    <button type="button" className="a-card ov-extras__stat ov-extras__pending" onClick={onOrders}><small>Waiting for you</small><strong>{pending} pending</strong><span>New, confirmed or processing ↗</span></button>
    <div className="a-card ov-extras__stat"><small>Subscribers</small><strong>{subscribers}</strong><span>Newsletter list</span></div>
    <div className="ov-extras__lists">
    <div className="a-card ov-extras__list"><h3>Top products · 30 days</h3>{top.length?<ol>{top.map(([id,t])=><li key={id}>{t.name}<b>{t.qty} sold</b></li>)}</ol>:<p>No sales in the last 30 days.</p>}</div>
    <div className="a-card ov-extras__list"><h3>Low stock</h3>{low.length?<ul>{low.map(p=><li key={p.id}><button type="button" className="text-link" onClick={()=>onProduct(p)}>{p.name}</button><b className={p.stock===0?'is-out':''}>{p.stock===0?'Out':p.stock+' left'}</b></li>)}</ul>:<p>Everything is well stocked.</p>}</div>
    </div>
  </section>;
}
