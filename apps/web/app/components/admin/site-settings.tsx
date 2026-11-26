'use client';
// Studio screens for everything stored in the `site` settings row and the `content` row.
// Every section is an EditableCard: collapsed summary, Edit opens the form, Save goes to the server.
import {useState,type ReactNode} from 'react';
import {money,type Category,type Product} from '@aurzen/shared/catalog';
import {homeSectionLabels,cardLabels,cardLabelText,type CategorySettings,linkHref,linkTypeLabels,type Content,type ContentPage,type FaqGroup,type NavItem,type Review,type SiteLink,type SiteSettings,shopWhatsApp,displayWhatsAppNumber,extraMessageTemplates} from '@aurzen/shared/site';
import EditableCard,{EditableGroup,RowTools,move,newId} from './editable-card';
import LinkPicker from './link-picker';
import ImageField from './image-field';

export type SiteProps={site:SiteSettings;content:Content;categories:Category[];products:Product[];
  saveSite:<K extends keyof SiteSettings>(section:K,value:SiteSettings[K])=>Promise<void>;resetSite:(section:keyof SiteSettings)=>Promise<void>;
  saveContent:<K extends keyof Content>(section:K,value:Content[K])=>Promise<void>};

// ---- small field helpers ----
type Setter<T>=(next:T)=>void;
function Text<T>({label,draft,set,k,max=200,area=false,hint,type='text',required=false}:{label:string;draft:T;set:Setter<T>;k:keyof T;max?:number;area?:boolean;hint?:string;type?:string;required?:boolean}){
  const value=String(draft[k]??'');
  return <label>{label}{area?<textarea rows={3} value={value} maxLength={max} required={required} onChange={e=>set({...draft,[k]:e.target.value})}/>:<input type={type} value={value} maxLength={max} required={required} onChange={e=>set({...draft,[k]:e.target.value})}/>}{hint&&<small className="hero-slide__hint">{hint}</small>}</label>;
}
function Num<T>({label,draft,set,k,min=0,max=1000000,hint}:{label:string;draft:T;set:Setter<T>;k:keyof T;min?:number;max?:number;hint?:string}){
  return <label>{label}<input type="number" inputMode="numeric" min={min} max={max} step={1} value={String(draft[k]??0)} onChange={e=>set({...draft,[k]:e.target.value===''?0:Math.round(Number(e.target.value))})}/>{hint&&<small className="hero-slide__hint">{hint}</small>}</label>;
}
function Toggle<T>({label,draft,set,k,hint}:{label:string;draft:T;set:Setter<T>;k:keyof T;hint?:string}){
  return <label className="ec-toggle"><input type="checkbox" checked={!!draft[k]} onChange={e=>set({...draft,[k]:e.target.checked})}/><span>{label}{hint&&<small className="hero-slide__hint"> {hint}</small>}</span></label>;
}
function DateTime({label,value,onChange}:{label:string;value:string|null;onChange:(v:string|null)=>void}){
  const local=value?new Date(new Date(value).getTime()-new Date(value).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
  return <label>{label}<input type="datetime-local" value={local} onChange={e=>onChange(e.target.value?new Date(e.target.value).toISOString():null)}/></label>;
}
const Pair=({children}:{children:ReactNode})=><div className="form-pair">{children}</div>;
const onOff=(on:boolean,yes='On',no='Off')=>({text:on?yes:no,tone:on?'on' as const:'off' as const});
const describe=(link:SiteLink|null,p:SiteProps)=>!link?'No link':link.type==='category'?link.value:link.type==='product'?(p.products.find(x=>String(x.id)===link.value)?.name||'Missing product'):link.type==='page'?(p.content.pages.find(x=>x.slug===link.value)?.title||'Missing page'):link.type==='url'?link.value:linkTypeLabels[link.type];
const imgThumb=(src:string)=>src&&src!=='box'?src:'';

// ---- Navigation lists (menu, footer columns, legal links) ----
function NavListEditor({items,set,p,label,max=12}:{items:NavItem[];set:(items:NavItem[])=>void;p:SiteProps;label:string;max?:number}){
  return <div className="ec-list">
    {items.map((item,i)=><div key={item.id} className="ec-list__item">
      <div className="ec-list__head"><strong>{item.label||'Untitled'}</strong><small>{describe(item.link,p)}{item.hidden?' · hidden':''}</small><RowTools index={i} count={items.length} label={item.label||'link'} onMove={(a,b)=>set(move(items,a,b))} onRemove={()=>set(items.filter(x=>x.id!==item.id))}/></div>
      <Pair><label>Label<input value={item.label} maxLength={40} onChange={e=>set(items.map(x=>x.id===item.id?{...x,label:e.target.value}:x))}/></label>
      <LinkPicker label="Goes to" value={item.link} allowCategories categories={p.categories} products={p.products} pages={p.content.pages} onChange={link=>link&&set(items.map(x=>x.id===item.id?{...x,link}:x))}/></Pair>
      <label className="ec-toggle"><input type="checkbox" checked={!item.hidden} onChange={e=>set(items.map(x=>x.id===item.id?{...x,hidden:!e.target.checked}:x))}/><span>Show this link</span></label>
    </div>)}
    {items.length<max&&<button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>set([...items,{id:newId('link'),label:'New link',link:{type:'shop',value:''},hidden:false}])}>+ Add {label} link</button>}
  </div>;
}

