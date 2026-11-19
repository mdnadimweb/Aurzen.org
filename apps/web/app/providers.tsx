'use client';
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { categoryList, type Product, type CartItem, type HeroSlide, type Storefront, type Category, type Promotion } from '@aurzen/shared/catalog';
import {usePathname} from 'next/navigation';
import {mergeSite,type SiteSettings} from '@aurzen/shared/site';
export type Catalog={products:Product[];categories:string[];categoryDetails?:Category[];promotions?:Promotion[];hero?:HeroSlide[]|null;storefront?:Storefront|null;site?:SiteSettings;bestsellers?:number[];serverNow?:number};
export async function api<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers }, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok)
        throw Object.assign(new Error(result.error || 'Unable to complete your request.'),{status:response.status});
    return result;
}
function useStoreState(initialCatalog:Catalog) {
    const pathname=usePathname();
    const [now,setNow]=useState(initialCatalog.serverNow||0);
    const clockOffset=useRef(initialCatalog.serverNow?initialCatalog.serverNow-Date.now():0);
    const [bagOpen,setBagOpen]=useState(false);
    useEffect(()=>{setBagOpen(false);},[pathname]);
    const [site, setSite] = useState<SiteSettings>(()=>initialCatalog.site||mergeSite(null));
    const [bestsellers, setBestsellers] = useState<number[]>(initialCatalog.bestsellers||[]);
    const [products, setProducts] = useState<Product[]>(initialCatalog.products), [categories, setCategories] = useState<string[]>(initialCatalog.categories), [hero, setHero] = useState<HeroSlide[]|null>(initialCatalog.hero||null), [storefront, setStorefront] = useState<Storefront|null>(initialCatalog.storefront||null), [categoryDetails, setCategoryDetails] = useState<Category[]>(initialCatalog.categoryDetails||[]), [promotions, setPromotions] = useState<Promotion[]>(initialCatalog.promotions||[]), [cart, setCart] = useState<CartItem[]>([]), [ready, setReady] = useState(false), [loaded, setLoaded] = useState(true), [error, setError] = useState('');
    const refresh = useCallback(async () => { try {
        const d = await api('/api/catalog/');
        setProducts(d.products);
        setCategories(d.categories);
        setHero(d.hero||null); setStorefront(d.storefront||null); if(d.site)setSite(d.site);if(Array.isArray(d.bestsellers))setBestsellers(d.bestsellers); setCategoryDetails(d.categoryDetails||[]); setPromotions(d.promotions||[]);
        if(Number.isFinite(d.serverNow)){clockOffset.current=d.serverNow-Date.now();setNow(d.serverNow);}
        setLoaded(true);
        setError('');
    }
    catch (e) {
        setError((e as Error).message);
    } }, []);
    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('aurzen-cart') || '[]');
            if (Array.isArray(stored))
                setCart(stored.filter(c => Number.isSafeInteger(c.id) && Number.isSafeInteger(c.qty) && c.qty > 0 && c.qty <= 100 && typeof c.size === 'string' && (c.color === undefined || typeof c.color === 'string')));
        }
        catch { }
        setReady(true);
    }, []);
    // The page arrives with a fresh catalog, so the first refresh is skipped; later page changes
    // pick up stock and price edits made since.
    const firstPath=useRef(true);
    useEffect(()=>{if(firstPath.current){firstPath.current=false;return;}void refresh();},[refresh,pathname]);
    // Use server time, including on clients with an inaccurate system clock.
    // Re-render at schedule boundaries so idle pages never retain an expired sale.
    useEffect(()=>{
        const current=Date.now()+clockOffset.current;
        const boundaries=products.flatMap(p=>[p.offer?.startsAt,p.offer?.endsAt]).filter((value):value is string=>!!value).map(Date.parse).filter(value=>Number.isFinite(value)&&value>current);
        const wait=boundaries.length?Math.min(60000,Math.max(1,Math.min(...boundaries)-current+1)):60000;
        const timer=setTimeout(()=>setNow(Date.now()+clockOffset.current),wait);
        return()=>clearTimeout(timer);
    },[products,now]);
    useEffect(()=>{
        const sync=()=>{if(document.visibilityState==='hidden')return;setNow(Date.now()+clockOffset.current);void refresh();};
        const timer=setInterval(sync,60000);
        window.addEventListener('focus',sync);document.addEventListener('visibilitychange',sync);
        return()=>{clearInterval(timer);window.removeEventListener('focus',sync);document.removeEventListener('visibilitychange',sync);};
    },[refresh]);
    useEffect(() => { if (ready)
        try {
            localStorage.setItem('aurzen-cart', JSON.stringify(cart));
        }
        catch { } }, [ready, cart]);
    // categoryTree: every category with its parent and URL slug (older API responses fall back to names only).
    const categoryTree=useMemo(()=>categoryList(categoryDetails,categories),[categoryDetails,categories]);
    return { bestsellers, site, setSite, products, setProducts, categories, setCategories, categoryTree, setCategoryDetails, promotions, setPromotions, hero, setHero, storefront, setStorefront, cart, setCart, ready, loaded, error, refresh, bagOpen, setBagOpen, now };
}
const StoreContext = createContext<ReturnType<typeof useStoreState> | null>(null);
export function StoreProvider({ children,initialCatalog }: {
    children: ReactNode;
    initialCatalog:Catalog;
}) { const state = useStoreState(initialCatalog); return <StoreContext.Provider value={state}>{children}</StoreContext.Provider>; }
export function useStore() { const store = useContext(StoreContext); if (!store)
    throw new Error('StoreProvider is missing'); return store; }
