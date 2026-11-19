'use client';
import {linkTypeLabels,linkTypes,type ContentPage,type SiteLink} from '@aurzen/shared/site';
import type {Category,Product} from '@aurzen/shared/catalog';

/** Where a button or menu item goes: a page of this shop (so it cannot break) or a custom address. */
export default function LinkPicker({label,value,onChange,categories,products,pages,allowCategories=false,optional=false}:{
  label:string;value:SiteLink|null;onChange:(link:SiteLink|null)=>void;categories:Category[];products:Product[];pages:ContentPage[];allowCategories?:boolean;optional?:boolean;
}){
  const types=linkTypes.filter(t=>allowCategories||t!=='categories');
  const type=value?.type||'';
  return <div className="link-picker">
    <label>{label}<select value={type} onChange={e=>{const t=e.target.value as SiteLink['type']|'';onChange(t?{type:t,value:t==='category'?categories[0]?.name||'':t==='product'?String(products[0]?.id||''):t==='page'?pages[0]?.slug||'':''}:null);}}>
      {(optional||!value)&&<option value="">{optional?'No link':'Choose…'}</option>}
      {types.map(t=><option key={t} value={t}>{linkTypeLabels[t]}</option>)}
    </select></label>
    {value?.type==='category'&&<label>Category<select value={value.value} onChange={e=>onChange({type:'category',value:e.target.value})}>{categories.map(c=><option key={c.name} value={c.name}>{c.parent?c.parent+' › ':''}{c.name}</option>)}</select></label>}
    {value?.type==='product'&&<label>Product<select value={value.value} onChange={e=>onChange({type:'product',value:e.target.value})}>{products.map(p=><option key={p.id} value={String(p.id)}>{p.name}</option>)}</select></label>}
    {value?.type==='page'&&<label>Page<select value={value.value} onChange={e=>onChange({type:'page',value:e.target.value})}>{pages.map(p=><option key={p.slug} value={p.slug}>{p.title}{p.published?'':' (hidden)'}</option>)}</select></label>}
    {value?.type==='url'&&<label>Address<input type="text" inputMode="url" value={value.value} maxLength={500} placeholder="https://… or /shop/" onChange={e=>onChange({type:'url',value:e.target.value})}/></label>}
  </div>;
}
