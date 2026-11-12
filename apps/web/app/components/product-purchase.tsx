'use client';
import {useEffect,useRef,useState} from 'react';
import type {Product} from '@aurzen/shared/catalog';
import ProductPrice from './product-price';
export default function ProductPurchase({product,onAdd,onBuy,disabled}:{product:Product;onAdd:()=>boolean;onBuy:()=>void;disabled:boolean}){
  const controls=useRef<HTMLDivElement>(null),[offscreen,setOffscreen]=useState(false),[added,setAdded]=useState(false),addedTimer=useRef<number>(undefined);
  useEffect(()=>()=>window.clearTimeout(addedTimer.current),[]);
  // Brief confirmation only; the button stays enabled so shoppers can add again at once.
  const add=()=>{if(!onAdd())return;setAdded(true);window.clearTimeout(addedTimer.current);addedTimer.current=window.setTimeout(()=>setAdded(false),1600);};
  useEffect(()=>{const node=controls.current;if(!node||!('IntersectionObserver' in window))return;const observer=new IntersectionObserver(([entry])=>setOffscreen(!entry.isIntersecting));observer.observe(node);return()=>observer.disconnect();},[]);
  const buttons=<><button type="button" disabled={disabled} className={'primary purchase-add'+(added?' is-added':'')} onClick={add}><span className="purchase-add-label" key={String(added)}>{added?'Added ✓':'Add to Bag'}</span></button><button type="button" disabled={product.stock<=0} className="primary" onClick={onBuy}>Buy Now ↗</button></>;
  return <><div ref={controls} className="purchase-actions">{buttons}</div>{offscreen&&<div className="mobile-purchase" aria-label="Quick purchase"><div className="mobile-purchase-copy"><small>{product.name}</small><ProductPrice product={product} compact/></div><div className="purchase-actions">{buttons}</div></div>}</>;
}
