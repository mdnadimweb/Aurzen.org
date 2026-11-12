'use client';
import {useEffect,useRef,useState} from 'react';
import Box from './box-art';

type Props={src?:string;alt:string;category?:string;className?:string;eager?:boolean;secondarySrc?:string};
export default function ProductImage({src,alt,category,className='',eager=false,secondarySrc}:Props){
  const image=useRef<HTMLImageElement>(null);
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
  const [requested,setRequested]=useState(false),[hovered,setHovered]=useState(false),[secondaryReady,setSecondaryReady]=useState(false);
  const photo=src&&src!=='box'?src:undefined;
  const secondary=secondarySrc&&secondarySrc!=='box'&&secondarySrc!==photo?secondarySrc:undefined;
  const illustration=!photo&&category==='Mystery Boxes';
  useEffect(()=>{
    setState('loading');setRequested(false);setSecondaryReady(false);
    if(image.current?.complete)setState(image.current.naturalWidth?'ready':'error');
  },[photo,secondary]);
  const fallback=!photo||state==='error';
  return <div className={'product-media '+className+(hovered&&secondaryReady?' product-media--preview':'')} data-category={category} data-state={!photo?'missing':state}
    onPointerEnter={event=>{if(secondary&&event.pointerType==='mouse'&&window.matchMedia('(hover: hover) and (pointer: fine)').matches){setRequested(true);setHovered(true);}}}
    onPointerLeave={()=>setHovered(false)}>
    {photo&&<img ref={image} className="product-media__main" src={photo} alt={fallback?'':alt} loading={eager?'eager':'lazy'} fetchPriority={eager?'high':'auto'} decoding="async" onLoad={()=>setState('ready')} onError={()=>setState('error')}/>}
    {requested&&secondary&&<img key={secondary} className="product-media__secondary" src={secondary} alt="" aria-hidden="true" loading="lazy" decoding="async" onLoad={()=>setSecondaryReady(true)} onError={()=>setSecondaryReady(false)}/>}
    {fallback&&(illustration?<div className="product-media__illustration" role="img" aria-label={alt+' — gift box illustration'}><div aria-hidden="true"><Box/></div><span>Gift box illustration</span></div>:<div className="product-media__fallback" role="img" aria-label={alt+' — photo '+(photo?'unavailable':'coming soon')}><span className="product-media__monogram" aria-hidden="true">AZ</span><span className="product-media__wordmark" aria-hidden="true">AURZÉN</span><span className="product-media__note">{photo?'Photo unavailable':'Photo coming soon'}</span></div>)}
    {photo&&state==='loading'&&<span className="product-media__loading" aria-hidden="true">Loading photo…</span>}
  </div>;
}
