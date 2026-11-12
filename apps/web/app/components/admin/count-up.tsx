'use client';
import {useEffect,useState} from 'react';
import {animate,useReducedMotion} from 'motion/react';
import {easePremium} from './motion';

/** Counts from the previous value to `value` (~800ms). Screen readers get the final text separately. */
export default function CountUp({value,format=String,delay=0}:{value:number;format?:(n:number)=>string;delay?:number}){
  const reduced=useReducedMotion();
  const [shown,setShown]=useState(reduced?value:0);
  useEffect(()=>{
    if(reduced){setShown(value);return;}
    const controls=animate(0,value,{duration:0.8,delay,ease:easePremium,onUpdate:latest=>setShown(latest)});
    return()=>controls.stop();
  },[value,reduced,delay]);
  return <span aria-hidden="true">{format(Math.round(shown))}</span>;
}
