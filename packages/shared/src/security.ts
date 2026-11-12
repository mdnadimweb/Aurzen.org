export function contentSecurityPolicy(nonce:string,development=false){
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development?" 'unsafe-eval'":''}`,
    // React, Motion and the gallery use style attributes. Scripts remain nonce-only.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self'${development?' ws: wss:':''}`,
    "object-src 'none'", "base-uri 'none'", "form-action 'self'",
    "frame-ancestors 'none'", "frame-src 'none'",
  ].join('; ');
}
export function validMutationOrigin(request:Request){
  const value=request.headers.get('origin'),host=request.headers.get('host');
  if(!value||!host||request.headers.get('sec-fetch-site')==='cross-site')return false;
  try{
    const origin=new URL(value);
    const protocol=request.headers.get('x-forwarded-proto')||new URL(request.url).protocol.slice(0,-1);
    return ['http','https'].includes(protocol)&&origin.protocol===protocol+':'&&origin.origin===value&&origin.host===host;
  }catch{return false;}
}
