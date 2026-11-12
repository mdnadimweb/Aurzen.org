'use client';
import {useEffect,useRef,useState} from 'react';
import type {Product} from '@aurzen/shared/catalog';
import ProductImage from './product-image';
import Modal from './modal';
function Photo({src,alt,eager=false,priority=false}:{src:string;alt:string;eager?:boolean;priority?:boolean}){
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading'),[retry,setRetry]=useState(0);
  const image=useRef<HTMLImageElement>(null);
  useEffect(()=>{if(image.current?.complete)setState(image.current.naturalWidth?'ready':'error');},[retry,src]);
  return <><img ref={image} key={retry} className={state==='error'?'photo-failed':undefined} src={src} alt={state==='error'?'':alt} draggable={false} loading={eager?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async" onLoad={()=>setState('ready')} onError={()=>setState('error')}/>{state==='loading'&&<span className="photo-state" role="status">Loading photo…</span>}{state==='error'&&<div className="photo-state" role="alert">Photo unavailable. <button type="button" aria-label={'Retry '+alt} onClick={e=>{e.stopPropagation();setState('loading');setRetry(n=>n+1);}}>Retry</button></div>}</>;
}
export default function ProductGallery({product}:{product:Product}){
  const images=Array.from(new Set([product.image,...(product.images||[])])).filter(src=>src&&src!=='box');
  const photoKey=images.join('|');
  const [index,setIndex]=useState(0),[open,setOpen]=useState(false),[zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0});
  const pointer=useRef<{x:number;y:number;panX:number;panY:number}|null>(null),swipe=useRef<{x:number;y:number}|null>(null),stage=useRef<HTMLDivElement>(null);
  const select=(next:number)=>{setIndex((next+images.length)%images.length);setZoom(1);setPan({x:0,y:0});};
  const clampPan=(x:number,y:number)=>{
    const bounds=stage.current?.getBoundingClientRect();
    const maxX=(bounds?.width||0)*(zoom-1)/2,maxY=(bounds?.height||0)*(zoom-1)/2;
    return {x:Math.max(-maxX,Math.min(maxX,x)),y:Math.max(-maxY,Math.min(maxY,y))};
  };
  useEffect(()=>{setIndex(0);setZoom(1);setPan({x:0,y:0});setOpen(false);},[product.id,photoKey]);
  const current=images[index]||images[0];
  if(!images.length)return <ProductImage className="gallery-main" src={product.image} alt={product.name} category={product.category}/>;
  const arrows=images.length>1&&<div className="gallery-arrows"><button aria-label="Previous photo" onClick={()=>select(index-1)}>←</button><span aria-live="polite">{index+1} / {images.length}</span><button aria-label="Next photo" onClick={()=>select(index+1)}>→</button></div>;
  return <div className="product-gallery">
    <div className="gallery-main" data-category={product.category} style={{touchAction:'pan-y'}} onTouchStart={e=>{swipe.current=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;}} onTouchEnd={e=>{if(swipe.current){const delta=e.changedTouches[0].clientX-swipe.current.x,vertical=e.changedTouches[0].clientY-swipe.current.y;if(Math.abs(delta)>50&&Math.abs(delta)>Math.abs(vertical))select(index+(delta<0?1:-1));}swipe.current=null;}} onTouchCancel={()=>{swipe.current=null;}}>
      <Photo key={current} src={current} alt={product.name+' — photo '+(index+1)} eager priority={index===0}/>
      <button className="gallery-expand" aria-label="Open full-screen photo viewer" onClick={()=>{setOpen(true);setZoom(1);setPan({x:0,y:0});}}>View & zoom ⤢</button>
    </div>{arrows}
    {images.length>1&&<div className="gallery-thumbnails" aria-label="Product photos">{images.map((src,i)=><button key={src} aria-label={'Show photo '+(i+1)} aria-pressed={index===i} onClick={()=>select(i)}><ProductImage src={src} alt={product.name+' — thumbnail '+(i+1)} category={product.category}/></button>)}</div>}
    <Modal open={open} onClose={()=>setOpen(false)} label={product.name+' photo viewer'} className="image-viewer">
      <div className="viewer-content" onKeyDown={e=>{if(e.key==='ArrowLeft'){e.preventDefault();select(index-1);}if(e.key==='ArrowRight'){e.preventDefault();select(index+1);}}}>
        <div className="viewer-toolbar"><span>{product.name}</span><button aria-label="Zoom out" disabled={zoom===1} onClick={()=>{setZoom(Math.max(1,zoom-0.5));setPan({x:0,y:0});}}>−</button><span aria-live="polite">{Math.round(zoom*100)}%</span><button aria-label="Zoom in" disabled={zoom===3} onClick={()=>setZoom(Math.min(3,zoom+0.5))}>+</button><button onClick={()=>{setZoom(1);setPan({x:0,y:0});}}>Reset</button><button autoFocus aria-label="Close photo viewer" onClick={()=>setOpen(false)}>×</button></div>
        <p className="viewer-help">Use arrows to change photos. Zoom in and drag to explore. Escape to close.</p>
        <div ref={stage} className="viewer-stage" style={{cursor:zoom>1?'grab':'auto',touchAction:'none'}} tabIndex={0} aria-label="Photo; when zoomed use arrow keys to pan" onKeyDown={e=>{if(zoom>1&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();e.stopPropagation();setPan(p=>clampPan(p.x+(e.key==='ArrowLeft'?40:e.key==='ArrowRight'?-40:0),p.y+(e.key==='ArrowUp'?40:e.key==='ArrowDown'?-40:0)));}}}
          onPointerDown={e=>{if(!e.isPrimary||e.button!==0)return;pointer.current={x:e.clientX,y:e.clientY,panX:pan.x,panY:pan.y};e.currentTarget.setPointerCapture(e.pointerId);}}
          onPointerMove={e=>{const start=pointer.current;if(start&&zoom>1)setPan(clampPan(start.panX+e.clientX-start.x,start.panY+e.clientY-start.y));}}
          onPointerUp={e=>{const start=pointer.current;if(start&&zoom===1&&Math.abs(e.clientX-start.x)>50&&Math.abs(e.clientX-start.x)>Math.abs(e.clientY-start.y))select(index+(e.clientX<start.x?1:-1));pointer.current=null;}} onPointerCancel={()=>{pointer.current=null;}}>
          <div style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}><Photo key={current} src={current} alt={product.name+' — photo '+(index+1)} eager/></div>
        </div>{arrows}
      </div>
    </Modal>
  </div>;
}
