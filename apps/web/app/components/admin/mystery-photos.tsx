'use client';
// Homepage → Mystery box section: several photos (uploaded in one go), shown in turn on the storefront.
import {useId,useState} from 'react';
import {maxImageBytes,maxImageMegabytes} from '@aurzen/shared/upload-limits';
import {mysteryImageLimit} from '@aurzen/shared/site';
import Icon from '../admin-icons';

const types=['image/jpeg','image/png','image/webp'];

async function uploadOne(file:File){
  const form=new FormData();form.append('photo',file);
  const response=await fetch('/api/admin/images/',{method:'POST',body:form,credentials:'same-origin'});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||'Unable to upload '+file.name+'. Please try again.');
  if(typeof result.url!=='string')throw new Error('The upload of '+file.name+' did not return a photo.');
  return result.url as string;
}

export default function MysteryPhotos({images,interval,onImages,onInterval}:{images:string[];interval:number;onImages:(images:string[])=>void;onInterval:(seconds:number)=>void}){
  const id=useId();
  const [busy,setBusy]=useState(''),[error,setError]=useState('');
  const room=mysteryImageLimit-images.length;
  async function add(files:File[]){
    setError('');
    const chosen=files.slice(0,room),skipped=files.length-chosen.length;
    const bad=chosen.find(f=>!types.includes(f.type)||f.size===0||f.size>maxImageBytes);
    if(bad){setError(bad.name+': choose a JPG, PNG or WebP photo up to '+maxImageMegabytes+' MB.');return;}
    let list=images;
    try{
      for(const [i,file] of chosen.entries()){
        setBusy('Uploading photo '+(i+1)+' of '+chosen.length+'… Please keep this page open.');
        list=[...list,await uploadOne(file)];onImages(list);
      }
      if(skipped>0)setError('Only '+mysteryImageLimit+' photos fit; '+skipped+' were not added.');
    }catch(e){setError((e as Error).message);}
    finally{setBusy('');}
  }
  const move=(from:number,to:number)=>{const next=images.slice();const [x]=next.splice(from,1);next.splice(to,0,x);onImages(next);};
  return <fieldset className="mystery-photos" disabled={!!busy}>
    <legend>Photos <span>(shown in turn instead of the box drawing)</span></legend>
    {images.length>0?<ol className="mystery-photos__list">{images.map((src,i)=><li key={src+i}>
      <img src={src} alt={'Photo '+(i+1)} loading="lazy"/>
      <span className="mystery-photos__n">{i+1}</span>
      <div className="mystery-photos__tools">
        <button type="button" className="a-btn a-btn--icon a-btn--sm" aria-label={'Move photo '+(i+1)+' earlier'} disabled={i===0} onClick={()=>move(i,i-1)}><Icon name="chevron" style={{transform:'rotate(180deg)'}}/></button>
        <button type="button" className="a-btn a-btn--icon a-btn--sm" aria-label={'Move photo '+(i+1)+' later'} disabled={i===images.length-1} onClick={()=>move(i,i+1)}><Icon name="chevron"/></button>
        <button type="button" className="a-btn a-btn--icon a-btn--sm" aria-label={'Remove photo '+(i+1)} onClick={()=>onImages(images.filter((_,j)=>j!==i))}><Icon name="trash"/></button>
      </div>
    </li>)}</ol>:<p className="hero-slide__hint">No photos yet: the homepage shows the AURZÉN box drawing.</p>}
    <div className="mystery-photos__add">
      <label className="a-btn a-btn--secondary a-btn--sm" htmlFor={id} aria-disabled={room<=0}><Icon name="plus"/>Add photos</label>
      <input id={id} className="sr-only" type="file" multiple accept={types.join(',')} disabled={room<=0||!!busy} onChange={e=>{const files=[...(e.currentTarget.files||[])];e.currentTarget.value='';if(files.length)void add(files);}}/>
      <small>Pick several at once. JPG, PNG or WebP, up to {maxImageMegabytes} MB each · {images.length}/{mysteryImageLimit} photos.</small>
    </div>
    <label className="mystery-photos__interval">Change photo every
      <span><input type="number" min={2} max={30} step={1} value={interval} onChange={e=>onInterval(Math.round(Number(e.target.value)||5))}/> seconds</span>
    </label>
    {busy&&<p role="status">{busy}</p>}
    {error&&<p className="form-error" role="alert">{error}</p>}
  </fieldset>;
}
