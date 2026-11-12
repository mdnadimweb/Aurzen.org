'use client';
import {useId,useRef,useState} from 'react';
import ProductImage from './product-image';
import {maxImageBytes,maxImageMegabytes} from '@aurzen/shared/upload-limits';

const maxPhotos=8;
type FailedUpload={file:File;message:string};
export default function ProductPhoto({initialImage='box',initialImages=[],disabled,onBusy}:{initialImage?:string;initialImages?:string[];disabled:boolean;onBusy:(busy:boolean)=>void}){
  const id=useId();
  const [images,setImages]=useState(()=>Array.from(new Set([initialImage,...initialImages])).filter(image=>image!=='box').slice(0,maxPhotos));
  const [busy,setBusy]=useState(false),[failed,setFailed]=useState<FailedUpload[]>([]),[message,setMessage]=useState('');
  const uploading=useRef(false);
  async function upload(files:File[]){
    if(uploading.current||disabled)return;
    uploading.current=true;setBusy(true);onBusy(true);setMessage('');
    const failures:FailedUpload[]=[];
    let added=0,remaining=maxPhotos-images.length;
    try{
      for(const file of files){
        if(remaining===0){failures.push({file,message:'The gallery is full. Remove a photo before retrying.'});continue;}
        if(!['image/jpeg','image/png','image/webp'].includes(file.type)){failures.push({file,message:'Choose a JPG, PNG or WebP photo.'});continue;}
        if(file.size===0||file.size>maxImageBytes){failures.push({file,message:`Choose a photo between 1 byte and ${maxImageMegabytes} MB.`});continue;}
        try{
          const form=new FormData();form.append('photo',file);
          const response=await fetch('/api/admin/images/',{method:'POST',body:form,credentials:'same-origin'});
          const result=await response.json();
          if(!response.ok)throw new Error(result.error||'Unable to upload this photo.');
          if(typeof result.url!=='string')throw new Error('The upload did not return a photo. Please retry.');
          setImages(current=>[...current,result.url]);remaining--;added++;
        }catch(error){failures.push({file,message:(error as Error).message});}
      }
      setFailed(failures);
      setMessage(`${added} photo${added===1?'':'s'} uploaded. ${failures.length?`${failures.length} could not be uploaded; successful photos are kept.`:'Save the product to apply your gallery.'}`);
    }finally{uploading.current=false;setBusy(false);onBusy(false);}
  }
  const move=(from:number,to:number)=>setImages(current=>{const next=[...current];const [image]=next.splice(from,1);next.splice(to,0,image);return next;});
  return <div className="photo-field">
    <label htmlFor={id}>Product photos ({images.length}/{maxPhotos})</label>
    <input type="hidden" name="image" value={images[0]||'box'}/>
    <input type="hidden" name="images" value={JSON.stringify(images)}/>
    {images.length?<ol className="admin-photo-list">{images.map((image,index)=><li key={image} className="admin-photo-item">
      <ProductImage className="admin-photo-preview" src={image} alt={`Product photo ${index+1}${index===0?', cover image':''}`}/>
      <div><strong>{index===0?'Cover image':`Photo ${index+1}`}</strong><div className="admin-photo-actions">
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={disabled||busy||index===0} onClick={()=>move(index,0)} aria-label={`Make photo ${index+1} the cover`}>Make cover</button>
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={disabled||busy||index===0} onClick={()=>move(index,index-1)} aria-label={`Move photo ${index+1} earlier`}>Move earlier</button>
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={disabled||busy||index===images.length-1} onClick={()=>move(index,index+1)} aria-label={`Move photo ${index+1} later`}>Move later</button>
        <button type="button" className="a-btn a-btn--danger-ghost a-btn--sm" disabled={disabled||busy} onClick={()=>setImages(current=>current.filter((_,i)=>i!==index))} aria-label={`Remove photo ${index+1}`}>Remove</button>
      </div></div>
    </li>)}</ol>:<div className="upload-placeholder">No photos yet. Add photos to your product gallery.</div>}
    <input id={id} type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={disabled||busy||images.length>=maxPhotos} aria-describedby={id+'-help'} onChange={e=>{const files=Array.from(e.currentTarget.files||[]);e.currentTarget.value='';if(files.length)void upload(files);}}/>
    <p id={id+'-help'} className="upload-help">Up to 8 JPG, PNG or WebP photos, {maxImageMegabytes} MB each. Photos are optimized automatically. The first photo is the cover used throughout the store. Removing a photo here keeps its stored file safe for other products.</p>
    {busy&&<p role="status">Uploading photos… Please keep this form open.</p>}
    {message&&<p role="status">{message}</p>}
    {!!failed.length&&<div className="form-error" role="alert"><p>Some photos need attention:</p><ul>{failed.map(({file,message},index)=><li key={index}>{file.name}: {message}</li>)}</ul><div className="photo-retry"><button type="button" className="a-btn a-btn--secondary a-btn--sm" disabled={disabled||busy||images.length>=maxPhotos} onClick={()=>void upload(failed.map(item=>item.file))}>Retry unsuccessful uploads</button><button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={disabled||busy} onClick={()=>setFailed([])}>Dismiss unsuccessful uploads</button></div></div>}
  </div>;
}
