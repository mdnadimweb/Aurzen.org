'use client';
import ProductPhoto from './product-photo';
import AdminOffer from './admin-offer';
import AdminVariants from './admin-variants';
import Modal from './modal';
import ProductImage from './product-image';
import Icon,{type IconName} from './admin-icons';
import Overview from './admin/overview';
import {initials,relativeTime} from './admin/metrics';
import OrderEditor from './admin/order-editor';
import HeroEditor from './admin/hero-editor';
import StorefrontEditor from './admin/storefront-editor';
import CategoryManager from './admin/category-manager';
import ProductsTable from './admin/products-table';
import PromotionsEditor from './admin/promotions-editor';
import CategoryPicker from './admin/category-picker';
import OrderFilters,{useOrderFilters} from './admin/order-filters';
import {defaultHeroSlides} from './FashionHero';

import BrandLogo from './brand-logo';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { money, editableStatuses, lineKey, optionLabel, mainCategories, type Product, type Order } from '@aurzen/shared/catalog';
import { api, useStore } from '../providers';

const tabs:{name:string;icon:IconName}[]=[{name:'Overview',icon:'overview'},{name:'Products',icon:'products'},{name:'Categories',icon:'categories'},{name:'Homepage',icon:'slides'},{name:'Orders',icon:'orders'},{name:'Customers',icon:'customers'}];
const statuses=['New','Confirmed','Processing','Shipped','Delivered','Cancelled','Returned'];
const statusKey=(status:string)=>status.toLowerCase().replace(/[^a-z]/g,'');
const stockLevel=(stock:number)=>stock===0?'out':stock<=5?'low':'in';
const stockText=(stock:number)=>stock===0?'Out of stock':stock<=5?'Low stock':'In stock';
const bannerKey='aurzen-studio-banner-dismissed';
type Notice={text:string;kind:'success'|'error'};

