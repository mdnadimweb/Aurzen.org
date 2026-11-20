'use client';
import {useState} from 'react';
import {type Category,type Product} from '@aurzen/shared/catalog';
import {csv,download} from './site-settings';

type Run=(data:Record<string,unknown>)=>Promise<void>;
const columns=['id','name','category','price','stock','tag','sku','status','description'];

/** Minimal CSV reader: quoted fields, doubled quotes, commas and new lines inside quotes. */
export function parseCsv(text:string){
  const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
  const src=text.replace(/^﻿/,'');
  for(let i=0;i<src.length;i++){
    const c=src[i];
    if(quoted){if(c==='"'){if(src[i+1]==='"'){field+='"';i++;}else quoted=false;}else field+=c;continue;}
    if(c==='"')quoted=true;else if(c===','){row.push(field);field='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&src[i+1]==='\n')i++;row.push(field);rows.push(row);row=[];field='';}else field+=c;
  }
  if(field||row.length){row.push(field);rows.push(row);}
  return rows.filter(r=>r.some(x=>x.trim()));
}
/** Bulk bar for selected products plus CSV export/import (owners; staff get export only). */
export default function ProductBulk({selected,filtered,categories,owner,onRun,onClear}:{selected:Product[];filtered:Product[];categories:Category[];owner:boolean;onRun:Run;onClear:()=>void}){
  const [op,setOp]=useState(''),[value,setValue]=useState(''),[busy,setBusy]=useState(false),[preview,setPreview]=useState<Record<string,string>[]|null>(null),[error,setError]=useState('');
  const leaves=categories.filter(c=>!categories.some(x=>x.parent===c.name));
  async function apply(){
    const payload=op==='price'?Math.round(Number(value)):value;
    if(!op||value==='')return;
    if(!confirm(`Apply to ${selected.length} product${selected.length===1?'':'s'}?`))return;
    setBusy(true);setError('');
    try{await onRun({action:'bulkProducts',op,ids:selected.map(p=>p.id),value:payload});setOp('');setValue('');onClear();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function readFile(file:File){
    setError('');
    const rows=parseCsv(await file.text());
    if(rows.length<2){setError('The file has no product rows.');return;}
    const head=rows[0].map(h=>h.trim().toLowerCase());
    if(!head.includes('name')||!head.includes('category')||!head.includes('price')){setError('The first row must include name, category and price columns (export a CSV to see the layout).');return;}
    setPreview(rows.slice(1).map(r=>Object.fromEntries(head.map((h,i)=>[h,(r[i]||'').trim()]))));
  }
  async function importRows(){
    if(!preview)return;
    setBusy(true);setError('');
    try{await onRun({action:'importProducts',rows:preview.map(r=>({id:r.id||'',name:r.name,category:r.category,price:Number(r.price),stock:Number(r.stock||0),tag:r.tag||'',sku:r.sku||'',status:r.status||'',description:r.description||''}))});setPreview(null);}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <div className="order-bulk product-bulk">
    <span>{selected.length?selected.length+' selected':'Select products for bulk changes'}</span>
    {owner&&<>
      <select aria-label="Bulk action" value={op} disabled={!selected.length||busy} onChange={e=>{setOp(e.target.value);setValue('');}}><option value="">Bulk action…</option><option value="status">Set status</option><option value="price">Change price by %</option><option value="category">Move to category</option></select>
      {op==='status'&&<select aria-label="New status" value={value} onChange={e=>setValue(e.target.value)}><option value="">Choose…</option><option value="active">Active</option><option value="draft">Draft</option><option value="hidden">Hidden</option></select>}
      {op==='price'&&<input aria-label="Percent change" type="number" min={-90} max={300} placeholder="e.g. 10 or -15" value={value} onChange={e=>setValue(e.target.value)}/>}
      {op==='category'&&<select aria-label="New category" value={value} onChange={e=>setValue(e.target.value)}><option value="">Choose…</option>{leaves.map(c=><option key={c.name} value={c.name}>{c.parent?c.parent+' › ':''}{c.name}</option>)}</select>}
      <button type="button" className="a-btn a-btn--primary a-btn--sm" disabled={!op||value===''||busy} onClick={()=>void apply()}>{busy?'Working…':'Apply'}</button>
    </>}
    <button type="button" className="a-btn a-btn--secondary a-btn--sm" disabled={!filtered.length} onClick={()=>download(`aurzen-products-${new Date().toISOString().slice(0,10)}.csv`,csv([columns,...filtered.map(p=>[p.id,p.name,p.category,p.price,p.stock,p.tag||'',p.extra?.sku||'',p.extra?.status||'active',p.description||''])]))}>Export {filtered.length} to CSV</button>
    {owner&&<label className="a-btn a-btn--ghost a-btn--sm product-bulk__import">Import CSV<input type="file" accept=".csv,text/csv" className="sr-only" onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)void readFile(file);}}/></label>}
    {error&&<p className="form-error" role="alert">{error}</p>}
    {preview&&<div className="product-import" role="dialog" aria-label="Import preview">
      <h3>Check before importing</h3>
      <p className="hero-slide__hint">{preview.filter(r=>r.id).length} rows update existing products (by ID) · {preview.filter(r=>!r.id).length} new products are added as <strong>Drafts</strong> (hidden until you publish them). Photos are not imported. Nothing is deleted. If any row is wrong, nothing is saved.</p>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{['ID','Name','Category','Price','Stock','Status'].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{preview.slice(0,50).map((r,i)=><tr key={i}><td>{r.id||'new'}</td><td>{r.name}</td><td>{r.category}</td><td>{r.price}</td><td>{r.stock}</td><td>{r.status||(r.id?'unchanged':'draft')}</td></tr>)}</tbody></table></div>
      {preview.length>50&&<p className="hero-slide__hint">…and {preview.length-50} more rows.</p>}
      <div className="ec__buttons"><button type="button" className="a-btn a-btn--ghost" disabled={busy} onClick={()=>setPreview(null)}>Cancel</button><button type="button" className="a-btn a-btn--primary" disabled={busy} onClick={()=>void importRows()}>{busy?'Importing…':`Import ${preview.length} rows`}</button></div>
    </div>}
  </div>;
}
