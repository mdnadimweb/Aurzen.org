const test=require('node:test'),assert=require('node:assert/strict');
const {contentSecurityPolicy,validMutationOrigin}=require('@aurzen/shared/security');
const {requestContext,cookies}=require('../apps/api/dist/lib/cookies.js');
test('domain-independent CSP requires nonces and restricts scripts, connections, framing and objects',()=>{
  const value=contentSecurityPolicy('one-time-random-value');
  assert.match(value,/script-src 'self' 'nonce-one-time-random-value' 'strict-dynamic'/);
  assert(!value.includes('unsafe-eval'));
  assert(!value.split('; ').find(x=>x.startsWith('script-src')).includes('unsafe-inline'));
  for(const directive of ["connect-src 'self'","frame-ancestors 'none'","object-src 'none'","base-uri 'none'"])assert(value.includes(directive));
  assert(!value.includes('netlify'));assert(!value.includes('vercel'));
  assert(contentSecurityPolicy('dev',true).includes('unsafe-eval'));
});
test('CSRF accepts changing hostnames and rejects foreign, null, missing, malformed and cross-scheme origins',()=>{
  const request=(host,origin,extra={})=>new Request('http://container.internal/api/orders/',{headers:{host,...(origin?{origin}:{}),...extra}});
  for(const host of ['localhost:3000','store.example','new-domain.example','[::1]:3000'])assert(validMutationOrigin(request(host,'http://'+host)));
  assert(validMutationOrigin(request('new-domain.example','https://new-domain.example',{'x-forwarded-proto':'https'})));
  for(const origin of ['https://attacker.example','null',undefined,'http://store.example.evil','http://store.example/path'])assert(!validMutationOrigin(request('store.example',origin)));
  assert(!validMutationOrigin(request('store.example','http://store.example',{'sec-fetch-site':'cross-site'})));
  assert(!validMutationOrigin(request('store.example','http://store.example',{'x-forwarded-proto':'https'})));
});
test('cookie contexts are isolated and production session cookies are host-only and secure',async()=>{
  const previous=process.env.COOKIE_SECURE;delete process.env.COOKIE_SECURE;
  try{
    const contexts=['first','second'].map(value=>({request:new Request('https://store.example',{headers:{cookie:'aurzen_admin='+value}}),setCookies:[]}));
    await Promise.all(contexts.map((context,index)=>requestContext.run(context,async()=>{
      await new Promise(resolve=>setTimeout(resolve,index?0:10));
      const jar=await cookies();assert.equal(jar.get('aurzen_admin').value,index?'second':'first');
      jar.set('aurzen_admin','token',{httpOnly:true,secure:true,sameSite:'Strict',maxAge:28800});jar.delete('aurzen_admin');
    })));
    for(const context of contexts){assert.equal(context.setCookies.length,2);assert(context.setCookies.every(value=>value.includes('HttpOnly')&&value.includes('Secure')&&value.includes('SameSite=Strict')&&!value.includes('Domain=')));assert(context.setCookies[1].includes('Max-Age=0'));}
  }finally{if(previous===undefined)delete process.env.COOKIE_SECURE;else process.env.COOKIE_SECURE=previous;}
});
