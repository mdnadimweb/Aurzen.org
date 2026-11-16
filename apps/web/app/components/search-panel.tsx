'use client';
// Product search with instant suggestions. The catalog is already in the store on the
// client, so suggestions need no network request (and so no stale responses can arrive);
// submitting opens /shop/?q=… with every match.
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useDeferredValue,useId,useState,type KeyboardEvent} from 'react';
import type {Product} from '@aurzen/shared/catalog';
import {useStore} from '../providers';
import Modal from './modal';
import ProductImage from './product-image';
import ProductPrice from './product-price';

export const maxSuggestions=6;
/** Same matching as the shop page: name, category or label contains every typed word. */
export function matchesSearch(p:Product,query:string){
  const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const haystack=(p.name+' '+p.category+' '+(p.tag||'')).toLowerCase();
  return words.every(w=>haystack.includes(w));
}

export default function SearchPanel({open,onClose}:{open:boolean;onClose:()=>void}){
  const {products,loaded,error,refresh}=useStore();
  const router=useRouter(),id=useId();
  const [query,setQuery]=useState(''),[active,setActive]=useState(-1);
  const deferred=useDeferredValue(query);
  const term=deferred.trim();
  const matches=term?products.filter(p=>matchesSearch(p,term)):[];
  const suggestions=matches.slice(0,maxSuggestions);
  const close=()=>{onClose();setActive(-1);};
  const submit=()=>{if(!query.trim())return;close();router.push('/shop/?q='+encodeURIComponent(query.trim()));};
  const onKeyDown=(event:KeyboardEvent<HTMLInputElement>)=>{
    // A search field clears itself on Escape and swallows it; close the panel instead.
    if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key==='ArrowDown'&&suggestions.length){event.preventDefault();setActive(i=>(i+1)%suggestions.length);}
    else if(event.key==='ArrowUp'&&suggestions.length){event.preventDefault();setActive(i=>i<=0?suggestions.length-1:i-1);}
    else if(event.key==='Enter'){event.preventDefault();const chosen=suggestions[active];if(chosen){close();router.push('/products/'+chosen.id+'/');}else submit();}
  };
  return <Modal open={open} onClose={close} label="Product search" className="search-dialog">
    <form role="search" className="search-panel" onSubmit={e=>{e.preventDefault();submit();}}>
      <div className="search-panel__field">
        <label htmlFor={id+'-input'} className="sr-only">Search products</label>
        <input id={id+'-input'} type="search" autoFocus enterKeyHint="search" autoComplete="off" placeholder="Search dresses, abayas, suits…" value={query}
          role="combobox" aria-expanded={suggestions.length>0} aria-controls={id+'-list'} aria-autocomplete="list" aria-activedescendant={active>=0?id+'-option-'+active:undefined}
          onChange={e=>{setQuery(e.target.value);setActive(-1);}} onKeyDown={onKeyDown}/>
        <button type="button" className="search-panel__close" aria-label="Close search" onClick={close}>×</button>
      </div>
      <div className="search-panel__results" aria-live="polite">
        {error&&!products.length?<p className="form-error">Search is unavailable right now. <button type="button" className="text-link" onClick={()=>void refresh()}>Try again</button></p>
        :!loaded?<p role="status" className="muted">Loading products…</p>
        :!term?<p className="muted">Start typing to see matching pieces.</p>
        :!suggestions.length?<p className="muted">No pieces match “{term}”. Try another word.</p>
        :<>
          <ul id={id+'-list'} role="listbox" aria-label="Suggested products" className="search-suggestions">{suggestions.map((p,i)=><li key={p.id} id={id+'-option-'+i} role="option" aria-selected={i===active}>
            <Link href={'/products/'+p.id+'/'} onClick={close} tabIndex={-1}><span className="search-suggestions__photo"><ProductImage src={p.image} alt="" category={p.category}/></span><span className="search-suggestions__name">{p.name}<small>{p.category}</small></span><ProductPrice product={p} compact/></Link>
          </li>)}</ul>
          <button className="text-link search-panel__all" type="submit">See all {matches.length} result{matches.length===1?'':'s'} for “{term}” ↗</button>
        </>}
      </div>
    </form>
  </Modal>;
}
