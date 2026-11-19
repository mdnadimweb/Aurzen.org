import 'server-only';
import {backendConfig,catalog,catalogChanged} from './backend';
import {validMutationOrigin} from './security';
import {maxImageBytes} from '@aurzen/shared/upload-limits';

export async function forward(request:Request){
  const path=new URL(request.url).pathname;
  if(!/^\/(?:api\/(?:catalog|content|subscribe|orders|tracking|admin(?:\/session|\/images)?)\/?|media\/[a-f0-9-]{36}\.webp\/?)$/.test(path))return Response.json({error:'Not found.'},{status:404});
  const mutation=!['GET','HEAD'].includes(request.method);
  if(mutation&&!validMutationOrigin(request))return Response.json({error:'Request origin is not allowed.'},{status:403});
  // The storefront's catalog refresh is served from the shared cached copy (see catalog()).
  if(!mutation&&/^\/api\/catalog\/?$/.test(path)){
    try{return Response.json(await catalog(),{headers:{'Cache-Control':'no-store'}});}
    catch{return Response.json({error:'Store service is temporarily unavailable.'},{status:502,headers:{'Cache-Control':'no-store'}});}
  }
  const limit=path.includes('/images')?maxImageBytes+65536:/^\/api\/admin\/?$/.test(path)?1000000:32000;
  try{
    let body:Uint8Array|undefined;
    if(mutation){
      if(Number(request.headers.get('content-length')||0)>limit)return Response.json({error:'Request is too large.'},{status:413});
      if(request.body){
        const reader=request.body.getReader(),chunks:Uint8Array[]=[];let total=0;
        try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>limit){await reader.cancel();return Response.json({error:'Request is too large.'},{status:413});}chunks.push(value);}}
        finally{reader.releaseLock();}
        body=Buffer.concat(chunks);
      }
    }
    const {url,token}=backendConfig();
    const headers=new Headers({'x-aurzen-internal-token':token});
    for(const name of ['content-type','cookie','origin']){const value=request.headers.get(name);if(value)headers.set(name,value);}
    // Photos may ask for a smaller copy (?w=400); nothing else forwards a query string.
    const width=path.startsWith('/media/')?new URL(request.url).searchParams.get('w'):null;
    const query=width&&/^\d{3,4}$/.test(width)?'?w='+width:'';
    const upstream=await fetch(url+path+query,{method:request.method,headers,body:body as BodyInit|undefined,cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(30000)});
    const out=new Headers();
    for(const name of ['content-type','cache-control','x-content-type-options']){const value=upstream.headers.get(name);if(value)out.set(name,value);}
    if(!path.startsWith('/media/'))out.set('cache-control','no-store');
    // A smaller copy is cached for a year only when the API confirms it resized the photo
    // (an older API ignores ?w=, and its full-size answer must not stick to the small URL).
    else if(query&&upstream.headers.get('x-aurzen-width')!==width)out.set('cache-control','public, max-age=300');
    for(const cookie of upstream.headers.getSetCookie())out.append('set-cookie',cookie);
    // Admin edits and placed orders (stock) change the catalog: drop the cached copy right away.
    if(mutation&&upstream.ok&&/^\/api\/(?:admin|orders)\/?$/.test(path))catalogChanged();
    return new Response(upstream.body,{status:upstream.status,headers:out});
  }catch{return Response.json({error:'Store service is temporarily unavailable.'},{status:502,headers:{'Cache-Control':'no-store'}});}
}
