'use client';
// Collapsed-by-default blocks on the Homepage tab: a header with a short summary and an Edit button;
// Edit opens the full form, Minimise folds it again. Closed bodies stay mounted (hidden) so nothing typed is lost.
import type {FormEvent} from 'react';
import Icon from '../admin-icons';

export function FoldToggle({open,label,onToggle}:{open:boolean;label:string;onToggle:()=>void}){
  return <button type="button" className={'a-btn a-btn--sm fold-toggle '+(open?'a-btn--ghost':'a-btn--secondary')} aria-expanded={open} aria-label={(open?'Minimise ':'Edit ')+label} onClick={onToggle}>
    {open?'Minimise':<><Icon name="edit"/>Edit</>}
  </button>;
}

/** When the browser blocks a save because a hidden field is invalid, open the block that holds it. */
export function openInvalid(open:(key:string)=>void){
  return (e:FormEvent)=>{
    const block=(e.target as HTMLElement).closest<HTMLElement>('[data-fold]');
    if(block?.dataset.fold!==undefined)open(block.dataset.fold);
  };
}
