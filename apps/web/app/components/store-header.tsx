'use client';
import {useEffect,useId,useState,type MouseEvent} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import BrandLogo from './brand-logo';
import Modal from './modal';
import './store-header.css';

type Props={view:string;count:number;onBag:()=>void;bagOpen:boolean;categories:string[];onNavigate:(view:string,category?:string)=>void};
export default function StoreHeader({view,count,onBag,bagOpen,categories,onNavigate}:Props){
  const [menuOpen,setMenuOpen]=useState(false);
  const navigationId=useId(),pathname=usePathname();
  useEffect(()=>{setMenuOpen(false);},[pathname]);
  useEffect(()=>{if(bagOpen)setMenuOpen(false);},[bagOpen]);
  useEffect(()=>{
    const desktop=window.matchMedia('(min-width: 1051px)');
    const closeOnDesktop=()=>{if(desktop.matches)setMenuOpen(false);};
    desktop.addEventListener('change',closeOnDesktop);
    return()=>desktop.removeEventListener('change',closeOnDesktop);
  },[]);
  const navigate=(event:MouseEvent<HTMLAnchorElement>,target:string,category?:string)=>{
    setMenuOpen(false);
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();onNavigate(target,category);
  };
  const categoryHref=(category:string)=>'/shop/?category='+encodeURIComponent(category);
  const links=(mobile=false)=><>
    <Link href="/" aria-current={view==='home'?'page':undefined} onClick={e=>navigate(e,'home')}>Home</Link>
    <Link href="/shop/" aria-current={view==='shop'?'page':undefined} onClick={e=>navigate(e,'shop','All')}>Shop all</Link>
    {categories.map(category=><Link key={category} href={categoryHref(category)} onClick={e=>navigate(e,'shop',category)}>{category==='Mystery Boxes'?'Mystery boxes':category}<span aria-hidden="true">{mobile?'↗':''}</span></Link>)}
    {mobile&&<Link href="/tracking/" onClick={e=>navigate(e,'tracking')}>Track your order <span aria-hidden="true">↗</span></Link>}
  </>;
  return <div className="store-header-wrap">
    <div className="announcement store-header-announcement">A little joy, delivered. <span>Thoughtfully selected in Bangladesh</span></div>
    <header className="store-header">
      <BrandLogo/>
      <nav className="store-header-desktop-nav" aria-label="Main navigation">{links()}</nav>
      <div className="store-header-actions"><button className="store-menu-button" aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls={navigationId} onClick={()=>setMenuOpen(true)}><span aria-hidden="true">☰</span> Menu</button><button className="bag store-header-bag" aria-label={`Open shopping bag, ${count} item${count===1?'':'s'}`} aria-haspopup="dialog" aria-expanded={bagOpen} onClick={()=>{setMenuOpen(false);onBag();}}>Bag <span key={count}>{count}</span></button></div>
    </header>
    <Modal open={menuOpen} onClose={()=>setMenuOpen(false)} label="Navigation menu" className="mobile-nav">
      <div className="mobile-nav-heading"><div><div className="eyebrow">A LITTLE EVERYDAY ELEGANCE</div><h2>Explore AURZÉN</h2></div><button autoFocus aria-label="Close navigation menu" onClick={()=>setMenuOpen(false)}>×</button></div>
      <nav id={navigationId} aria-label="Mobile navigation">{links(true)}</nav>
      <div className="mobile-nav-note"><p>Thoughtfully selected.<br/>Beautifully wrapped.</p><span>Cash on delivery across Bangladesh</span></div>
    </Modal>
  </div>;
}
