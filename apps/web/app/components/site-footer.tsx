'use client';
import {useState,type FormEvent} from 'react';
import Link from 'next/link';
import {categoryPath,mainCategories} from '@aurzen/shared/catalog';
import {linkHref,whatsappLink,shopWhatsApp,displayWhatsAppNumber,type NavItem} from '@aurzen/shared/site';
import BrandLogo from './brand-logo';
import {api,useStore} from '../providers';

/** Last 10 digits of a Bangladesh number, however it is typed (+880 1874-627259, 01874627259…). */
const localDigits=(n:string)=>n.replace(/\D/g,'').slice(-10);
/** "24\nKamrangirchar ,Dhaka" → "24, Kamrangirchar, Dhaka": one line, tidy commas. */
const oneLineAddress=(a:string)=>a.split(/\n+/).map(l=>l.trim()).filter(Boolean).join(', ').replace(/\s*,\s*/g,', ').replace(/(, )+/g,', ').replace(/^, |, $/g,'');
/** Opening hours: a bare "24" or "24/7" reads as "Open 24/7"; anything else is shown as typed, after "Hours:". */
const hoursText=(h:string)=>/^\s*24\s*(\/\s*7|h|hours?)?\s*$/i.test(h)?'Open 24/7':/^(open|hours)/i.test(h.trim())?h.trim():'Hours: '+h.trim();
/** Storefront footer, edited in Studio → Navigation & footer. Left-aligned columns; on phones two columns side by side. */
export default function SiteFooter(){
  const {site,categoryTree}=useStore();
  const {general:g,footer:f}=site;
  const [open,setOpen]=useState<string|null>(null);
  const links=(items:NavItem[])=>items.filter(i=>!i.hidden).flatMap(item=>item.link.type==='categories'
    ?mainCategories(categoryTree).map(c=><li key={item.id+c.slug}><Link href={categoryPath(categoryTree,c.name)}>{c.name}</Link></li>)
    :[<li key={item.id}>{item.link.type==='url'&&/^https?:/.test(item.link.value)?<a href={item.link.value} rel="noopener noreferrer" target="_blank">{item.label}</a>:<Link href={linkHref(item.link,categoryTree)}>{item.label}</Link>}</li>]);
  // The phone line is left out when it is the same number as WhatsApp, so a number is never listed twice.
  const wa=shopWhatsApp(site),sameNumber=!!(wa&&g.phone&&localDigits(wa)===localDigits(g.phone));
  const contact=[
    wa&&<li key="wa"><a href={whatsappLink(wa)} rel="noopener noreferrer" target="_blank" aria-label={'Chat with '+g.brand+' on WhatsApp'}>{sameNumber?'Call / WhatsApp':'WhatsApp'} {displayWhatsAppNumber(wa)}</a></li>,
    g.phone&&!sameNumber&&<li key="ph"><a href={'tel:'+g.phone.replace(/[^\d+]/g,'')}>{g.phone}</a></li>,
    g.email&&<li key="em"><a href={'mailto:'+g.email}>{g.email}</a></li>,
    g.messenger&&<li key="ms"><a href={g.messenger} rel="noopener noreferrer" target="_blank">Messenger</a></li>,
    g.hours&&<li key="hr"><span>{hoursText(g.hours)}</span></li>,
    g.address&&<li key="ad"><span>{oneLineAddress(g.address)}</span></li>,
  ].filter(Boolean);
  const social=([['Facebook',g.facebook],['Instagram',g.instagram],['TikTok',g.tiktok],['YouTube',g.youtube]] as const).filter(([,url])=>url);
  const columns=[...f.columns.filter(c=>!c.hidden).map(c=>({id:c.id,title:c.title,body:<ul>{links(c.links)}</ul>})),...(contact.length?[{id:'contact',title:'Contact',body:<ul>{contact}</ul>}]:[])];
  // Columns share the width equally whatever their number, so nothing is left empty on the right.
  return <footer className="site-footer" style={{"--footer-cols":columns.length} as React.CSSProperties}>
    <div className="site-footer__brand">
      {g.logoDark?<Link href="/" className="logo brand-logo" aria-label={g.brand+' home'}><img src={g.logoDark} alt={g.brand} width={157} height={96}/></Link>:<BrandLogo variant="light"/>}
      {g.about&&<p className="site-footer__pre">{g.about}</p>}
      {social.length>0&&<ul className="site-footer__social">{social.map(([label,url])=><li key={label}><a href={url} rel="noopener noreferrer" target="_blank">{label}</a></li>)}</ul>}
      {g.businessInfo&&<p className="site-footer__small site-footer__pre">{g.businessInfo}</p>}
    </div>
    {columns.map(c=>{const id='footer-col-'+c.id,isOpen=open===c.id;return <div key={c.id} data-col={c.id} className={'site-footer__col'+(isOpen?' is-open':'')}>
      <h4><button type="button" aria-expanded={isOpen} aria-controls={id} onClick={()=>setOpen(isOpen?null:c.id)}>{c.title}<span aria-hidden="true">+</span></button></h4>
      <div id={id} className="site-footer__list">{c.body}</div>
    </div>;})}
    {f.newsletter.enabled&&<Newsletter title={f.newsletter.title} text={f.newsletter.text}/>}
    <div className="site-footer__bottom">
      <span>© {new Date().getFullYear()} {g.brand}.{f.bottomText&&' '+f.bottomText}</span>
      <nav aria-label="Legal">{f.legal.filter(l=>!l.hidden).map(l=><Link key={l.id} href={linkHref(l.link,categoryTree)}>{l.label}</Link>)}</nav>
      {f.payments.length>0&&<ul className="site-footer__payments" aria-label="Payment methods">{f.payments.map(p=><li key={p}>{p}</li>)}</ul>}
    </div>
  </footer>;
}
function Newsletter({title,text}:{title:string;text:string}){
  const [state,setState]=useState<'idle'|'busy'|'done'>('idle'),[error,setError]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(state==='busy')return;
    const contact=String(new FormData(event.currentTarget).get('contact')||'');
    setState('busy');setError('');
    try{await api('/api/subscribe/',{method:'POST',body:JSON.stringify({contact})});setState('done');}
    catch(e){setError((e as Error).message);setState('idle');}
  }
  return <form className="site-footer__newsletter" onSubmit={submit}>
    <div><h4>{title}</h4>{text&&<p>{text}</p>}</div>
    {state==='done'?<p role="status">Thank you. You’re on the list.</p>:<div className="site-footer__signup">
      <label className="sr-only" htmlFor="footer-contact">Email or phone</label>
      <input id="footer-contact" name="contact" required minLength={5} maxLength={120} placeholder="Email or phone number" autoComplete="email"/>
      <button type="submit" disabled={state==='busy'}>{state==='busy'?'Joining…':'Join'}</button>
    </div>}
    {error&&<p className="site-footer__error" role="alert">{error}</p>}
  </form>;
}
