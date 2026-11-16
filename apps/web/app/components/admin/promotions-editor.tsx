'use client';
// Admin → Homepage → Promotions: the compact "New Arrivals & Offers" banner.
import {useState} from 'react';
import {activePromotions,maxPromotions,promotionLimits,type Category,type Product,type Promotion} from '@aurzen/shared/catalog';
import Icon from '../admin-icons';
import ImageField from './image-field';
import {localDate,utcDate} from '../admin-offer';

const newSlide=():Promotion=>({id:'p-'+Math.random().toString(36).slice(2,10),image:'',mobileImage:'',headline:'New arrivals are here',cta:'Shop now',link:{type:'sale',value:''},startsAt:null,endsAt:null,hidden:false});
const state=(p:Promotion,now:number)=>p.hidden?'Hidden':p.startsAt&&Date.parse(p.startsAt)>now?'Scheduled':p.endsAt&&Date.parse(p.endsAt)<=now?'Ended':'Live';

export default function PromotionsEditor({initial,products,categories,onSave}:{initial:Promotion[];products:Product[];categories:Category[];onSave:(promotions:Promotion[])=>Promise<void>}){
  const [slides,setSlides]=useState<Promotion[]>(initial),[saving,setSaving]=useState(false),[uploads,setUploads]=useState(0),[error,setError]=useState(''),[dirty,setDirty]=useState(false);
  const [now]=useState(()=>Date.now());
  const busy=saving||uploads>0;
  const onBusy=(value:boolean)=>setUploads(n=>Math.max(0,n+(value?1:-1)));
  const update=(i:number,patch:Partial<Promotion>)=>{setSlides(list=>list.map((s,j)=>j===i?{...s,...patch}:s));setDirty(true);};
  const move=(from:number,to:number)=>{setSlides(list=>{const next=[...list];const [s]=next.splice(from,1);next.splice(to,0,s);return next;});setDirty(true);};
  async function save(){
    if(busy)return;
    const missing=slides.findIndex(s=>!s.image);
    if(missing>=0){setError(`Add a main image to promotion ${missing+1}.`);return;}
    setSaving(true);setError('');
    try{await onSave(slides);setDirty(false);}catch(e){setError((e as Error).message);}finally{setSaving(false);}
  }
  const live=activePromotions(slides,now).length;
  return <form className="a-card mt-6 p-5 promotions-editor" aria-label="Promotions banner" onSubmit={e=>{e.preventDefault();void save();}}>
    <h2 className="mt-0">Promotions</h2>
    <p className="hero-slide__hint mt-0">The “New Arrivals &amp; Offers” banner below the featured categories. {live===0?'No slide is live, so the banner is hidden.':live===1?'One live slide shows as a still banner.':`${live} live slides rotate automatically.`}</p>
    {!slides.length&&<div className="admin-empty"><h3>No promotion slides yet.</h3><p>Add a slide to show the banner on your homepage.</p></div>}
    <ol className="hero-editor__list">{slides.map((s,i)=><li key={s.id} className="a-card hero-slide promo-editor-slide" data-hidden={s.hidden||undefined}>
      <div className="hero-slide__head">
        <h3>Promotion {i+1} <small className="promo-state" data-state={state(s,now).toLowerCase()}>{state(s,now)}</small></h3>
        <div className="admin-photo-actions">
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={busy||i===0} onClick={()=>move(i,i-1)} aria-label={`Move promotion ${i+1} earlier`}>Move earlier</button>
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={busy||i===slides.length-1} onClick={()=>move(i,i+1)} aria-label={`Move promotion ${i+1} later`}>Move later</button>
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={busy} aria-pressed={s.hidden} onClick={()=>update(i,{hidden:!s.hidden})}>{s.hidden?'Show':'Hide'}</button>
          <button type="button" className="a-btn a-btn--danger-ghost a-btn--sm" disabled={busy} aria-label={`Remove promotion ${i+1}`} onClick={()=>{if(confirm(`Remove promotion ${i+1}?`)){setSlides(list=>list.filter((_,j)=>j!==i));setDirty(true);}}}><Icon name="trash"/>Remove</button>
        </div>
      </div>
      <div className="hero-slide__body">
        <section className="form-section"><h4>Text and button</h4>
          <label>Headline<input required value={s.headline} maxLength={promotionLimits.headline} disabled={busy} onChange={e=>update(i,{headline:e.target.value})}/></label>
          <div className="form-pair">
            <label>Button label<input required value={s.cta} maxLength={promotionLimits.cta} disabled={busy} onChange={e=>update(i,{cta:e.target.value})}/></label>
            <label>Button goes to<select value={s.link.type} disabled={busy} onChange={e=>{const type=e.target.value as Promotion['link']['type'];update(i,{link:{type,value:type==='product'?String(products[0]?.id||''):type==='category'?categories[0]?.name||'':''}});}}><option value="sale">Sale page</option><option value="category">A category</option><option value="product">A product</option></select></label>
          </div>
          {s.link.type==='category'&&<label>Category<select required value={s.link.value} disabled={busy} onChange={e=>update(i,{link:{type:'category',value:e.target.value}})}>{!categories.some(c=>c.name===s.link.value)&&<option value="">Choose a category</option>}{categories.map(c=><option key={c.name} value={c.name}>{c.parent?`${c.parent} › ${c.name}`:c.name}</option>)}</select></label>}
          {s.link.type==='product'&&<label>Product<select required value={s.link.value} disabled={busy} onChange={e=>update(i,{link:{type:'product',value:e.target.value}})}>{!products.some(p=>String(p.id)===s.link.value)&&<option value="">Choose a product</option>}{products.map(p=><option key={p.id} value={String(p.id)}>{p.name}</option>)}</select></label>}
          <div className="form-pair">
            <label>Start (optional)<input type="datetime-local" step="any" value={localDate(s.startsAt)} disabled={busy} onChange={e=>update(i,{startsAt:utcDate(e.target.value)})}/></label>
            <label>End (optional)<input type="datetime-local" step="any" value={localDate(s.endsAt)} min={localDate(s.startsAt)||undefined} disabled={busy} onChange={e=>update(i,{endsAt:utcDate(e.target.value)})}/></label>
          </div>
          <small className="hero-slide__hint">Times are Asia/Dhaka. A blank start shows the slide now; a blank end keeps it running.</small>
        </section>
        <section className="form-section"><h4>Images</h4>
          <ImageField label="Main image" value={s.image} disabled={busy&&uploads===0} onBusy={onBusy} onChange={image=>update(i,{image})} hint="Wide photo, about 1600 × 500. Keep the left side calm for the text."/>
          <ImageField label="Mobile image" optional value={s.mobileImage} disabled={busy&&uploads===0} onBusy={onBusy} onChange={mobileImage=>update(i,{mobileImage})} hint="Used on phones. A squarer photo, about 800 × 600."/>
        </section>
      </div>
    </li>)}</ol>
    <div className="hero-editor__foot">
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="form-modal__buttons">
        <button type="button" className="a-btn a-btn--secondary" disabled={busy||slides.length>=maxPromotions} onClick={()=>{setSlides(list=>[...list,newSlide()]);setDirty(true);}}><Icon name="plus"/>Add promotion{slides.length>=maxPromotions?` (max ${maxPromotions})`:''}</button>
        <button className="a-btn a-btn--primary" disabled={busy}>{uploads?'Uploading photo…':saving?'Saving…':dirty?'Save promotions':'Saved'}</button>
      </div>
    </div>
  </form>;
}
