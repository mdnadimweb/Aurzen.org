import 'server-only';
import {headers} from 'next/headers';
import type {Metadata} from 'next';

/** Social previews need absolute image URLs; uploaded photos are site-relative (/media/…). */
export async function absoluteUrl(path:string){
  if(/^https:\/\//i.test(path))return path;
  const h=await headers();
  const host=h.get('x-forwarded-host')||h.get('host');
  const proto=h.get('x-forwarded-proto')||(host?.startsWith('localhost')||host?.startsWith('127.0.0.1')?'http':'https');
  return host?`${proto}://${host}${path}`:path;
}
export async function pageMetadata({title,description,image,path}:{title:string;description:string;image?:string;path?:string}):Promise<Metadata>{
  const images=image&&image!=='box'?[await absoluteUrl(image)]:undefined;
  return {title,description,...(path?{alternates:{canonical:await absoluteUrl(path)}}:{}),openGraph:{title,description,images,type:'website'},twitter:{card:images?'summary_large_image':'summary',title,description,images}};
}
