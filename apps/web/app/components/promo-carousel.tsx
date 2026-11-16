'use client';
// Compact "New Arrivals & Offers" banner. Several active slides rotate with a short
// fade; one slide is a static banner; no active slides hides the section.
import Link from 'next/link';
import {useEffect,useRef,useState,type TouchEvent} from 'react';
import {activePromotions,categoryPath,type Category,type Promotion} from '@aurzen/shared/catalog';
import {useStore} from '../providers';

export function promotionHref(p:Promotion,categories:Category[]){
  if(p.link.type==='sale')return '/sale/';
  if(p.link.type==='product')return '/products/'+encodeURIComponent(p.link.value)+'/';
  return categoryPath(categories,p.link.value);
}

export default function PromoCarousel(){
  const {promotions,categoryTree,now}=useStore();
  const slides=activePromotions(promotions,now);
  const [index,setIndex]=useState(0),[paused,setPaused]=useState(false),[focused,setFocused]=useState(false);
  const touch=useRef<number|null>(null);
  const count=slides.length,current=Math.min(index,Math.max(0,count-1));
  useEffect(()=>{if(index>=count&&count)setIndex(0);},[index,count]);
  useEffect(()=>{
    if(count<2||paused||focused||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const timer=window.setTimeout(()=>{if(document.visibilityState==='visible')setIndex(i=>(i+1)%count);},6000);
    return()=>window.clearTimeout(timer);
  },[current,count,paused,focused]);
  if(!count)return null;
  const go=(i:number)=>setIndex((i+count)%count);
  const onTouchEnd=(event:TouchEvent)=>{
    const start=touch.current;touch.current=null;
    if(start===null||count<2)return;
    const delta=event.changedTouches[0].clientX-start;
    if(Math.abs(delta)>40)go(current+(delta<0?1:-1));
  };
  return <section className="promo-banner" aria-label="New arrivals and offers" aria-roledescription={count>1?'carousel':undefined}
    onFocusCapture={e=>{if((e.target as Element).matches(':focus-visible'))setFocused(true);}} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setFocused(false);}}>
    <div className="promo-banner__viewport" onTouchStart={e=>{touch.current=e.touches[0].clientX;}} onTouchEnd={onTouchEnd}>
      {slides.map((slide,i)=>{const active=i===current;return <article key={slide.id} className="promo-slide" data-active={active} aria-hidden={!active} inert={!active||undefined} aria-roledescription={count>1?'slide':undefined} aria-label={count>1?`${i+1} of ${count}: ${slide.headline}`:undefined}>
        <picture>{slide.mobileImage&&<source media="(max-width: 640px)" srcSet={slide.mobileImage}/>}<img src={slide.image} alt="" loading={i===0?'eager':'lazy'} decoding="async"/></picture>
        <div className="promo-slide__copy"><span className="promo-slide__eyebrow">NEW ARRIVALS &amp; OFFERS</span><h2>{slide.headline}</h2><Link className="promo-slide__button" href={promotionHref(slide,categoryTree)}>{slide.cta} <span aria-hidden="true">↗</span></Link></div>
      </article>;})}
    </div>
    {count>1&&<div className="promo-banner__controls" role="group" aria-label="Banner controls">
      <button type="button" aria-label="Previous offer" onClick={()=>go(current-1)}>←</button>
      <span className="promo-banner__index" aria-live="polite">{current+1} / {count}</span>
      <button type="button" aria-label="Next offer" onClick={()=>go(current+1)}>→</button>
      <button type="button" aria-label={paused?'Play offers':'Pause offers'} aria-pressed={paused} onClick={()=>setPaused(p=>!p)}>{paused?'▶':'Ⅱ'}</button>
    </div>}
  </section>;
}
