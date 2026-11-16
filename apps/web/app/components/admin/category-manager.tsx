'use client';
// Admin → Categories: main categories with one level of subcategories.
import {useEffect,useState} from 'react';
import {categoryFamily,categoryLimits,categoryPath,mainCategories,subcategoriesOf,type Category,type Product} from '@aurzen/shared/catalog';
import Modal from '../modal';
import Icon from '../admin-icons';
import ImageField from './image-field';
import ProductImage from '../product-image';

type Draft={original:string|null;name:string;parent:string;cover:string};
export default function CategoryManager({categories,products,onSave,onDelete,requestNew,onRequestHandled}:{categories:Category[];products:Product[];onSave:(data:Record<string,unknown>)=>Promise<void>;onDelete:(name:string)=>Promise<void>;requestNew?:boolean;onRequestHandled?:()=>void}){
  const [draft,setDraft]=useState<Draft|null>(null),[saving,setSaving]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState('');
  const open=(category:Category|null,parent='')=>{setError('');setDraft(category?{original:category.name,name:category.name,parent:category.parent||'',cover:category.cover||''}:{original:null,name:'',parent,cover:''});};
  useEffect(()=>{if(requestNew){open(null);onRequestHandled?.();}},[requestNew]);
  const count=(name:string,family=false)=>products.filter(p=>(family?categoryFamily(categories,name):[name]).includes(p.category)).length;
  const mains=mainCategories(categories);
  const editingMainWithSubs=!!draft?.original&&subcategoriesOf(categories,draft.original).length>0;
  async function save(){
    if(!draft||saving||uploading)return;
    setSaving(true);setError('');
    try{
      const payload={name:draft.name,parent:draft.parent||null,cover:draft.parent?null:draft.cover||null};
      await onSave(draft.original?{action:'editCategory',original:draft.original,...payload}:{action:'addCategory',...payload});
      setDraft(null);
    }catch(e){setError((e as Error).message);}finally{setSaving(false);}
  }
  const remove=async(c:Category)=>{if(confirm(`Remove ${c.name}? This cannot be undone.`))await onDelete(c.name);};
  const row=(c:Category,sub=false)=><li key={c.name} className={'category-row'+(sub?' category-row--sub':'')}>
    <span className="category-row__thumb" aria-hidden="true">{!sub&&c.cover?<ProductImage src={c.cover} alt=""/>:<Icon name={sub?'chevron':'categories'}/>}</span>
    <div className="category-row__copy"><strong>{c.name}</strong><small>{sub?`${count(c.name)} product${count(c.name)===1?'':'s'}`:`${count(c.name,true)} product${count(c.name,true)===1?'':'s'} · ${subcategoriesOf(categories,c.name).length} subcategor${subcategoriesOf(categories,c.name).length===1?'y':'ies'}`} · <a href={categoryPath(categories,c.name)} target="_blank" rel="noreferrer">{categoryPath(categories,c.name)}</a></small></div>
    <div className="admin-photo-actions">
      {!sub&&<button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={()=>open(null,c.name)}><Icon name="plus"/>Subcategory</button>}
      <button type="button" className="a-btn a-btn--secondary a-btn--sm" aria-label={'Edit '+c.name} onClick={()=>open(c)}><Icon name="edit"/>Edit</button>
      <button type="button" className="a-btn a-btn--danger-ghost a-btn--sm" aria-label={'Remove category '+c.name} onClick={()=>void remove(c)}><Icon name="trash"/></button>
    </div>
  </li>;
  return <section className="a-card category-manager" aria-label="Categories">
    <div className="category-manager__head"><p className="hero-slide__hint">Main categories appear on the homepage and in the menu. Subcategories sit inside one main category. A category can be removed once it has no products or subcategories.</p><button type="button" className="a-btn a-btn--primary" onClick={()=>open(null)}><Icon name="plus"/>Add category</button></div>
    {!mains.length?<div className="admin-empty"><span className="admin-empty__icon"><Icon name="categories"/></span><h3>No categories yet.</h3><p>Add your first main category.</p></div>
    :<ul className="category-list">{mains.map(m=><li key={m.name}><ul>{row(m)}{subcategoriesOf(categories,m.name).map(s=>row(s,true))}</ul></li>)}</ul>}
    <Modal open={!!draft} onClose={()=>{if(!saving&&!uploading)setDraft(null);}} label={draft?.original?'Edit category':'Add category'} className="admin-edit-dialog admin-edit-dialog--category">{draft&&<form className="form-modal" aria-label={draft.original?'Edit category':'Add category'} onSubmit={e=>{e.preventDefault();void save();}}>
      <div className="form-modal__head"><div><div className="admin-eyebrow">Organise your store</div><h2>{draft.original?'Edit '+draft.original:draft.parent?'Add a subcategory':'Add category'}</h2></div><button type="button" aria-label="Close form" className="a-btn a-btn--icon close" disabled={saving||uploading} onClick={()=>setDraft(null)}><Icon name="close"/></button></div>
      <div className="form-modal__body"><div className="form-modal__main">
        <section className="form-section"><h3>Category</h3>
          <label>Name<input autoFocus required minLength={2} maxLength={categoryLimits.name} value={draft.name} disabled={saving} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
          <label>Type<select value={draft.parent} disabled={saving||editingMainWithSubs} onChange={e=>setDraft({...draft,parent:e.target.value})}>
            <option value="">Main category</option>
            {mains.filter(m=>m.name!==draft.original).map(m=><option key={m.name} value={m.name}>Subcategory of {m.name}</option>)}
          </select></label>
          {editingMainWithSubs&&<small className="hero-slide__hint">This category has subcategories, so it stays a main category.</small>}
          {draft.original&&<small className="hero-slide__hint">Renaming keeps the same web address, so shared links keep working. Products in this category move with it.</small>}
        </section>
        {!draft.parent&&<section className="form-section"><h3>Cover</h3><ImageField label="Cover image" optional value={draft.cover} disabled={saving} onBusy={setUploading} onChange={cover=>setDraft(d=>d&&{...d,cover})} hint="Shown on the homepage tile. Without one, a product photo from this category is used."/></section>}
      </div></div>
      <div className="form-modal__foot">{error&&<p className="form-error" role="alert">{error}</p>}<div className="form-modal__buttons"><button type="button" className="a-btn a-btn--secondary" disabled={saving||uploading} onClick={()=>setDraft(null)}>Cancel</button><button className="a-btn a-btn--primary" disabled={saving||uploading}>{uploading?'Uploading photo…':saving?'Saving…':'Save category'}</button></div></div>
    </form>}</Modal>
  </section>;
}
