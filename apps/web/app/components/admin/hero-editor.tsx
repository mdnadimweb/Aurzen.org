'use client';
import {useId,useRef,useState} from 'react';
import {heroFieldLimits,heroTones,maxHeroSlides,type HeroSlide} from '@aurzen/shared/catalog';
import {maxImageBytes,maxImageMegabytes} from '@aurzen/shared/upload-limits';
import ProductImage from '../product-image';
import BoxArt from '../box-art';
import Icon from '../admin-icons';

const toneLabels:Record<HeroSlide['tone'],string>={rose:'Rose',sand:'Sand',plum:'Plum'};
type Field=keyof typeof heroFieldLimits;

function SlidePhoto({slide,index,disabled,onChange,onBusy}:{slide:HeroSlide;index:number;disabled:boolean;onChange:(image:string)=>void;onBusy:(busy:boolean)=>void}){
  const id=useId();
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const uploading=useRef(false);
  const isUrl=slide.image!=='box'&&!/^\/(media|images)\//.test(slide.image);
  async function upload(file:File){
    if(uploading.current||disabled)return;
    setError('');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Choose a JPG, PNG or WebP photo.');return;}
    if(file.size===0||file.size>maxImageBytes){setError(`Choose a photo between 1 byte and ${maxImageMegabytes} MB.`);return;}
    uploading.current=true;setBusy(true);onBusy(true);
    try{
      const form=new FormData();form.append('photo',file);
      const response=await fetch('/api/admin/images/',{method:'POST',body:form,credentials:'same-origin'});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Unable to upload this photo.');
      if(typeof result.url!=='string')throw new Error('The upload did not return a photo. Please retry.');
      onChange(result.url);
    }catch(e){setError((e as Error).message);}
    finally{uploading.current=false;setBusy(false);onBusy(false);}
  }
  return <div className="photo-field hero-slide__photo">
    <div className="hero-slide__preview" data-tone={slide.tone}>
      {slide.image==='box'?<div className="hero-slide__box" role="img" aria-label={`Slide ${index+1}: gift box illustration`}><BoxArt/></div>:<ProductImage className="admin-photo-preview" src={slide.image} alt={`Slide ${index+1} photo`}/>}
    </div>
    <label htmlFor={id}>Upload a new photo</label>
    <input id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled||busy} aria-describedby={id+'-help'} onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)void upload(file);}}/>
    <p id={id+'-help'} className="upload-help">JPG, PNG or WebP, up to {maxImageMegabytes} MB. A tall (portrait) photo looks best.</p>
    <label>Or paste an HTTPS image link<input type="url" inputMode="url" placeholder="https://…" value={isUrl?slide.image:''} disabled={disabled||busy} maxLength={2000} onChange={e=>onChange(e.target.value.trim())}/></label>
    <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={disabled||busy||slide.image==='box'} onClick={()=>onChange('box')}><Icon name="box"/>Use the gift box illustration</button>
    {busy&&<p role="status">Uploading photo… Please keep this page open.</p>}
    {error&&<p className="form-error" role="alert">{error}</p>}
  </div>;
}

