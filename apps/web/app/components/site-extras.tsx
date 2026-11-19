'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {linkHref,popupActive,whatsappLink} from '@aurzen/shared/site';
import {useStore} from '../providers';

type Tracker=((...args:unknown[])=>void)&{queue?:unknown[];loaded?:boolean;version?:string;callMethod?:(...args:unknown[])=>void;push?:unknown};
declare global{interface Window{fbq?:Tracker;_fbq?:Tracker;dataLayer?:unknown[];gtag?:(...args:unknown[])=>void}}

/** Fires a standard Meta Pixel event when the owner has set a Pixel ID (no-op otherwise). */
export function trackEvent(name:'ViewContent'|'AddToCart'|'InitiateCheckout'|'Purchase',data?:Record<string,unknown>){
  try{window.fbq?.('track',name,data);}catch{}
}
function loadScript(src:string){const s=document.createElement('script');s.async=true;s.src=src;document.head.appendChild(s);}

/** Chat buttons, welcome popup and analytics, all driven by Studio settings.
 *  Scripts load only when an ID is set, and only after the page has finished loading. */
export default function SiteExtras(){
  const {site,categoryTree,now}=useStore();
  const pathname=usePathname()||'/';
  const {pixel,analytics,whatsapp,messenger}=site.integrations;
  const storefront=!pathname.startsWith('/admin');
  useEffect(()=>{
    if(!storefront||(!pixel&&!analytics))return;
    const start=()=>{
      if(pixel&&!window.fbq){
        const fbq:Tracker=function(...args:unknown[]){fbq.callMethod?fbq.callMethod(...args):fbq.queue!.push(args);} as Tracker;
        fbq.queue=[];fbq.loaded=true;fbq.version='2.0';fbq.push=fbq;window.fbq=fbq;window._fbq=fbq;
        loadScript('https://connect.facebook.net/en_US/fbevents.js');
        fbq('init',pixel);
      }
      if(analytics&&!window.gtag){
        window.dataLayer=window.dataLayer||[];
        window.gtag=function(...args:unknown[]){window.dataLayer!.push(args);};
        window.gtag('js',new Date());window.gtag('config',analytics);
        loadScript('https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(analytics));
      }
    };
    if(document.readyState==='complete')start();else{window.addEventListener('load',start,{once:true});return()=>window.removeEventListener('load',start);}
  },[pixel,analytics,storefront]);
  useEffect(()=>{if(storefront)try{window.fbq?.('track','PageView');}catch{}},[pathname,storefront]);
  if(!storefront)return null;
  return <>
    {(whatsapp.enabled||messenger.enabled)&&<div className={'chat-buttons chat-buttons--'+whatsapp.position}>
      {whatsapp.enabled&&<a data-kind="whatsapp" href={whatsappLink(whatsapp.number,whatsapp.message)} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp"><svg aria-hidden="true" viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z"/></svg></a>}
      {messenger.enabled&&<a data-kind="messenger" href={messenger.link} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on Messenger"><svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.4 2 2 6.1 2 11.6c0 2.9 1.2 5.4 3.2 7.1V22l3-1.7c.9.3 1.8.4 2.8.4 5.6 0 10-4.1 10-9.6S17.6 2 12 2Zm1 12.9-2.5-2.7-5 2.7 5.5-5.8 2.6 2.7 4.9-2.7-5.5 5.8Z"/></svg></a>}
    </div>}
    {popupActive(site,now||Date.now())&&<Popup key={site.popup.title} site={site} href={site.popup.link?linkHref(site.popup.link,categoryTree):''}/>}
  </>;
}
function Popup({site,href}:{site:ReturnType<typeof useStore>['site'];href:string}){
  const p=site.popup,key='aurzen-popup-seen';
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    try{const seen=Number(localStorage.getItem(key)||0);if(seen&&Date.now()-seen<p.days*86400000)return;}catch{}
    const timer=setTimeout(()=>setOpen(true),2500);return()=>clearTimeout(timer);
  },[p.days]);
  useEffect(()=>{if(!open)return;const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')close();};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);},[open]);
  function close(){setOpen(false);try{localStorage.setItem(key,String(Date.now()));}catch{}}
  if(!open)return null;
  return <div className="site-popup" onClick={e=>{if(e.target===e.currentTarget)close();}}>
    <div className="site-popup__card" role="dialog" aria-modal="true" aria-labelledby="site-popup-title">
      <button type="button" className="site-popup__close" aria-label="Close" autoFocus onClick={close}>×</button>
      {p.image&&<img src={p.image} alt="" loading="lazy"/>}
      <div className="site-popup__body"><h2 id="site-popup-title">{p.title}</h2>{p.text&&<p>{p.text}</p>}{p.cta&&href&&<Link className="primary" href={href} onClick={close}>{p.cta}</Link>}</div>
    </div>
  </div>;
}
