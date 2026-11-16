'use client';
// Admin → Products: category filter (a main category includes its subcategories),
// search, sort and pagination. Changing any of them returns to page one.
import {useEffect,useMemo,useState} from 'react';
import {categoryFamily,mainCategories,money,subcategoriesOf,type Category,type Product} from '@aurzen/shared/catalog';
import Icon from '../admin-icons';
import ProductImage from '../product-image';

export const productsPerPage=20;
const stockLevel=(stock:number)=>stock===0?'out':stock<=5?'low':'in';
const stockText=(stock:number)=>stock===0?'Out of stock':stock<=5?'Low stock':'In stock';
const sorters:Record<string,(a:Product,b:Product)=>number>={newest:(a,b)=>b.id-a.id,oldest:(a,b)=>a.id-b.id,name:(a,b)=>a.name.localeCompare(b.name),'price-asc':(a,b)=>a.price-b.price,'price-desc':(a,b)=>b.price-a.price,'stock-asc':(a,b)=>a.stock-b.stock};

export default function ProductsTable({products,categories,onEdit,onStockInput,onStockSave,onRemove}:{products:Product[];categories:Category[];onEdit:(p:Product)=>void;onStockInput:(id:number,stock:number)=>void;onStockSave:(id:number,stock:number)=>void;onRemove:(p:Product)=>void}){
  const [category,setCategory]=useState(''),[query,setQuery]=useState(''),[sort,setSort]=useState('oldest'),[page,setPage]=useState(1);
  useEffect(()=>setPage(1),[category,query,sort]);
  const filtered=useMemo(()=>{
    const family=category?categoryFamily(categories,category):null;
    const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return products.filter(p=>(!family||family.includes(p.category))&&words.every(w=>(p.name+' '+p.category+' '+(p.tag||'')).toLowerCase().includes(w))).sort(sorters[sort]);
  },[products,categories,category,query,sort]);
  const pages=Math.max(1,Math.ceil(filtered.length/productsPerPage)),current=Math.min(page,pages);
  const shown=filtered.slice((current-1)*productsPerPage,current*productsPerPage);
  const parentOf=(name:string)=>categories.find(c=>c.name===name)?.parent;
  const clear=()=>{setCategory('');setQuery('');};
  return <section className="a-card a-card--flush" aria-label="Products">
    <div className="admin-filters" role="search">
      <label>Category<select value={category} onChange={e=>setCategory(e.target.value)} aria-describedby="product-filter-count">
        <option value="">All categories</option>
        {mainCategories(categories).map(m=><optgroup key={m.name} label={m.name}>
          <option value={m.name}>{m.name}{subcategoriesOf(categories,m.name).length?' (all)':''}</option>
          {subcategoriesOf(categories,m.name).map(s=><option key={s.name} value={s.name}>— {s.name}</option>)}
        </optgroup>)}
      </select></label>
      <label>Search<input type="search" value={query} placeholder="Name, category or label" onChange={e=>setQuery(e.target.value)}/></label>
      <label>Sort<select value={sort} onChange={e=>setSort(e.target.value)}><option value="oldest">Oldest first</option><option value="newest">Newest first</option><option value="name">Name A–Z</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="stock-asc">Stock: lowest first</option></select></label>
      <p id="product-filter-count" className="admin-filters__count" aria-live="polite">{filtered.length} of {products.length} products</p>
    </div>
    {!products.length?<div className="admin-empty"><span className="admin-empty__icon"><Icon name="products"/></span><h3>No products yet.</h3><p>Add your first product to start selling.</p></div>
    :!filtered.length?<div className="admin-empty"><span className="admin-empty__icon"><Icon name="products"/></span><h3>No products match these filters.</h3><p>Try another category or search, or clear the filters.</p><button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={clear}>Clear filters</button></div>
    :<div className="admin-table-wrap"><table className="admin-table admin-table--products"><thead><tr><th scope="col">Product</th><th scope="col">Category</th><th scope="col" className="admin-num">Price</th><th scope="col">Stock</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{shown.map(p=><tr key={p.id}>
      <td data-label="Product"><div className="admin-product"><span className="admin-thumb" aria-hidden="true"><ProductImage src={p.image} alt={p.name} category={p.category}/></span><div><strong>{p.name}</strong>{p.tag&&<small>{p.tag}</small>}</div></div></td>
      <td data-label="Category">{p.category}{parentOf(p.category)&&<small>in {parentOf(p.category)}</small>}</td>
      <td data-label="Price" className="admin-num">{money(p.price)}{p.offer?.enabled&&<small>Offer {p.offer.percent}%</small>}</td>
      <td data-label="Stock"><div className="a-stock" data-level={stockLevel(p.stock)}><span className="a-stock__dot" aria-hidden="true"/><input aria-label={'Stock for '+p.name} aria-describedby={'stock-state-'+p.id} className="stock-input" type="number" min="0" value={p.stock} onChange={e=>{const stock=Number(e.target.value);if(Number.isSafeInteger(stock)&&stock>=0)onStockInput(p.id,stock);}} onBlur={e=>onStockSave(p.id,Number(e.target.value))}/><small id={'stock-state-'+p.id}>{stockText(p.stock)}</small></div></td>
      <td data-label="Actions" className="admin-actions"><button type="button" className="a-btn a-btn--secondary a-btn--sm" data-row-action="edit" aria-label={'Edit '+p.name} onClick={()=>onEdit(p)}><Icon name="edit"/>Edit</button><button type="button" className="a-btn a-btn--danger-ghost a-btn--sm" data-row-action="remove" aria-label={'Remove '+p.name} onClick={()=>onRemove(p)}><Icon name="trash"/>Remove</button></td>
    </tr>)}</tbody></table></div>}
    {filtered.length>productsPerPage&&<nav className="admin-pagination" aria-label="Product pages">
      <button type="button" className="a-btn a-btn--secondary a-btn--sm" disabled={current<=1} onClick={()=>setPage(current-1)}>Previous</button>
      <span aria-live="polite">Page {current} of {pages} · {(current-1)*productsPerPage+1}–{Math.min(current*productsPerPage,filtered.length)} of {filtered.length}</span>
      <button type="button" className="a-btn a-btn--secondary a-btn--sm" disabled={current>=pages} onClick={()=>setPage(current+1)}>Next</button>
    </nav>}
  </section>;
}
