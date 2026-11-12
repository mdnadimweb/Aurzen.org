'use client';
import ProductPhoto from './product-photo';
import AdminOffer from './admin-offer';
import Modal from './modal';
import ProductImage from './product-image';
import Icon,{type IconName} from './admin-icons';
import Overview from './admin/overview';
import {initials} from './admin/metrics';

import BrandLogo from './brand-logo';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { money, type Product, type Order } from '@aurzen/shared/catalog';
import { api, useStore } from '../providers';

const tabs:{name:string;icon:IconName}[]=[{name:'Overview',icon:'overview'},{name:'Products',icon:'products'},{name:'Categories',icon:'categories'},{name:'Orders',icon:'orders'},{name:'Customers',icon:'customers'}];
const statuses=['New','Confirmed','Processing','Shipped','Delivered','Cancelled','Returned'];
const statusKey=(status:string)=>status.toLowerCase().replace(/[^a-z]/g,'');
const stockLevel=(stock:number)=>stock===0?'out':stock<=5?'low':'in';
const stockText=(stock:number)=>stock===0?'Out of stock':stock<=5?'Low stock':'In stock';
const bannerKey='aurzen-studio-banner-dismissed';
type Notice={text:string;kind:'success'|'error'};

function DeliveryEditor({order,onSave}:{order:Order;onSave:(data:Record<string,unknown>)=>Promise<void>}){
    const [saving,setSaving]=useState(false);
    const filled=Boolean(order.courier&&order.trackingReference);
    return <details className="admin-delivery">
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
    const { products, setProducts, categories, setCategories } = useStore();
    const [offerPrice,setOfferPrice]=useState(0);
    const [orders, setOrders] = useState<Order[]>([]), [tab, setTab] = useState('Overview'), [notice, setNoticeState] = useState<Notice|null>(null), [modal, setModal] = useState(''), [editing, setEditing] = useState<Product | null>(null), [saving, setSaving] = useState(false), [uploading,setUploading]=useState(false), [adminLoaded, setAdminLoaded] = useState(false), [formError,setFormError]=useState('');
    const [navOpen,setNavOpen]=useState(false),[bannerOpen,setBannerOpen]=useState(true);
    const menuButton=useRef<HTMLButtonElement>(null),sidebar=useRef<HTMLElement>(null);
    const setNotice=(text:string,kind:Notice['kind']='success')=>setNoticeState(text?{text,kind}:null);
    useEffect(()=>{setFormError('');setOfferPrice(editing?.price||0);},[modal,editing?.id]);
    useEffect(() => { api('/api/admin').then(d => { setProducts(d.products); setCategories(d.categories); setOrders(d.orders); setAdminLoaded(true); }).catch(e => setNotice(e.message,'error')); }, []);
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
    async function mutate(data: Record<string, unknown>) { const d = await api('/api/admin', { method: 'POST', body: JSON.stringify(data) }); setProducts(d.products); setCategories(d.categories); setOrders(d.orders); }
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
        <nav className="admin-nav">{tabs.map(t => <button type="button" className={tab === t.name ? 'selected' : ''} aria-current={tab===t.name?'page':undefined} key={t.name} onClick={() => choose(t.name)}><Icon name={t.icon}/>{t.name}</button>)}</nav>
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
        <div className="admin-title"><div><div className="admin-eyebrow">{tab==='Overview'?'Your business, at a glance':'Studio · '+tab}</div><h1>{tab === 'Overview' ? 'Welcome to your studio, Nadim.' : tab}</h1><p>{tab === 'Overview' ? 'A little clarity for your everyday business.' : 'Manage your AURZÉN ' + tab.toLowerCase() + '.'}</p></div>{['Products', 'Categories'].includes(tab) && <button type="button" className="a-btn a-btn--primary" onClick={() => { setEditing(null); setModal(tab === 'Products' ? 'product' : 'category'); }}><Icon name="plus"/>Add {tab === 'Products' ? 'product' : 'category'}</button>}</div>
    {tab === 'Overview' && (adminLoaded?<Overview orders={orders} products={products} onEditProduct={openProduct} onViewOrders={()=>setTab('Orders')} onAddProduct={()=>{ setTab('Products'); openProduct(null); }} onAddCategory={()=>{ setTab('Categories'); setModal('category'); }} onStorefront={()=>go('home')}/>:<div className="ov-skeleton" aria-hidden="true">{[0,1,2,3].map(i=><div key={i} className="a-card"/>)}</div>)}
    {tab === 'Products' && <section className="a-card a-card--flush" aria-label="Products"><div className="admin-table-wrap"><table className="admin-table admin-table--products"><thead><tr><th scope="col">Product</th><th scope="col">Category</th><th scope="col" className="admin-num">Price</th><th scope="col">Stock</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{products.map(p => <tr key={p.id}>
        <td data-label="Product"><div className="admin-product"><span className="admin-thumb" aria-hidden="true"><ProductImage src={p.image} alt={p.name} category={p.category}/></span><div><strong>{p.name}</strong>{p.tag&&<small>{p.tag}</small>}</div></div></td>
        <td data-label="Category">{p.category}</td>
        <td data-label="Price" className="admin-num">{money(p.price)}{p.offer?.enabled&&<small>Offer {p.offer.percent}%</small>}</td>
        <td data-label="Stock"><div className="a-stock" data-level={stockLevel(p.stock)}><span className="a-stock__dot" aria-hidden="true"/><input aria-label={'Stock for ' + p.name} aria-describedby={'stock-state-'+p.id} className="stock-input" type="number" min="0" value={p.stock} onChange={e => { const stock = Number(e.target.value); if (Number.isSafeInteger(stock) && stock >= 0)
        setProducts(products.map(x => x.id === p.id ? { ...x, stock } : x)); }} onBlur={e => void change({ action: 'stock', id: p.id, stock: Number(e.target.value) })}/><small id={'stock-state-'+p.id}>{stockText(p.stock)}</small></div></td>
        <td data-label="Actions" className="admin-actions"><button type="button" className="a-btn a-btn--secondary a-btn--sm" data-row-action="edit" aria-label={'Edit '+p.name} onClick={() => openProduct(p)}><Icon name="edit"/>Edit</button><button type="button" className="a-btn a-btn--danger-ghost a-btn--sm" data-row-action="remove" aria-label={'Remove '+p.name} onClick={() => { if (confirm('Remove ' + p.name + ' from the store?'))
        void change({ action: 'deleteProduct', id: p.id }); }}><Icon name="trash"/>Remove</button></td>
    </tr>)}</tbody></table></div>{!products.length&&<div className="admin-empty"><span className="admin-empty__icon"><Icon name="products"/></span><h3>No products yet.</h3><p>Add your first product to start selling.</p></div>}</section>}
    {tab === 'Categories' && <div className="admin-category-grid">{categories.map((c) => { const count=products.filter(p => p.category === c).length; return <article className="a-card admin-category" key={c}><span className="admin-category__icon"><Icon name={/mystery/i.test(c)?'box':'categories'}/></span><h2>{c}</h2><p>{count} product{count===1?'':'s'}</p><button type="button" className="a-btn a-btn--danger-ghost a-btn--sm" aria-label={'Remove category '+c} onClick={() => { if (confirm('Remove ' + c + '?'))
        void change({ action: 'deleteCategory', name: c }); }}><Icon name="trash"/>Remove category</button></article>; })}</div>}
    {tab === 'Orders' && <section className="a-card a-card--flush" aria-label="Orders">{!orders.length ? <div className="admin-empty"><span className="admin-empty__icon"><Icon name="orders"/></span><h3>No orders yet.</h3><p>Place an order from the storefront.</p></div> : <div className="admin-table-wrap"><table className="admin-table admin-table--orders"><thead><tr><th scope="col">Order</th><th scope="col">Customer & delivery</th><th scope="col">Items</th><th scope="col" className="admin-num">Total</th><th scope="col">Status & courier</th></tr></thead><tbody>{orders.map(o => <tr key={o.id}>
        <td data-label="Order"><span className="admin-mono">{o.id}</span><small>{new Date(o.date).toLocaleDateString('en-BD')}</small></td>
        <td data-label="Customer">{o.name}<small>{o.phone}<br />{o.address}<br />{o.area === 'dhaka' ? 'Dhaka city' : 'Outside Dhaka'} · Delivery {money(o.delivery)}</small></td>
        <td data-label="Items">{o.items.map((x) => <small key={x.id + '-' + x.size}>{x.name} × {x.qty}<br />{x.size}</small>)}</td>
        <td data-label="Total" className="admin-num">{money(o.total)}<small>Cash on delivery</small></td>
        <td data-label="Status"><div className="a-status-select" data-status={statusKey(o.status)}><span className="a-pill__dot" aria-hidden="true"/><select aria-label={'Status for '+o.id} value={o.status} onChange={e => void change({ action: 'status', id: o.id, status: e.target.value })}>{statuses.map(s => <option key={s}>{s}</option>)}</select></div><DeliveryEditor key={o.id+'-'+(o.courier||'')+'-'+(o.trackingReference||'')} order={o} onSave={change}/></td>
    </tr>)}</tbody></table></div>}</section>}
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
                    await mutate(modal === 'category' ? { action: 'addCategory', name: f.get('name') } : { action: 'saveProduct', id: editing?.id, name: f.get('name'), category: f.get('category'), price: Number(f.get('price')), stock: Number(f.get('stock')), image: f.get('image') || 'box', images:JSON.parse(String(f.get('images')||'[]')), description:f.get('description'),tag:f.get('tag'),offer:JSON.parse(String(f.get('offer')||'null')) });
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
                        {modal === 'product' && <><label>Category<select name="category" defaultValue={editing?.category}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label>Product label<input name="tag" defaultValue={editing?.tag||'NEW ARRIVAL'} maxLength={40}/></label></>}
                    </section>
                    {modal === 'product' && <><section className="form-section"><h3>Pricing & stock</h3><div className="form-pair"><label>Price (৳)<input name="price" type="number" min="1" step="1" max="1000000" defaultValue={editing?.price} onChange={event=>setOfferPrice(Number(event.target.value))} required/></label><label>Stock<input name="stock" type="number" min="0" step="1" max="1000000" defaultValue={editing?.stock} required/></label></div></section>
                    <section className="form-section"><h3>Description</h3><label>Description<textarea name="description" defaultValue={editing?.description||''} maxLength={3000} rows={6} placeholder="Materials, fit, care instructions and what is included"/></label></section></>}
                </div>
                {modal === 'product' && <div className="form-modal__side">
                    <section className="form-section"><h3>Photos</h3><ProductPhoto key={editing?.id||'new'} initialImage={editing?.image||'box'} initialImages={editing?.images||[]} disabled={saving} onBusy={setUploading}/></section>
                    <AdminOffer key={editing?.id||'new'} initialOffer={editing?.offer} price={offerPrice} disabled={saving}/>
                </div>}
            </div>
            <div className="form-modal__foot">{formError&&<p className="form-error" role="alert">{formError}</p>}<div className="form-modal__buttons"><button type="button" className="a-btn a-btn--secondary" disabled={saving || uploading} onClick={() => setModal('')}>Cancel</button><button className="a-btn a-btn--primary" disabled={saving || uploading}>{uploading ? 'Uploading photo…' : saving ? 'Saving…' : 'Save ' + modal}</button></div></div>
        </form>}</Modal>
    {notice && <div role={notice.kind==='error'?'alert':'status'} className={'admin-toast admin-toast--'+notice.kind}><Icon name={notice.kind==='error'?'alert':'check'}/><span>{notice.text}</span><button type="button" className="a-btn a-btn--icon a-btn--sm" aria-label="Dismiss notification" onClick={()=>setNoticeState(null)}><Icon name="close"/></button></div>}
    </div>;
}
