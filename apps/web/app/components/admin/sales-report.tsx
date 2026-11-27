'use client';
// Sales report: one Asia/Dhaka day at a time, worked out live from the orders already loaded in the studio.
// A sale counts on the day the order was placed. Cancelled and Returned orders are left out of every total
// (and listed on their own), so changing an order's status updates the report straight away, for any day.
import {useMemo,useState} from 'react';
import {money,optionLabel,orderSourceOf,type Order} from '@aurzen/shared/catalog';
import {csv,download} from './site-settings';
import {paymentName} from './order-tools';
import Icon from '../admin-icons';

const DAY=86400000,DHAKA=6*3600000;
/** Calendar day in Bangladesh (UTC+6, no daylight saving) as YYYY-MM-DD. */
export const dhakaDay=(iso:string|number)=>new Date((typeof iso==='number'?iso:Date.parse(iso))+DHAKA).toISOString().slice(0,10);
export const shiftDay=(day:string,days:number)=>new Date(Date.parse(day+'T00:00:00Z')+days*DAY).toISOString().slice(0,10);
export const counted=(o:Pick<Order,'status'>)=>o.status!=='Cancelled'&&o.status!=='Returned';
const time=(iso:string)=>new Date(iso).toLocaleTimeString('en-BD',{timeZone:'Asia/Dhaka',hour:'numeric',minute:'2-digit'});
const longDay=(day:string)=>new Date(day+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
const shortDay=(day:string)=>new Date(day+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
const itemsText=(o:Order)=>o.items.map(i=>`${i.name} (${optionLabel(i)}) ×${i.qty}`).join('; ');

/** Everything the page shows for one day. Exported for tests. */
export function daySummary(orders:Order[],day:string){
  const ofDay=orders.filter(o=>dhakaDay(o.date)===day).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
  const sold=ofDay.filter(counted),lost=ofDay.filter(o=>!counted(o));
  const sum=(list:Order[],f:(o:Order)=>number)=>list.reduce((n,o)=>n+f(o),0);
  const products=new Map<string,{name:string;qty:number;amount:number;sizes:Map<string,number>}>();
  for(const o of sold)for(const i of o.items){
    const key=i.id+'|'+i.name,row=products.get(key)||{name:i.name,qty:0,amount:0,sizes:new Map<string,number>()};
    row.qty+=i.qty;row.amount+=i.price*i.qty;const label=optionLabel(i);row.sizes.set(label,(row.sizes.get(label)||0)+i.qty);products.set(key,row);
  }
  const outside=sold.filter(o=>o.source&&o.source!=='website');
  return {
    orders:ofDay,sold,lost,
    total:sum(sold,o=>o.total),items:sum(sold,o=>o.items.reduce((n,i)=>n+i.qty,0)),
    delivery:sum(sold,o=>o.delivery),discount:sum(sold,o=>o.discount||0),
    website:{count:sold.length-outside.length,total:sum(sold,o=>o.total)-sum(outside,o=>o.total)},outside:{count:outside.length,total:sum(outside,o=>o.total)},
    lostTotal:sum(lost,o=>o.total),
    products:[...products.values()].sort((a,b)=>b.qty-a.qty||b.amount-a.amount),
  };
}

export default function SalesReport({orders,onOpenOrders}:{orders:Order[];onOpenOrders?:()=>void}){
  const today=dhakaDay(Date.now());
  const [day,setDay]=useState(today);
  const report=useMemo(()=>daySummary(orders,day),[orders,day]);
  // The seven days ending on the chosen day, for quick jumps.
  const week=useMemo(()=>Array.from({length:7},(_,i)=>shiftDay(day,i-6)).map(d=>{const list=orders.filter(o=>counted(o)&&dhakaDay(o.date)===d);return {day:d,count:list.length,total:list.reduce((n,o)=>n+o.total,0)};}),[orders,day]);
  const firstDay=orders.length?orders.reduce((min,o)=>{const d=dhakaDay(o.date);return d<min?d:min;},today):today;

  const exportDay=()=>download(`aurzen-sales-${day}.csv`,csv([
    ['Date','Time','Order','Source','Status','Counted in sales','Customer','Phone','Items','Payment','Delivery','Discount','Total'],
    ...report.orders.map(o=>[day,time(o.date),o.id,orderSourceOf(o).label,o.status,counted(o)?'Yes':'No',o.name,o.phone,itemsText(o),paymentName(o),o.delivery,o.discount||0,o.total]),
    [],
    ['Product','Sizes','Quantity','Amount'],
    ...report.products.map(p=>[p.name,[...p.sizes].map(([s,q])=>`${s} ×${q}`).join(', '),p.qty,p.amount]),
    [],
    ['Orders counted',report.sold.length],['Items sold',report.items],['Total sales',report.total],['Delivery charges',report.delivery],['Discounts',report.discount],['Cancelled / returned',report.lostTotal],
  ]));

  return <section className="sales-report" aria-label="Sales report">
    <div className="a-card sales-report__bar">
      <div className="sales-report__day">
        <button type="button" className="a-btn a-btn--icon a-btn--secondary sales-report__prev" aria-label="Previous day" disabled={day<=firstDay} onClick={()=>setDay(d=>shiftDay(d,-1))}><Icon name="chevron"/></button>
        <label className="sales-report__date"><span className="sr-only">Day</span><input type="date" value={day} max={today} onChange={e=>e.target.value&&setDay(e.target.value>today?today:e.target.value)}/></label>
        <button type="button" className="a-btn a-btn--icon a-btn--secondary" aria-label="Next day" disabled={day>=today} onClick={()=>setDay(d=>shiftDay(d,1))}><Icon name="chevron"/></button>
        {day!==today&&<button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>setDay(today)}>Today</button>}
      </div>
      <h2 className="sales-report__title">{day===today?'Today · ':day===shiftDay(today,-1)?'Yesterday · ':''}{longDay(day)}</h2>
      <button type="button" className="a-btn a-btn--secondary a-btn--sm" disabled={!report.orders.length} onClick={exportDay}><Icon name="receipt"/>Download CSV</button>
    </div>

    <nav className="sales-report__week" aria-label="Last 7 days">{week.map(w=><button key={w.day} type="button" className={w.day===day?'is-on':''} aria-current={w.day===day?'date':undefined} onClick={()=>setDay(w.day)}><small>{shortDay(w.day)}</small><strong>{money(w.total)}</strong><span>{w.count} order{w.count===1?'':'s'}</span></button>)}</nav>

    <div className="sales-report__stats">
      <div className="a-card ov-extras__stat"><small>Total sales</small><strong>{money(report.total)}</strong><span>{report.sold.length} order{report.sold.length===1?'':'s'}</span></div>
      <div className="a-card ov-extras__stat"><small>Items sold</small><strong>{report.items}</strong><span>{report.products.length} product{report.products.length===1?'':'s'}</span></div>
      <div className="a-card ov-extras__stat"><small>Delivery charges</small><strong>{money(report.delivery)}</strong><span>Included in total sales</span></div>
      <div className="a-card ov-extras__stat"><small>Discounts given</small><strong>{money(report.discount)}</strong><span>Coupons and manual discounts</span></div>
      <div className="a-card ov-extras__stat"><small>Website / outside</small><strong>{money(report.website.total)} · {money(report.outside.total)}</strong><span>{report.website.count} website · {report.outside.count} outside</span></div>
    </div>

    {!report.orders.length?<div className="a-card admin-empty" role="status"><span className="admin-empty__icon"><Icon name="orders"/></span><h3>No orders on this day</h3><p>Pick another day above.</p></div>:<>
      <section className="a-card a-card--flush sales-report__block" aria-labelledby="sales-orders-title">
        <h3 id="sales-orders-title" className="sales-report__head">Orders <small>{report.sold.length} counted</small></h3>
        {report.sold.length?<div className="admin-table-wrap"><table className="admin-table sales-report__table">
          <thead><tr><th scope="col">Time</th><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Products</th><th scope="col">Status</th><th scope="col" className="admin-num">Amount</th></tr></thead>
          <tbody>{report.sold.map(o=><tr key={o.id}>
            <td data-label="Time"><span>{time(o.date)}</span></td>
            <td data-label="Order"><span className="admin-mono">{o.id}</span><small>{orderSourceOf(o).label} · {paymentName(o)}</small></td>
            <td data-label="Customer"><strong>{o.name}</strong><small>{o.phone}</small></td>
            <td data-label="Products"><ul className="sales-report__items">{o.items.map((i,n)=><li key={n}>{i.name} <span>{optionLabel(i)} ×{i.qty}</span></li>)}</ul></td>
            <td data-label="Status"><span>{o.status}</span></td>
            <td data-label="Amount" className="admin-num"><strong>{money(o.total)}</strong>{(o.delivery>0||!!o.discount)&&<small>{o.delivery>0?'incl. '+money(o.delivery)+' delivery':''}{o.delivery>0&&o.discount?' · ':''}{o.discount?'−'+money(o.discount)+' discount':''}</small>}</td>
          </tr>)}</tbody>
          <tfoot><tr><th scope="row" colSpan={5}>Total sales</th><td className="admin-num"><strong>{money(report.total)}</strong></td></tr></tfoot>
        </table></div>:<p className="sales-report__none">Every order on this day was cancelled or returned.</p>}
      </section>

      {report.products.length>0&&<section className="a-card a-card--flush sales-report__block" aria-labelledby="sales-products-title">
        <h3 id="sales-products-title" className="sales-report__head">Products sold</h3>
        <div className="admin-table-wrap"><table className="admin-table sales-report__table">
          <thead><tr><th scope="col">Product</th><th scope="col">Sizes</th><th scope="col" className="admin-num">Qty</th><th scope="col" className="admin-num">Amount</th></tr></thead>
          <tbody>{report.products.map(p=><tr key={p.name}><td data-label="Product"><strong>{p.name}</strong></td><td data-label="Sizes"><span>{[...p.sizes].map(([s,q])=>`${s} ×${q}`).join(', ')}</span></td><td data-label="Qty" className="admin-num"><span>{p.qty}</span></td><td data-label="Amount" className="admin-num"><span>{money(p.amount)}</span></td></tr>)}</tbody>
          <tfoot><tr><th scope="row" colSpan={2}>Items total (before delivery and discounts)</th><td className="admin-num"><strong>{report.items}</strong></td><td className="admin-num"><strong>{money(report.products.reduce((n,p)=>n+p.amount,0))}</strong></td></tr></tfoot>
        </table></div>
      </section>}

      {report.lost.length>0&&<section className="a-card a-card--flush sales-report__block sales-report__block--lost" aria-labelledby="sales-lost-title">
        <h3 id="sales-lost-title" className="sales-report__head">Cancelled / returned <small>not counted · {money(report.lostTotal)}</small></h3>
        <div className="admin-table-wrap"><table className="admin-table sales-report__table">
          <thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Products</th><th scope="col">Status</th><th scope="col" className="admin-num">Amount</th></tr></thead>
          <tbody>{report.lost.map(o=><tr key={o.id}><td data-label="Order"><span className="admin-mono">{o.id}</span><small>{time(o.date)}</small></td><td data-label="Customer"><strong>{o.name}</strong><small>{o.phone}</small></td><td data-label="Products"><span>{itemsText(o)}</span></td><td data-label="Status"><span>{o.status}</span>{o.cancelReason?<small>{o.cancelReason}</small>:null}</td><td data-label="Amount" className="admin-num"><span>{money(o.total)}</span></td></tr>)}</tbody>
        </table></div>
      </section>}
      {onOpenOrders&&<p className="sales-report__foot">A sale counts on the day the order was placed. Change a status on the <button type="button" className="text-link" onClick={onOpenOrders}>Orders page</button> and this report updates automatically.</p>}
    </>}
  </section>;
}
