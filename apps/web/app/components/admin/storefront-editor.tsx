'use client';
import {useState} from 'react';
import {categoryCover,defaultStorefront,storefrontLimits,type Product,type Storefront} from '@aurzen/shared/catalog';

/** Announcement bar text and the photo that represents each category on the homepage. */
export default function StorefrontEditor({initial,categories,products,onSave}:{initial:Storefront|null;categories:string[];products:Product[];onSave:(storefront:Storefront)=>Promise<void>}){
  const start=initial||defaultStorefront;
  const [message,setMessage]=useState(start.announcement.message),[detail,setDetail]=useState(start.announcement.detail);
  // Only keep choices that still point at a product in that category.
  const [covers,setCovers]=useState<Record<string,number>>(()=>Object.fromEntries(Object.entries(start.covers).filter(([c,id])=>products.some(p=>p.id===id&&p.category===c))));
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  const draft:Storefront={announcement:{message,detail},covers};
  const dirty=JSON.stringify(draft)!==JSON.stringify(initial||defaultStorefront);
  async function save(){
    setSaving(true);setError('');
    try{await onSave(draft);}catch(e){setError((e as Error).message);}finally{setSaving(false);}
  }
  return <form className="a-card mt-6 p-5" aria-label="Storefront text and category covers" onSubmit={e=>{e.preventDefault();void save();}}>
    <h2 className="mt-0">Storefront</h2>
    <section className="form-section"><h3>Announcement bar</h3>
      <div className="form-pair">
        <label>Message<input value={message} required maxLength={storefrontLimits.message} disabled={saving} onChange={e=>setMessage(e.target.value)}/></label>
        <label>Detail (optional)<input value={detail} maxLength={storefrontLimits.detail} disabled={saving} onChange={e=>setDetail(e.target.value)}/><small className="hero-slide__hint">Shown after the message, slightly faded.</small></label>
      </div>
    </section>
    <section className="form-section"><h3>Category covers</h3>
      <p className="hero-slide__hint mt-0">The photo on each homepage category tile. Automatic uses the first product with a photo.</p>
      <div className="form-pair">{categories.map(category=>{
        const choices=products.filter(p=>p.category===category);
        return <label key={category}>{category}<select value={covers[category]??''} disabled={saving} onChange={e=>{const id=Number(e.target.value);setCovers(current=>{const next={...current};if(id)next[category]=id;else delete next[category];return next;});}}>
          <option value="">Automatic{choices.length?` (${categoryCover(category,products)?.name})`:''}</option>
          {choices.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select></label>;
      })}</div>
    </section>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <div className="form-modal__buttons"><button className="a-btn a-btn--primary" disabled={saving||!dirty}>{saving?'Saving…':dirty?'Save storefront':'Saved'}</button></div>
  </form>;
}
