'use client';
import BrandLogo from './components/brand-logo';
import FadeIn from './FadeIn';
import FashionHero from './components/FashionHero';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { money, type Product } from '@aurzen/shared/catalog';
import { useStore } from './providers';
import Box from './components/box-art';
import Card from './components/product-card';
import Checkout,{type DirectCheckout} from './components/checkout';
import BagDrawer from './components/bag-drawer';
import ProductPurchase from './components/product-purchase';
import ProductGallery from './components/product-gallery';
import ProductPrice,{OfferBadge} from './components/product-price';
import ProductImage from './components/product-image';
import StoreHeader from './components/store-header';
import OrderTracking from './components/order-tracking';
import {validOption,styleOptions} from '@aurzen/shared/catalog';
import AdminWorkspace from './components/admin-workspace';
export default function Store({ initial = 'home', product, directCheckout }: {
    initial?: string;
    product?: Product;
    directCheckout?: DirectCheckout;
}) {
    const router = useRouter(), view = initial;
    const { products, categories, cart, setCart, loaded, error, refresh, bagOpen, setBagOpen } = useStore();
    const [filter, setFilter] = useState('All'), [query, setQuery] = useState(''), [sort, setSort] = useState('featured'), [notice, setNotice] = useState(''), [selected, setSelected] = useState<Product | null>(product || null), [size, setSize] = useState(''), [boxStyle, setBoxStyle] = useState(''), [optionError,setOptionError]=useState('');
    useEffect(()=>{setSize('');setBoxStyle('');setOptionError('');},[product?.id]);
    useEffect(() => { setSelected(product ? (loaded ? products.find(p => p.id === product.id) || null : product) : null); }, [product, products, loaded]);
    useEffect(() => { const sync = () => setFilter(new URLSearchParams(window.location.search).get('category') || 'All'); sync(); window.addEventListener('popstate', sync); return () => window.removeEventListener('popstate', sync); }, []);
    useEffect(() => { if (notice) {
        const t = setTimeout(() => setNotice(''), 3500);
        return () => clearTimeout(t);
    } }, [notice]);
    const go = (v: string, category?: string) => { router.push((v === 'home' ? '/' : '/' + v) + (category ? '?category=' + encodeURIComponent(category) : '')); if (v === 'shop')
        setFilter(category || 'All'); };
    const purchaseOption = (p:Product) => {
        if(p.stock<=0){setNotice('This product is currently out of stock.');return null;}
        const option=p.category==='Mystery Boxes'?boxStyle:p.category==='Clothing'?size:'One size';
        if(validOption(p,option))return option;
        setOptionError('Please choose a '+(p.category==='Clothing'?'size':'style')+'.');
        setNotice('Please choose a '+(p.category==='Clothing'?'size':'style')+' before continuing.');
        document.getElementById('product-options')?.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
        document.getElementById('product-options')?.focus({preventScroll:true});
        return null;
    };
    const buy = (p:Product) => {
        const option=purchaseOption(p);if(!option)return;
        setBagOpen(false);
        router.push('/cart/?'+new URLSearchParams({buy:String(p.id),option,attempt:crypto.randomUUID()}));
    };
    const add = (p: Product): boolean => { const option=purchaseOption(p);if(!option)return false; if(cart.some(c=>c.id===p.id&&c.size===option&&c.qty>=100)){setNotice('You can add up to 100 of each size or style.');return false;} const inBag = cart.filter(c => c.id === p.id).reduce((sum, c) => sum + c.qty, 0); if (inBag >= p.stock) {
        setNotice('All available stock is already in your bag');
        return false;
    } setCart(c => { const found = c.find(x => x.id === p.id && x.size === option); return found ? c.map(x => x === found ? { ...x, qty: x.qty + 1 } : x) : [...c, { id: p.id, qty: 1, size: option }]; }); setBagOpen(true); setNotice('Added to your bag'); return true; };
    const count = cart.reduce((s, c) => s + c.qty, 0);
    const filtered = products.filter(p => (filter === 'All' || filter === p.category) && (p.name + ' ' + p.category).toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : sort === 'name' ? a.name.localeCompare(b.name) : a.id - b.id);
    return <>{error && <div className="form-error" role="alert">{error} <button className="text-link" onClick={() => void refresh()}>Retry</button></div>}{view !== 'admin' && <StoreHeader view={view} count={count} onBag={()=>setBagOpen(true)} bagOpen={bagOpen} categories={categories} onNavigate={go}/>}
    {view === 'home' && <><main><FashionHero /><div className="benefits"><span>♧ &nbsp; Thoughtfully selected</span><span>◇ &nbsp; Premium, within reach</span><span>▧ &nbsp; Cash on delivery</span><span>♡ &nbsp; Packed with a little love</span></div><FadeIn as="section" className="section"><div className="section-heading"><div className="eyebrow">FIND YOUR LITTLE SOMETHING</div><h2>Meet your next favourites.</h2><button className="text-link" onClick={() => { go('shop', 'All'); }}>Shop all collections ↗</button></div><div className="collections">{categories.slice(0,3).map(c=>{const featured=products.find(p=>p.category===c&&p.image&&p.image!=='box')||products.find(p=>p.category===c);return <button key={c} className={'collection'+(c==='Mystery Boxes'?' c1':'')} onClick={()=>go('shop',c)}><ProductImage src={featured?.image} category={c} alt={featured?featured.name+' - '+c+' collection':c+' collection'}/><div className="collection-copy"><small>{c==='Mystery Boxes'?'THE JOY IS IN THE SURPRISE':'YOUR EVERYDAY, ELEVATED'}</small><h3>{c} <span aria-hidden="true">↗</span></h3></div></button>;})}</div></FadeIn><FadeIn as="section" className="section picks"><div className="section-heading"><div className="eyebrow">LOVED FOR A REASON</div><h2>The current favourites.</h2><button className="text-link" onClick={() => go('shop')}>Discover the edit ↗</button></div><div className="product-grid">{products.slice(0, 4).map((p,i) => <Card key={p.id} p={p} delay={(i%4)*60}/>)}</div></FadeIn><FadeIn as="section" className="mystery"><Box /><div><div className="eyebrow">A SURPRISE WITH YOUR NAME ON IT</div><h2>Good things come<br />in mystery boxes.</h2><p>Tell us a little about your style. We’ll take care of the surprise. A thoughtfully curated box of fashion and accessories, made to brighten your everyday.</p><button className="primary" onClick={() => { go('shop', 'Mystery Boxes'); }}>Find your mystery box ↗</button><small>Thoughtfully selected · Beautifully wrapped · Uniquely you</small></div></FadeIn><FadeIn as="section" className="brand-note"><div className="eyebrow">A NOTE FROM AURZÉN</div><h2>Beautiful things.<br /><em>Without the extraordinary price.</em></h2><p>We believe a little elegance belongs in every day. We’re building AURZÉN around pieces that feel special, thoughtful details, and the joy of finding something that feels like you.</p></FadeIn></main></>}
    {view === 'shop' && <main className="section shop"><div className="eyebrow">THE AURZÉN COLLECTION</div><h1>{filter === 'All' ? 'Find your everyday extraordinary.' : filter}</h1><p>Thoughtful pieces. Little discoveries. All in one place.</p><div className="shop-toolbar"><div className="chips">{['All', ...categories].map(c => <button className={filter === c ? 'chosen' : ''} key={c} onClick={() => { setFilter(c); window.history.replaceState(null, '', '/shop' + (c === 'All' ? '' : '?category=' + encodeURIComponent(c))); }}>{c}</button>)}</div><input aria-label="Search products" placeholder="Search the collection…" value={query} onChange={e => setQuery(e.target.value)}/><select aria-label="Sort products" value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name: A–Z</option></select></div><p className="muted">{filtered.length} thoughtfully selected pieces</p><div className="product-grid">{filtered.map((p,i) => <Card p={p} key={p.id} delay={(i%4)*60}/>)}</div>{!loaded && <p role="status">Loading the collection…</p>}{loaded && !filtered.length && <div className="empty">No pieces found. Try another category or search.</div>}</main>}
    {view === 'tracking' && <OrderTracking/>}
    {view === 'cart' && <Checkout key={directCheckout?.attempt||'bag'} directCheckout={directCheckout}/>}
    {view === 'admin' && <AdminWorkspace />}
    {view === 'product' && !selected && <main className="section empty"><h1>This piece is currently unavailable.</h1><p>Explore the collection for your next favourite.</p><Link className="primary" href="/shop/">Back to the collection</Link></main>}
    {view === 'product' && selected && <main className="section product-page has-mobile-purchase"><Link className="text-link" href="/shop">← Back to collection</Link><div className="detail"><div className="product-gallery-offer"><ProductGallery key={selected.id} product={selected}/><OfferBadge product={selected}/></div><div className="detail-copy"><div className="eyebrow">{selected.category}</div><h1>{selected.name}</h1><ProductPrice product={selected}/><p>{selected.description || (selected.category === 'Mystery Boxes' ? 'A curated surprise of fashion and accessories. Share your style preference to help us make it feel like you.' : 'An everyday favourite, thoughtfully selected for your wardrobe.')}</p>{selected.category === 'Mystery Boxes' ? <label id="product-options" tabIndex={-1}>Your style<select value={boxStyle} aria-invalid={!!optionError} aria-describedby={optionError?'product-option-error':undefined} onChange={e => {setBoxStyle(e.target.value);setOptionError('');}}><option value="">Choose your style</option>{styleOptions.map(s => <option key={s}>{s}</option>)}</select></label> : selected.category === 'Clothing' ? <fieldset id="product-options" className="product-options" tabIndex={-1}><legend>Choose a size</legend><div className="chips" role="group" aria-label="Choose a size" aria-invalid={!!optionError} aria-describedby={optionError?'product-option-error':undefined}>{['S', 'M', 'L', 'XL'].map(s => <button aria-pressed={size === s} className={size === s ? 'chosen' : ''} onClick={() => {setSize(s);setOptionError('');}} key={s}>{s}</button>)}</div></fieldset> : null}{optionError&&<p id="product-option-error" className="field-error" role="alert">{optionError}</p>}<p className="muted">{selected.stock > 0 ? selected.stock + ' available' : 'Currently out of stock'}</p><ProductPurchase product={selected} onAdd={()=>add(selected)} onBuy={()=>buy(selected)} disabled={!selected.stock||cart.filter(c=>c.id===selected.id).reduce((n,c)=>n+c.qty,0)>=selected.stock}/><small>Cash on delivery · Thoughtfully packed</small><Link className="text-link" href="/cart">View your bag ↗</Link></div></div></main>}
    {view !== 'admin' && <footer><div><BrandLogo/><p>A little elegance for every day.<br />Thoughtfully selected in Bangladesh.</p></div><div><h4>Explore</h4>{categories.map(c => <button key={c} onClick={() => { go('shop', c); }}>{c}</button>)}</div><div><h4>The little details</h4><Link href="/tracking/">Track your order ↗</Link><p>Cash on delivery<br />Dhaka city ৳80 · Outside Dhaka ৳150<br />Returns accepted if the delivered item does not match your order.</p></div><div className="footer-bottom">© {new Date().getFullYear()} AURZÉN. Made with a little love.<a href="/admin">Enter the studio ↗</a></div></footer>}
    {view!=='admin'&&<BagDrawer/>}
    {notice && <div role="status" className="toast">✓ {notice}</div>}</>;
}
