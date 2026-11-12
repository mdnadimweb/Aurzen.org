import {NextRequest,NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {contentSecurityPolicy} from './server/security';
export function proxy(request:NextRequest){
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
