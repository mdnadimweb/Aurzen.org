'use client';
// Compact "New Arrivals & Offers" banner. Several active slides slide in automatically
// every few seconds and loop forever (paused on hover/keyboard focus, swipe on touch);
// one slide is a static banner; no active slides hides the section.
import Link from 'next/link';
import {useEffect,useRef,useState,type TouchEvent} from 'react';
import {activePromotions,categoryPath,type Category,type Promotion} from '@aurzen/shared/catalog';
import {useStore} from '../providers';
import {responsiveSrcSet} from './responsive-image';
import {usePageLoaded} from './use-page-loaded';

export function promotionHref(p:Promotion,categories:Category[]){
  if(p.link.type==='sale')return '/sale/';
  if(p.link.type==='product')return '/products/'+encodeURIComponent(p.link.value)+'/';
  return categoryPath(categories,p.link.value);
}

export const autoAdvanceMs=4500;

export default function PromoCarousel(){
  const {promotions,categoryTree,now}=useStore();
  const slides=activePromotions(promotions,now);
  const [index,setIndex]=useState(0),[previous,setPrevious]=useState(-1),[direction,setDirection]=useState<'next'|'back'>('next'),[paused,setPaused]=useState(false),[focused,setFocused]=useState(false);
  const touch=useRef<number|null>(null),pageLoaded=usePageLoaded();
  const count=slides.length,current=Math.min(index,Math.max(0,count-1));
  useEffect(()=>{if(index>=count&&count){setIndex(0);setPrevious(-1);}},[index,count]);
  // Move to another slide; the outgoing one animates away in the same direction.
  const go=(i:number,dir:'next'|'back'='next')=>{setDirection(dir);setPrevious(current);setIndex((i+count)%count);};
  useEffect(()=>{
    if(!pageLoaded||count<2||paused||focused||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const timer=window.setTimeout(()=>{if(document.visibilityState==='visible')go(current+1);},autoAdvanceMs);
    return()=>window.clearTimeout(timer);
  },[current,count,paused,focused,pageLoaded]);
  if(!count)return null;
  const onTouchEnd=(event:TouchEvent)=>{
    const start=touch.current;touch.current=null;
    if(start===null||count<2)return;
    const delta=event.changedTouches[0].clientX-start;
    if(Math.abs(delta)>40)go(current+(delta<0?1:-1),delta<0?'next':'back');
  };
  return <section className="promo-banner" data-direction={direction} onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} aria-label="New arrivals and offers" aria-roledescription={count>1?'carousel':undefined}
    onFocusCapture={e=>{if((e.target as Element).matches(':focus-visible'))setFocused(true);}} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setFocused(false);}}>
    <div className="promo-banner__viewport" onTouchStart={e=>{touch.current=e.touches[0].clientX;}} onTouchEnd={onTouchEnd}>
      {slides.map((slide,i)=>{const active=i===current;return <article key={slide.id} className="promo-slide" data-active={active} data-state={active?(previous<0?'shown':'active'):i===previous?'leaving':undefined} aria-hidden={!active} inert={!active||undefined} aria-roledescription={count>1?'slide':undefined} aria-label={count>1?`${i+1} of ${count}: ${slide.headline}`:undefined}>
        {(active||pageLoaded)&&<picture>{slide.mobileImage&&<source media="(max-width: 640px)" sizes="100vw" srcSet={responsiveSrcSet(slide.mobileImage)||slide.mobileImage}/>}<img src={slide.image} sizes="100vw" srcSet={responsiveSrcSet(slide.image)} alt="" width={1600} height={400} loading={i===0?'eager':'lazy'} decoding="async"/></picture>}
        <div className="promo-slide__copy"><span className="promo-slide__eyebrow">NEW ARRIVALS &amp; OFFERS</span><h2>{slide.headline}</h2><Link className="promo-slide__button" href={promotionHref(slide,categoryTree)}>{slide.cta} <span aria-hidden="true">↗</span></Link></div>
      </article>;})}
    </div>
  </section>;
}
