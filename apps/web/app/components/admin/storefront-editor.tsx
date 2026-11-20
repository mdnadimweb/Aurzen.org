'use client';
import {useState} from 'react';
import {FoldToggle,openInvalid} from './fold';
import {categoryCover,categoryFamily,type Category,defaultStorefront,maxFeaturedCategories,storefrontLimits,type Product,type Storefront} from '@aurzen/shared/catalog';

/** Announcement bar text, featured categories and the product photo used for each category tile.
 *  categories: main category names (featured tiles and covers only use main categories). */
export default function StorefrontEditor({initial,categories,tree=[],products,onSave}:{initial:Storefront|null;categories:string[];tree?:Category[];products:Product[];onSave:(storefront:Storefront)=>Promise<void>}){
  // A main category's cover can be any product in it or in its subcategories.
  const family=(category:string)=>tree.length?categoryFamily(tree,category):[category];
  const start=initial||defaultStorefront;
  const [message,setMessage]=useState(start.announcement.message),[detail,setDetail]=useState(start.announcement.detail);
  // Only keep choices that still point at a product in that category.
  const [covers,setCovers]=useState<Record<string,number>>(()=>Object.fromEntries(Object.entries(start.covers).filter(([c,id])=>products.some(p=>p.id===id&&family(c).includes(p.category)))));
  const [featured,setFeatured]=useState<string[]>(()=>(start.featured||[]).filter(name=>categories.includes(name)));
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  const [open,setOpen]=useState<string|null>(null);
  const draft:Storefront={announcement:{message,detail},covers,featured};
  const dirty=JSON.stringify(draft)!==JSON.stringify({...defaultStorefront,...(initial||{}),featured:initial?.featured||[]});
  const moveFeatured=(from:number,to:number)=>setFeatured(list=>{const next=[...list];const [name]=next.splice(from,1);next.splice(to,0,name);return next;});
  async function save(){
    setSaving(true);setError('');
    try{await onSave(draft);}catch(e){setError((e as Error).message);}finally{setSaving(false);}
  }
  return <form className="a-card mt-6 p-5" aria-label="Storefront text and category covers" onInvalidCapture={openInvalid(setOpen)} onSubmit={e=>{e.preventDefault();void save();}}>
    <h2 className="mt-0">Storefront</h2>
    <section className="form-section fold-section" data-fold="announcement" data-open={open==='announcement'||undefined}><div className="fold-head"><h3>Announcement bar{open!=='announcement'&&<span className="fold-summary">{message}</span>}</h3><FoldToggle open={open==='announcement'} label="announcement bar" onToggle={()=>setOpen(open==='announcement'?null:'announcement')}/></div><div className="fold-body" hidden={open!=='announcement'}>
      <div className="form-pair">
        <label>Message<input value={message} required maxLength={storefrontLimits.message} disabled={saving} onChange={e=>setMessage(e.target.value)}/></label>
        <label>Detail (optional)<input value={detail} maxLength={storefrontLimits.detail} disabled={saving} onChange={e=>setDetail(e.target.value)}/><small className="hero-slide__hint">Shown after the message, slightly faded.</small></label>
      </div>
    </div></section>
    <section className="form-section fold-section" data-fold="featured" data-open={open==='featured'||undefined}><div className="fold-head"><h3>Featured categories{open!=='featured'&&<span className="fold-summary">{featured.length?featured.join(' · '):'Automatic'}</span>}</h3><FoldToggle open={open==='featured'} label="featured categories" onToggle={()=>setOpen(open==='featured'?null:'featured')}/></div><div className="fold-body" hidden={open!=='featured'}>
      <p className="hero-slide__hint mt-0">Up to {maxFeaturedCategories} main categories shown directly below the hero, in this order. With none chosen, the first {maxFeaturedCategories} main categories appear.</p>
      {featured.length>0&&<ol className="featured-picker">{featured.map((name,i)=><li key={name}><span>{i+1}. {name}</span><div className="admin-photo-actions">
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={saving||i===0} aria-label={'Move '+name+' earlier'} onClick={()=>moveFeatured(i,i-1)}>↑</button>
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={saving||i===featured.length-1} aria-label={'Move '+name+' later'} onClick={()=>moveFeatured(i,i+1)}>↓</button>
        <button type="button" className="a-btn a-btn--danger-ghost a-btn--sm" disabled={saving} aria-label={'Stop featuring '+name} onClick={()=>setFeatured(list=>list.filter(n=>n!==name))}>Remove</button>
      </div></li>)}</ol>}
      <label>Add a featured category<select value="" disabled={saving||featured.length>=maxFeaturedCategories} onChange={e=>{const name=e.target.value;if(name)setFeatured(list=>list.includes(name)||list.length>=maxFeaturedCategories?list:[...list,name]);}}>
        <option value="">{featured.length>=maxFeaturedCategories?`All ${maxFeaturedCategories} places are used`:'Choose a main category'}</option>
        {categories.filter(name=>!featured.includes(name)).map(name=><option key={name} value={name}>{name}</option>)}
      </select></label>
    </div></section>
    <section className="form-section fold-section" data-fold="covers" data-open={open==='covers'||undefined}><div className="fold-head"><h3>Category covers{open!=='covers'&&<span className="fold-summary">{Object.keys(covers).length?Object.keys(covers).length+' chosen by you, the rest automatic':'All automatic'}</span>}</h3><FoldToggle open={open==='covers'} label="category covers" onToggle={()=>setOpen(open==='covers'?null:'covers')}/></div><div className="fold-body" hidden={open!=='covers'}>
      <p className="hero-slide__hint mt-0">Used when a category has no uploaded cover (set that in Categories). Automatic uses the first product with a photo.</p>
      <div className="form-pair">{categories.map(category=>{
        const choices=products.filter(p=>family(category).includes(p.category));
        return <label key={category}>{category}<select value={covers[category]??''} disabled={saving} onChange={e=>{const id=Number(e.target.value);setCovers(current=>{const next={...current};if(id)next[category]=id;else delete next[category];return next;});}}>
          <option value="">Automatic{choices.length?` (${categoryCover(category,products,{},family(category))?.name})`:''}</option>
          {choices.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select></label>;
      })}</div>
    </div></section>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <div className="form-modal__buttons"><button className="a-btn a-btn--primary" disabled={saving||!dirty}>{saving?'Saving…':dirty?'Save storefront':'Saved'}</button></div>
  </form>;
}
