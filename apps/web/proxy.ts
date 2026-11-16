import {NextRequest,NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {contentSecurityPolicy} from './server/security';
import {backendConfig} from './server/backend';
import {categoryList,categoryPath} from '@aurzen/shared/catalog';
// Older shared links (/shop/?category=Name, e.g. from Facebook ads) get a real HTTP redirect to the
// collection URL, keeping utm_*/fbclid and every other parameter. Unknown names fall through to /shop/.
async function legacyCategoryRedirect(request:NextRequest){
  const {pathname,searchParams}=request.nextUrl;
  const name=searchParams.get('category');
  if((pathname!=='/shop'&&pathname!=='/shop/')||!name||name==='All')return null;
  try{
    const {url,token}=backendConfig();
    const response=await fetch(url+'/api/catalog/',{cache:'no-store',headers:{'x-aurzen-internal-token':token},signal:AbortSignal.timeout(8000)});
    if(!response.ok)return null;
    const data=await response.json();
    const categories=categoryList(data.categoryDetails,data.categories);
    if(!categories.some(c=>c.name===name))return null;
    const target=request.nextUrl.clone();
    target.pathname=categoryPath(categories,name);target.searchParams.delete('category');
    return NextResponse.redirect(target,307);
  }catch{return null;}
}
export async function proxy(request:NextRequest){
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