export function StorefrontSettings(p:SiteProps){
  const {site}=p;
  return <EditableGroup>
    <h2 className="ec-heading">Announcement bar</h2>
    <EditableCard title="Announcement messages" summary={site.announcement.items.map(a=>a.text).join(' · ')||'No messages'} badge={onOff(site.announcement.enabled)} initial={site.announcement} onSave={v=>p.saveSite('announcement',v)} onReset={()=>p.resetSite('announcement')} validate={v=>v.items.some(i=>!i.text.trim())?'Every message needs text.':''}
      render={(d,set)=><>
        <Pair><Toggle label="Show the announcement bar" draft={d} set={set} k="enabled"/><Num label="Seconds per message" draft={d} set={set} k="interval" min={3} max={20}/></Pair>
        <div className="ec-list">{d.items.map((a,i)=>{const up=(x:Partial<typeof a>)=>set({...d,items:d.items.map(m=>m.id===a.id?{...m,...x}:m)});return <div key={a.id} className="ec-list__item">
          <div className="ec-list__head"><strong>Message {i+1}</strong><small>{a.active?'Active':'Paused'}</small><RowTools index={i} count={d.items.length} label={'message '+(i+1)} onMove={(x,y)=>set({...d,items:move(d.items,x,y)})} onRemove={()=>set({...d,items:d.items.filter(m=>m.id!==a.id)})}/></div>
          <Pair><label>Message<input value={a.text} maxLength={80} onChange={e=>up({text:e.target.value})}/></label><label>Detail (optional)<input value={a.detail} maxLength={80} onChange={e=>up({detail:e.target.value})}/></label></Pair>
          <LinkPicker label="Link (optional)" optional value={a.link} categories={p.categories} products={p.products} pages={p.content.pages} onChange={link=>up({link})}/>
          <Pair><DateTime label="Start (optional)" value={a.startsAt} onChange={v=>up({startsAt:v})}/><DateTime label="End (optional)" value={a.endsAt} onChange={v=>up({endsAt:v})}/></Pair>
          <label className="ec-toggle"><input type="checkbox" checked={a.active} onChange={e=>up({active:e.target.checked})}/><span>Active</span></label>
        </div>;})}
        {d.items.length<10&&<button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>set({...d,items:[...d.items,{id:newId('msg'),text:'',detail:'',link:null,active:true,startsAt:null,endsAt:null}]})}>+ Add message</button>}</div>
      </>}/>
    <h2 className="ec-heading">Navigation & footer</h2>
    <EditableCard title="Main menu" summary={site.navigation.items.filter(i=>!i.hidden).map(i=>i.link.type==='categories'?'[categories]':i.label).join(' · ')} initial={site.navigation} onSave={v=>p.saveSite('navigation',v)} onReset={()=>p.resetSite('navigation')}
      render={(d,set)=><><p className="hero-slide__hint">“Every main category (automatic)” inserts all main categories in their current order.</p><NavListEditor items={d.items} set={items=>set({items})} p={p} label="menu"/></>}/>
    <EditableCard title="Footer" summary={site.footer.columns.map(c=>c.title).join(' · ')+' · Contact · bottom bar'} initial={site.footer} onSave={v=>p.saveSite('footer',v)} onReset={()=>p.resetSite('footer')}
      render={(d,set)=><>
        <p className="hero-slide__hint">The brand column (logo, footer text, social links) and the Contact column come from General settings.</p>
        {d.columns.map((c,i)=><div key={c.id} className="ec-list__item">
          <div className="ec-list__head"><strong>Column: {c.title}</strong><RowTools index={i} count={d.columns.length} label={'column '+c.title} onMove={(x,y)=>set({...d,columns:move(d.columns,x,y)})} onRemove={()=>set({...d,columns:d.columns.filter(x=>x.id!==c.id)})}/></div>
          <Pair><label>Heading<input value={c.title} maxLength={40} onChange={e=>set({...d,columns:d.columns.map(x=>x.id===c.id?{...x,title:e.target.value}:x)})}/></label><label className="ec-toggle"><input type="checkbox" checked={!c.hidden} onChange={e=>set({...d,columns:d.columns.map(x=>x.id===c.id?{...x,hidden:!e.target.checked}:x)})}/><span>Show column</span></label></Pair>
          <NavListEditor items={c.links} set={links=>set({...d,columns:d.columns.map(x=>x.id===c.id?{...x,links}:x)})} p={p} label="column"/>
        </div>)}
        {d.columns.length<3&&<button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>set({...d,columns:[...d.columns,{id:newId('col'),title:'New column',hidden:false,links:[]}]})}>+ Add column</button>}
        <h4>Bottom bar</h4>
        <Text label="Text after © year and brand" draft={d} set={set} k="bottomText" max={120}/>
        <label>Payment labels (one per line)<textarea rows={2} value={d.payments.join('\n')} onChange={e=>set({...d,payments:e.target.value.split('\n').map(x=>x.trimStart()).filter((x,i,a)=>x||i===a.length-1).slice(0,8)})}/></label>
        <NavListEditor items={d.legal} set={legal=>set({...d,legal})} p={p} label="bottom bar" max={6}/>
        <h4>Newsletter signup</h4>
        <Toggle label="Show email / phone signup in the footer" draft={d.newsletter} set={newsletter=>set({...d,newsletter})} k="enabled"/>
        <Pair><Text label="Title" draft={d.newsletter} set={newsletter=>set({...d,newsletter})} k="title" max={80}/><Text label="Text" draft={d.newsletter} set={newsletter=>set({...d,newsletter})} k="text" max={160}/></Pair>
      </>} validate={v=>v.payments.some(x=>!x.trim())?'Remove empty payment labels.':''}/>
    <h2 className="ec-heading">Homepage text</h2>
    <EditableCard title="Homepage sections (order & visibility)" summary={site.home.order.filter(s=>!site.home.hidden.includes(s)).map(s=>homeSectionLabels[s]).join(' → ')} initial={site.home} onSave={v=>p.saveSite('home',v)}
      render={(d,set)=><><p className="hero-slide__hint">The big slideshow always comes first. Arrange the sections below it.</p><div className="ec-list">{d.order.map((s,i)=><div key={s} className="ec-list__item"><div className="ec-list__head"><strong>{homeSectionLabels[s]}</strong><RowTools index={i} count={d.order.length} label={homeSectionLabels[s]} onMove={(a,b)=>set({...d,order:move(d.order,a,b)})}/></div>
        <label className="ec-toggle"><input type="checkbox" checked={!d.hidden.includes(s)} onChange={e=>set({...d,hidden:e.target.checked?d.hidden.filter(x=>x!==s):[...d.hidden,s]})}/><span>Show</span></label></div>)}</div></>}/>
    <EditableCard title="Trust strip" summary={site.home.trust.filter(t=>!t.hidden).map(t=>t.text).join(' · ')} initial={site.home} onSave={v=>p.saveSite('home',v)}
      render={(d,set)=><div className="ec-list">{d.trust.map((t,i)=>{const up=(x:Partial<typeof t>)=>set({...d,trust:d.trust.map(m=>m.id===t.id?{...m,...x}:m)});return <div key={t.id} className="ec-list__item">
        <div className="ec-list__head"><strong>{t.text||'Item'}</strong><RowTools index={i} count={d.trust.length} label={t.text||'item'} onMove={(x,y)=>set({...d,trust:move(d.trust,x,y)})} onRemove={()=>set({...d,trust:d.trust.filter(m=>m.id!==t.id)})}/></div>
        <Pair><label>Icon (a symbol, optional)<input value={t.icon} maxLength={4} onChange={e=>up({icon:e.target.value})}/></label><label>Text<input value={t.text} maxLength={40} onChange={e=>up({text:e.target.value})}/></label></Pair>
        <label className="ec-toggle"><input type="checkbox" checked={!t.hidden} onChange={e=>up({hidden:!e.target.checked})}/><span>Show</span></label></div>;})}
        {d.trust.length<6&&<button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>set({...d,trust:[...d.trust,{id:newId('trust'),icon:'',text:'',hidden:false}]})}>+ Add item</button>}</div>}/>
    <EditableCard title="Favourites row" summary={site.home.favourites.title+' · '+site.home.favourites.count+' products'} badge={onOff(!site.home.favourites.hidden,'Shown','Hidden')} initial={site.home} onSave={v=>p.saveSite('home',v)}
      render={(d,set)=>{const f=d.favourites,s=(favourites:typeof f)=>set({...d,favourites});return <>
        <label className="ec-toggle"><input type="checkbox" checked={!f.hidden} onChange={e=>s({...f,hidden:!e.target.checked})}/><span>Show this row</span></label>
        <Pair><Text label="Eyebrow" draft={f} set={s} k="eyebrow" max={60}/><Text label="Heading" draft={f} set={s} k="title" max={80} required/></Pair>
        <Pair><Text label="Button text" draft={f} set={s} k="cta" max={40}/><label>Products shown<select value={f.count} onChange={e=>s({...f,count:Number(e.target.value)})}><option value={4}>4</option><option value={8}>8</option></select></label></Pair>
        <Pair><label>Products come from<select value={f.source} onChange={e=>s({...f,source:e.target.value as typeof f.source,category:e.target.value==='category'?f.category||p.categories[0]?.name||'':f.category})}><option value="first">First products in the shop</option><option value="newest">Newest arrivals</option><option value="bestsellers">Best sellers (last 90 days)</option><option value="sale">On sale now</option><option value="category">A category</option><option value="manual">Hand-picked</option></select></label>
          {f.source==='category'&&<label>Category<select value={f.category} onChange={e=>s({...f,category:e.target.value})}>{p.categories.map(c=><option key={c.name} value={c.name}>{c.parent?c.parent+' › ':''}{c.name}</option>)}</select></label>}</Pair>
        {f.source==='manual'&&<><label>Add a product<select value="" onChange={e=>{const id=Number(e.target.value);if(id&&!f.ids.includes(id)&&f.ids.length<8)s({...f,ids:[...f.ids,id]});}}><option value="">Choose…</option>{p.products.filter(x=>!f.ids.includes(x.id)).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <div className="ec-list">{f.ids.map((id,i)=><div key={id} className="ec-list__head"><span>{p.products.find(x=>x.id===id)?.name||'Removed product'}</span><RowTools index={i} count={f.ids.length} label="product" onMove={(a,b)=>s({...f,ids:move(f.ids,a,b)})} onRemove={()=>s({...f,ids:f.ids.filter(x=>x!==id)})}/></div>)}</div></>}
        <p className="hero-slide__hint">Products shown here are not repeated in the category rows below.</p></>;}}/>
    <EditableCard title="Mystery box section" summary={site.home.mystery.title.replace(/\n/g,' ')} badge={onOff(!site.home.mystery.hidden,'Shown','Hidden')} initial={site.home} onSave={v=>p.saveSite('home',v)}
      render={(d,set)=>{const m=d.mystery,s=(mystery:typeof m)=>set({...d,mystery});return <>
        <label className="ec-toggle"><input type="checkbox" checked={!m.hidden} onChange={e=>s({...m,hidden:!e.target.checked})}/><span>Show this section (needs a Mystery category)</span></label>
        <Pair><Text label="Eyebrow" draft={m} set={s} k="eyebrow" max={60}/><Text label="Heading (Enter for a new line)" draft={m} set={s} k="title" max={80} area required/></Pair>
        <Text label="Text" draft={m} set={s} k="text" max={400} area/>
        <Pair><Text label="Button text" draft={m} set={s} k="cta" max={40}/><Text label="Small print" draft={m} set={s} k="small" max={120}/></Pair></>;}}/>
    <EditableCard title="A note from the brand" summary={site.home.note.title+' '+site.home.note.emphasis} badge={onOff(!site.home.note.hidden,'Shown','Hidden')} initial={site.home} onSave={v=>p.saveSite('home',v)} onReset={()=>p.resetSite('home')}
      render={(d,set)=>{const n=d.note,s=(note:typeof n)=>set({...d,note});return <>
        <label className="ec-toggle"><input type="checkbox" checked={!n.hidden} onChange={e=>s({...n,hidden:!e.target.checked})}/><span>Show this section</span></label>
        <Pair><Text label="Eyebrow" draft={n} set={s} k="eyebrow" max={60}/><Text label="Heading" draft={n} set={s} k="title" max={80} required/></Pair>
        <Text label="Highlighted line (italic)" draft={n} set={s} k="emphasis" max={80}/><Text label="Text" draft={n} set={s} k="text" max={600} area/></>;}}/>
  </EditableGroup>;
}

