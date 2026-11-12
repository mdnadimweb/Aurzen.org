'use client';
import {useState} from 'react';
import {motion,useReducedMotion} from 'motion/react';
import {easePremium,ms} from './motion';
import {percentOf,statusKey} from './metrics';
import CountUp from './count-up';

/** Order status ring. Segments draw in one after another; legend hover/focus highlights a segment. */
export default function StatusDonut({data}:{data:{status:string;count:number}[]}){
  const reduced=useReducedMotion();
  const [hovered,setHovered]=useState<string|null>(null),[pinned,setPinned]=useState<string|null>(null);
  const active=hovered||pinned;
  const total=data.reduce((n,d)=>n+d.count,0);
  const present=data.filter(d=>d.count>0);
  const gap=present.length>1?0.006:0;
  let start=0;
  const segments=present.map((d,i)=>{const length=d.count/total;const segment={...d,start,length:Math.max(0,length-gap),index:i};start+=length;return segment;});
  const summary=total?`Order status: ${present.map(d=>`${d.status} ${d.count} (${percentOf(d.count,total)}%)`).join(', ')}.`:'No orders yet.';
  return <div className="ov-donut">
    <div className="ov-donut__chart">
      <svg viewBox="0 0 120 120" role="img" aria-label={summary}>
        <circle cx="60" cy="60" r="44" className="ov-donut__track"/>
        <g transform="rotate(-90 60 60)">{segments.map(s=><motion.circle key={s.status} cx="60" cy="60" r="44" data-status={statusKey(s.status)} className={'ov-donut__segment'+(active&&active!==s.status?' is-dim':'')+(active===s.status?' is-active':'')}
          initial={{pathLength:0,pathOffset:s.start}} animate={{pathLength:s.length,pathOffset:s.start}} transition={{duration:ms(reduced,600),delay:ms(reduced,250+s.index*120),ease:easePremium}}/>)}</g>
      </svg>
      <div className="ov-donut__center" aria-hidden="true"><strong><CountUp value={total} delay={reduced?0:0.25}/></strong><span>{total===1?'order':'orders'}</span></div>
    </div>
    <ul className="ov-legend">{data.map(d=>{const pct=percentOf(d.count,total);return <li key={d.status}>
      <button type="button" className={'ov-legend__item'+(active===d.status?' is-active':'')} data-status={statusKey(d.status)} aria-pressed={pinned===d.status} disabled={!d.count}
        onMouseEnter={()=>setHovered(d.status)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(d.status)} onBlur={()=>setHovered(null)} onClick={()=>setPinned(p=>p===d.status?null:d.status)}>
        <span className="ov-legend__dot" aria-hidden="true"/><span className="ov-legend__name">{d.status}</span><span className="ov-legend__count">{d.count}</span><span className="ov-legend__pct">{pct}%</span>
      </button></li>;})}</ul>
  </div>;
}