function DeliveryEditor({order,onSave,onOpen}:{order:Order;onSave:(data:Record<string,unknown>)=>Promise<void>;onOpen:()=>void}){
    const [saving,setSaving]=useState(false);
    const filled=Boolean(order.courier&&order.trackingReference);
    return <details className="admin-delivery" onToggle={e=>{if(e.currentTarget.open)onOpen();}}>
        <summary><Icon name="truck"/><span>Delivery details</span><span className="admin-delivery__state">{filled?order.courier:'Not added'}</span><Icon name="chevron" className="a-icon admin-delivery__chevron"/></summary>
        <form className="admin-delivery-form" onSubmit={async e=>{e.preventDefault();if(saving)return;const data=new FormData(e.currentTarget);setSaving(true);try{await onSave({action:'delivery',id:order.id,courier:data.get('courier'),trackingReference:data.get('trackingReference')});}finally{setSaving(false);}}}>
            <label>Courier<input name="courier" defaultValue={order.courier||''} maxLength={80} disabled={saving} placeholder="Courier name"/></label>
            <label>Tracking reference<input name="trackingReference" defaultValue={order.trackingReference||''} maxLength={120} disabled={saving} placeholder="Real courier reference"/></label>
            <small>Enter both fields to show delivery details to the customer. Clear both to remove them.</small>
            <button className="a-btn a-btn--primary a-btn--sm" disabled={saving}>{saving?'Saving delivery…':'Save delivery details'}</button>
        </form>
    </details>;
}
export default function AdminWorkspace() {
    const router = useRouter();
    const { products, setProducts, categories, setCategories, categoryTree, setCategoryDetails, promotions, setPromotions, hero, setHero, storefront, setStorefront } = useStore();
    const [categoryRequest,setCategoryRequest]=useState(false);
    const [offerPrice,setOfferPrice]=useState(0);
    const [orders, setOrders] = useState<Order[]>([]), [tab, setTab] = useState('Overview'), [notice, setNoticeState] = useState<Notice|null>(null), [modal, setModal] = useState(''), [editing, setEditing] = useState<Product | null>(null), [saving, setSaving] = useState(false), [uploading,setUploading]=useState(false), [adminLoaded, setAdminLoaded] = useState(false), [formError,setFormError]=useState('');
    const orderFilter=useOrderFilters(orders);
    const [navOpen,setNavOpen]=useState(false),[bannerOpen,setBannerOpen]=useState(true),[editingOrder,setEditingOrder]=useState<Order|null>(null);
    const menuButton=useRef<HTMLButtonElement>(null),sidebar=useRef<HTMLElement>(null);
    const setNotice=(text:string,kind:Notice['kind']='success')=>setNoticeState(text?{text,kind}:null);
    useEffect(()=>{setFormError('');setOfferPrice(editing?.price||0);},[modal,editing?.id]);
    useEffect(() => { api('/api/admin').then(d => { setProducts(d.products); setCategories(d.categories); setCategoryDetails(d.categoryDetails||[]); setPromotions(d.promotions||[]); setHero(d.hero||null); setStorefront(d.storefront||null); setOrders(d.orders); setAdminLoaded(true); }).catch(e => setNotice(e.message,'error')); }, []);
    // Keep the unread-order badge current while the studio is open (orders only, so edits in progress are untouched).
    useEffect(() => { const poll = () => { if (document.visibilityState === 'visible') api('/api/admin').then(d => setOrders(d.orders)).catch(() => {}); }; const timer = setInterval(poll, 30000); document.addEventListener('visibilitychange', poll); return () => { clearInterval(timer); document.removeEventListener('visibilitychange', poll); }; }, []);
    useEffect(() => { if (notice) {
        const t = setTimeout(() => setNoticeState(null), 6000);
        return () => clearTimeout(t);
    } }, [notice]);
    useEffect(()=>{try{if(localStorage.getItem(bannerKey)==='1')setBannerOpen(false);}catch{}},[]);
    // Mobile navigation drawer: Escape closes it, focus moves in and back, and it closes on desktop widths.
    useEffect(()=>{
        if(!navOpen)return;
        sidebar.current?.querySelector<HTMLElement>('nav button')?.focus();
        const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')closeNav();};
        const desktop=window.matchMedia('(min-width: 1025px)');
        const onChange=()=>{if(desktop.matches)setNavOpen(false);};
        document.addEventListener('keydown',onKey);desktop.addEventListener('change',onChange);
        return()=>{document.removeEventListener('keydown',onKey);desktop.removeEventListener('change',onChange);};
    },[navOpen]);
    async function mutate(data: Record<string, unknown>) { const d = await api('/api/admin', { method: 'POST', body: JSON.stringify(data) }); setProducts(d.products); setCategories(d.categories); setCategoryDetails(d.categoryDetails||[]); setPromotions(d.promotions||[]); setHero(d.hero||null); setStorefront(d.storefront||null); setOrders(d.orders); }
    const unread = orders.filter(o => !o.readAt).length;
    // Read status is saved on the server and never changes the fulfilment status.
    const markRead = (order: Order) => { if (order.readAt) return; const readAt = new Date().toISOString(); setOrders(list => list.map(o => o.id === order.id ? { ...o, readAt } : o)); api('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'markRead', id: order.id }) }).then(d => setOrders(d.orders)).catch(e => setNotice((e as Error).message, 'error')); };
    async function change(data: Record<string, unknown>) { try {
        await mutate(data);
        setNotice('Changes saved');
    }
    catch (e) {
        setNotice((e as Error).message,'error');
    } }
    const go = (v: string) => router.push(v === 'home' ? '/' : '/' + v);
    // Focus returns to the menu button once the main area is no longer inert.
    const restoreMenuFocus=()=>requestAnimationFrame(()=>menuButton.current?.focus());
    const choose=(name:string)=>{setTab(name);if(navOpen){setNavOpen(false);restoreMenuFocus();}};
    function closeNav(){setNavOpen(false);restoreMenuFocus();}
    const dismissBanner=()=>{setBannerOpen(false);try{localStorage.setItem(bannerKey,'1');}catch{}};
    const openProduct=(product:Product|null)=>{setEditing(product);setModal('product');};
    return <div className="admin">
    <aside ref={sidebar} id="admin-sidebar" className={'admin-sidebar'+(navOpen?' is-open':'')} aria-label="Studio navigation">
        <div className="admin-sidebar__brand"><BrandLogo/><button type="button" className="a-btn a-btn--icon admin-sidebar__close" aria-label="Close navigation" onClick={closeNav}><Icon name="close"/></button></div>
        <small className="admin-sidebar__label">Workspace</small>
        <nav className="admin-nav">{tabs.map(t => <button type="button" className={tab === t.name ? 'selected' : ''} aria-current={tab===t.name?'page':undefined} key={t.name} onClick={() => choose(t.name)}><Icon name={t.icon}/>{t.name}{t.name==='Orders'&&unread>0&&<span className="admin-nav__badge" aria-label={unread+' unread order'+(unread===1?'':'s')}>{unread>99?'99+':unread}</span>}</button>)}</nav>
        <div className="admin-sidebar__foot">
            <a href="/" className="admin-sidebar__link"><Icon name="storefront"/>View storefront<Icon name="external" className="a-icon admin-sidebar__ext"/></a>
            <div className="admin-user"><span aria-hidden="true">N</span><div>Nadim<small>Store owner</small></div></div>
        </div>
    </aside>
    {navOpen&&<div className="admin-scrim" aria-hidden="true" onClick={closeNav}/>}
    <div className="admin-main" inert={navOpen||undefined}>
        <div className="admin-topbar">
            <button ref={menuButton} type="button" className="a-btn a-btn--icon admin-menu-button" aria-label="Open navigation" aria-expanded={navOpen} aria-controls="admin-sidebar" onClick={()=>setNavOpen(true)}><Icon name="menu"/></button>
            <nav className="admin-breadcrumb" aria-label="Breadcrumb"><ol><li>AURZÉN</li><li>Studio</li><li aria-current="page">{tab}</li></ol></nav>
            <div className="admin-topbar__actions">
                <span className="admin-chip"><Icon name="lock"/>Private workspace</span>
                <button type="button" className="a-btn a-btn--secondary a-btn--sm admin-signout" onClick={async () => { try {
                    await api('/api/admin/session', { method: 'DELETE' });
                    setOrders([]);
                    router.replace('/admin/login');
                    router.refresh();
                }
                catch (e) {
                    setNotice((e as Error).message,'error');
                } }}><Icon name="logout"/><span>Sign out</span></button>
            </div>
        </div>
        <div className="admin-content">
        {!adminLoaded && <p className="admin-loading" role="status">Loading your workspace…</p>}
        {bannerOpen&&<div className="admin-info" role="note"><Icon name="info"/><p><strong>Before you open orders</strong>Products and orders are stored on the server. Replace sample products and confirm delivery settings before opening orders.</p><button type="button" className="a-btn a-btn--icon a-btn--sm" aria-label="Dismiss this note" onClick={dismissBanner}><Icon name="close"/></button></div>}
        <div className="admin-title"><div><div className="admin-eyebrow">{tab==='Overview'?'Your business, at a glance':'Studio · '+tab}</div><h1>{tab === 'Overview' ? 'Welcome to your studio, Nadim.' : tab}</h1><p>{tab === 'Overview' ? 'A little clarity for your everyday business.' : 'Manage your AURZÉN ' + tab.toLowerCase() + '.'}</p></div>{tab === 'Products' && <button type="button" className="a-btn a-btn--primary" onClick={() => { setEditing(null); setModal('product'); }}><Icon name="plus"/>Add product</button>}</div>
    {tab === 'Overview' && (adminLoaded?<Overview orders={orders} products={products} onEditProduct={openProduct} onViewOrders={()=>setTab('Orders')} onAddProduct={()=>{ setTab('Products'); openProduct(null); }} onAddCategory={()=>{ setTab('Categories'); setCategoryRequest(true); }} onStorefront={()=>go('home')}/>:<div className="ov-skeleton" aria-hidden="true">{[0,1,2,3].map(i=><div key={i} className="a-card"/>)}</div>)}
    {tab === 'Products' && <ProductsTable products={products} categories={categoryTree} onEdit={openProduct} onStockInput={(id, stock) => setProducts(products.map(x => x.id === id ? { ...x, stock } : x))} onStockSave={(id, stock) => void change({ action: 'stock', id, stock })} onRemove={p => { if (confirm('Remove ' + p.name + ' from the store?')) void change({ action: 'deleteProduct', id: p.id }); }}/>}
    {tab === 'Categories' && <CategoryManager categories={categoryTree} products={products} requestNew={categoryRequest} onRequestHandled={() => setCategoryRequest(false)} onSave={async data => { await mutate(data); setNotice('Category saved'); }} onDelete={name => change({ action: 'deleteCategory', name })}/>}
    {tab === 'Homepage' && (adminLoaded?<HeroEditor key={'hero:'+JSON.stringify(hero)} initialSlides={hero?.length?hero:defaultHeroSlides(products,categories)} custom={!!hero?.length} categories={categories} onSave={async slides=>{await mutate({action:'saveHero',slides});setNotice('Homepage slides saved');}} onReset={async()=>{await mutate({action:'resetHero'});setNotice('Automatic slides restored');}}/>:<p className="admin-loading" role="status">Loading your slides…</p>)}
    {tab === 'Homepage' && adminLoaded && <StorefrontEditor key={'storefront:'+JSON.stringify(storefront)+categoryTree.length} initial={storefront} categories={mainCategories(categoryTree).map(c=>c.name)} products={products} onSave={async value=>{await mutate({action:'saveStorefront',storefront:value});setNotice('Storefront saved');}}/>}
    {tab === 'Homepage' && adminLoaded && <PromotionsEditor key={'promotions:'+JSON.stringify(promotions)} initial={promotions} products={products} categories={categoryTree} onSave={async value=>{await mutate({action:'savePromotions',promotions:value});setNotice('Promotions saved');}}/>}
    {tab === 'Orders' && <section className="a-card a-card--flush" aria-label="Orders">{!orders.length ? <div className="admin-empty"><span className="admin-empty__icon"><Icon name="orders"/></span><h3>No orders yet.</h3><p>Place an order from the storefront.</p></div> : <><OrderFilters state={orderFilter}/>{!orderFilter.filtered.length ? <div className="admin-empty" role="status"><span className="admin-empty__icon"><Icon name="orders"/></span><h3>No orders found</h3><p>Try another search or date range.</p><button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={orderFilter.reset}>Reset filters</button></div> : <div className="admin-table-wrap"><table className="admin-table admin-table--orders"><thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Delivery address</th><th scope="col">Items</th><th scope="col" className="admin-num">Total</th><th scope="col">Status & courier</th></tr></thead><tbody>{orderFilter.filtered.map(o => <tr key={o.id}>
        <td data-label="Order"><span className="admin-mono">{o.id}</span>{!o.readAt&&<span className="admin-new-marker">New<span className="sr-only"> unread order</span></span>}<small>{new Date(o.date).toLocaleDateString('en-BD')}{o.editedAt&&<> · Edited {relativeTime(o.editedAt)}</>}</small>{editableStatuses.includes(o.status)?<button type="button" className="a-btn a-btn--secondary a-btn--sm admin-order-edit" data-row-action="edit-order" aria-label={'Edit order '+o.id} onClick={()=>{markRead(o);setEditingOrder(o);}}><Icon name="edit"/>Edit order</button>:<small className="admin-order-locked"><Icon name="lock"/>{o.status==='Cancelled'?'Locked · order cancelled':o.status==='Returned'?'Locked · order returned':'Locked · already shipped'}</small>}</td>
        <td data-label="Customer"><strong className="admin-order-name">{o.name}</strong><small>{o.phone}</small></td>
        <td data-label="Address" className="admin-order-address">{o.address}<small>{o.area === 'dhaka' ? 'Dhaka city' : 'Outside Dhaka'} · Delivery {money(o.delivery)}</small></td>
        <td data-label="Items">{o.items.map((x) => <small key={lineKey(x)}>{x.name} × {x.qty}<br />{optionLabel(x)}</small>)}</td>
        <td data-label="Total" className="admin-num">{money(o.total)}<small>Cash on delivery</small></td>
        <td data-label="Status"><div className="a-status-select" data-status={statusKey(o.status)}><span className="a-pill__dot" aria-hidden="true"/><select aria-label={'Status for '+o.id} value={o.status} onChange={e => void change({ action: 'status', id: o.id, status: e.target.value })}>{statuses.map(s => <option key={s}>{s}</option>)}</select></div><DeliveryEditor key={o.id+'-'+(o.courier||'')+'-'+(o.trackingReference||'')} order={o} onSave={change} onOpen={()=>markRead(o)}/></td>
    </tr>)}</tbody></table></div>}</>}</section>}
    {tab === 'Customers' && <section className="a-card a-card--flush" aria-label="Customers">{!orders.length ? <div className="admin-empty"><span className="admin-empty__icon"><Icon name="customers"/></span><h3>No customers yet.</h3><p>Customer profiles will appear after your first order.</p></div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th scope="col">Name</th><th scope="col">Phone</th><th scope="col" className="admin-num">Orders</th><th scope="col" className="admin-num">Order value</th></tr></thead><tbody>{Array.from(new Set(orders.map(o => o.phone))).map(phone => { const list = orders.filter(o => o.phone === phone); return <tr key={phone}><td data-label="Name"><div className="admin-person"><span aria-hidden="true">{initials(list[0].name)}</span>{list[0].name}</div></td><td data-label="Phone">{phone}</td><td data-label="Orders" className="admin-num">{list.length}</td><td data-label="Order value" className="admin-num">{money(list.reduce((s, o) => s + o.total, 0))}</td></tr>; })}</tbody></table></div>}</section>}
        </div>
    </div>
    <Modal open={!!modal} onClose={()=>{if(!saving&&!uploading)setModal('');}} label={editing ? 'Edit product' : 'Add ' + modal} className={'admin-edit-dialog admin-edit-dialog--'+(modal||'closed')}>{modal&&<form aria-label={editing ? 'Edit product' : 'Add ' + modal} className="form-modal" onSubmit={async (e) => {
                e.preventDefault();
                if (saving || uploading)
                    return;
                setSaving(true);
                setFormError('');
                const f = new FormData(e.currentTarget);
                try {
                    await mutate(modal === 'category' ? { action: 'addCategory', name: f.get('name') } : { action: 'saveProduct', id: editing?.id, name: f.get('name'), category: f.get('category'), price: Number(f.get('price')), stock: Number(f.get('stock')), image: f.get('image') || 'box', images:JSON.parse(String(f.get('images')||'[]')), description:f.get('description'),tag:f.get('tag'),offer:JSON.parse(String(f.get('offer')||'null')),sizes:JSON.parse(String(f.get('sizes')||'[]')),colors:JSON.parse(String(f.get('colors')||'[]')) });
                    setModal('');
                    setEditing(null);
                    setNotice('Saved to your store');
                }
                catch (e) {
                    setFormError((e as Error).message);
                }
                finally {
                    setSaving(false);
                }
            }}>
            <div className="form-modal__head"><div><div className="admin-eyebrow">{modal==='product'?'Grow your collection':'Organise your store'}</div><h2>{editing ? 'Edit product' : 'Add ' + modal}</h2></div><button type="button" aria-label="Close form" className="a-btn a-btn--icon close" disabled={saving || uploading} onClick={() => setModal('')}><Icon name="close"/></button></div>
            <div className="form-modal__body">
                <div className="form-modal__main">
                    <section className="form-section"><h3>{modal==='product'?'Product details':'Category'}</h3>
                        <label>Name<input name="name" autoFocus defaultValue={editing?.name || ''} required minLength={2} maxLength={100}/></label>
                        {modal === 'product' && <><CategoryPicker key={editing?.id||'new'} categories={categoryTree} initial={editing?.category}/><label>Product label<input name="tag" defaultValue={editing?.tag||'NEW ARRIVAL'} maxLength={40}/></label></>}
                    </section>
                    {modal === 'product' && <><section className="form-section"><h3>Pricing & stock</h3><div className="form-pair"><label>Price (৳)<input name="price" type="number" min="1" step="1" max="1000000" defaultValue={editing?.price} onChange={event=>setOfferPrice(Number(event.target.value))} required/></label><label>Stock<input name="stock" type="number" min="0" step="1" max="1000000" defaultValue={editing?.stock} required/></label></div></section>
                    <section className="form-section"><h3>Description</h3><label>Description<textarea name="description" defaultValue={editing?.description||''} maxLength={3000} rows={6} placeholder="Materials, fit, care instructions and what is included"/></label></section>
                    <AdminVariants key={editing?.id||'new'} product={editing} disabled={saving}/></>}
                </div>
                {modal === 'product' && <div className="form-modal__side">
                    <section className="form-section"><h3>Photos</h3><ProductPhoto key={editing?.id||'new'} initialImage={editing?.image||'box'} initialImages={editing?.images||[]} disabled={saving} onBusy={setUploading}/></section>
                    <AdminOffer key={editing?.id||'new'} initialOffer={editing?.offer} price={offerPrice} disabled={saving}/>
                </div>}
            </div>
            <div className="form-modal__foot">{formError&&<p className="form-error" role="alert">{formError}</p>}<div className="form-modal__buttons"><button type="button" className="a-btn a-btn--secondary" disabled={saving || uploading} onClick={() => setModal('')}>Cancel</button><button className="a-btn a-btn--primary" disabled={saving || uploading}>{uploading ? 'Uploading photo…' : saving ? 'Saving…' : 'Save ' + modal}</button></div></div>
        </form>}</Modal>
    <Modal open={!!editingOrder} onClose={()=>setEditingOrder(null)} label={editingOrder?'Edit order '+editingOrder.id:'Edit order'} className="admin-edit-dialog admin-edit-dialog--order">{editingOrder&&<OrderEditor key={editingOrder.id} order={editingOrder} products={products} onCancel={()=>setEditingOrder(null)} onSave={async data=>{await mutate({action:'editOrder',...data});setEditingOrder(null);setNotice('Order updated');}}/>}</Modal>
    {notice && <div role={notice.kind==='error'?'alert':'status'} className={'admin-toast admin-toast--'+notice.kind}><Icon name={notice.kind==='error'?'alert':'check'}/><span>{notice.text}</span><button type="button" className="a-btn a-btn--icon a-btn--sm" aria-label="Dismiss notification" onClick={()=>setNoticeState(null)}><Icon name="close"/></button></div>}
    </div>;
}