export function GeneralSettings(p:SiteProps){
  const {site}=p,[busy,setBusy]=useState(false);
  const g=site.general,c=site.checkout;
  return <EditableGroup>
    <EditableCard title="Brand & logo" thumb={g.logo||'/brand/aurzen-logo.png'} summary={g.brand+' · '+g.tagline} initial={g} onSave={v=>p.saveSite('general',v)}
      render={(d,set)=><>
        <Pair><Text label="Brand name" draft={d} set={set} k="brand" max={40} required/><Text label="Tagline" draft={d} set={set} k="tagline" max={120}/></Pair>
        <Text label="Footer text (under the logo)" draft={d} set={set} k="about" max={300} area/>
        <ImageField label="Logo on dark footer" optional value={d.logoDark} onChange={logoDark=>set({...d,logoDark})} onBusy={setBusy} disabled={busy} hint="Leave empty to keep the gold logo."/>
        <ImageField label="Favicon (square)" optional value={d.favicon} onChange={favicon=>set({...d,favicon})} onBusy={setBusy} disabled={busy}/>
        <Text label="Business info shown in the footer" draft={d} set={set} k="businessInfo" max={300} area hint="For example trade licence or registered name."/>
      </>}/>
    <EditableCard title="Contact & social" summary={[g.whatsapp&&'WhatsApp '+g.whatsapp,g.phone,g.email,[g.facebook,g.instagram,g.tiktok,g.youtube].filter(Boolean).length+' social links'].filter(Boolean).join(' · ')} initial={g} onSave={v=>p.saveSite('general',v)}
      render={(d,set)=><>
        <Pair><Text label="WhatsApp number" draft={d} set={set} k="whatsapp" max={25} hint="Type it any way (01XXXXXXXXX or +880 1XXX-XXXXXX); it is saved as 8801XXXXXXXXX and used by every WhatsApp button and link."/><Text label="Phone" draft={d} set={set} k="phone" max={30}/></Pair>
        <Pair><Text label="Email" type="email" draft={d} set={set} k="email" max={120}/><Text label="Messenger / Facebook page link" draft={d} set={set} k="messenger" max={500}/></Pair>
        <Pair><Text label="Support hours" draft={d} set={set} k="hours" max={120}/><Text label="Address" draft={d} set={set} k="address" max={300} area/></Pair>
        <Pair><Text label="Facebook" draft={d} set={set} k="facebook" max={500}/><Text label="Instagram" draft={d} set={set} k="instagram" max={500}/></Pair>
        <Pair><Text label="TikTok" draft={d} set={set} k="tiktok" max={500}/><Text label="YouTube" draft={d} set={set} k="youtube" max={500}/></Pair>
        <p className="hero-slide__hint">Filled-in contact details appear as a Contact column in the footer.</p>
      </>}/>
    <EditableCard title="Delivery charges" summary={`Dhaka ${money(c.dhaka)} · Outside ${money(c.outside)}`+(c.freeThreshold?` · Free from ${money(c.freeThreshold)}`:'')+(c.minOrder?` · Minimum ${money(c.minOrder)}`:'')} initial={c} onSave={v=>p.saveSite('checkout',v)}
      render={(d,set)=><>
        <Pair><Num label="Dhaka city (৳)" draft={d} set={set} k="dhaka" max={5000}/><Num label="Outside Dhaka (৳)" draft={d} set={set} k="outside" max={5000}/></Pair>
        <Pair><Num label="Free delivery from (৳)" draft={d} set={set} k="freeThreshold" hint="0 = off"/><Num label="Minimum order (৳)" draft={d} set={set} k="minOrder" hint="0 = no minimum"/></Pair>
        <Text label="Estimated delivery time" draft={d} set={set} k="estimate" max={120} hint="Shown on the order confirmation, e.g. 2–4 days inside Dhaka."/>
      </>}/>
    <EditableCard title="Payment methods" summary={[c.cod&&'Cash on delivery'+(c.codFee?` (+${money(c.codFee)})`:''),c.bkash.enabled&&'bKash',c.nagad.enabled&&'Nagad',c.advance.enabled&&'Advance'].filter(Boolean).join(' · ')} initial={c} onSave={v=>p.saveSite('checkout',v)}
      render={(d,set)=><>
        <Pair><Toggle label="Cash on delivery" draft={d} set={set} k="cod"/><Num label="Cash on delivery fee (৳)" draft={d} set={set} k="codFee" max={5000} hint="Added to delivery. 0 = none."/></Pair>
        <Text label="Cash on delivery text" draft={d} set={set} k="paymentNote" max={400} area/>
        {(['bkash','nagad','advance'] as const).map(m=>{const label={bkash:'bKash',nagad:'Nagad',advance:'Advance payment'}[m];const v=d[m],s=(x:typeof v)=>set({...d,[m]:x});return <div key={m} className="ec-list__item"><Toggle label={label} draft={v} set={s} k="enabled"/><Text label={label+' instructions shown at checkout'} draft={v} set={s} k="instructions" max={400} area hint="E.g. Send money to 01XXXXXXXXX and write the transaction ID in the order note."/></div>;})}
        <p className="hero-slide__hint">bKash, Nagad and advance are recorded on the order for you to confirm by hand; no online payment is taken.</p>
      </>}/>
    <EditableCard title="Checkout form & messages" summary={'Email '+c.email+' · Order note '+(c.note?'on':'off')} initial={c} onSave={v=>p.saveSite('checkout',v)} onReset={()=>p.resetSite('checkout')}
      render={(d,set)=><>
        <Pair><label>Email field<select value={d.email} onChange={e=>set({...d,email:e.target.value as typeof d.email})}><option value="hidden">Hidden</option><option value="optional">Optional</option><option value="required">Required</option></select></label><Toggle label="Ask for an order note" draft={d} set={set} k="note"/></Pair>
        <Text label="Returns note at checkout" draft={d} set={set} k="returnsNote" max={300} area/>
        <Pair><Text label="Confirmation heading" draft={d} set={set} k="confirmTitle" max={80} required/><Text label="Confirmation text" draft={d} set={set} k="confirmText" max={400} area/></Pair>
        <Text label="Tracking page text" draft={d} set={set} k="trackingIntro" max={300} area hint="Empty keeps the standard text."/>
      </>}/>
  </EditableGroup>;
}

