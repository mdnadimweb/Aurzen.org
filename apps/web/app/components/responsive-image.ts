import {mediaWidths} from '@aurzen/shared/upload-limits';
// Photos are offered in several widths so each screen downloads only the size it shows.
// - Unsplash catalogue photos are resized by Unsplash (?w=).
// - Uploaded photos (/media/…) are stored up to 1600px; the store API serves smaller copies (?w=).
// - The bundled default banner has pre-made WebP copies.
const unsplashWidths=[400,600,900,1200];
export function responsiveSrcSet(src?:string){
  if(!src)return undefined;
  if(/^\/media\/[a-f0-9-]{36}\.webp$/.test(src))return mediaWidths.map(width=>src+'?w='+width+' '+width+'w').concat(src+' 1600w').join(', ');
  if(src==='/images/fashion-hero.jpeg')return '/images/fashion-hero-800.webp 800w, /images/fashion-hero-1312.webp 1312w';
  if(!src.startsWith('https://images.unsplash.com/'))return undefined;
  try{
    const url=new URL(src);
    return unsplashWidths.map(width=>{url.searchParams.set('w',String(width));return url.toString()+' '+width+'w';}).join(', ');
  }catch{return undefined;}
}
/** Product grid: two columns on phones, up to four on wide screens. */
export const cardSizes='(max-width: 900px) 50vw, 25vw';
