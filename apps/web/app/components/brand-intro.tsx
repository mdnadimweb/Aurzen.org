'use client';

import {useCallback,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';

const sessionKey='aurzen-brand-intro-seen';

export default function BrandIntro({children}:{children:ReactNode}){
  const pathname=usePathname();
  const [visible,setVisible]=useState(()=>pathname!=='/admin'&&!pathname.startsWith('/admin/'));
  const [playing,setPlaying]=useState(false);
  const attempted=useRef(false);
  const content=useRef<HTMLDivElement>(null);
  const overlay=useRef<HTMLDivElement>(null);
  const logo=useRef<HTMLImageElement>(null);
  const dismiss=useCallback(()=>{setVisible(false);setPlaying(false);},[]);

  useLayoutEffect(()=>{
    // The server renders the cover too, so hydration never reveals the page first.
    // Check session preferences before the first hydrated paint.
    if(pathname==='/admin'||pathname.startsWith('/admin/')){dismiss();return;}
    if(attempted.current)return;
    attempted.current=true;
    try{
      if(sessionStorage.getItem(sessionKey)==='1'){dismiss();return;}
      sessionStorage.setItem(sessionKey,'1');
    }catch{/* Restricted storage still permits one introduction per mounted app. */}
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)dismiss();
  },[pathname,dismiss]);
  useLayoutEffect(()=>{
    if(!visible)return;
    const covered=content.current,screen=overlay.current,image=logo.current;
    if(!covered||!screen||!image){dismiss();return;}

    const previousFocus=document.activeElement;
    const previousInert=covered.inert;
    const scrollElements=[document.documentElement,document.body];
    const scrollStyles=scrollElements.map(node=>({
      value:node.style.getPropertyValue('overflow'),priority:node.style.getPropertyPriority('overflow'),
    }));
    covered.inert=true;
    scrollElements.forEach(node=>node.style.setProperty('overflow','hidden'));
    screen.focus({preventScroll:true});

    // Independent of image events, CSS animation events and the normal sequence timer.
    const maximum=window.setTimeout(dismiss,2500);
    let sequence:number|undefined;
    let started=false;
    const start=()=>{
      if(started)return;
      if(!image.naturalWidth){dismiss();return;}
      started=true;
      setPlaying(true);
      sequence=window.setTimeout(dismiss,2300);
    };
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Tab')event.preventDefault();
      if(event.key==='Escape')dismiss();
    };
    const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
    const onPreference=()=>{if(preference.matches)dismiss();};
    image.addEventListener('load',start);
    image.addEventListener('error',dismiss);
    screen.addEventListener('keydown',onKey);
    preference.addEventListener('change',onPreference);
    if(preference.matches)dismiss();
    else if(image.complete)start();

    return()=>{
      window.clearTimeout(maximum);
      window.clearTimeout(sequence);
      image.removeEventListener('load',start);
      image.removeEventListener('error',dismiss);
      screen.removeEventListener('keydown',onKey);
      preference.removeEventListener('change',onPreference);
      covered.inert=previousInert;
      scrollElements.forEach((node,index)=>{
        const saved=scrollStyles[index];
        if(saved.value)node.style.setProperty('overflow',saved.value,saved.priority);
        else node.style.removeProperty('overflow');
      });
      if(previousFocus instanceof HTMLElement&&previousFocus.isConnected&&previousFocus!==document.body){
        previousFocus.focus({preventScroll:true});
      }
    };
  },[visible,dismiss]);

  return <>
    <noscript><style>{'.brand-intro{display:none!important}'}</style></noscript>
    <div ref={content} data-brand-content>{children}</div>
    {visible&&<div
      ref={overlay}
      className={'brand-intro'+(playing?' brand-intro--playing':'')}
      tabIndex={-1}
      role="img"
      aria-label="AURZÉN"
      onAnimationEnd={event=>{if(event.target===event.currentTarget&&event.animationName==='brand-intro-exit')dismiss();}}
    >
      <div className="brand-intro__logo">
        <img ref={logo} src="/aurzen-logo.png" alt="" width={1698} height={926} decoding="async" fetchPriority="high"/>
        <span className="brand-intro__mask" aria-hidden="true"><span className="brand-intro__shine"/></span>
      </div>
    </div>}
  </>;
}
