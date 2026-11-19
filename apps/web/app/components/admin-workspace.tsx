'use client';
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
import ProductEditor from './admin/product-editor';
import OrderFilters,{useOrderFilters} from './admin/order-filters';
import {defaultHeroSlides} from './FashionHero';

import BrandLogo from './brand-logo';

import { useState, useEffect, useRef, Fragment } from 'react';
import { defaultContent, type Content, type CustomerInfo } from '@aurzen/shared/site';
import { OrderTools, OrderBulkBar, paymentName } from './admin/order-tools';
import CustomersPanel from './admin/customers-panel';
import { MessageTemplates, CategorySettingsEditor, StorefrontSettings, GeneralSettings, SeoSettings, PopupSettings, PagesEditor, FaqEditor, ReviewsEditor, Subscribers, ActivityLog, type SiteProps } from './admin/site-settings';
import Backup from './admin/backup';
import './admin/editable-card.css';
import { useRouter, usePathname } from 'next/navigation';
import { money, editableStatuses, statusOptions, lineKey, optionLabel, mainCategories, type Product, type Order } from '@aurzen/shared/catalog';
import { api, useStore } from '../providers';

const tabs:{name:string;icon:IconName;group?:string}[]=[{name:'Overview',icon:'overview'},{name:'Orders',icon:'orders'},{name:'Products',icon:'products'},{name:'Categories',icon:'categories'},{name:'Customers',icon:'customers'},
    {name:'Homepage',icon:'slides',group:'Storefront'},{name:'Menus & text',icon:'storefront',group:'Storefront'},{name:'Pages',icon:'edit',group:'Storefront'},{name:'FAQ',icon:'info',group:'Storefront'},{name:'Reviews',icon:'check',group:'Storefront'},
    {name:'Popup',icon:'plus',group:'Marketing'},{name:'Subscribers',icon:'customers',group:'Marketing'},
    {name:'Settings',icon:'lock',group:'Settings'},{name:'SEO & integrations',icon:'external',group:'Settings'},{name:'Activity log',icon:'overview',group:'Settings'},{name:'Backup',icon:'truck',group:'Settings'}];
const statusKey=(status:string)=>status.toLowerCase().replace(/[^a-z]/g,'');
const stockLevel=(stock:number)=>stock===0?'out':stock<=5?'low':'in';
const stockText=(stock:number)=>stock===0?'Out of stock':stock<=5?'Low stock':'In stock';
const leaveMessage='Leave this page? Your unsaved product changes will be lost.';
const bannerKey='aurzen-studio-banner-dismissed';
type Notice={text:string;kind:'success'|'error'};