export function MessageTemplates(p:SiteProps){
  const m=p.site.messages,statuses=['New','Confirmed','Processing','Shipped','Delivered','Cancelled','Returned'];
  return <EditableGroup><EditableCard title="Order messages (WhatsApp / SMS)" summary={Object.keys(m).length+' templates · '+Object.keys(m).join(', ')} initial={m} onSave={v=>p.saveSite('messages',v)} onReset={()=>p.resetSite('messages')}
    render={(d,set)=><><p className="hero-slide__hint">On each order, a button opens WhatsApp (or SMS) with this text ready to send. Placeholders: {'{order_id} {name} {total} {status} {courier} {tracking}'}. Leave a status empty for no message.</p>
      {[...statuses,...Object.keys(extraMessageTemplates)].map(s=><label key={s}>{s}<textarea rows={2} maxLength={500} value={d[s]||''} placeholder={(extraMessageTemplates as Record<string,string>)[s]||''} onChange={e=>set({...d,[s]:e.target.value})}/></label>)}</>}/></EditableGroup>;
}
export function SeoSettings(p:SiteProps){
  const {seo,integrations:i}=p.site,[busy,setBusy]=useState(false);
  return <EditableGroup>
    <EditableCard title="Search & social sharing" thumb={seo.ogImage||''} summary={seo.title} badge={onOff(seo.indexing,'Indexed','Hidden from search')} initial={seo} onSave={v=>p.saveSite('seo',v)} onReset={()=>p.resetSite('seo')}
      render={(d,set)=><>
        <Text label="Homepage title" draft={d} set={set} k="title" max={90} required/>
        <Text label="Title template for other pages" draft={d} set={set} k="titleTemplate" max={80} required hint="%s is replaced by the page name, e.g. “%s | AURZÉN”."/>
        <Text label="Meta description" draft={d} set={set} k="description" max={170} area required hint={d.description.length+'/170 characters'}/>
        <ImageField label="Social share image (1200×630)" optional value={d.ogImage} onChange={ogImage=>set({...d,ogImage})} onBusy={setBusy} disabled={busy}/>
        <Toggle label="Allow search engines to index the shop" draft={d} set={set} k="indexing" hint="(only when ordering is open)"/>
      </>}/>
    <EditableCard title="Analytics & verification" summary={[i.pixel&&'Meta Pixel',i.analytics&&'Google Analytics',i.searchConsole&&'Search Console'].filter(Boolean).join(' · ')||'Nothing connected'} initial={i} onSave={v=>p.saveSite('integrations',v)}
      render={(d,set)=><>
        <Pair><Text label="Meta Pixel ID" draft={d} set={set} k="pixel" max={20} hint="Numbers only. Fires PageView, ViewContent, AddToCart, InitiateCheckout and Purchase."/><Text label="Google Analytics ID" draft={d} set={set} k="analytics" max={20} hint="G-XXXXXXXXXX"/></Pair>
        <Text label="Google Search Console code" draft={d} set={set} k="searchConsole" max={100} hint="Only the content=&quot;…&quot; value of the meta tag."/>
        <p className="hero-slide__hint">Scripts load only when an ID is set, after the page has finished loading.</p>
      </>}/>
    <EditableCard title="Chat buttons" summary={[i.whatsapp.enabled&&'WhatsApp '+(displayWhatsAppNumber(shopWhatsApp(p.site))||'— no number'),i.messenger.enabled&&'Messenger'].filter(Boolean).join(' · ')||'Off'} badge={onOff(i.whatsapp.enabled||i.messenger.enabled)} initial={i} onSave={v=>p.saveSite('integrations',v)}
      render={(d,set)=>{const w=d.whatsapp,sw=(whatsapp:typeof w)=>set({...d,whatsapp}),m=d.messenger,sm=(messenger:typeof m)=>set({...d,messenger});return <>
        <Toggle label="WhatsApp chat button" draft={w} set={sw} k="enabled"/>
        <p className="hero-slide__hint">{shopWhatsApp(p.site)?'Opens a chat with '+displayWhatsAppNumber(shopWhatsApp(p.site))+'. ':'No WhatsApp number yet, so the button stays hidden. '}Change the number in Settings → Contact & social.</p>
        <Pair><label>Side<select value={w.position} onChange={e=>sw({...w,position:e.target.value as 'left'|'right'})}><option value="right">Bottom right</option><option value="left">Bottom left</option></select></label><Text label="Pre-filled message" draft={w} set={sw} k="message" max={200}/></Pair>
        <Toggle label="Messenger chat button" draft={m} set={sm} k="enabled"/><Text label="Messenger link" draft={m} set={sm} k="link" max={500} hint="https://m.me/yourpage"/></>;}}/>
  </EditableGroup>;
}

