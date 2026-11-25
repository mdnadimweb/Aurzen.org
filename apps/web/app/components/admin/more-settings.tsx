'use client';
// Studio screens: scheduled sales, appearance, redirects, size guides and gift options.
import {useState} from 'react';
import {defaultAppearance,type Sale,type SizeGuide} from '@aurzen/shared/site';
import EditableCard,{EditableGroup,RowTools,move,newId} from './editable-card';
import ImageField from './image-field';
import type {SiteProps} from './site-settings';

const local=(v:string|null)=>v?new Date(new Date(v).getTime()-new Date(v).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
const iso=(v:string)=>v?new Date(v).toISOString():null;
const when=(s:{startsAt:string|null;endsAt:string|null})=>(s.startsAt?'from '+new Date(s.startsAt).toLocaleDateString('en-BD'):'now')+(s.endsAt?' until '+new Date(s.endsAt).toLocaleDateString('en-BD'):'');
function status(s:Sale){const now=Date.now();if(!s.active)return {text:'Off',tone:'off' as const};if(s.endsAt&&now>=Date.parse(s.endsAt))return {text:'Ended',tone:'off' as const};if(s.startsAt&&now<Date.parse(s.startsAt))return {text:'Scheduled',tone:'warn' as const};return {text:'Running',tone:'on' as const};}

export function SalesEditor(p:SiteProps){
  const sales=p.site.sales,[busy,setBusy]=useState(false);
  const save=(items:Sale[])=>p.saveSite('sales',{...sales,items});
  const mains=p.categories;
  return <EditableGroup>
    <p className="hero-slide__hint">A sale gives a % discount for a date range and switches on and off by itself. A product’s own offer (set on the product) always wins over a sale.</p>
    {sales.items.map((s,i)=><EditableCard key={s.id} title={s.name+' · '+s.percent+'% off'} summary={(s.target==='all'?'Everything':s.target==='category'?s.category:s.products.length+' products')+' · '+when(s)} badge={status(s)} initial={s}
      actions={<RowTools index={i} count={sales.items.length} label={s.name} onMove={(a,b)=>void save(move(sales.items,a,b))} onRemove={()=>void save(sales.items.filter(x=>x.id!==s.id))}/>}
      onSave={v=>save(sales.items.map(x=>x.id===s.id?v:x))}
      render={(d,set)=><>
        <div className="form-pair"><label>Name<input value={d.name} maxLength={60} onChange={e=>set({...d,name:e.target.value})}/></label><label>Discount (%)<input type="number" min={1} max={90} value={d.percent} onChange={e=>set({...d,percent:Math.round(Number(e.target.value)||0)})}/></label></div>
        <div className="form-pair"><label>Applies to<select value={d.target} onChange={e=>set({...d,target:e.target.value as Sale['target'],category:e.target.value==='category'?d.category||mains[0]?.name||'':''})}><option value="all">Every product</option><option value="category">A category (with its subcategories)</option><option value="products">Chosen products</option></select></label>
          {d.target==='category'&&<label>Category<select value={d.category} onChange={e=>set({...d,category:e.target.value})}>{mains.map(c=><option key={c.name} value={c.name}>{c.parent?c.parent+' › ':''}{c.name}</option>)}</select></label>}</div>
        {d.target==='products'&&<fieldset className="ec-tags sale-products"><legend>Products</legend>{p.products.map(x=><label key={x.id} className="ec-toggle"><input type="checkbox" checked={d.products.includes(x.id)} onChange={e=>set({...d,products:e.target.checked?[...d.products,x.id]:d.products.filter(id=>id!==x.id)})}/><span>{x.name}</span></label>)}</fieldset>}
        <div className="form-pair"><label>Starts<input type="datetime-local" value={local(d.startsAt)} onChange={e=>set({...d,startsAt:iso(e.target.value)})}/></label><label>Ends<input type="datetime-local" value={local(d.endsAt)} onChange={e=>set({...d,endsAt:iso(e.target.value)})}/></label></div>
        <label className="ec-toggle"><input type="checkbox" checked={d.active} onChange={e=>set({...d,active:e.target.checked})}/><span>Active</span></label>
      </>}/>)}
    <button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>void save([...sales.items,{id:newId('sale'),name:'New sale',percent:10,target:'all',category:'',products:[],startsAt:null,endsAt:null,active:false}])}>+ Add sale</button>
    <h2 className="ec-heading">Sale page</h2>
    <EditableCard title="Sale page text & banner" thumb={sales.page.banner} summary={sales.page.title+' · '+sales.page.intro} initial={sales.page} onSave={page=>p.saveSite('sales',{...sales,page})}
      render={(d,set)=><>
        <div className="form-pair"><label>Eyebrow<input value={d.eyebrow} maxLength={60} onChange={e=>set({...d,eyebrow:e.target.value})}/></label><label>Title<input value={d.title} maxLength={80} onChange={e=>set({...d,title:e.target.value})}/></label></div>
        <label>Intro<textarea rows={2} maxLength={300} value={d.intro} onChange={e=>set({...d,intro:e.target.value})}/></label>
        <ImageField label="Banner (wide)" optional value={d.banner} onChange={banner=>set({...d,banner})} onBusy={setBusy} disabled={busy}/>
      </>}/>
  </EditableGroup>;
}

