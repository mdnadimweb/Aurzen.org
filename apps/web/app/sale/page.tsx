import Store from '../store';
import {catalog} from '@/server/backend';
import {pageMetadata} from '@/server/seo';
import {saleProducts} from '@aurzen/shared/catalog';
export const dynamic='force-dynamic';
export async function generateMetadata(){
  const data=await catalog(),items=saleProducts(data.products,data.serverNow);
  return pageMetadata({title:'Sale | AURZÉN',description:items.length?`${items.length} AURZÉN piece${items.length===1?'':'s'} on offer right now.`:'Current AURZÉN offers.',image:items.find(p=>p.image&&p.image!=='box')?.image});
}
export default function Page(){return <Store initial="sale"/>;}