export function PopupSettings(p:SiteProps){
  const pop=p.site.popup,[busy,setBusy]=useState(false);
  return <EditableGroup><EditableCard title="Welcome popup" thumb={pop.image} summary={pop.title||'No popup yet'} badge={onOff(pop.enabled)} initial={pop} onSave={v=>p.saveSite('popup',v)}
    render={(d,set)=><>
      <Toggle label="Show the popup" draft={d} set={set} k="enabled" hint="(appears after 2.5 s, once per visitor)"/>
      <Pair><Text label="Title" draft={d} set={set} k="title" max={80}/><Num label="Show again after (days)" draft={d} set={set} k="days" min={1} max={365}/></Pair>
      <Text label="Text" draft={d} set={set} k="text" max={300} area/>
      <ImageField label="Image" optional value={d.image} onChange={image=>set({...d,image})} onBusy={setBusy} disabled={busy}/>
      <Pair><Text label="Button text" draft={d} set={set} k="cta" max={30}/><LinkPicker label="Button goes to" optional value={d.link} categories={p.categories} products={p.products} pages={p.content.pages} onChange={link=>set({...d,link})}/></Pair>
      <Pair><DateTime label="Start (optional)" value={d.startsAt} onChange={startsAt=>set({...d,startsAt})}/><DateTime label="End (optional)" value={d.endsAt} onChange={endsAt=>set({...d,endsAt})}/></Pair>
    </>}/></EditableGroup>;
}

