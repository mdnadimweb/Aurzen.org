'use client';
// One image chosen by upload (the authenticated /api/admin/images flow) or an HTTPS link.
import {useId,useRef,useState} from 'react';
import {shrinkPhoto} from './shrink-photo';
import ProductImage from '../product-image';

export default function ImageField({label,value,onChange,onBusy,disabled,optional=false,hint}:{label:string;value:string;onChange:(image:string)=>void;onBusy:(busy:boolean)=>void;disabled?:boolean;optional?:boolean;hint?:string}){
  const id=useId(),uploading=useRef(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const isLink=!!value&&!/^\/(media|images)\//.test(value);
  async function upload(file:File){
    if(uploading.current||disabled)return;
    setError('');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Choose a JPG, PNG or WebP photo.');return;}
    uploading.current=true;setBusy(true);onBusy(true);
    try{
      const photo=await shrinkPhoto(file);
      const form=new FormData();form.append('photo',photo);
      const response=await fetch('/api/admin/images/',{method:'POST',body:form,credentials:'same-origin'});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Unable to upload this photo. Please try again.');
      if(typeof result.url!=='string')throw new Error('The upload did not return a photo. Please retry.');
      onChange(result.url);
    }catch(e){setError((e as Error).message);}
    finally{uploading.current=false;setBusy(false);onBusy(false);}
  }
  return <fieldset className="image-field" disabled={disabled}>
    <legend>{label}{optional?' (optional)':''}</legend>
    <div className="image-field__preview">{value?<ProductImage src={value} alt={label+' preview'}/>:<span>No image yet</span>}</div>
    <div className="image-field__controls">
      <label htmlFor={id}>Upload a photo</label>
      <input id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled||busy} aria-describedby={id+'-help'} onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)void upload(file);}}/>
      <small id={id+'-help'}>{hint||'JPG, PNG or WebP, any size (large photos are made smaller before upload).'}</small>
      <label>Or paste an HTTPS image link<input type="url" inputMode="url" placeholder="https://…" value={isLink?value:''} maxLength={2000} disabled={disabled||busy} onChange={e=>onChange(e.target.value.trim())}/></label>
      {value&&<button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={disabled||busy} onClick={()=>onChange('')}>Remove image</button>}
      {busy&&<p role="status">Uploading photo… Please keep this page open.</p>}
      {error&&<p className="form-error" role="alert">{error}</p>}
    </div>
  </fieldset>;
}
