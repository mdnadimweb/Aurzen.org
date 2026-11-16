'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {sizePresets,variantLimits,type Product} from '@aurzen/shared/catalog';

const colourPresets=['Black','White','Off-white','Beige','Navy','Red','Maroon','Pink','Green','Blue','Grey','Brown'];

// One optional choice (sizes or colours) for a product. Turned off = an empty list,
// and the storefront then shows no picker for it.
function VariantList({kind,name,initial,presets,disabled}:{kind:'size'|'colour';name:string;initial:string[];presets:readonly string[];disabled:boolean}){
  const id=useId(),input=useRef<HTMLInputElement>(null);
  const [enabled,setEnabled]=useState(initial.length>0),[list,setList]=useState<string[]>(initial),[draft,setDraft]=useState(''),[error,setError]=useState('');
  const plural=kind==='size'?'sizes':'colours';
  const has=(value:string)=>list.some(item=>item.toLowerCase()===value.toLowerCase());
  const add=(raw:string)=>{
    const value=raw.replace(/\s+/g,' ').trim();
    if(!value)return;
    if(value.length>variantLimits.length){setError(`Keep each ${kind} to ${variantLimits.length} characters or fewer.`);return;}
    if(has(value)){setError(`${value} is already added.`);return;}
    if(list.length>=variantLimits.count){setError(`Use at most ${variantLimits.count} ${plural}.`);return;}
    setList(current=>[...current,value]);setDraft('');setError('');
  };
  const toggle=(value:string)=>has(value)?setList(current=>current.filter(item=>item.toLowerCase()!==value.toLowerCase())):add(value);
  const missing=enabled&&list.length===0;
  // Blocks saving while the choice is on but empty, with a clear browser message.
  useEffect(()=>{input.current?.setCustomValidity(missing?`Add at least one ${kind}, or turn ${plural} off.`:'');},[missing,kind,plural]);
  return <fieldset className="admin-variants__group" disabled={disabled}>
    <legend>{kind==='size'?'Sizes':'Colours'}</legend>
    <label className="offer-toggle"><input type="checkbox" checked={enabled} onChange={event=>{setEnabled(event.target.checked);setError('');}}/>This product comes in different {plural}</label>
    <input type="hidden" name={name} value={JSON.stringify(enabled?list:[])}/>
    {!enabled?<p className="field-hint">Off: customers won't be asked to choose a {kind}.</p>:<>
      <div className="admin-variants__presets" role="group" aria-label={`Common ${plural}`}>
        {presets.map(value=><button key={value} type="button" className="admin-variants__preset" aria-pressed={has(value)} onClick={()=>toggle(value)}>{value}</button>)}
      </div>
      <div className="admin-variants__add">
        <label htmlFor={id}>Add your own {kind}</label>
        <div><input ref={input} id={id} value={draft} maxLength={variantLimits.length} placeholder={kind==='size'?'e.g. 38, 40 or 2-3 years':'e.g. Mint green'} aria-describedby={error?id+'-error':undefined}
          onChange={event=>{setDraft(event.target.value);setError('');}}
          onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();add(draft);}}}/>
          <button type="button" className="a-btn a-btn--secondary a-btn--sm" disabled={!draft.trim()} onClick={()=>add(draft)}>Add</button></div>
      </div>
      {error&&<p id={id+'-error'} className="field-error" role="alert">{error}</p>}
      {list.length?<ul className="admin-variants__chosen" aria-label={`Available ${plural}, in the order customers see them`}>
        {list.map(value=><li key={value}><span>{value}</span><button type="button" aria-label={`Remove ${value}`} onClick={()=>setList(current=>current.filter(item=>item!==value))}>×</button></li>)}
      </ul>:<p className="field-hint">Choose from the list above or add your own.</p>}
    </>}
  </fieldset>;
}

export default function AdminVariants({product,disabled}:{product:Product|null;disabled:boolean}){
  return <section className="form-section admin-variants"><h3>Sizes & colours</h3>
    <p className="field-hint">Turn these on only if customers need to choose. Products without them show no size or colour picker.</p>
    <VariantList kind="size" name="sizes" initial={product?.sizes||[]} presets={sizePresets} disabled={disabled}/>
    <VariantList kind="colour" name="colors" initial={product?.colors||[]} presets={colourPresets} disabled={disabled}/>
  </section>;
}
