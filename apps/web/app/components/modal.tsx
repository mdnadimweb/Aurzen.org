'use client';
import {useEffect,useRef,type ReactNode} from 'react';
let locks=0;
let bodyOverflow='',htmlOverflow='';
function lockScroll(){
  if(locks++===0){bodyOverflow=document.body.style.overflow;htmlOverflow=document.documentElement.style.overflow;document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';}
  return()=>{if(--locks===0){document.body.style.overflow=bodyOverflow;document.documentElement.style.overflow=htmlOverflow;}};
}
export default function Modal({open,onClose,label,className='',children}:{open:boolean;onClose:()=>void;label:string;className?:string;children:ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);
  const backdropStart=useRef(false);
  const close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const dialog=ref.current;if(!dialog||!open)return;
    const focus=document.activeElement as HTMLElement|null;
    const unlock=lockScroll();
    if(!dialog.open)dialog.showModal();
    return()=>{dialog.close();unlock();if(focus?.isConnected)focus.focus({preventScroll:true});};
  },[open]);
  const outside=(element:HTMLDialogElement,x:number,y:number)=>{const rect=element.getBoundingClientRect();return x<rect.left||x>rect.right||y<rect.top||y>rect.bottom;};
  return <dialog ref={ref} aria-label={label} aria-modal="true" className={'store-dialog '+className} onCancel={e=>{e.preventDefault();close.current();}} onPointerDown={e=>{backdropStart.current=e.target===e.currentTarget&&outside(e.currentTarget,e.clientX,e.clientY);}} onClick={e=>{if(backdropStart.current&&e.target===e.currentTarget&&outside(e.currentTarget,e.clientX,e.clientY))close.current();backdropStart.current=false;}}>
    {open&&children}
  </dialog>;
}
