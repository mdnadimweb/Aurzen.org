'use client';
import {useEffect,useId,useState,type MouseEvent} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import BrandLogo from './brand-logo';
import Modal from './modal';
import {categoryPath,defaultStorefront,mainCategories} from '@aurzen/shared/catalog';
import SearchPanel from './search-panel';
import {useStore} from '../providers';
import './store-header.css';

type Props={view:string;count:number;onBag:()=>void;bagOpen:boolean;categories:string[];onNavigate:(view:string,category?:string)=>void};
export default function StoreHeader({view,count,onBag,bagOpen,categories,onNavigate}:Props){
  const [menuOpen,setMenuOpen]=useState(false),[searchOpen,setSearchOpen]=useState(false),[scrolled,setScrolled]=useState(false);
  const store=useStore(),{announcement}=store.storefront||defaultStorefront;
  // Main categories link to their shareable collection pages.
  const mains=mainCategories(store.categoryTree).filter(c=>categories.includes(c.name));
  const navigationId=useId(),pathname=usePathname();
  useEffect(()=>{setMenuOpen(false);setSearchOpen(false);},[pathname]);
  useEffect(()=>{if(bagOpen)setMenuOpen(false);},[bagOpen]);
  useEffect(()=>{
    const desktop=window.matchMedia('(min-width: 1051px)');
    const closeOnDesktop=()=>{if(desktop.matches)setMenuOpen(false);};
    desktop.addEventListener('change',closeOnDesktop);
    return()=>desktop.removeEventListener('change',closeOnDesktop);
  },[]);
  // Compact, translucent header once the page scrolls; hysteresis avoids flicker at the threshold.
  useEffect(()=>{
    let frame=0;
    const update=()=>{frame=0;setScrolled(current=>current?window.scrollY>8:window.scrollY>48);};
    const onScroll=()=>{if(!frame)frame=window.requestAnimationFrame(update);};
    update();window.addEventListener('scroll',onScroll,{passive:true});
    return()=>{window.removeEventListener('scroll',onScroll);if(frame)window.cancelAnimationFrame(frame);};
  },[]);
  const navigate=(event:MouseEvent<HTMLAnchorElement>,target:string,category?:string)=>{
    setMenuOpen(false);
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();onNavigate(target,category);
  };
  const links=(mobile=false)=><>
    <Link href="/" aria-current={view==='home'?'page':undefined} onClick={e=>navigate(e,'home')}>Home</Link>
    <Link href="/shop/" aria-current={view==='shop'?'page':undefined} onClick={e=>navigate(e,'shop','All')}>Shop all</Link>
    {mains.map(category=><Link key={category.slug} href={categoryPath(store.categoryTree,category.name)} aria-current={pathname.startsWith(categoryPath(store.categoryTree,category.name))?'page':undefined} onClick={()=>setMenuOpen(false)}>{category.name==='Mystery Boxes'?'Mystery boxes':category.name}<span aria-hidden="true">{mobile?'↗':''}</span></Link>)}
    <Link href="/sale/" aria-current={pathname.startsWith('/sale')?'page':undefined} onClick={()=>setMenuOpen(false)}>Sale<span aria-hidden="true">{mobile?'↗':''}</span></Link>
    {mobile&&<Link href="/tracking/" onClick={e=>navigate(e,'tracking')}>Track your order <span aria-hidden="true">↗</span></Link>}
  </>;
  return <div className={'store-header-wrap'+(scrolled?' is-scrolled':'')}>
    <div className="announcement store-header-announcement">{announcement.message}{announcement.detail&&<> <span>{announcement.detail}</span></>}</div>
    <header className="store-header">
      <BrandLogo/>
      <nav className="store-header-desktop-nav" aria-label="Main navigation">{links()}</nav>
      <div className="store-header-actions"><button type="button" className="store-search-button" aria-label="Open product search" aria-haspopup="dialog" aria-expanded={searchOpen} onClick={()=>{setMenuOpen(false);setSearchOpen(true);}}><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><span className="store-search-button__label">Search</span></button><button className="store-menu-button" aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls={navigationId} onClick={()=>setMenuOpen(true)}><span aria-hidden="true">☰</span> Menu</button><button className="bag store-header-bag" aria-label={`Open shopping bag, ${count} item${count===1?'':'s'}`} aria-haspopup="dialog" aria-expanded={bagOpen} onClick={()=>{setMenuOpen(false);onBag();}}>Bag <span key={count}>{count}</span></button></div>
    </header>
    <SearchPanel open={searchOpen} onClose={()=>setSearchOpen(false)}/>
    <Modal open={menuOpen} onClose={()=>setMenuOpen(false)} label="Navigation menu" className="mobile-nav">
      <div className="mobile-nav-heading"><div><div className="eyebrow">A LITTLE EVERYDAY ELEGANCE</div><h2>Explore AURZÉN</h2></div><button autoFocus aria-label="Close navigation menu" onClick={()=>setMenuOpen(false)}>×</button></div>
      <nav id={navigationId} aria-label="Mobile navigation">{links(true)}</nav>
      <div className="mobile-nav-note"><p>Thoughtfully selected.<br/>Beautifully wrapped.</p><span>Cash on delivery across Bangladesh</span></div>
    </Modal>
  </div>;
}
