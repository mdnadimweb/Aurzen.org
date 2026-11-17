'use client';
// Product category in two steps: the main category, then (optionally) one of its subcategories.
// The form still posts a single `category` value: the subcategory when one is chosen, else the main one.
import {useState} from 'react';
import {mainCategories,subcategoriesOf,type Category} from '@aurzen/shared/catalog';

export default function CategoryPicker({categories,initial}:{categories:Category[];initial?:string}){
  const mains=mainCategories(categories);
  const current=categories.find(c=>c.name===initial);
  const [main,setMain]=useState(current?.parent||current?.name||mains[0]?.name||'');
  const [sub,setSub]=useState(current?.parent?current.name:'');
  const subs=subcategoriesOf(categories,main);
  return <>
    <input type="hidden" name="category" value={sub||main}/>
    <div className="form-pair">
      <label>Category<select value={main} onChange={e=>{setMain(e.target.value);setSub('');}} required>
        {mains.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
      </select></label>
      <label>Subcategory<select value={sub} onChange={e=>setSub(e.target.value)} disabled={!subs.length} aria-describedby="subcategory-hint">
        <option value="">{subs.length?'None (just '+main+')':'No subcategories yet'}</option>
        {subs.map(s=><option key={s.name} value={s.name}>{s.name}</option>)}
      </select></label>
    </div>
    <p id="subcategory-hint" className="form-hint">{subs.length?'Products in a subcategory also appear on the main '+main+' page.':'To add one, create a subcategory under '+(main||'a category')+' in the Categories tab.'}</p>
  </>;
}
