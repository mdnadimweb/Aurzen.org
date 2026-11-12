'use client';
import {motion,useReducedMotion} from 'motion/react';
import {easePremium,ms} from './motion';

/** Tiny decorative 14-day line that draws in. Values are described in the card's text. */
export default function Sparkline({values,delay=0}:{values:number[];delay?:number}){
  const reduced=useReducedMotion();
  const w=96,h=28,max=Math.max(...values,0);
  const points=values.map((v,i)=>[values.length>1?i/(values.length-1)*w:w/2,max?h-2-(v/max)*(h-6):h-3] as const);
  const line=points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)).join(' ');
  const area=line+` L${w} ${h} L0 ${h} Z`;
  const last=points[points.length-1];
  return <svg className="ov-spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" focusable="false">
    <motion.path d={area} className="ov-spark__area" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:ms(reduced,600),delay:ms(reduced,delay+400)}}/>
    <motion.path d={line} className="ov-spark__line" fill="none" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:ms(reduced,800),delay:ms(reduced,delay),ease:easePremium}}/>
    {last&&<motion.circle cx={last[0]} cy={last[1]} r="2.5" className="ov-spark__dot" initial={{scale:0}} animate={{scale:1}} transition={{duration:ms(reduced,300),delay:ms(reduced,delay+800)}}/>}
  </svg>;
}
