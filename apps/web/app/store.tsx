'use client';
import SiteFooter from './components/site-footer';
import SiteExtras,{trackEvent} from './components/site-extras';
import FadeIn from './FadeIn';
import FashionHero from './components/FashionHero';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { money, categoryPath, categoryFromSlugs, mainCategories, type Product } from '@aurzen/shared/catalog';
import { renderMarkdown, isMystery, type ContentPage, type FaqGroup, type Review } from '@aurzen/shared/site';
import { Testimonials, ProductReviews } from './components/reviews';
import {FeaturedCategories,CategoryPreviews,CollectionsDirectory,CollectionView,SaleView} from './components/collections';
import PromoCarousel from './components/promo-carousel';
import {matchesSearch} from './components/search-panel';
import { useStore } from './providers';
import Box from './components/box-art';
import Card from './components/product-card';
import type {DirectCheckout} from './components/checkout';
import dynamic from 'next/dynamic';
// Checkout, tracking and the owner studio are split into their own chunks so the shop pages
// (home, collections, product) never download or parse their code.
const Checkout=dynamic(()=>import('./components/checkout'));
const OrderTracking=dynamic(()=>import('./components/order-tracking'));
const AdminWorkspace=dynamic(()=>import('./components/admin-workspace'));
import BagDrawer from './components/bag-drawer';
import ProductPurchase from './components/product-purchase';
import ProductGallery from './components/product-gallery';
import ProductPrice,{OfferBadge} from './components/product-price';
import ProductImage from './components/product-image';
import StoreHeader from './components/store-header';
import {validOption,validColor,styleOptions,productOptions,productColors,hasSizeChoice,sameLine,type CartItem} from '@aurzen/shared/catalog';
export default function Store({ initial = 'home', product, directCheckout, collection, page, faq, reviews = [] }: {
    /** Approved reviews: newest on the homepage, the product's own on its page. */
    reviews?: Review[];
    /** A content page (/pages/<slug>/) or the FAQ groups (/faq/), rendered on the server. */
    page?: ContentPage;
    faq?: FaqGroup[];
    initial?: string;
    product?: Product;
    directCheckout?: DirectCheckout;
    /** URL slugs for /collections/<main>[/<sub>]. */
    collection?: string[];
}) {
    const router = useRouter(), view = initial;
    const { site, products, categories, categoryTree, cart, setCart, loaded, error, refresh, bagOpen, setBagOpen } = useStore();
    const [filter, setFilter] = useState('All'), [query, setQuery] = useState(''), [sort, setSort] = useState('featured'), [notice, setNotice] = useState(''), [selected, setSelected] = useState<Product | null>(product || null), [size, setSize] = useState(''), [boxStyle, setBoxStyle] = useState(''), [color, setColor] = useState(''), [optionError,setOptionError]=useState(''), [colorError,setColorError]=useState('');
    useEffect(()=>{setSize('');setBoxStyle('');setColor('');setOptionError('');setColorError('');if(product)trackEvent('ViewContent',{content_ids:[String(product.id)],content_type:'product',value:product.price,currency:'BDT'});},[product?.id]);
    useEffect(() => { setSelected(product ? (loaded ? products.find(p => p.id === product.id) || null : product) : null); }, [product, products, loaded]);
    useEffect(() => { const sync = () => { const params = new URLSearchParams(window.location.search); setFilter(params.get('category') || 'All'); setQuery(params.get('q') || ''); }; sync(); window.addEventListener('popstate', sync); return () => window.removeEventListener('popstate', sync); }, []);
    useEffect(() => { if (notice) {
        const t = setTimeout(() => setNotice(''), 3500);
        return () => clearTimeout(t);
    } }, [notice]);
    const go = (v: string, category?: string) => { router.push((v === 'home' ? '/' : '/' + v) + (category ? '?category=' + encodeURIComponent(category) : '')); if (v === 'shop')
        setFilter(category || 'All'); };
    const styleChoice=(p:Product)=>isMystery(categoryTree,p.category)&&!p.sizes?.length;
    const focusChoice=(id:string)=>{const el=document.getElementById(id);el?.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});el?.focus({preventScroll:true});};
    const purchaseOption = (p:Product):Pick<CartItem,'size'|'color'>|null => {
        if(p.stock<=0){setNotice('This product is currently out of stock.');return null;}
        const option=styleChoice(p)?boxStyle:hasSizeChoice(p)?size:'One size';
        const sizeOk=validOption(p,option),colorOk=validColor(p,color);
        if(sizeOk&&colorOk)return {size:option,...(color?{color}:{})};
        const word=styleChoice(p)?'style':'size';
        if(!sizeOk)setOptionError('Please choose a '+word+'.');
        if(!colorOk)setColorError('Please choose a colour.');
        setNotice('Please choose '+(!sizeOk&&!colorOk?'a '+word+' and a colour':!sizeOk?'a '+word:'a colour')+' before continuing.');
        focusChoice(!sizeOk?'product-options':'product-colors');
        return null;
    };
    const buy = (p:Product) => {
        const option=purchaseOption(p);if(!option)return;
        setBagOpen(false);
        router.push('/cart/?'+new URLSearchParams({buy:String(p.id),option:option.size,...(option.color?{color:option.color}:{}),attempt:crypto.randomUUID()}));
    };
    const add = (p: Product): boolean => { const option=purchaseOption(p);if(!option)return false; const line={id:p.id,...option};if(cart.some(c=>sameLine(c,line)&&c.qty>=100)){setNotice('You can add up to 100 of each size, colour or style.');return false;} const inBag = cart.filter(c => c.id === p.id).reduce((sum, c) => sum + c.qty, 0); if (inBag >= p.stock) {
        setNotice('All available stock is already in your bag');
        return false;
    } trackEvent('AddToCart',{content_ids:[String(p.id)],content_type:'product',value:p.price,currency:'BDT'}); setCart(c => { const found = c.find(x => sameLine(x, line)); return found ? c.map(x => x === found ? { ...x, qty: x.qty + 1 } : x) : [...c, { ...line, qty: 1 }]; }); setBagOpen(true); setNotice('Added to your bag'); return true; };
    const count = cart.reduce((s, c) => s + c.qty, 0);
    const filtered = products.filter(p => (filter === 'All' || filter === p.category) && matchesSearch(p, query)).sort((a, b) => sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : sort === 'name' ? a.name.localeCompare(b.name) : a.id - b.id);
    return <>{error && <div className="form-error" role="alert">{error} <button className="text-link" onClick={() => void refresh()}>Retry</button></div>}{view !== 'admin' && <StoreHeader view={view} count={count} onBag={()=>setBagOpen(true)} bagOpen={bagOpen} categories={categories} onNavigate={go}/>}
    {view === 'home' && (()=>{ const h=site.home, favourites=products.slice(0,h.favourites.count), mystery=categoryTree.find(c=>!c.parent&&/mystery/i.test(c.name)); const lines=(text:string)=>text.split('\n').map((line,i)=><span key={i}>{i>0&&<br/>}{line}</span>); return <><main><FashionHero />{h.trust.some(t=>!t.hidden)&&<div className="benefits">{h.trust.filter(t=>!t.hidden).map(t=><span key={t.id}>{t.icon&&<>{t.icon} &nbsp; </>}{t.text}</span>)}</div>}<FeaturedCategories/><PromoCarousel/>{!h.favourites.hidden&&<FadeIn as="section" className="section picks"><div className="section-heading">{h.favourites.eyebrow&&<div className="eyebrow">{h.favourites.eyebrow}</div>}<h2>{h.favourites.title}</h2>{h.favourites.cta&&<button className="text-link" onClick={() => go('shop')}>{h.favourites.cta}</button>}</div><div className="product-grid">{favourites.map((p,i) => <Card key={p.id} p={p} delay={(i%4)*60}/>)}</div></FadeIn>}<CategoryPreviews exclude={h.favourites.hidden?[]:favourites.map(p => p.id)}/>{mystery&&!h.mystery.hidden&&<FadeIn as="section" className="mystery"><Box /><div>{h.mystery.eyebrow&&<div className="eyebrow">{h.mystery.eyebrow}</div>}<h2>{lines(h.mystery.title)}</h2>{h.mystery.text&&<p>{h.mystery.text}</p>}{h.mystery.cta&&<Link className="primary" href={categoryPath(categoryTree,mystery.name)}>{h.mystery.cta}</Link>}{h.mystery.small&&<small>{h.mystery.small}</small>}</div></FadeIn>}<Testimonials reviews={reviews}/>{!h.note.hidden&&<FadeIn as="section" className="brand-note">{h.note.eyebrow&&<div className="eyebrow">{h.note.eyebrow}</div>}<h2>{h.note.title}{h.note.emphasis&&<><br /><em>{h.note.emphasis}</em></>}</h2>{h.note.text&&<p>{h.note.text}</p>}</FadeIn>}</main></>; })()}
    {view === 'shop' && <main className="section shop"><div className="eyebrow">THE AURZÉN COLLECTION</div><h1>{filter === 'All' ? 'Find your everyday extraordinary.' : filter}</h1><p>Thoughtful pieces. Little discoveries. All in one place.</p><div className="shop-toolbar"><nav className="chips" aria-label="Collections"><Link className="chosen" aria-current="page" href="/shop/">All</Link>{mainCategories(categoryTree).map(c => <Link key={c.slug} href={categoryPath(categoryTree, c.name)}>{c.name}</Link>)}<Link href="/sale/">Sale</Link></nav><input aria-label="Search products" placeholder="Search the collection…" value={query} onChange={e => setQuery(e.target.value)}/><select aria-label="Sort products" value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name: A–Z</option></select></div><p className="muted">{filtered.length} thoughtfully selected pieces</p><div className="product-grid">{filtered.map((p,i) => <Card p={p} key={p.id} delay={(i%4)*60}/>)}</div>{!loaded && <p role="status">Loading the collection…</p>}{loaded && !filtered.length && <div className="empty">No pieces found. Try another category or search.</div>}</main>}
    {view === 'page' && page && <main className="section content-page"><div className="eyebrow">{site.general.brand}</div><h1>{page.title}</h1><div className="rich" dangerouslySetInnerHTML={{__html:renderMarkdown(page.body)}}/></main>}
    {view === 'faq' && <main className="section content-page"><div className="eyebrow">HELP</div><h1>Frequently asked questions</h1>{(faq||[]).map(g=><section className="faq-group" key={g.id}><h2>{g.title}</h2>{g.items.map(q=><details key={q.id}><summary>{q.q}</summary><p>{q.a}</p></details>)}</section>)}{!(faq||[]).length&&<p>No questions yet.</p>}</main>}
    {view === 'collections' && <CollectionsDirectory/>}
    {view === 'sale' && <SaleView/>}
    {view === 'collection' && (()=>{ const found = categoryFromSlugs(categoryTree, collection || []); return found ? <CollectionView key={(found.sub||found.main).slug} main={found.main} sub={found.sub}/> : <main className="section empty"><h1>This collection is not available.</h1><p>It may have been renamed or removed.</p><Link className="primary" href="/collections/">Browse all categories</Link></main>; })()}
    {view === 'tracking' && <OrderTracking/>}
    {view === 'cart' && <Checkout key={directCheckout?.attempt||'bag'} directCheckout={directCheckout}/>}
    {view === 'admin' && <AdminWorkspace />}
    {view === 'product' && !selected && <main className="section empty"><h1>This piece is currently unavailable.</h1><p>Explore the collection for your next favourite.</p><Link className="primary" href="/shop/">Back to the collection</Link></main>}
    {view === 'product' && selected && <main className="section product-page has-mobile-purchase"><Link className="text-link" href={categoryTree.some(c => c.name === selected.category) ? categoryPath(categoryTree, selected.category) : "/shop/"}>← Back to {categoryTree.some(c => c.name === selected.category) ? selected.category : "collection"}</Link><div className="detail"><div className="product-gallery-offer"><ProductGallery key={selected.id} product={selected}/><OfferBadge product={selected}/></div><div className="detail-copy"><div className="eyebrow">{selected.category}</div><h1>{selected.name}</h1><ProductPrice product={selected}/><p>{selected.description || (isMystery(categoryTree, selected.category) ? 'A curated surprise of fashion and accessories. Share your style preference to help us make it feel like you.' : 'An everyday favourite, thoughtfully selected for your wardrobe.')}</p>{styleChoice(selected) ? <label id="product-options" tabIndex={-1}>Your style<select value={boxStyle} aria-invalid={!!optionError} aria-describedby={optionError?'product-option-error':undefined} onChange={e => {setBoxStyle(e.target.value);setOptionError('');}}><option value="">Choose your style</option>{styleOptions.map(s => <option key={s}>{s}</option>)}</select></label> : hasSizeChoice(selected) ? <fieldset id="product-options" className="product-options" tabIndex={-1}><legend>Choose a size{size&&<span className="product-options__chosen">: {size}</span>}</legend><div className="chips" role="group" aria-label="Choose a size" aria-invalid={!!optionError} aria-describedby={optionError?'product-option-error':undefined}>{productOptions(selected).map(s => <button type="button" aria-pressed={size === s} className={size === s ? 'chosen' : ''} onClick={() => {setSize(s);setOptionError('');}} key={s}>{s}</button>)}</div></fieldset> : null}{optionError&&<p id="product-option-error" className="field-error" role="alert">{optionError}</p>}{productColors(selected).length>0&&<fieldset id="product-colors" className="product-options" tabIndex={-1}><legend>Choose a colour{color&&<span className="product-options__chosen">: {color}</span>}</legend><div className="chips" role="group" aria-label="Choose a colour" aria-invalid={!!colorError} aria-describedby={colorError?'product-color-error':undefined}>{productColors(selected).map(c => <button type="button" aria-pressed={color === c} className={color === c ? 'chosen' : ''} onClick={() => {setColor(c);setColorError('');}} key={c}>{c}</button>)}</div></fieldset>}{colorError&&<p id="product-color-error" className="field-error" role="alert">{colorError}</p>}<p className="muted">{selected.stock > 0 ? selected.stock + ' available' : 'Currently out of stock'}</p><ProductPurchase product={selected} onAdd={()=>add(selected)} onBuy={()=>buy(selected)} disabled={!selected.stock||cart.filter(c=>c.id===selected.id).reduce((n,c)=>n+c.qty,0)>=selected.stock}/><small>Cash on delivery · Thoughtfully packed</small><Link className="text-link" href="/cart">View your bag ↗</Link></div></div><ProductReviews reviews={reviews}/></main>}
    {view !== 'admin' && <SiteFooter/>}
    {view!=='admin'&&<BagDrawer/>}
    <SiteExtras/>
    {notice && <div role="status" className="toast">✓ {notice}</div>}</>;
}
