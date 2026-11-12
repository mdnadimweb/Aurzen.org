'use client';
import {motion,useReducedMotion} from 'motion/react';
import {easePremium,ms} from './motion';
import {percentOf} from './metrics';

export type Part={key:string;label:string;count:number;tone:string};
/** Horizontal stacked bar whose parts grow in from the left, with a counted legend. */
export default function SplitBar({parts,label,unit,delay=300}:{parts:Part[];label:string;unit:[string,string];delay?:number}){
  const reduced=useReducedMotion();
  const total=parts.reduce((n,p)=>n+p.count,0);
  const describe=parts.map(p=>`${p.label} ${p.count} (${percentOf(p.count,total)}%)`).join(', ');
  return <div className="ov-split">
    <div className="ov-split__bar" role="img" aria-label={`${label}: ${total?describe:'none yet'}.`}>
      {total?parts.filter(p=>p.count).map((p,i)=><motion.span key={p.key} className="ov-split__part" data-tone={p.tone} style={{width:`${p.count/total*100}%`,originX:0}}
        initial={{scaleX:0}} animate={{scaleX:1}} transition={{duration:ms(reduced,600),delay:ms(reduced,delay+i*120),ease:easePremium}}/>):null}
    </div>
    <ul className="ov-split__legend">{parts.map(p=><li key={p.key} data-tone={p.tone}><span className="ov-split__dot" aria-hidden="true"/>{p.label}<strong>{p.count}</strong><span className="ov-split__unit">{p.count===1?unit[0]:unit[1]}</span></li>)}</ul>
  </div>;
}
