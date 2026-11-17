// Catalogue photos from Unsplash are stored at 1200px wide (about 220 KB each). Product cards show
// them at 200–400px, so the browser is offered smaller copies and picks the one that fits the
// screen. Uploaded photos (/media/…) are already compressed and are left as they are.
const widths=[400,600,900,1200];
export function responsiveSrcSet(src?:string){
  if(!src||!src.startsWith('https://images.unsplash.com/'))return undefined;
  try{
    const url=new URL(src);
    return widths.map(width=>{url.searchParams.set('w',String(width));return url.toString()+' '+width+'w';}).join(', ');
  }catch{return undefined;}
}
/** Product grid: two columns on phones, up to four on wide screens. */
export const cardSizes='(max-width: 900px) 50vw, 25vw';