function DeliveryEditor({order,onSave,onOpen}:{order:Order;onSave:(data:Record<string,unknown>)=>Promise<void>;onOpen:()=>void}){
    const [saving,setSaving]=useState(false);
    const filled=Boolean(order.courier&&order.trackingReference);
    return <details className="admin-delivery" onToggle={e=>{if(e.currentTarget.open)onOpen();}}>
        <summary><Icon name="truck"/><span>Delivery details</span><span className="admin-delivery__state">{filled?order.courier:'Not added'}</span><Icon name="chevron" className="a-icon admin-delivery__chevron"/></summary>
        <form className="admin-delivery-form" onSubmit={async e=>{e.preventDefault();if(saving)return;const data=new FormData(e.currentTarget);setSaving(true);try{await onSave({action:'delivery',id:order.id,courier:data.get('courier'),trackingReference:data.get('trackingReference')});}finally{setSaving(false);}}}>
            <label>Courier<input name="courier" list="courier-names" defaultValue={order.courier||''} maxLength={80} disabled={saving} placeholder="Pathao, Steadfast, RedX…"/><datalist id="courier-names"><option value="Pathao"/><option value="Steadfast"/><option value="RedX"/><option value="Paperfly"/><option value="eCourier"/></datalist></label>
            <label>Tracking reference<input name="trackingReference" defaultValue={order.trackingReference||''} maxLength={120} disabled={saving} placeholder="Real courier reference"/></label>
            <small>Enter both fields to show delivery details to the customer. Clear both to remove them.</small>
            <button className="a-btn a-btn--primary a-btn--sm" disabled={saving}>{saving?'Saving delivery…':'Save delivery details'}</button>
        </form>
    </details>;
}
export default function AdminWorkspace() {
    const router = useRouter();
    const { site, setSite, products, setProducts, categories, setCategories, categoryTree, setCategoryDetails, promotions, setPromotions, hero, setHero, storefront, setStorefront } = useStore();
    const [selectedIds,setSelectedIds]=useState<string[]>([]),[customers,setCustomers]=useState<Record<string,CustomerInfo>>({});
    const [content,setContent]=useState<Content>(defaultContent),[subscribers,setSubscribers]=useState<{contact:string;created:string}[]>([]),[activity,setActivity]=useState<{at:string;actor:string;area:string;detail:string}[]>([]);
    const [categoryRequest,setCategoryRequest]=useState(false);
    const [orders, setOrders] = useState<Order[]>([]), [tab, setTab] = useState('Overview'), [notice, setNoticeState] = useState<Notice|null>(null), [adminLoaded, setAdminLoaded] = useState(false), [dirty, setDirty] = useState(false);
    const orderFilter=useOrderFilters(orders);
    const [navOpen,setNavOpen]=useState(false),[bannerOpen,setBannerOpen]=useState(true),[editingOrder,setEditingOrder]=useState<Order|null>(null);
    const menuButton=useRef<HTMLButtonElement>(null),sidebar=useRef<HTMLElement>(null);
    const setNotice=(text:string,kind:Notice['kind']='success')=>setNoticeState(text?{text,kind}:null);
    // /admin/products/new/ and /admin/products/<id>/ show the product form as its own page.
    const productRoute=/^\/admin\/products\/(new|\d+)\/?$/.exec(usePathname()||'')?.[1];
    const editingProduct=productRoute&&productRoute!=='new'?products.find(p=>String(p.id)===productRoute)||null:null;
    // Coming back from the product page: open the requested tab and show its message.
    useEffect(()=>{
        if(productRoute){setTab('Products');return;}
        const query=new URLSearchParams(window.location.search),wanted=query.get('tab');
        if(wanted&&tabs.some(t=>t.name===wanted))setTab(wanted);
        if(query.get('saved'))setNoticeState({text:'Saved to your store',kind:'success'});
        if(wanted||query.get('saved'))window.history.replaceState(null,'','/admin/');
    },[]);
    // Unsaved product changes: ask before a reload, closing the tab or following a link.
    useEffect(()=>{
        if(!dirty)return;
        const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
        const onClick=(event:MouseEvent)=>{const link=(event.target as Element|null)?.closest?.('a[href]');if(link&&!confirm(leaveMessage)){event.preventDefault();event.stopPropagation();}};
        window.addEventListener('beforeunload',warn);document.addEventListener('click',onClick,true);
        return()=>{window.removeEventListener('beforeunload',warn);document.removeEventListener('click',onClick,true);};
    },[dirty]);
    const leave=(url:string)=>{if(dirty&&!confirm(leaveMessage))return false;setDirty(false);router.push(url);return true;};
    useEffect(() => { api('/api/admin/').then(d => { applyExtras(d); setProducts(d.products); setCategories(d.categories); setCategoryDetails(d.categoryDetails||[]); setPromotions(d.promotions||[]); setHero(d.hero||null); setStorefront(d.storefront||null); setOrders(d.orders); setAdminLoaded(true); }).catch(e => setNotice(e.message,'error')); }, []);
    // Keep the unread-order badge current while the studio is open (orders only, so edits in progress are untouched).
    useEffect(() => { const poll = () => { if (document.visibilityState === 'visible') api('/api/admin/').then(d => setOrders(d.orders)).catch(() => {}); }; const timer = setInterval(poll, 30000); document.addEventListener('visibilitychange', poll); return () => { clearInterval(timer); document.removeEventListener('visibilitychange', poll); }; }, []);
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
    const applyExtras=(d:any)=>{if(d.customers)setCustomers(d.customers);if(d.site)setSite(d.site);if(d.content)setContent(d.content);if(d.subscribers)setSubscribers(d.subscribers);if(d.activity)setActivity(d.activity);};
    const siteProps:SiteProps={site,content,categories:categoryTree,products,
        saveSite:async(section,value)=>{await mutate({action:'saveSite',section,value});setNotice('Saved to your store');},
        resetSite:async section=>{await mutate({action:'resetSite',section});setNotice('Original content restored');},
        saveContent:async(section,value)=>{await mutate({action:'saveContent',section,value});setNotice('Saved to your store');}};
    async function mutate(data: Record<string, unknown>) { const d = await api('/api/admin/', { method: 'POST', body: JSON.stringify(data) }); applyExtras(d); setProducts(d.products); setCategories(d.categories); setCategoryDetails(d.categoryDetails||[]); setPromotions(d.promotions||[]); setHero(d.hero||null); setStorefront(d.storefront||null); setOrders(d.orders); }
    const unread = orders.filter(o => !o.readAt).length;
    // Read status is saved on the server and never changes the fulfilment status.
    const markRead = (order: Order) => { if (order.readAt) return; const readAt = new Date().toISOString(); setOrders(list => list.map(o => o.id === order.id ? { ...o, readAt } : o)); api('/api/admin/', { method: 'POST', body: JSON.stringify({ action: 'markRead', id: order.id }) }).then(d => setOrders(d.orders)).catch(e => setNotice((e as Error).message, 'error')); };
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
    const choose=(name:string)=>{if(productRoute&&!leave('/admin/?tab='+encodeURIComponent(name)))return;setTab(name);if(navOpen){setNavOpen(false);restoreMenuFocus();}};
    function closeNav(){setNavOpen(false);restoreMenuFocus();}
    const dismissBanner=()=>{setBannerOpen(false);try{localStorage.setItem(bannerKey,'1');}catch{}};
    const openProduct=(product:Product|null)=>{router.push(product?'/admin/products/'+product.id+'/':'/admin/products/new/');};
    return <div className="admin">
    <aside ref={sidebar} id="admin-sidebar" className={'admin-sidebar'+(navOpen?' is-open':'')} aria-label="Studio navigation">
        <div className="admin-sidebar__brand"><BrandLogo variant="light"/><button type="button" className="a-btn a-btn--icon admin-sidebar__close" aria-label="Close navigation" onClick={closeNav}><Icon name="close"/></button></div>
        <small className="admin-sidebar__label">Workspace</small>
        <nav className="admin-nav">{tabs.map((t,i) => <Fragment key={t.name}>{t.group&&tabs[i-1]?.group!==t.group&&<small className="admin-sidebar__label admin-nav__group">{t.group}</small>}<button type="button" className={tab === t.name ? 'selected' : ''} aria-current={tab===t.name?'page':undefined} key={t.name} onClick={() => choose(t.name)}><Icon name={t.icon}/>{t.name}{t.name==='Orders'&&unread>0&&<span className="admin-nav__badge" aria-label={unread+' unread order'+(unread===1?'':'s')}>{unread>99?'99+':unread}</span>}</button></Fragment>)}</nav>
        <div className="admin-sidebar__foot">
            <a href="/" className="admin-sidebar__link"><Icon name="storefront"/>View storefront<Icon name="external" className="a-icon admin-sidebar__ext"/></a>
            <div className="admin-user"><span aria-hidden="true">N</span><div>Nadim<small>Store owner</small></div></div>
        </div>
    </aside>
    {navOpen&&<div className="admin-scrim" aria-hidden="true" onClick={closeNav}/>}
    <div className="admin-main" inert={navOpen||undefined}>
        <div className="admin-topbar">
            <button ref={menuButton} type="button" className="a-btn a-btn--icon admin-menu-button" aria-label="Open navigation" aria-expanded={navOpen} aria-controls="admin-sidebar" onClick={()=>setNavOpen(true)}><Icon name="menu"/></button>
            <nav className="admin-breadcrumb" aria-label="Breadcrumb"><ol><li>AURZÉN</li><li>Studio</li>{productRoute?<><li>Products</li><li aria-current="page">{productRoute==='new'?'Add product':'Edit product'}</li></>:<li aria-current="page">{tab}</li>}</ol></nav>
            <div className="admin-topbar__actions">
                <span className="admin-chip"><Icon name="lock"/>Private workspace</span>
                <button type="button" className="a-btn a-btn--secondary a-btn--sm admin-signout" onClick={async () => { try {
                    await api('/api/admin/session/', { method: 'DELETE' });
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
        {productRoute ? (productRoute==='new'||editingProduct ? <ProductEditor key={productRoute} product={editingProduct} categories={categoryTree} onDirty={setDirty} onCancel={()=>{leave('/admin/?tab=Products');}} onSave={async data=>{await mutate(data);setDirty(false);router.push('/admin/?tab=Products&saved=1');}}/> : <div className="admin-empty" role="status"><h3>{adminLoaded?'Product not found':'Loading product…'}</h3>{adminLoaded&&<button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={()=>leave('/admin/?tab=Products')}>Back to products</button>}</div>) : <>
        <div className="admin-title"><div><div className="admin-eyebrow">{tab==='Overview'?'Your business, at a glance':'Studio · '+tab}</div><h1>{tab === 'Overview' ? 'Welcome to your studio, Nadim.' : tab}</h1><p>{tab === 'Overview' ? 'A little clarity for your everyday business.' : 'Manage your AURZÉN ' + tab.toLowerCase() + '.'}</p></div>{tab === 'Products' && <button type="button" className="a-btn a-btn--primary" onClick={() => openProduct(null)}><Icon name="plus"/>Add product</button>}</div>
    {tab === 'Overview' && (adminLoaded?<Overview orders={orders} products={products} onEditProduct={openProduct} onViewOrders={()=>setTab('Orders')} onAddProduct={()=>{ setTab('Products'); openProduct(null); }} onAddCategory={()=>{ setTab('Categories'); setCategoryRequest(true); }} onStorefront={()=>go('home')}/>:<div className="ov-skeleton" aria-hidden="true">{[0,1,2,3].map(i=><div key={i} className="a-card"/>)}</div>)}
    {tab === 'Products' && <ProductsTable products={products} categories={categoryTree} onEdit={openProduct} onStockInput={(id, stock) => setProducts(products.map(x => x.id === id ? { ...x, stock } : x))} onStockSave={(id, stock) => void change({ action: 'stock', id, stock })} onRemove={p => { if (confirm('Remove ' + p.name + ' from the store?')) void change({ action: 'deleteProduct', id: p.id }); }}/>}
    {tab === 'Categories' && <CategoryManager categories={categoryTree} products={products} requestNew={categoryRequest} onRequestHandled={() => setCategoryRequest(false)} onSave={async data => { await mutate(data); setNotice('Category saved'); }} onDelete={name => change({ action: 'deleteCategory', name })}/>}
    {adminLoaded && tab === 'Categories' && <div className="mt-6"><CategorySettingsEditor {...siteProps}/></div>}
    {tab === 'Homepage' && (adminLoaded?<HeroEditor key={'hero:'+JSON.stringify(hero)} initialSlides={hero?.length?hero:defaultHeroSlides(products,categories)} custom={!!hero?.length} categories={categories} onSave={async slides=>{await mutate({action:'saveHero',slides});setNotice('Homepage slides saved');}} onReset={async()=>{await mutate({action:'resetHero'});setNotice('Automatic slides restored');}}/>:<p className="admin-loading" role="status">Loading your slides…</p>)}
    {tab === 'Homepage' && adminLoaded && <StorefrontEditor key={'storefront:'+JSON.stringify(storefront)+categoryTree.length} initial={storefront} categories={mainCategories(categoryTree).map(c=>c.name)} tree={categoryTree} products={products} onSave={async value=>{await mutate({action:'saveStorefront',storefront:value});setNotice('Storefront saved');}}/>}
    {tab === 'Homepage' && adminLoaded && <PromotionsEditor key={'promotions:'+JSON.stringify(promotions)} initial={promotions} products={products} categories={categoryTree} onSave={async value=>{await mutate({action:'savePromotions',promotions:value});setNotice('Promotions saved');}}/>}
    {adminLoaded && tab === 'Menus & text' && <StorefrontSettings {...siteProps}/>}
    {adminLoaded && tab === 'Pages' && <PagesEditor {...siteProps}/>}
    {adminLoaded && tab === 'FAQ' && <FaqEditor {...siteProps}/>}
    {adminLoaded && tab === 'Reviews' && <ReviewsEditor {...siteProps}/>}
    {adminLoaded && tab === 'Popup' && <PopupSettings {...siteProps}/>}
    {adminLoaded && tab === 'Subscribers' && <Subscribers list={subscribers} onDelete={contact=>void change({action:'deleteSubscriber',contact})}/>}
    {adminLoaded && tab === 'Settings' && <><GeneralSettings {...siteProps}/><div className="mt-6"><MessageTemplates {...siteProps}/></div></>}
    {adminLoaded && tab === 'SEO & integrations' && <SeoSettings {...siteProps}/>}
    {adminLoaded && tab === 'Activity log' && <ActivityLog list={activity}/>}
    {adminLoaded && tab === 'Backup' && <Backup products={products} categories={categoryTree} orders={orders} site={site} content={content} onImport={async value=>{for(const [section,data] of Object.entries(value))await mutate({action:'saveSite',section,value:data});setNotice('Settings imported');}}/>}
    {tab === 'Orders' && <section className="a-card a-card--flush" aria-label="Orders">{!orders.length ? <div className="admin-empty"><span className="admin-empty__icon"><Icon name="orders"/></span><h3>No orders yet.</h3><p>Place an order from the storefront.</p></div> : <><OrderFilters state={orderFilter}/><OrderBulkBar selected={orderFilter.filtered.filter(o=>selectedIds.includes(o.id))} filtered={orderFilter.filtered} site={site} onClear={()=>setSelectedIds([])} onBulk={async(status,reason)=>{await mutate({action:'bulkStatus',ids:orderFilter.filtered.filter(o=>selectedIds.includes(o.id)).map(o=>o.id),status,reason});setNotice('Orders updated');}}/>{!orderFilter.filtered.length ? <div className="admin-empty" role="status"><span className="admin-empty__icon"><Icon name="orders"/></span><h3>No orders found</h3><p>Try another search, status or date range.</p><button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={orderFilter.reset}>Reset filters</button></div> : <div className="admin-table-wrap"><table className="admin-table admin-table--orders"><thead><tr><th scope="col" className="order-select"><input type="checkbox" aria-label="Select all shown orders" checked={orderFilter.filtered.length>0&&orderFilter.filtered.every(o=>selectedIds.includes(o.id))} onChange={e=>setSelectedIds(e.target.checked?orderFilter.filtered.map(o=>o.id):[])}/></th><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Delivery address</th><th scope="col">Items</th><th scope="col" className="admin-num">Total</th><th scope="col">Status & courier</th></tr></thead><tbody>{orderFilter.filtered.map(o => <tr key={o.id}>
        <td className="order-select"><input type="checkbox" aria-label={'Select order '+o.id} checked={selectedIds.includes(o.id)} onChange={e=>setSelectedIds(list=>e.target.checked?[...list,o.id]:list.filter(id=>id!==o.id))}/></td><td data-label="Order"><span className="admin-mono">{o.id}</span>{!o.readAt&&<span className="admin-new-marker">New<span className="sr-only"> unread order</span></span>}<small>{new Date(o.date).toLocaleDateString('en-BD')}{o.editedAt&&<> · Edited {relativeTime(o.editedAt)}</>}</small>{editableStatuses.includes(o.status)?<button type="button" className="a-btn a-btn--secondary a-btn--sm admin-order-edit" data-row-action="edit-order" aria-label={'Edit order '+o.id} onClick={()=>{markRead(o);setEditingOrder(o);}}><Icon name="edit"/>Edit order</button>:<small className="admin-order-locked"><Icon name="lock"/>{o.status==='Cancelled'?'Locked · order cancelled':o.status==='Returned'?'Locked · order returned':'Locked · already shipped'}</small>}</td>
        <td data-label="Customer"><strong className="admin-order-name">{o.name}</strong><small>{o.phone}</small></td>
        <td data-label="Address" className="admin-order-address">{o.address}<small>{o.area === 'dhaka' ? 'Dhaka city' : 'Outside Dhaka'} · Delivery {money(o.delivery)}</small></td>
        <td data-label="Items">{o.items.map((x) => <small key={lineKey(x)}>{x.name} × {x.qty}<br />{optionLabel(x)}</small>)}</td>
        <td data-label="Total" className="admin-num">{money(o.total)}<small>{paymentName(o)}</small></td>
        <td data-label="Status"><div className="a-status-select" data-status={statusKey(o.status)}><span className="a-pill__dot" aria-hidden="true"/><select aria-label={'Status for '+o.id} value={o.status} onChange={e => { const status = e.target.value; const reason = status === 'Cancelled' ? prompt('Reason for cancelling (optional)') : ''; if (reason === null) { e.target.value = o.status; return; } void change({ action: 'status', id: o.id, status, reason }); }}>{statusOptions(o.status).map(s => <option key={s}>{s}</option>)}</select></div><DeliveryEditor key={o.id+'-'+(o.courier||'')+'-'+(o.trackingReference||'')} order={o} onSave={change} onOpen={()=>markRead(o)}/><OrderTools key={o.id+(o.notes||"")} order={o} orders={orders} site={site} customer={customers[o.phone]} onSave={change}/></td>
    </tr>)}</tbody></table></div>}</>}</section>}
    {tab === 'Customers' && adminLoaded && <CustomersPanel orders={orders} customers={customers} onSave={async(phone,info)=>{await mutate({action:'saveCustomer',phone,info});setNotice('Customer saved');}}/>}</>}
        </div>
    </div>
    <Modal open={!!editingOrder} onClose={()=>setEditingOrder(null)} label={editingOrder?'Edit order '+editingOrder.id:'Edit order'} className="admin-edit-dialog admin-edit-dialog--order">{editingOrder&&<OrderEditor key={editingOrder.id} order={editingOrder} products={products} onCancel={()=>setEditingOrder(null)} onSave={async data=>{await mutate({action:'editOrder',...data});setEditingOrder(null);setNotice('Order updated');}}/>}</Modal>
    {notice && <div role={notice.kind==='error'?'alert':'status'} className={'admin-toast admin-toast--'+notice.kind}><Icon name={notice.kind==='error'?'alert':'check'}/><span>{notice.text}</span><button type="button" className="a-btn a-btn--icon a-btn--sm" aria-label="Dismiss notification" onClick={()=>setNoticeState(null)}><Icon name="close"/></button></div>}
    </div>;
}
