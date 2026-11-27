'use client';
// Search a product by name or by pasting its link (…/products/76/), pick a size (and colour), and it is
// added straight to the order. Used by New order and Edit order.
import {useMemo,useRef,useState} from 'react';
import {money,productOptions,productColors,productPricing,type Product} from '@aurzen/shared/catalog';
import Icon from '../admin-icons';

const words=(s:string)=>s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').split(/[^a-z0-9]+/).filter(Boolean);
/** Product ID from a pasted link or "#76" / "76"; null when the text is a name search. */
export function productIdFrom(query:string){
  const q=query.trim();
  const link=/\/products\/(\d+)/.exec(q);if(link)return Number(link[1]);
  const id=/^#?(\d{1,9})$/.exec(q);return id?Number(id[1]):null;
}
export function searchProducts(products:Product[],query:string,limit=8){
  const id=productIdFrom(query);
  if(id!==null){const exact=products.find(p=>p.id===id);if(exact)return [exact];}
  const terms=words(query);
  if(!terms.length)return products.slice(0,limit);
  return products.map(p=>{const hay=words(p.name+' '+p.category);const score=terms.reduce((n,t)=>n+(hay.some(w=>w.startsWith(t))?2:hay.some(w=>w.includes(t))?1:-10),0);return {p,score};})
    .filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.p);
}

/** `left(product,size)` = how many more can be added in that size (Infinity when stock is not tracked per size). */
export default function ProductPicker({products,left,onAdd,now}:{products:Product[];left:(p:Product,size:string)=>number;onAdd:(p:Product,size:string,color:string)=>void;now:number}){
  const [query,setQuery]=useState(''),[open,setOpen]=useState(false),[chosen,setChosen]=useState<Product|null>(null),[color,setColor]=useState(''),[active,setActive]=useState(0);
  const input=useRef<HTMLInputElement>(null);
  const results=useMemo(()=>searchProducts(products,query),[products,query]);
  const pick=(p:Product)=>{
    const options=productOptions(p),colors=productColors(p);
    setQuery('');setOpen(false);
    // One size and no colours: add it right away.
    if(options.length===1&&!colors.length){if(left(p,options[0])>0)onAdd(p,options[0],'');input.current?.focus();return;}
    setChosen(p);setColor(colors[0]||'');
  };
  const addSize=(size:string)=>{if(!chosen)return;onAdd(chosen,size,color);setChosen(null);input.current?.focus();};
  return <div className="picker">
    <label className="picker__search">Add a product<span className="picker__field"><Icon name="products"/>
      <input ref={input} type="search" value={query} placeholder="Search by name, or paste the product link" autoComplete="off" role="combobox" aria-expanded={open} aria-controls="picker-results" aria-autocomplete="list"
        onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)}
        onChange={e=>{setQuery(e.target.value);setOpen(true);setActive(0);setChosen(null);}}
        onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setActive(a=>Math.min(a+1,results.length-1));}else if(e.key==='ArrowUp'){e.preventDefault();setActive(a=>Math.max(a-1,0));}else if(e.key==='Enter'&&open&&results[active]){e.preventDefault();pick(results[active]);}else if(e.key==='Escape'){setOpen(false);}}}/></span></label>
    {open&&<ul id="picker-results" className="picker__results" role="listbox">
      {results.length?results.map((p,i)=>{const soldOut=p.stock<=0;return <li key={p.id} role="option" aria-selected={i===active} aria-disabled={soldOut} className={(i===active?'is-active ':'')+(soldOut?'is-out':'')}
        onMouseDown={e=>{e.preventDefault();if(!soldOut)pick(p);}} onMouseEnter={()=>setActive(i)}>
        <span className="picker__thumb">{p.image&&p.image!=='box'?<img src={p.image} alt="" width={40} height={40} loading="lazy"/>:<Icon name="box"/>}</span>
        <span className="picker__name"><strong>{p.name}</strong><small>{p.category} · #{p.id}</small></span>
        <span className="picker__meta"><strong>{money(productPricing(p,now).unitPrice)}</strong><small>{soldOut?'Sold out':p.stock+' in stock'}</small></span>
      </li>;}):<li className="picker__none">No product matches “{query}”.</li>}
    </ul>}
    {chosen&&<div className="picker__chosen" role="group" aria-label={'Choose a size for '+chosen.name}>
      <div className="picker__chosen-head"><strong>{chosen.name}</strong><button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={()=>setChosen(null)}>Cancel</button></div>
      {productColors(chosen).length>0&&<label className="picker__color">Colour<select value={color} onChange={e=>setColor(e.target.value)}>{productColors(chosen).map(c=><option key={c}>{c}</option>)}</select></label>}
      <p className="picker__hint">Tap a size to add it:</p>
      <div className="picker__sizes">{productOptions(chosen).map(s=>{const n=left(chosen,s);return <button key={s} type="button" className="a-btn a-btn--secondary a-btn--sm" disabled={n<=0} onClick={()=>addSize(s)}>{s}<small>{n<=0?'sold out':Number.isFinite(n)?n+' left':''}</small></button>;})}</div>
    </div>}
  </div>;
}
