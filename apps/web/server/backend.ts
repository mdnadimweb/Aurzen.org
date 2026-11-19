import 'server-only';
import {cookies} from 'next/headers';
import {revalidateTag,unstable_cache} from 'next/cache';
import {cache} from 'react';
import {randomUUID} from 'node:crypto';
import type {Product,HeroSlide,Storefront,Category,Promotion} from '@aurzen/shared/catalog';
import {mergeSite,defaultContent,type SiteSettings,type Content} from '@aurzen/shared/site';

export function backendConfig(){
  const url=process.env.INTERNAL_API_URL||'http://127.0.0.1:4000';
  const token=process.env.INTERNAL_API_TOKEN;
  if(!token||token.length<32)throw new Error('Configure INTERNAL_API_TOKEN (at least 32 characters).');
  const parsed=new URL(url);
  if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||parsed.pathname!=='/')throw new Error('INTERNAL_API_URL must be an HTTP(S) origin.');
  return {url:parsed.origin,token};
}
async function read<T>(path:string,authenticated=false):Promise<T>{
  const {url,token}=backendConfig();
  const response=await fetch(url+path,{cache:'no-store',headers:{'x-aurzen-internal-token':token,...(authenticated?{cookie:(await cookies()).toString()}:{})},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Store service is unavailable.');
  return response.json();
}
type CatalogData={products:Product[];categories:string[];categoryDetails?:Category[];promotions?:Promotion[];hero?:HeroSlide[]|null;storefront?:Storefront|null;site?:SiteSettings;serverNow:number};
// The public catalog is the same for every visitor, so pages read a shared cached copy instead of
// waiting on the store service each time. A copy older than a minute is refreshed in the background
// (visitors still get an instant page, even while the free-plan API wakes up). Admin changes and new
// orders expire it at once through catalogChanged(), so edits and stock show on the next visit.
// The cached copy belongs to one deployment (Vercel keeps cached data across deployments) or, when
// self-hosted, to one server start, so a new release never begins with an old catalog.
const cacheGeneration=process.env.VERCEL_DEPLOYMENT_ID||randomUUID();
const sharedCatalog=unstable_cache(()=>read<CatalogData>('/api/catalog/'),['aurzen-catalog',cacheGeneration],{revalidate:60,tags:['catalog']});
// cache(): one read per request even when the layout, page and page title all need it.
// serverNow is always the real current time, never the time the copy was taken (sale timers use it).
export const catalog=cache(async():Promise<CatalogData>=>({...(await sharedCatalog()),serverNow:Date.now()}));
export const catalogChanged=()=>revalidateTag('catalog',{expire:0});
export const isAdmin=async()=>(await read<{authenticated:boolean}>('/api/admin/session/',true)).authenticated;
/** Site settings for metadata and server-rendered pages (defaults when the API is older). */
export const site=cache(async():Promise<SiteSettings>=>{try{return (await catalog()).site||mergeSite(null);}catch{return mergeSite(null);}});
// Pages, FAQ and approved reviews: the same shared cache and expiry as the catalog.
const sharedContent=unstable_cache(()=>read<Content>('/api/content/'),['aurzen-content',cacheGeneration],{revalidate:300,tags:['catalog']});
export const content=cache(async():Promise<Content>=>{try{return await sharedContent();}catch{return defaultContent;}});
