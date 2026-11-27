'use client';
import SiteFooter from './components/site-footer';
import SiteExtras,{trackEvent} from './components/site-extras';
import FadeIn from './FadeIn';
import FashionHero from './components/FashionHero';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { money, categoryPath, categoryFromSlugs, categoryFamily, mainCategories, productPricing, sizeAvailable, type Product } from '@aurzen/shared/catalog';
import { renderMarkdown, isMystery, sizeGuideFor, type ContentPage, type FaqGroup, type Review } from '@aurzen/shared/site';
import Modal from './components/modal';
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
import WhatsAppLink from './components/whatsapp-link';
import MysterySlides from './components/mystery-slides';
import ProductGallery from './components/product-gallery';
import RelatedProducts from './components/related-products';
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
    const { bestsellers, site, products, categories, categoryTree, cart, setCart, loaded, error, refresh, bagOpen, setBagOpen } = useStore();
    const [filter, setFilter] = useState('All'), [query, setQuery] = useState(''), [sort, setSort] = useState('featured'), [notice, setNotice] = useState(''), [selected, setSelected] = useState<Product | null>(product || null), [size, setSize] = useState(''), [boxStyle, setBoxStyle] = useState(''), [color, setColor] = useState(''), [optionError,setOptionError]=useState(''), [colorError,setColorError]=useState(''), [guideOpen,setGuideOpen]=useState(false);
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
    // Studio → Appearance → Maintenance mode: the shop shows only a short message (the studio still works).
    if (site.appearance.maintenance && view !== 'admin') return <main className="section empty maintenance"><div className="eyebrow">{site.general.brand}</div><h1>We’ll be back soon.</h1><p>{site.appearance.maintenanceMessage}</p></main>;
    const guide = selected ? sizeGuideFor(site, categoryTree, selected) : null;
    return <>{error && <div className="form-error" role="alert">{error} <button className="text-link" onClick={() => void refresh()}>Retry</button></div>}{view !== 'admin' && <StoreHeader view={view} count={count} onBag={()=>setBagOpen(true)} bagOpen={bagOpen} categories={categories} onNavigate={go}/>}
    {view === 'home' && (()=>{
      // Studio → Homepage text: section order, hidden sections and where the favourites come from.
      const h=site.home, f=h.favourites, now=Date.now(), mystery=categoryTree.find(c=>!c.parent&&/mystery/i.test(c.name));
      const inStock=products.filter(p=>p.stock>0);
      const pool=f.source==='newest'?[...products].sort((a,b)=>b.id-a.id):f.source==='bestsellers'?[...bestsellers.map(id=>products.find(p=>p.id===id)).filter((p):p is Product=>!!p),...inStock.filter(p=>!bestsellers.includes(p.id))]:f.source==='sale'?products.filter(p=>productPricing(p,now).active):f.source==='category'?products.filter(p=>categoryFamily(categoryTree,f.category).includes(p.category)):f.source==='manual'?f.ids.map(id=>products.find(p=>p.id===id)).filter((p):p is Product=>!!p):products;
      const favourites=pool.slice(0,f.count), hidden=new Set(h.hidden), showFavourites=!f.hidden&&!hidden.has('favourites')&&favourites.length>0;
      const lines=(text:string)=>text.split('\n').map((line,i)=><span key={i}>{i>0&&<br/>}{line}</span>);
      const blocks:Record<string,React.ReactNode>={
        trust:h.trust.some(t=>!t.hidden)&&<div className="benefits">{h.trust.filter(t=>!t.hidden).map(t=><span key={t.id}>{t.icon&&<>{t.icon} &nbsp; </>}{t.text}</span>)}</div>,
        collections:<FeaturedCategories/>,
        promos:<PromoCarousel/>,
        favourites:showFavourites&&<FadeIn as="section" className="section picks"><div className="section-heading">{f.eyebrow&&<div className="eyebrow">{f.eyebrow}</div>}<h2>{f.title}</h2>{f.cta&&<button className="text-link" onClick={() => go('shop')}>{f.cta}</button>}</div><div className="product-grid">{favourites.map((p,i) => <Card key={p.id} p={p} delay={(i%4)*60}/>)}</div></FadeIn>,
        categoryRows:<CategoryPreviews exclude={showFavourites?favourites.map(p => p.id):[]}/>,
        mystery:mystery&&!h.mystery.hidden&&<FadeIn as="section" className="mystery">{h.mystery.images?.length?<MysterySlides images={h.mystery.images} interval={h.mystery.interval} label={h.mystery.title.replace(/\n/g,' ')}/>:<Box />}<div>{h.mystery.eyebrow&&<div className="eyebrow">{h.mystery.eyebrow}</div>}<h2>{lines(h.mystery.title)}</h2>{h.mystery.text&&<p>{h.mystery.text}</p>}{h.mystery.cta&&<Link className="primary" href={categoryPath(categoryTree,mystery.name)}>{h.mystery.cta}</Link>}{h.mystery.small&&<small>{h.mystery.small}</small>}</div></FadeIn>,
        testimonials:<Testimonials reviews={reviews}/>,
        note:!h.note.hidden&&<FadeIn as="section" className="brand-note">{h.note.eyebrow&&<div className="eyebrow">{h.note.eyebrow}</div>}<h2>{h.note.title}{h.note.emphasis&&<><br /><em>{h.note.emphasis}</em></>}</h2>{h.note.text&&<p>{h.note.text}</p>}</FadeIn>,
      };
      return <><main><FashionHero />{h.order.filter(id=>!hidden.has(id)).map(id=><Fragment key={id}>{blocks[id]}</Fragment>)}</main></>;
    })()}
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
    {view === 'product' && selected && <main className="section product-page has-mobile-purchase"><Link className="text-link" href={categoryTree.some(c => c.name === selected.category) ? categoryPath(categoryTree, selected.category) : "/shop/"}>← Back to {categoryTree.some(c => c.name === selected.category) ? selected.category : "collection"}</Link><div className="detail"><div className="product-gallery-offer"><ProductGallery key={selected.id} product={selected}/><OfferBadge product={selected}/></div><div className="detail-copy"><div className="eyebrow">{selected.category}</div><h1>{selected.name}</h1><ProductPrice product={selected}/>{selected.description ? <div className="rich product-description" dangerouslySetInnerHTML={{ __html: renderMarkdown(selected.description) }}/> : <p>{(isMystery(categoryTree, selected.category) ? 'A curated surprise of fashion and accessories. Share your style preference to help us make it feel like you.' : 'An everyday favourite, thoughtfully selected for your wardrobe.')}</p>}{isMystery(categoryTree, selected.category) && (()=>{ const m = site.mysteryBox; if (!m.guaranteed && !m.worth && !m.noSpoiler && !m.steps.length) return null; return <div className="mystery-details">{m.worth > 0 && <p className="mystery-details__worth">Worth at least {money(m.worth)}</p>}{m.guaranteed && <><h2>What’s inside</h2><p>{m.guaranteed}</p></>}{m.steps.length > 0 && <><h2>How it works</h2><ol>{m.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></>}{m.noSpoiler && <small>{m.noSpoiler}</small>}</div>; })()}{styleChoice(selected) ? <label id="product-options" tabIndex={-1}>Your style<select value={boxStyle} aria-invalid={!!optionError} aria-describedby={optionError?'product-option-error':undefined} onChange={e => {setBoxStyle(e.target.value);setOptionError('');}}><option value="">Choose your style</option>{styleOptions.map(s => <option key={s}>{s}</option>)}</select></label> : hasSizeChoice(selected) ? <fieldset id="product-options" className="product-options" tabIndex={-1}><legend>Choose a size{size&&<span className="product-options__chosen">: {size}</span>}</legend><div className="chips" role="group" aria-label="Choose a size" aria-invalid={!!optionError} aria-describedby={optionError?'product-option-error':undefined}>{productOptions(selected).map(s => { const soldOut = sizeAvailable(selected, s) <= 0; return <button type="button" aria-pressed={size === s} className={size === s ? 'chosen' : ''} disabled={soldOut} title={soldOut ? 'Sold out' : undefined} onClick={() => {setSize(s);setOptionError('');}} key={s}>{s}{soldOut && <span className="sr-only"> (sold out)</span>}</button>; })}</div></fieldset> : null}{optionError&&<p id="product-option-error" className="field-error" role="alert">{optionError}</p>}{productColors(selected).length>0&&<fieldset id="product-colors" className="product-options" tabIndex={-1}><legend>Choose a colour{color&&<span className="product-options__chosen">: {color}</span>}</legend><div className="chips" role="group" aria-label="Choose a colour" aria-invalid={!!colorError} aria-describedby={colorError?'product-color-error':undefined}>{productColors(selected).map(c => <button type="button" aria-pressed={color === c} className={color === c ? 'chosen' : ''} onClick={() => {setColor(c);setColorError('');}} key={c}>{c}</button>)}</div></fieldset>}{colorError&&<p id="product-color-error" className="field-error" role="alert">{colorError}</p>}{guide && <><button type="button" className="text-link size-guide-link" onClick={() => setGuideOpen(true)}>Size guide ↗</button><Modal open={guideOpen} onClose={() => setGuideOpen(false)} label={guide.name} className="size-guide-modal"><div className="size-guide"><div className="size-guide__head"><h2>{guide.name}</h2><button type="button" aria-label="Close size guide" onClick={() => setGuideOpen(false)}>×</button></div><div className="size-guide__table"><table><thead><tr>{guide.columns.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead><tbody>{guide.rows.map((r, i) => <tr key={i}>{r.map((v, j) => j === 0 ? <th key={j} scope="row">{v}</th> : <td key={j}>{v}</td>)}</tr>)}</tbody></table></div>{guide.note && <p>{guide.note}</p>}</div></Modal></>}<p className="muted">{selected.stock > 0 ? selected.stock + ' available' : 'Currently out of stock'}</p><ProductPurchase product={selected} onAdd={()=>add(selected)} onBuy={()=>buy(selected)} disabled={!selected.stock||cart.filter(c=>c.id===selected.id).reduce((n,c)=>n+c.qty,0)>=selected.stock}/><WhatsAppLink className="purchase-chat" label={'Order or ask about '+selected.name+' on WhatsApp'} message={origin=>{const mystery=isMystery(categoryTree, selected.category),choice=mystery?boxStyle:size;return ['Hi '+site.general.brand+', I would like to order:',selected.name,...(mystery||productOptions(selected).length?[(mystery?'Style: ':'Size: ')+(choice||'not chosen yet')]:[]),...(color?['Colour: '+color]:[]),'Price: '+money(productPricing(selected).unitPrice),...(origin?[origin+'/products/'+selected.id+'/']:[])].join('\n');}}><span className="purchase-chat__lead">Prefer to chat?</span> <span className="purchase-chat__cta">Order on WhatsApp</span><span className="purchase-chat__arrow" aria-hidden="true">→</span></WhatsAppLink><ul className="purchase-trust" aria-label="Delivery and packing"><li><span className="purchase-trust__icon"><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/></svg></span>Cash on delivery</li><li><span className="purchase-trust__icon"><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="9" width="17" height="11" rx="1"/><path d="M2.5 9h19V6.5h-19z"/><path d="M12 6.5V20"/><path d="M12 6.5C10.5 3.5 7 3.5 7.5 5.5S12 6.5 12 6.5Zm0 0c1.5-3 5-3 4.5-1S12 6.5 12 6.5Z"/></svg></span>Thoughtfully packed</li></ul></div></div><ProductReviews reviews={reviews}/><RelatedProducts key={'related-'+selected.id} product={selected}/></main>}
    {view !== 'admin' && <SiteFooter/>}
    {view!=='admin'&&<BagDrawer/>}
    <SiteExtras/>
    {notice && <div role="status" className="toast">✓ {notice}</div>}</>;
}
