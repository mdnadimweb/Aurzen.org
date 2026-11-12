import {createServer, type IncomingMessage} from 'node:http';
import {createHash,timingSafeEqual} from 'node:crypto';
import {requestContext} from './lib/cookies';
import {database} from './lib/database';
import {maxImageBytes} from '@aurzen/shared/upload-limits';
import * as catalog from './app/api/catalog/route';
import * as orders from './app/api/orders/route';
import * as tracking from './app/api/tracking/route';
import * as admin from './app/api/admin/route';
import * as session from './app/api/admin/session/route';
import * as images from './app/api/admin/images/route';
import * as media from './app/media/[id]/route';

const token=process.env.INTERNAL_API_TOKEN;
if(!token||token.length<32)throw new Error('INTERNAL_API_TOKEN must contain at least 32 characters.');
if(!process.env.ADMIN_PASSWORD||process.env.ADMIN_PASSWORD.length<16)throw new Error('ADMIN_PASSWORD must contain at least 16 characters.');
if(process.env.NODE_ENV==='production'&&process.env.SEED_DEMO==='true')throw new Error('SEED_DEMO must be false in production.');
const hash=(value:string)=>createHash('sha256').update(value).digest();
type Handler=(request:Request)=>Promise<Response>|Response;
const routes:Record<string,Record<string,Handler>>={
  '/api/catalog':{GET:catalog.GET},'/api/orders':{GET:orders.GET,POST:orders.POST},
  '/api/tracking':{POST:tracking.POST},'/api/admin':{GET:admin.GET,POST:admin.POST},
  '/api/admin/session':{GET:session.GET,POST:session.POST,DELETE:session.DELETE},
  '/api/admin/images':{POST:images.POST},
};
async function readBody(message:IncomingMessage,limit:number){
  if(Number(message.headers['content-length']||0)>limit)throw new Error('PAYLOAD_LIMIT');
  const chunks:Buffer[]=[];let total=0;
  for await(const chunk of message){total+=chunk.length;if(total>limit)throw new Error('PAYLOAD_LIMIT');chunks.push(Buffer.from(chunk));}
  return Buffer.concat(chunks);
}
const server=createServer({maxHeaderSize:16384,requestTimeout:30000,headersTimeout:15000},async(message,out)=>{
  out.setHeader('X-Content-Type-Options','nosniff');out.setHeader('Cache-Control','no-store');
  try{
    const path=new URL(message.url||'/','http://api.internal').pathname.replace(/\/$/,'');
    if(path==='/healthz'&&message.method==='GET'){
      await (await database()).prepare('SELECT 1').get();out.setHeader('Content-Type','application/json');out.end('{"status":"ok","service":"api"}');return;
    }
    if(!timingSafeEqual(hash(String(message.headers['x-aurzen-internal-token']||'')),hash(token))){out.writeHead(401);out.end();return;}
    const method=message.method||'GET';
    let handler=routes[path]?.[method];
    if(path.startsWith('/media/')&&method==='GET')handler=request=>media.GET(request,{params:Promise.resolve({id:path.slice(7)})});
    if(!handler){out.writeHead(routes[path]?405:404);out.end();return;}
    const bytes=!['GET','HEAD'].includes(method)?await readBody(message,path==='/api/admin/images'?maxImageBytes+65536:32000):undefined;
    const headers=new Headers();for(const [key,value]of Object.entries(message.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
    const request=new Request('http://api.internal'+path,{method,headers,body:bytes as BodyInit|undefined});
    const context={request,setCookies:[] as string[]};
    const response=await requestContext.run(context,()=>handler(request));
    out.statusCode=response.status;
    response.headers.forEach((value,key)=>out.setHeader(key,value));
    if(context.setCookies.length)out.setHeader('Set-Cookie',context.setCookies);
    out.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){
    const oversized=error instanceof Error&&error.message==='PAYLOAD_LIMIT';
    if(!oversized)console.error('API request failed:',error instanceof Error?error.message:'Unknown error');
    out.statusCode=oversized?413:500;out.setHeader('Content-Type','application/json');out.end(JSON.stringify({error:oversized?'Request is too large.':'Store service is unavailable.'}));
  }
});
server.keepAliveTimeout=5000;
server.listen(Number(process.env.PORT||4000),process.env.HOST||'0.0.0.0',()=>console.log('API ready'));
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{
  server.close(async()=>{try{(await database()).close();}finally{process.exit(0);}});
  setTimeout(()=>process.exit(1),10000).unref();
});