export default function HeroEditor({initialSlides,custom,categories,onSave,onReset}:{initialSlides:HeroSlide[];custom:boolean;categories:string[];onSave:(slides:HeroSlide[])=>Promise<void>;onReset:()=>Promise<void>}){
  const [slides,setSlides]=useState(initialSlides);
  const [saving,setSaving]=useState(false),[uploads,setUploads]=useState(0),[error,setError]=useState(''),[dirty,setDirty]=useState(false);
  const busy=saving||uploads>0;
  const onBusy=(value:boolean)=>setUploads(count=>Math.max(0,count+(value?1:-1)));
  const update=(index:number,patch:Partial<HeroSlide>)=>{setSlides(current=>current.map((slide,i)=>i===index?{...slide,...patch}:slide));setDirty(true);};
  const move=(from:number,to:number)=>{setSlides(current=>{const next=[...current];const [slide]=next.splice(from,1);next.splice(to,0,slide);return next;});setDirty(true);};
  const remove=(index:number)=>{if(confirm(`Remove slide ${index+1}?`)){setSlides(current=>current.filter((_,i)=>i!==index));setDirty(true);}};
  const add=()=>{setSlides(current=>[...current,{eyebrow:'NEW EDIT',title:'A new story,',emphasis:'just arrived.',description:'',image:'box',alt:'AURZÉN collection',caption:'',note:'',category:categories[0]||'',cta:'Shop now',tone:'rose'}]);setDirty(true);};
  async function save(){
    if(busy)return;
    setSaving(true);setError('');
    try{await onSave(slides);setDirty(false);}catch(e){setError((e as Error).message);}finally{setSaving(false);}
  }
  async function reset(){
    if(busy||!confirm('Go back to the automatic slides? Your custom slides will be removed.'))return;
    setSaving(true);setError('');
    try{await onReset();}catch(e){setError((e as Error).message);}finally{setSaving(false);}
  }
  const text=(index:number,field:Field,label:string,options:{required?:boolean;area?:boolean;hint?:string}={})=>{
    const slide=slides[index],props={value:slide[field],maxLength:heroFieldLimits[field],required:options.required,disabled:busy};
    return <label>{label}{options.required?'':' (optional)'}
      {options.area?<textarea rows={3} {...props} onChange={e=>update(index,{[field]:e.target.value} as Partial<HeroSlide>)}/>:<input {...props} onChange={e=>update(index,{[field]:e.target.value} as Partial<HeroSlide>)}/>}
      {options.hint&&<small className="hero-slide__hint">{options.hint}</small>}
    </label>;
  };
  return <form className="hero-editor" aria-label="Homepage slides" onSubmit={e=>{e.preventDefault();void save();}}>
    <div className="admin-info hero-editor__status" role="note"><Icon name="info"/><p><strong>{custom?'Showing your custom slides':'Showing the automatic slides'}</strong>{custom?'Customers see the slides saved here. Reset to return to the automatic slides.':'These are the slides customers see right now. Edit them and save to make them your own.'}</p></div>
    <ol className="hero-editor__list">{slides.map((slide,index)=><li key={index} className="a-card hero-slide">
      <div className="hero-slide__head">
        <h2>Slide {index+1}{index===0&&<small>Shown first</small>}</h2>
        <div className="admin-photo-actions">
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={busy||index===0} onClick={()=>move(index,index-1)} aria-label={`Move slide ${index+1} earlier`}>Move earlier</button>
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={busy||index===slides.length-1} onClick={()=>move(index,index+1)} aria-label={`Move slide ${index+1} later`}>Move later</button>
          <button type="button" className="a-btn a-btn--danger-ghost a-btn--sm" disabled={busy||slides.length<=1} onClick={()=>remove(index)} aria-label={`Remove slide ${index+1}`}><Icon name="trash"/>Remove</button>
        </div>
      </div>
      <div className="hero-slide__body">
        <section className="form-section"><h3>Text</h3>
          {text(index,'eyebrow','Eyebrow',{hint:'Small capital text above the heading.'})}
          <div className="form-pair">{text(index,'title','Heading',{required:true})}{text(index,'emphasis','Heading highlight',{hint:'Shown in italic after the heading.'})}</div>
          {text(index,'description','Description',{area:true})}
          <div className="form-pair">
            {text(index,'cta','Button text',{required:true})}
            <label>Button opens category<select value={slide.category} disabled={busy} required onChange={e=>update(index,{category:e.target.value})}>
              {!categories.includes(slide.category)&&<option value={slide.category}>{slide.category||'Choose a category'} (not available)</option>}
              {categories.map(c=><option key={c} value={c}>{c}</option>)}
            </select></label>
          </div>
          <label>Colour mood<select value={slide.tone} disabled={busy} onChange={e=>update(index,{tone:e.target.value as HeroSlide['tone']})}>{heroTones.map(t=><option key={t} value={t}>{toneLabels[t]}</option>)}</select></label>
        </section>
        <section className="form-section"><h3>Photo</h3>
          <SlidePhoto slide={slide} index={index} disabled={busy&&uploads===0} onChange={image=>update(index,{image})} onBusy={onBusy}/>
          {text(index,'alt','Photo description',{required:true,hint:'Describes the photo for screen readers.'})}
          <div className="form-pair">{text(index,'caption','Photo caption')}{text(index,'note','Photo note')}</div>
        </section>
      </div>
    </li>)}</ol>
    <div className="hero-editor__foot">
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="form-modal__buttons">
        <button type="button" className="a-btn a-btn--secondary" disabled={busy||slides.length>=maxHeroSlides} onClick={add}><Icon name="plus"/>Add slide{slides.length>=maxHeroSlides?` (max ${maxHeroSlides})`:''}</button>
        {custom&&<button type="button" className="a-btn a-btn--danger-ghost" disabled={busy} onClick={()=>void reset()}>Reset to automatic</button>}
        <button className="a-btn a-btn--primary" disabled={busy}>{uploads?'Uploading photo…':saving?'Saving…':dirty||!custom?'Save slides':'Saved'}</button>
      </div>
    </div>
  </form>;
}
