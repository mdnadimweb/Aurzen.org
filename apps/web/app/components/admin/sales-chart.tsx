'use client';
import {useState,type KeyboardEvent} from 'react';
import {motion,useReducedMotion} from 'motion/react';
import {money} from '@aurzen/shared/catalog';
import {easePremium,ms} from './motion';
import type {Day} from './metrics';

/** 14-day order value bars (plum, today in gold) with hover/keyboard tooltip and a hidden data table. */
export default function SalesChart({days}:{days:Day[]}){
  const reduced=useReducedMotion();
  const [active,setActive]=useState<number|null>(null);
  const W=700,H=200,slot=W/days.length,bar=Math.min(30,slot*0.56);
  const max=Math.max(...days.map(d=>d.value),1);
  const total=days.reduce((n,d)=>n+d.value,0),best=days.reduce((a,b)=>b.value>a.value?b:a,days[0]);
  const summary=`Order value for the last ${days.length} days: ${money(total)} in total.`+(best&&best.value?` Highest on ${best.label} with ${money(best.value)}.`:'');
  const onKey=(event:KeyboardEvent<HTMLDivElement>)=>{
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();setActive(i=>{const next=(i??days.length)+(event.key==='ArrowRight'?1:-1);return Math.max(0,Math.min(days.length-1,next));});}
    if(event.key==='Escape')setActive(null);
  };
  const shown=active===null?null:days[active];
  return <div className="ov-sales">
    <div className="ov-sales__plot" tabIndex={0} role="group" aria-roledescription="chart" aria-label={summary+' Use left and right arrow keys to read each day.'} onKeyDown={onKey} onBlur={()=>setActive(null)} onMouseLeave={()=>setActive(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {[0.25,0.5,0.75,1].map(f=><line key={f} x1="0" x2={W} y1={H-f*(H-12)} y2={H-f*(H-12)} className="ov-sales__grid"/>)}
        {days.map((d,i)=>{const h=d.value?Math.max(4,d.value/max*(H-12)):2,x=i*slot+(slot-bar)/2;
          return <g key={d.key} onMouseEnter={()=>setActive(i)}>
            <rect x={i*slot} y="0" width={slot} height={H} fill="transparent"/>
            <motion.rect x={x} y={H-h} width={bar} height={h} rx="3" className={'ov-sales__bar'+(d.today?' is-today':'')+(d.value?'':' is-zero')+(active===i?' is-active':'')}
              style={{originY:1}} initial={{scaleY:0}} animate={{scaleY:1}} transition={{duration:ms(reduced,600),delay:ms(reduced,200+i*35),ease:easePremium}}/>
          </g>;})}
      </svg>
      {shown&&<div className={'ov-tooltip'+(active!<2?' ov-tooltip--start':active!>days.length-3?' ov-tooltip--end':'')} style={{left:`${(active!+0.5)/days.length*100}%`}} aria-hidden="true"><strong>{money(shown.value)}</strong><span>{shown.label}{shown.today?' · Today':''} · {shown.orders} order{shown.orders===1?'':'s'}</span></div>}
    </div>
    <p className="sr-only" aria-live="polite">{shown?`${shown.label}${shown.today?', today':''}: ${money(shown.value)}, ${shown.orders} orders`:''}</p>
    <div className="ov-sales__axis" aria-hidden="true">{days.map((d,i)=><span key={d.key} className={i===0||i===days.length-1||i===Math.floor(days.length/2)?'':'is-minor'}>{d.today?'Today':d.label}</span>)}</div>
    <table className="sr-only"><caption>Order value per day, last {days.length} days</caption><thead><tr><th scope="col">Day</th><th scope="col">Order value</th><th scope="col">Orders</th></tr></thead>
      <tbody>{days.map(d=><tr key={d.key}><th scope="row">{d.label}{d.today?' (today)':''}</th><td>{money(d.value)}</td><td>{d.orders}</td></tr>)}</tbody></table>
  </div>;
}
