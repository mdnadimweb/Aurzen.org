import {NextRequest,NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {contentSecurityPolicy} from './server/security';
import {backendConfig} from './server/backend';
import {categoryList,categoryPath} from '@aurzen/shared/catalog';
// Older shared links (/shop/?category=Name, e.g. from Facebook ads) get a real HTTP redirect to the
// collection URL, keeping utm_*/fbclid and every other parameter. Unknown names fall through to /shop/.
// (Former main categories such as /collections/abayas/ are redirected by the collection page itself,
// which reads the cached catalog, so ordinary collection visits never wait on an extra API call here.)
async function legacyCategoryRedirect(request:NextRequest){
  const {pathname,searchParams}=request.nextUrl;
  const shopName=(pathname==='/shop'||pathname==='/shop/')?searchParams.get('category'):null;
  if(!shopName||shopName==='All')return null;
  try{
    const {url,token}=backendConfig();
    const response=await fetch(url+'/api/catalog/',{cache:'no-store',headers:{'x-aurzen-internal-token':token},signal:AbortSignal.timeout(8000)});
    if(!response.ok)return null;
    const data=await response.json();
    const categories=categoryList(data.categoryDetails,data.categories);
    const name=shopName;
    if(!categories.some(c=>c.name===name))return null;
    const target=request.nextUrl.clone();
    target.pathname=categoryPath(categories,name);target.searchParams.delete('category');
    return NextResponse.redirect(target,307);
  }catch{return null;}
}
// Studio → Redirects: old address → new address (301). The list is cached for a minute and
// refreshed in the background, so a page never waits for it (a cold start just skips redirects once).
let redirectCache:{at:number;items:{from:string;to:string}[];loading?:Promise<void>}={at:0,items:[]};
function loadRedirects(){
  if(redirectCache.loading)return;
  redirectCache.loading=(async()=>{
    try{
      const {url,token}=backendConfig();
      const response=await fetch(url+'/api/redirects/',{cache:'no-store',headers:{'x-aurzen-internal-token':token},signal:AbortSignal.timeout(8000)});
      if(response.ok)redirectCache={at:Date.now(),items:await response.json()};
    }catch{}finally{redirectCache.loading=undefined;}
  })();
}
function ownerRedirect(request:NextRequest){
  if(Date.now()-redirectCache.at>60000)loadRedirects();
  const path=request.nextUrl.pathname.endsWith('/')?request.nextUrl.pathname:request.nextUrl.pathname+'/';
  const match=redirectCache.items.find(r=>r.from.toLowerCase()===path.toLowerCase());
  if(!match)return null;
  const external=/^https?:/.test(match.to);
  const target=external?new URL(match.to):new URL(match.to,request.nextUrl.origin);
  // Keep utm_*/fbclid and other parameters on internal redirects.
  if(!external)request.nextUrl.searchParams.forEach((value,key)=>{if(!target.searchParams.has(key))target.searchParams.set(key,value);});
  return NextResponse.redirect(target,301);
}
export async function proxy(request:NextRequest){
  const moved=ownerRedirect(request);
  if(moved)return moved;
  const redirect=await legacyCategoryRedirect(request);
  if(redirect)return redirect;
  const nonce=randomBytes(18).toString('base64');
  const csp=contentSecurityPolicy(nonce,process.env.NODE_ENV==='development');
  const headers=new Headers(request.headers);
  headers.set('x-nonce',nonce);headers.set('Content-Security-Policy',csp);
  const response=NextResponse.next({request:{headers}});
  response.headers.set('Content-Security-Policy',csp);
  response.headers.set('Cache-Control','private, no-store');
  // Coolify terminates HTTPS. Do not emit HSTS for local HTTP development.
  if(request.headers.get('x-forwarded-proto')==='https')response.headers.set('Strict-Transport-Security','max-age=31536000');
  return response;
}
export const config={matcher:['/((?!api/|media/|healthz|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)']};