export function AppearanceEditor(p:SiteProps){
  const a=p.site.appearance;
  const color=(k:'primary'|'accent'|'background'|'text',label:string,d:typeof a,set:(x:typeof a)=>void)=><label>{label}<span className="color-field"><input type="color" value={d[k]} onChange={e=>set({...d,[k]:e.target.value})}/><input value={d[k]} maxLength={7} onChange={e=>set({...d,[k]:e.target.value})}/></span></label>;
  return <EditableGroup>
    <EditableCard title="Colours & fonts" summary={[a.primary,a.accent,a.background].join(' · ')+' · '+a.headingFont+' / '+a.bodyFont} initial={a} onSave={v=>p.saveSite('appearance',v)} onReset={()=>p.saveSite('appearance',{...defaultAppearance,maintenance:a.maintenance,maintenanceMessage:a.maintenanceMessage})}
      render={(d,set)=><>
        <div className="form-pair">{color('primary','Main colour (plum)',d,set)}{color('accent','Accent (gold)',d,set)}</div>
        <div className="form-pair">{color('background','Background',d,set)}{color('text','Text',d,set)}</div>
        <div className="form-pair"><label>Heading font<select value={d.headingFont} onChange={e=>set({...d,headingFont:e.target.value as typeof d.headingFont})}><option value="cormorant">Cormorant (current)</option><option value="georgia">Georgia</option><option value="system">Clean sans-serif</option></select></label>
          <label>Body font<select value={d.bodyFont} onChange={e=>set({...d,bodyFont:e.target.value as typeof d.bodyFont})}><option value="dm-sans">DM Sans (current)</option><option value="system">Phone’s own font</option></select></label></div>
        <p className="hero-slide__hint">“Restore default” brings back the original AURZÉN look.</p>
      </>}/>
    <EditableCard title="Buttons, product cards & animation" summary={`${a.buttons} ${a.buttonFill} buttons · photos ${a.imageRatio==='default'?'standard':a.imageRatio} · animation ${a.motion}`} initial={a} onSave={v=>p.saveSite('appearance',v)}
      render={(d,set)=><>
        <div className="form-pair"><label>Button shape<select value={d.buttons} onChange={e=>set({...d,buttons:e.target.value as typeof d.buttons})}><option value="pill">Rounded pill (current)</option><option value="rounded">Soft corners</option><option value="square">Square</option></select></label>
          <label>Button style<select value={d.buttonFill} onChange={e=>set({...d,buttonFill:e.target.value as typeof d.buttonFill})}><option value="filled">Filled</option><option value="outline">Outline</option></select></label></div>
        <div className="form-pair"><label>Product photo shape<select value={d.imageRatio} onChange={e=>set({...d,imageRatio:e.target.value as typeof d.imageRatio})}><option value="default">Standard (current)</option><option value="4/5">Portrait 4:5</option><option value="1/1">Square 1:1</option></select></label>
          <label>Animation<select value={d.motion} onChange={e=>set({...d,motion:e.target.value as typeof d.motion})}><option value="normal">Normal</option><option value="slow">Slow</option><option value="off">Off</option></select></label></div>
        <label className="ec-toggle"><input type="checkbox" checked={d.showBadge} onChange={e=>set({...d,showBadge:e.target.checked})}/><span>Show product labels on cards</span></label>
        <label className="ec-toggle"><input type="checkbox" checked={d.showSaved} onChange={e=>set({...d,showSaved:e.target.checked})}/><span>Show “you save” text on cards</span></label>
        <p className="hero-slide__hint">Visitors who ask their phone for less motion never see animations.</p>
      </>}/>
    <EditableCard title="Maintenance mode & page-not-found" summary={(a.maintenance?'Shop closed for maintenance':'Shop open')+' · 404: '+a.notFoundTitle} badge={a.maintenance?{text:'Maintenance on',tone:'warn'}:undefined} initial={a} onSave={v=>p.saveSite('appearance',v)}
      render={(d,set)=><>
        <label className="ec-toggle"><input type="checkbox" checked={d.maintenance} onChange={e=>set({...d,maintenance:e.target.checked})}/><span>Maintenance mode (the shop shows only a message; the studio keeps working)</span></label>
        <label>Maintenance message<textarea rows={2} maxLength={300} value={d.maintenanceMessage} onChange={e=>set({...d,maintenanceMessage:e.target.value})}/></label>
        <div className="form-pair"><label>Page-not-found title<input value={d.notFoundTitle} maxLength={80} onChange={e=>set({...d,notFoundTitle:e.target.value})}/></label><label>Page-not-found text<input value={d.notFoundText} maxLength={300} onChange={e=>set({...d,notFoundText:e.target.value})}/></label></div>
      </>}/>
  </EditableGroup>;
}