// ---- Pages, FAQ, reviews ----
export function PagesEditor(p:SiteProps){
  const pages=p.content.pages;
  const save=(next:ContentPage[])=>p.saveContent('pages',next);
  return <EditableGroup>
    <p className="hero-slide__hint">Pages open at /pages/address/. Formatting: start a line with ## for a heading, **bold**, - for a list, [text](/shop/) for a link.</p>
    {pages.map((page,i)=><EditableCard key={page.slug} title={page.title} summary={'/pages/'+page.slug+'/'} badge={onOff(page.published,'Published','Hidden')} initial={page}
      actions={<RowTools index={i} count={pages.length} label={page.title} onMove={(a,b)=>void save(move(pages,a,b))} onRemove={()=>void save(pages.filter(x=>x.slug!==page.slug))}/>}
      onSave={v=>save(pages.map(x=>x.slug===page.slug?v:x))}
      render={(d,set)=><>
        <Pair><Text label="Title" draft={d} set={set} k="title" max={90} required/><Text label="Address" draft={d} set={set} k="slug" max={60} required hint="Lowercase letters, numbers and dashes. Changing it breaks old links."/></Pair>
        <label>Content<textarea rows={14} value={d.body} maxLength={20000} onChange={e=>set({...d,body:e.target.value})}/></label>
        <Pair><Text label="SEO title (optional)" draft={d} set={set} k="seoTitle" max={90}/><Text label="SEO description (optional)" draft={d} set={set} k="seoDescription" max={170}/></Pair>
        <Toggle label="Published" draft={d} set={set} k="published"/>
        <a className="text-link" href={'/pages/'+page.slug+'/'} target="_blank" rel="noopener noreferrer">View the saved page ↗</a>
      </>}/>)}
    <button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>{let n=1;while(pages.some(x=>x.slug==='new-page-'+n))n++;void save([...pages,{slug:'new-page-'+n,title:'New page',body:'',seoTitle:'',seoDescription:'',published:false}]);}}>+ Add page</button>
  </EditableGroup>;
}
export function FaqEditor(p:SiteProps){
  const groups=p.content.faq,save=(next:FaqGroup[])=>p.saveContent('faq',next);
  return <EditableGroup>
    <p className="hero-slide__hint">Shown at /faq/. Link to it from the menu or footer with the “FAQ” link.</p>
    {groups.map((g,i)=><EditableCard key={g.id} title={g.title} summary={g.items.length+' question'+(g.items.length===1?'':'s')} badge={onOff(!g.hidden,'Shown','Hidden')} initial={g}
      actions={<RowTools index={i} count={groups.length} label={g.title} onMove={(a,b)=>void save(move(groups,a,b))} onRemove={()=>void save(groups.filter(x=>x.id!==g.id))}/>}
      onSave={v=>save(groups.map(x=>x.id===g.id?v:x))}
      render={(d,set)=><>
        <Pair><Text label="Group title" draft={d} set={set} k="title" max={80} required/><label className="ec-toggle"><input type="checkbox" checked={!d.hidden} onChange={e=>set({...d,hidden:!e.target.checked})}/><span>Show group</span></label></Pair>
        <div className="ec-list">{d.items.map((q,j)=>{const up=(x:Partial<typeof q>)=>set({...d,items:d.items.map(m=>m.id===q.id?{...m,...x}:m)});return <div key={q.id} className="ec-list__item">
          <div className="ec-list__head"><strong>{q.q||'New question'}</strong><RowTools index={j} count={d.items.length} label="question" onMove={(a,b)=>set({...d,items:move(d.items,a,b)})} onRemove={()=>set({...d,items:d.items.filter(m=>m.id!==q.id)})}/></div>
          <label>Question<input value={q.q} maxLength={200} onChange={e=>up({q:e.target.value})}/></label>
          <label>Answer<textarea rows={3} value={q.a} maxLength={2000} onChange={e=>up({a:e.target.value})}/></label>
          <label className="ec-toggle"><input type="checkbox" checked={!q.hidden} onChange={e=>up({hidden:!e.target.checked})}/><span>Show</span></label></div>;})}
          <button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>set({...d,items:[...d.items,{id:newId('q'),q:'',a:'',hidden:false}]})}>+ Add question</button></div>
      </>}/>)}
    <button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>void save([...groups,{id:newId('group'),title:'New group',hidden:true,items:[]}])}>+ Add group</button>
  </EditableGroup>;
}
export function ReviewsEditor(p:SiteProps){
  const reviews=p.content.reviews,save=(next:Review[])=>p.saveContent('reviews',next);
  return <EditableGroup>
    <p className="hero-slide__hint">Approved reviews appear on the homepage and on the linked product’s page.</p>
    {!reviews.length&&<div className="admin-empty"><h3>No reviews yet.</h3><p>Add reviews customers sent you by message or phone.</p></div>}
    {reviews.map(r=><EditableCard key={r.id} title={r.name+' · '+'★'.repeat(r.rating)} thumb={r.photo} summary={r.text.slice(0,90)} badge={r.approved?{text:'Approved',tone:'on'}:{text:'Hidden',tone:'off'}} initial={r}
      actions={<><button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={()=>void save(reviews.map(x=>x.id===r.id?{...x,approved:!x.approved}:x))}>{r.approved?'Hide':'Approve'}</button><button type="button" className="a-btn a-btn--danger-ghost a-btn--sm" onClick={()=>{if(confirm('Delete this review?'))void save(reviews.filter(x=>x.id!==r.id));}}>Delete</button></>}
      onSave={v=>save(reviews.map(x=>x.id===r.id?v:x))} render={(d,set)=><ReviewFields d={d} set={set} products={p.products}/>}/>)}
    <button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>void save([{id:newId('review'),name:'Customer',rating:5,text:'Lovely quality.',photo:'',product:null,date:new Date().toISOString(),approved:false},...reviews])}>+ Add review</button>
  </EditableGroup>;
}
function ReviewFields({d,set,products}:{d:Review;set:(r:Review)=>void;products:Product[]}){
  const [busy,setBusy]=useState(false);
  return <>
    <Pair><Text label="Customer name" draft={d} set={set} k="name" max={60} required/><label>Rating<select value={d.rating} onChange={e=>set({...d,rating:Number(e.target.value)})}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}</select></label></Pair>
    <Text label="Review" draft={d} set={set} k="text" max={1000} area required/>
    <Pair><label>Product (optional)<select value={d.product??''} onChange={e=>set({...d,product:e.target.value?Number(e.target.value):null})}><option value="">Not linked</option>{products.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><DateTime label="Date" value={d.date} onChange={v=>set({...d,date:v||new Date().toISOString()})}/></Pair>
    <ImageField label="Photo" optional value={d.photo} onChange={photo=>set({...d,photo})} onBusy={setBusy} disabled={busy}/>
    <Toggle label="Approved (visible on the shop)" draft={d} set={set} k="approved"/>
  </>;
}

