import {createHash,timingSafeEqual} from 'node:crypto';
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export function assert(condition:unknown,message:string,status=400):asserts condition{if(!condition)throw new HttpError(status,message);}
export async function body(request:Request){
  const raw=await request.text();assert(raw.length<=32_000,'Request is too large.',413);
  try{const data=JSON.parse(raw);assert(data&&typeof data==='object'&&!Array.isArray(data),'Invalid request.');return data;}catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,'Invalid JSON.');}
}
export function sameOrigin(request:Request){
  if(process.env.INTERNAL_API_TOKEN){
    const hash=(value:string)=>createHash('sha256').update(value).digest();
    assert(timingSafeEqual(hash(request.headers.get('x-aurzen-internal-token')||''),hash(process.env.INTERNAL_API_TOKEN)),'Request origin is not allowed.',403);
    return;
  }
  const origin=request.headers.get('origin');
  const allowed=new Set([new URL(request.url).origin]);
  // Hosting proxies can expose an internal URL to the Node request. Only trust
  // explicitly configured public URLs, never client-supplied forwarded headers.
  const urls:(string|undefined)[]=[process.env.SITE_URL||'https://aurzen.netlify.app'];
  if(process.env.NETLIFY)urls.push(process.env.URL,process.env.DEPLOY_PRIME_URL,process.env.DEPLOY_URL);
  for(const value of urls){
    if(!value)continue;
    try{const url=new URL(value);if(url.protocol==='https:'||url.protocol==='http:')allowed.add(url.origin);}catch{}
  }
  assert(origin&&allowed.has(origin),'Request origin is not allowed.',403);
}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export function failure(error:unknown){
  if(error instanceof HttpError)return json({error:error.message},error.status);
  console.error('AURZEN server error',error);
  return json({error:'Something went wrong. Please try again.'},500);
}
export function text(value:unknown,min:number,max:number,label:string){assert(typeof value==='string'&&value.trim().length>=min&&value.trim().length<=max,`${label} must be ${min}–${max} characters.`);return value.trim();}