export function RedirectsEditor(p:SiteProps){
  const r=p.site.redirects;
  return <EditableGroup><EditableCard title="Redirects" summary={r.items.length+' old address'+(r.items.length===1?'':'es')+' forwarded'} initial={r} onSave={v=>p.saveSite('redirects',v)} onReset={()=>p.resetSite('redirects')}
    validate={v=>v.items.some(x=>!x.from.trim()||!x.to.trim())?'Fill in both addresses on every row.':''}
    render={(d,set)=><>
      <p className="hero-slide__hint">Old links (from Facebook posts or older pages) are forwarded permanently (301) to the new address. Example: /collections/old-name/ → /collections/ladies-fashion/</p>
      <div className="ec-list">{d.items.map((x,i)=><div key={i} className="ec-list__item"><div className="form-pair">
        <label>Old address<input value={x.from} maxLength={300} placeholder="/old-page/" onChange={e=>set({items:d.items.map((y,j)=>j===i?{...y,from:e.target.value}:y)})}/></label>
        <label>New address<input value={x.to} maxLength={300} placeholder="/collections/…/" onChange={e=>set({items:d.items.map((y,j)=>j===i?{...y,to:e.target.value}:y)})}/></label></div>
        <RowTools index={i} count={d.items.length} label={'redirect '+(x.from||i+1)} onMove={(a,b)=>set({items:move(d.items,a,b)})} onRemove={()=>set({items:d.items.filter((_,j)=>j!==i)})}/></div>)}
        <button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>set({items:[...d.items,{from:'',to:''}]})}>+ Add redirect</button></div>
    </>}/></EditableGroup>;
}

