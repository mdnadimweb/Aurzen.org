'use client';
import {defaultProductExtra,type Product} from '@aurzen/shared/catalog';

/** Studio-only product details: status, SKU, material, care, low-stock level, stock per size, SEO, related. */
export function ProductExtraFields({product,products,disabled}:{product:Product|null;products:Product[];disabled?:boolean}){
  const e={...defaultProductExtra,...product?.extra};
  const sizes=product?.sizes||[];
  return <>
    <section className="form-section"><h3>Status & details</h3>
      <div className="form-pair"><label>Status<select name="x-status" defaultValue={e.status} disabled={disabled}><option value="active">Active — shown in the shop</option><option value="draft">Draft — not shown</option><option value="hidden">Hidden — not shown</option></select></label>
        <label>SKU (optional)<input name="x-sku" defaultValue={e.sku} maxLength={60} disabled={disabled}/></label></div>
      <label className="ec-toggle"><input type="checkbox" name="x-featured" defaultChecked={e.featured} disabled={disabled}/><span>Featured (pinned first in “Newest” lists)</span></label>
      <label>Fabric / material<input name="x-material" defaultValue={e.material} maxLength={200} disabled={disabled}/></label>
      <label>Care instructions<textarea name="x-care" defaultValue={e.care} maxLength={600} rows={2} disabled={disabled}/></label>
      <label>Low-stock warning at<input name="x-lowStock" type="number" min={0} max={10000} defaultValue={e.lowStock} disabled={disabled}/></label>
    </section>
    {sizes.length>0&&<section className="form-section"><h3>Stock per size (optional)</h3>
      <p className="hero-slide__hint">Fill these to track each size; the total stock is then their sum and each size sells out on its own. Leave all empty to use one total. (Save first after changing the size list.)</p>
      <div className="size-stock">{sizes.map(s=><label key={s}>{s}<input name={'x-size:'+s} type="number" min={0} max={1000000} defaultValue={e.sizeStock[s]??''} disabled={disabled}/></label>)}</div>
    </section>}
    <section className="form-section"><h3>Search & related</h3>
      <label>SEO title (optional)<input name="x-seoTitle" defaultValue={e.seoTitle} maxLength={90} disabled={disabled}/></label>
      <label>SEO description (optional)<textarea name="x-seoDescription" defaultValue={e.seoDescription} maxLength={170} rows={2} disabled={disabled}/></label>
      <label>Related products (hold Ctrl / ⌘ to pick several; empty = same subcategory)<select name="x-related" multiple size={5} defaultValue={e.related.map(String)} disabled={disabled}>{products.filter(p=>p.id!==product?.id).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    </section>
  </>;
}
/** Reads the fields above from the submitted form. */
export function readProductExtra(f:FormData){
  const sizeStock:Record<string,number>={};
  for(const [key,value] of f.entries())if(key.startsWith('x-size:')&&String(value).trim()!=='')sizeStock[key.slice(7)]=Math.round(Number(value));
  return {status:f.get('x-status')||'active',sku:f.get('x-sku')||'',featured:f.get('x-featured')==='on',material:f.get('x-material')||'',care:f.get('x-care')||'',lowStock:Math.round(Number(f.get('x-lowStock')??5)),sizeStock,seoTitle:f.get('x-seoTitle')||'',seoDescription:f.get('x-seoDescription')||'',related:f.getAll('x-related').map(Number)};
}
