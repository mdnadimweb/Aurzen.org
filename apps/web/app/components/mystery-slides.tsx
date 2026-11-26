'use client';
// Homepage mystery box section: the owner's photos shown in turn (cross-fade with a slow zoom).
// Pauses while hovered or focused and when the tab is hidden; reduced motion turns off fade and zoom.
import {useEffect,useState} from 'react';

export default function MysterySlides({images,interval,label}:{images:string[];interval:number;label:string}){
  const [index,setIndex]=useState(0),[paused,setPaused]=useState(false),[hidden,setHidden]=useState(false);
  const count=images.length,ms=Math.min(30,Math.max(2,interval||5))*1000;
  useEffect(()=>{setIndex(i=>i<count?i:0);},[count]);
  useEffect(()=>{const update=()=>setHidden(document.hidden);update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
  // One timer per photo, so a photo picked with the dots also gets its full time.
  useEffect(()=>{
    if(count<2||paused||hidden)return;
    const timer=window.setTimeout(()=>setIndex(i=>(i+1)%count),ms);
    return()=>window.clearTimeout(timer);
  },[count,ms,paused,hidden,index]);
  return <div className="boxart mystery-slides" style={{'--mystery-ms':ms+'ms'} as React.CSSProperties}
    onPointerEnter={()=>setPaused(true)} onPointerLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={()=>setPaused(false)}>
    {images.map((src,i)=><img key={src+i} src={src} alt={i===index?label:''} aria-hidden={i!==index} className={i===index?'is-active':undefined}
      loading={i===0?'eager':'lazy'} decoding="async"/>)}
    {count>1&&<div className="mystery-slides__dots" aria-label="Choose a photo">{images.map((_,i)=><button key={i} type="button" aria-label={'Show photo '+(i+1)} aria-current={i===index||undefined} onClick={()=>setIndex(i)}/>)}</div>}
  </div>;
}
