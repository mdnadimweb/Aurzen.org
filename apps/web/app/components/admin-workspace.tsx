'use client';
import ProductPhoto from './product-photo';
import AdminOffer from './admin-offer';
import Modal from './modal';

import BrandLogo from './brand-logo';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { money, type Product, type Order } from '@aurzen/shared/catalog';
import { api, useStore } from '../providers';
function DeliveryEditor({order,onSave}:{order:Order;onSave:(data:Record<string,unknown>)=>Promise<void>}){
    const [saving,setSaving]=useState(false);
    return <form className="admin-delivery-form" onSubmit={async e=>{e.preventDefault();if(saving)return;const data=new FormData(e.currentTarget);setSaving(true);try{await onSave({action:'delivery',id:order.id,courier:data.get('courier'),trackingReference:data.get('trackingReference')});}finally{setSaving(false);}}}>
        <label>Courier<input name="courier" defaultValue={order.courier||''} maxLength={80} disabled={saving} placeholder="Courier name"/></label>
        <label>Tracking reference<input name="trackingReference" defaultValue={order.trackingReference||''} maxLength={120} disabled={saving} placeholder="Real courier reference"/></label>
        <small>Enter both fields to show delivery details to the customer. Clear both to remove them.</small>
        <button className="text-link" disabled={saving}>{saving?'Saving delivery…':'Save delivery details'}</button>
    </form>;
}
export default function AdminWorkspace() {
    const router = useRouter();
    const { products, setProducts, categories, setCategories } = useStore();
    const [offerPrice,setOfferPrice]=useState(0);
    const [orders, setOrders] = useState<Order[]>([]), [tab, setTab] = useState('Overview'), [notice, setNotice] = useState(''), [modal, setModal] = useState(''), [editing, setEditing] = useState<Product | null>(null), [saving, setSaving] = useState(false), [uploading,setUploading]=useState(false), [adminLoaded, setAdminLoaded] = useState(false), [formError,setFormError]=useState('');
    useEffect(()=>{setFormError('');setOfferPrice(editing?.price||0);},[modal,editing?.id]);
    useEffect(() => { api('/api/admin').then(d => { setProducts(d.products); setCategories(d.categories); setOrders(d.orders); setAdminLoaded(true); }).catch(e => setNotice(e.message)); }, []);
    useEffect(() => { if (notice) {
        const t = setTimeout(() => setNotice(''), 6000);
        return () => clearTimeout(t);
    } }, [notice]);
    async function mutate(data: Record<string, unknown>) { const d = await api('/api/admin', { method: 'POST', body: JSON.stringify(data) }); setProducts(d.products); setCategories(d.categories); setOrders(d.orders); }
    async function change(data: Record<string, unknown>) { try {
        await mutate(data);
        setNotice('Changes saved');
    }
    catch (e) {
        setNotice((e as Error).message);
    } }
    const go = (v: string) => router.push(v === 'home' ? '/' : '/' + v);
    return <><div className="admin"><aside><BrandLogo/><small>WORKSPACE</small>{['Overview', 'Products', 'Categories', 'Orders', 'Customers'].map(t => <button className={tab === t ? 'selected' : ''} key={t} onClick={() => setTab(t)}><span>{({ Overview: '◫', Products: '◇', Categories: '▦', Orders: '▤', Customers: '♧' })[t]}</span>{t}</button>)}<a href="/" className="back">↗ View storefront</a><div className="admin-user"><span>N</span><div>Nadim<small>Store owner</small></div></div></aside><div className="admin-main">{!adminLoaded && <p role="status">Loading your workspace…</p>}<button className="text-link signout" onClick={async () => { try {
        await api('/api/admin/session', { method: 'DELETE' });
        setOrders([]);
        router.replace('/admin/login');
        router.refresh();
    }
    catch (e) {
        setNotice((e as Error).message);
    } }}>Sign out</button><div className="admin-top">AURZÉN / Workspace / {tab}<span>● Private workspace</span></div><div className="preview-banner">Products and orders are stored on the server. Replace sample products and confirm delivery settings before opening orders.</div><div className="admin-title"><div><div className="eyebrow">YOUR BUSINESS, AT A GLANCE</div><h1>{tab === 'Overview' ? 'Welcome to your studio, Nadim.' : tab}</h1><p>{tab === 'Overview' ? 'A little clarity for your everyday business.' : 'Manage your AURZÉN ' + tab.toLowerCase() + '.'}</p></div>{['Products', 'Categories'].includes(tab) && <button className="primary" onClick={() => { setEditing(null); setModal(tab === 'Products' ? 'product' : 'category'); }}>+ Add {tab === 'Products' ? 'product' : 'category'}</button>}</div>
    {tab === 'Overview' && <><div className="stats">{[['Order value', money(orders.reduce((s, o) => s + o.total, 0)), 'All time'], ['Orders', orders.length, 'Received orders'], ['Products', products.length, products.reduce((s, p) => s + p.stock, 0) + ' units in stock'], ['Categories', categories.length, 'Ready for your next idea']].map(([label, value, note]) => <div className="panel" key={label}><small>{label}</small><h2>{value}</h2><p>{note}</p></div>)}</div><div className="admin-columns"><div className="panel"><h2>Recent orders</h2>{orders.length ? <table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.slice(0, 5).map(o => <tr key={o.id}><td>{o.id}</td><td>{o.name}</td><td>{money(o.total)}<small>Cash on delivery</small></td><td><span className="status">{o.status}</span></td></tr>)}</tbody></table> : <div className="empty"><span>▤</span><h3>Your next chapter starts here.</h3><p>Your first order will appear here.</p><button className="text-link" onClick={() => go('shop')}>Visit the storefront ↗</button></div>}</div><div className="panel quick-actions"><h2>Make it yours</h2><p>Build a collection that grows with AURZÉN.</p><button onClick={() => { setTab('Products'); setEditing(null); setModal('product'); }}>Add your first new product <span>↗</span></button><button onClick={() => { setTab('Categories'); setModal('category'); }}>Create a category <span>↗</span></button><button onClick={() => go('home')}>Explore the storefront <span>↗</span></button></div></div></>}
    {tab === 'Products' && <div className="panel table-scroll"><table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Action</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td><strong>{p.name}</strong></td><td>{p.category}</td><td>{money(p.price)}</td><td><input aria-label={'Stock for ' + p.name} className="stock-input" type="number" min="0" value={p.stock} onChange={e => { const stock = Number(e.target.value); if (Number.isSafeInteger(stock) && stock >= 0)
        setProducts(products.map(x => x.id === p.id ? { ...x, stock } : x)); }} onBlur={e => void change({ action: 'stock', id: p.id, stock: Number(e.target.value) })}/></td><td><button className="text-link" onClick={() => { setEditing(p); setModal('product'); }}>Edit</button> <button className="text-link" onClick={() => { if (confirm('Remove ' + p.name + ' from the store?'))
        void change({ action: 'deleteProduct', id: p.id }); }}>Remove</button></td></tr>)}</tbody></table></div>}
    {tab === 'Categories' && <div className="category-grid">{categories.map((c, i) => <div className="panel" key={c}><span className="category-icon">0{i + 1} /</span><h2>{c}</h2><p>{products.filter(p => p.category === c).length} products</p><button className="text-link" onClick={() => { if (confirm('Remove ' + c + '?'))
        void change({ action: 'deleteCategory', name: c }); }}>Remove category</button></div>)}</div>}
    {tab === 'Orders' && <div className="panel table-scroll">{!orders.length ? <div className="empty">No orders yet. Place an order from the storefront.</div> : <table><thead><tr><th>Order</th><th>Customer & delivery</th><th>Items</th><th>Total</th><th>Status & courier</th></tr></thead><tbody>{orders.map(o => <tr key={o.id}><td>{o.id}<small>{new Date(o.date).toLocaleDateString('en-BD')}</small></td><td>{o.name}<small>{o.phone}<br />{o.address}<br />{o.area === 'dhaka' ? 'Dhaka city' : 'Outside Dhaka'} · Delivery {money(o.delivery)}</small></td><td>{o.items.map((x) => <small key={x.id + '-' + x.size}>{x.name} × {x.qty}<br />{x.size}</small>)}</td><td>{money(o.total)}<small>Cash on delivery</small></td><td><select aria-label={'Status for '+o.id} value={o.status} onChange={e => void change({ action: 'status', id: o.id, status: e.target.value })}>{['New', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'].map(s => <option key={s}>{s}</option>)}</select><DeliveryEditor key={o.id+'-'+(o.courier||'')+'-'+(o.trackingReference||'')} order={o} onSave={change}/></td></tr>)}</tbody></table>}</div>}
    {tab === 'Customers' && <div className="panel table-scroll">{!orders.length ? <div className="empty">Customer profiles will appear after your first order.</div> : <table><thead><tr><th>Name</th><th>Phone</th><th>Orders</th><th>Order value</th></tr></thead><tbody>{Array.from(new Set(orders.map(o => o.phone))).map(phone => { const list = orders.filter(o => o.phone === phone); return <tr key={phone}><td>{list[0].name}</td><td>{phone}</td><td>{list.length}</td><td>{money(list.reduce((s, o) => s + o.total, 0))}</td></tr>; })}</tbody></table>}</div>}</div></div><Modal open={!!modal} onClose={()=>{if(!saving&&!uploading)setModal('');}} label={editing ? 'Edit product' : 'Add ' + modal} className="admin-edit-dialog">{modal&&<form aria-label={editing ? 'Edit product' : 'Add ' + modal} className="form-modal panel" onSubmit={async (e) => {
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
            }}><button type="button" aria-label="Close form" className="close" disabled={saving || uploading} onClick={() => setModal('')}>×</button><div className="eyebrow">GROW YOUR COLLECTION</div><h2>{editing ? 'Edit product' : 'Add ' + modal}</h2><label>Name<input name="name" autoFocus defaultValue={editing?.name || ''} required minLength={2} maxLength={100}/></label>{modal === 'product' && <><label>Category<select name="category" defaultValue={editing?.category}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><div className="form-pair"><label>Price (৳)<input name="price" type="number" min="1" step="1" max="1000000" defaultValue={editing?.price} onChange={event=>setOfferPrice(Number(event.target.value))} required/></label><label>Stock<input name="stock" type="number" min="0" step="1" max="1000000" defaultValue={editing?.stock} required/></label></div><AdminOffer key={editing?.id||'new'} initialOffer={editing?.offer} price={offerPrice} disabled={saving}/><label>Description<textarea name="description" defaultValue={editing?.description||''} maxLength={3000} rows={5} placeholder="Materials, fit, care instructions and what is included"/></label><label>Product label<input name="tag" defaultValue={editing?.tag||'NEW ARRIVAL'} maxLength={40}/></label><ProductPhoto key={editing?.id||'new'} initialImage={editing?.image||'box'} initialImages={editing?.images||[]} disabled={saving} onBusy={setUploading}/></>}{formError&&<p className="form-error" role="alert">{formError}</p>}<button className="primary" disabled={saving || uploading}>{uploading ? 'Uploading photo…' : saving ? 'Saving…' : 'Save ' + modal + ' ↗'}</button></form>}</Modal>
    {notice && <div role="status" className="toast">{notice}</div>}</>;
}