export function SizeGuidesEditor(p:SiteProps){
  const guides=p.site.sizeGuides.items,save=(items:SizeGuide[])=>p.saveSite('sizeGuides',{items});
  const ordered=p.categories.filter(c=>!c.parent).flatMap(m=>[m,...p.categories.filter(s=>s.parent===m.name)]);
  return <EditableGroup>
    <p className="hero-slide__hint">A “Size guide” link appears on product pages whose product, subcategory or main category is chosen here.</p>
    {guides.map((g,i)=><EditableCard key={g.id} title={g.name} summary={g.columns.join(' · ')+' · '+g.rows.length+' sizes · '+(g.categories.length+g.products.length?g.categories.length+' categories, '+g.products.length+' products':'not used yet')} initial={g}
      actions={<RowTools index={i} count={guides.length} label={g.name} onMove={(a,b)=>void save(move(guides,a,b))} onRemove={()=>void save(guides.filter(x=>x.id!==g.id))}/>}
      onSave={v=>save(guides.map(x=>x.id===g.id?v:x))}
      render={(d,set)=><>
        <label>Name<input value={d.name} maxLength={60} onChange={e=>set({...d,name:e.target.value})}/></label>
        <div className="size-guide__table"><table className="admin-table"><thead><tr>{d.columns.map((c,k)=><th key={k}><input aria-label={'Column '+(k+1)} value={c} maxLength={30} onChange={e=>set({...d,columns:d.columns.map((x,j)=>j===k?e.target.value:x)})}/></th>)}<th/></tr></thead>
          <tbody>{d.rows.map((r,ri)=><tr key={ri}>{d.columns.map((_,k)=><td key={k}><input aria-label={'Row '+(ri+1)+' column '+(k+1)} value={r[k]||''} maxLength={30} onChange={e=>set({...d,rows:d.rows.map((row,j)=>j===ri?d.columns.map((__,c)=>c===k?e.target.value:row[c]||''):row)})}/></td>)}<td><button type="button" className="a-btn a-btn--danger-ghost a-btn--sm" aria-label={'Remove row '+(ri+1)} onClick={()=>set({...d,rows:d.rows.filter((_,j)=>j!==ri)})}>×</button></td></tr>)}</tbody></table></div>
        <div className="order-tools__actions"><button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>set({...d,rows:[...d.rows,d.columns.map(()=>'')]})}>+ Row</button>
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={d.columns.length>=8} onClick={()=>set({...d,columns:[...d.columns,'New'],rows:d.rows.map(r=>[...r,''])})}>+ Column</button>
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={d.columns.length<=2} onClick={()=>set({...d,columns:d.columns.slice(0,-1),rows:d.rows.map(r=>r.slice(0,d.columns.length-1))})}>− Last column</button></div>
        <label>Note under the table<input value={d.note} maxLength={300} onChange={e=>set({...d,note:e.target.value})}/></label>
        <fieldset className="ec-tags"><legend>Show for these categories</legend>{ordered.map(c=><label key={c.slug} className="ec-toggle"><input type="checkbox" checked={d.categories.includes(c.slug)} onChange={e=>set({...d,categories:e.target.checked?[...d.categories,c.slug]:d.categories.filter(x=>x!==c.slug)})}/><span>{c.parent?'↳ ':''}{c.name}</span></label>)}</fieldset>
        <label>Or for single products<select value="" onChange={e=>{const id=Number(e.target.value);if(id&&!d.products.includes(id))set({...d,products:[...d.products,id]});}}><option value="">Add a product…</option>{p.products.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        {d.products.length>0&&<ul className="customer-orders">{d.products.map(id=><li key={id}>{p.products.find(x=>x.id===id)?.name||'Removed product'} <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={()=>set({...d,products:d.products.filter(x=>x!==id)})}>Remove</button></li>)}</ul>}
      </>}/>)}
    <button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>void save([...guides,{id:newId('guide'),name:'New size guide',columns:['Size','Chest','Length'],rows:[['S','',''],['M','',''],['L','','']],note:'',categories:[],products:[]}])}>+ Add size guide</button>
  </EditableGroup>;
}

