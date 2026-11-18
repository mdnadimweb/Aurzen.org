'use client';
// Add/edit product on its own page (/admin/products/new/, /admin/products/<id>/). A page cannot be
// dismissed by a stray click outside it, and leaving with unsaved changes asks first.
import {useEffect,useRef,useState} from 'react';
import type {Category,Product} from '@aurzen/shared/catalog';
import ProductPhoto from '../product-photo';
import AdminOffer from '../admin-offer';
import AdminVariants from '../admin-variants';
import CategoryPicker from './category-picker';
import Icon from '../admin-icons';

type Props={product:Product|null;categories:Category[];onSave:(data:Record<string,unknown>)=>Promise<void>;onCancel:()=>void;onDirty:(dirty:boolean)=>void};
const snapshot=(form:HTMLFormElement)=>JSON.stringify(Array.from(new FormData(form).entries()).map(([k,v])=>[k,typeof v==='string'?v:v.name]));

export default function ProductEditor({product,categories,onSave,onCancel,onDirty}:Props){
  const form=useRef<HTMLFormElement>(null),initial=useRef('');
  const [saving,setSaving]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState(''),[offerPrice,setOfferPrice]=useState(product?.price||0);
  // Changed = the form's current values differ from when it opened. Photo uploads, sizes and colours
  // update hidden fields without typing, so the check also runs after clicks and once a second.
  const check=()=>{if(form.current&&initial.current)onDirty(snapshot(form.current)!==initial.current);};
  useEffect(()=>{
    const start=setTimeout(()=>{if(form.current)initial.current=snapshot(form.current);},0);
    const timer=setInterval(check,1000);
    return()=>{clearTimeout(start);clearInterval(timer);onDirty(false);};
  },[]);
  const later=()=>setTimeout(check,0);
  const busy=saving||uploading;
  return <form ref={form} aria-label={product?'Edit product':'Add product'} className="form-modal form-page" onInput={later} onChange={later} onClickCapture={later} onSubmit={async e=>{
    e.preventDefault();
    if(busy)return;
    setSaving(true);setError('');
    const f=new FormData(e.currentTarget);
    try{
      await onSave({action:'saveProduct',id:product?.id,name:f.get('name'),category:f.get('category'),price:Number(f.get('price')),stock:Number(f.get('stock')),image:f.get('image')||'box',images:JSON.parse(String(f.get('images')||'[]')),description:f.get('description'),tag:f.get('tag'),offer:JSON.parse(String(f.get('offer')||'null')),sizes:JSON.parse(String(f.get('sizes')||'[]')),colors:JSON.parse(String(f.get('colors')||'[]'))});
    }catch(err){setError((err as Error).message);setSaving(false);}
  }}>
    <div className="form-modal__head"><div><button type="button" className="text-link form-page__back" disabled={busy} onClick={onCancel}>← Back to products</button><div className="admin-eyebrow">Grow your collection</div><h2>{product?'Edit product':'Add product'}</h2></div></div>
    <div className="form-modal__body">
      <div className="form-modal__main">
        <section className="form-section"><h3>Product details</h3>
          <label>Name<input name="name" autoFocus defaultValue={product?.name||''} required minLength={2} maxLength={100}/></label>
          <CategoryPicker categories={categories} initial={product?.category}/>
          <label>Product label<input name="tag" defaultValue={product?.tag||'NEW ARRIVAL'} maxLength={40}/></label>
        </section>
        <section className="form-section"><h3>Pricing & stock</h3><div className="form-pair"><label>Price (৳)<input name="price" type="number" min="1" step="1" max="1000000" defaultValue={product?.price} onChange={event=>setOfferPrice(Number(event.target.value))} required/></label><label>Stock<input name="stock" type="number" min="0" step="1" max="1000000" defaultValue={product?.stock} required/></label></div></section>
        <section className="form-section"><h3>Description</h3><label>Description<textarea name="description" defaultValue={product?.description||''} maxLength={3000} rows={6} placeholder="Materials, fit, care instructions and what is included"/></label></section>
        <AdminVariants product={product} disabled={saving}/>
      </div>
      <div className="form-modal__side">
        <section className="form-section"><h3>Photos</h3><ProductPhoto initialImage={product?.image||'box'} initialImages={product?.images||[]} disabled={saving} onBusy={setUploading}/></section>
        <AdminOffer initialOffer={product?.offer} price={offerPrice} disabled={saving}/>
      </div>
    </div>
    <div className="form-modal__foot">{error&&<p className="form-error" role="alert"><Icon name="alert"/> {error}</p>}<div className="form-modal__buttons"><button type="button" className="a-btn a-btn--secondary" disabled={busy} onClick={onCancel}>Cancel</button><button className="a-btn a-btn--primary" disabled={busy}>{uploading?'Uploading photo…':saving?'Saving…':'Save product'}</button></div></div>
  </form>;
}