// ---- Subscribers, activity log, backup ----
const csv=(rows:(string|number)[][])=>rows.map(r=>r.map(v=>{const s=String(v??'');return /[",\n]/.test(s)||/^[=+\-@]/.test(s)?'"'+(/^[=+\-@]/.test(s)?"'":'')+s.replace(/"/g,'""')+'"':s;}).join(',')).join('\n');
export function download(name:string,text:string,type='text/csv'){
  const url=URL.createObjectURL(new Blob(['﻿'+text],{type:type+';charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export {csv};
export function Subscribers({list,onDelete}:{list:{contact:string;created:string}[];onDelete:(contact:string)=>void}){
  return <section className="a-card p-5">
    <div className="ec-list__head"><h2 className="mt-0">Subscribers ({list.length})</h2><button type="button" className="a-btn a-btn--secondary a-btn--sm" disabled={!list.length} onClick={()=>download('aurzen-subscribers.csv',csv([['Contact','Joined'],...list.map(s=>[s.contact,s.created])]))}>Export CSV</button></div>
    {!list.length?<p className="hero-slide__hint">Turn on the newsletter signup under Storefront → Footer to collect emails and phone numbers.</p>:
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th scope="col">Contact</th><th scope="col">Joined</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{list.map(s=><tr key={s.contact}><td data-label="Contact">{s.contact}</td><td data-label="Joined">{new Date(s.created).toLocaleDateString('en-BD')}</td><td><button type="button" className="a-btn a-btn--danger-ghost a-btn--sm" onClick={()=>{if(confirm('Remove '+s.contact+' from the list?'))onDelete(s.contact);}}>Remove</button></td></tr>)}</tbody></table></div>}
  </section>;
}
export function ActivityLog({list}:{list:{at:string;actor:string;area:string;detail:string}[]}){
  const [area,setArea]=useState(''),[from,setFrom]=useState('');
  const areas=Array.from(new Set(list.map(a=>a.area))).sort();
  const shown=list.filter(a=>(!area||a.area===area)&&(!from||a.at.slice(0,10)>=from));
  return <section className="a-card p-5">
    <h2 className="mt-0">Activity log</h2>
    <div className="form-pair"><label>Area<select value={area} onChange={e=>setArea(e.target.value)}><option value="">All areas</option>{areas.map(a=><option key={a}>{a}</option>)}</select></label><label>From date<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label></div>
    {!shown.length?<p className="hero-slide__hint">No changes recorded yet.</p>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Area</th><th scope="col">Change</th></tr></thead><tbody>{shown.map((a,i)=><tr key={i}><td data-label="When">{new Date(a.at).toLocaleString('en-BD')}</td><td data-label="Who">{a.actor}</td><td data-label="Area">{a.area}</td><td data-label="Change">{a.detail}</td></tr>)}</tbody></table></div>}
  </section>;
}
export const linkLabel=(link:SiteLink,categories:Category[])=>linkHref(link,categories);

/** Per category: card button label, short description on its page, and SEO. Keyed by the category's URL slug. */
export function CategorySettingsEditor(p:SiteProps){
  const all=p.site.categories;
  const blank:CategorySettings={label:'auto',description:'',seoTitle:'',seoDescription:''};
  const ordered=p.categories.filter(c=>!c.parent).flatMap(m=>[m,...p.categories.filter(s=>s.parent===m.name)]);
  return <EditableGroup>
    <h2 className="ec-heading">Category cards, descriptions & SEO</h2>
    <p className="hero-slide__hint">Mystery Box categories never show “Choose your size”, whatever is chosen here.</p>
    {ordered.map(c=>{const value=all[c.slug]||blank;return <EditableCard key={c.slug} title={(c.parent?'↳ ':'')+c.name} summary={cardLabelText[value.label]+(value.description?' · '+value.description:'')} initial={value}
      onSave={v=>p.saveSite('categories',{...all,[c.slug]:v})}
      render={(d,set)=><>
        <label>Product card button<select value={d.label} onChange={e=>set({...d,label:e.target.value as CategorySettings['label']})}>{cardLabels.map(l=><option key={l} value={l}>{l==='auto'?(c.parent?'Same as main category':'Automatic'):cardLabelText[l]}</option>)}</select></label>
        <Text label="Short description (shown under the title)" draft={d} set={set} k="description" max={400} area/>
        <Pair><Text label="SEO title" draft={d} set={set} k="seoTitle" max={90}/><Text label="SEO description" draft={d} set={set} k="seoDescription" max={170}/></Pair>
      </>}/>;})}
  </EditableGroup>;
}