export function GiftsEditor(p:SiteProps){
  const g=p.site.gifts;
  const mains=p.categories.filter(c=>!c.parent);
  return <EditableGroup><EditableCard title="Gift options at checkout" summary={[g.wrap&&'Gift wrap ৳'+g.wrapPrice,g.card&&'Message card'].filter(Boolean).join(' · ')||'Off'} badge={g.wrap||g.card?{text:'On',tone:'on'}:{text:'Off',tone:'off'}} initial={g} onSave={v=>p.saveSite('gifts',v)}
    render={(d,set)=><>
      <div className="form-pair"><label className="ec-toggle"><input type="checkbox" checked={d.wrap} onChange={e=>set({...d,wrap:e.target.checked})}/><span>Offer gift wrap</span></label><label>Gift wrap price (৳, 0 = free)<input type="number" min={0} value={d.wrapPrice} onChange={e=>set({...d,wrapPrice:Math.round(Number(e.target.value)||0)})}/></label></div>
      <div className="form-pair"><label className="ec-toggle"><input type="checkbox" checked={d.card} onChange={e=>set({...d,card:e.target.checked})}/><span>Offer a message card</span></label><label>Message length (characters)<input type="number" min={20} max={500} value={d.cardLimit} onChange={e=>set({...d,cardLimit:Math.round(Number(e.target.value)||0)})}/></label></div>
      <fieldset className="ec-tags"><legend>Offered when the bag has something from</legend>{mains.map(c=><label key={c.slug} className="ec-toggle"><input type="checkbox" checked={d.categories.includes(c.slug)} onChange={e=>set({...d,categories:e.target.checked?[...d.categories,c.slug]:d.categories.filter(x=>x!==c.slug)})}/><span>{c.name}</span></label>)}</fieldset>
      <p className="hero-slide__hint">With nothing ticked, Mystery Box and Love &amp; Care get gift options automatically. To switch it on or off for one product, open the product and use “Gift wrap &amp; message card” (or select several in Products → Bulk action → Set gift option). Choices show on the order and the printed invoice.</p>
    </>}/></EditableGroup>;
}

export function MysteryEditor(p:SiteProps){
  const m=p.site.mysteryBox;
  return <EditableGroup><EditableCard title="Mystery Box details" summary={(m.worth?'Worth at least ৳'+m.worth.toLocaleString('en-BD')+' · ':'')+(m.steps.length?m.steps.length+' steps':'Not filled in yet')} initial={m} onSave={v=>p.saveSite('mysteryBox',v)}
    render={(d,set)=><>
      <p className="hero-slide__hint">Shown on every Mystery Box product page. Customers still choose their style before adding to the bag.</p>
      <label>What’s guaranteed inside<textarea rows={3} maxLength={600} value={d.guaranteed} onChange={e=>set({...d,guaranteed:e.target.value})}/></label>
      <label>Worth at least (৳, 0 = hide)<input type="number" min={0} value={d.worth} onChange={e=>set({...d,worth:Math.round(Number(e.target.value)||0)})}/></label>
      <div className="ec-list"><strong>How it works</strong>{d.steps.map((s,i)=><div key={i} className="ec-list__head"><input aria-label={'Step '+(i+1)} value={s} maxLength={160} onChange={e=>set({...d,steps:d.steps.map((x,j)=>j===i?e.target.value:x)})}/><RowTools index={i} count={d.steps.length} label={'step '+(i+1)} onMove={(a,b)=>set({...d,steps:move(d.steps,a,b)})} onRemove={()=>set({...d,steps:d.steps.filter((_,j)=>j!==i)})}/></div>)}
        {d.steps.length<6&&<button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>set({...d,steps:[...d.steps,'']})}>+ Add step</button>}</div>
      <label>No-spoiler note<textarea rows={2} maxLength={300} value={d.noSpoiler} onChange={e=>set({...d,noSpoiler:e.target.value})}/></label>
    </>} validate={v=>v.steps.some(s=>!s.trim())?'Fill in or remove empty steps.':''}/></EditableGroup>;
}

export function BannersEditor(p:SiteProps){
  const b=p.site.banners;
  return <EditableGroup><EditableCard title="Promotion banner settings" summary={(b.enabled?'Shown':'Hidden')+' · '+b.interval+' s per banner · '+(b.transition==='fade'?'fade':'slide')} badge={b.enabled?{text:'On',tone:'on'}:{text:'Off',tone:'off'}} initial={b} onSave={v=>p.saveSite('banners',v)}
    render={(d,set)=><>
      <label className="ec-toggle"><input type="checkbox" checked={d.enabled} onChange={e=>set({...d,enabled:e.target.checked})}/><span>Show the promotion banners on the homepage</span></label>
      <div className="form-pair"><label>Seconds per banner<input type="number" min={2} max={20} step={0.5} value={d.interval} onChange={e=>set({...d,interval:Number(e.target.value)})}/></label>
        <label>Change style<select value={d.transition} onChange={e=>set({...d,transition:e.target.value as 'slide'|'fade'})}><option value="slide">Slide</option><option value="fade">Fade</option></select></label></div>
      <p className="hero-slide__hint">Each banner’s own link, images and dates are edited in the list below.</p>
    </>}/></EditableGroup>;
}
