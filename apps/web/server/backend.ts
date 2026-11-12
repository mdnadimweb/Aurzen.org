import 'server-only';
import {cookies} from 'next/headers';
import type {Product} from '@aurzen/shared/catalog';

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
export const catalog=()=>read<{products:Product[];categories:string[];serverNow:number}>('/api/catalog/');
export const isAdmin=async()=>(await read<{authenticated:boolean}>('/api/admin/session/',true)).authenticated;
