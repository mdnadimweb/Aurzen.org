import {notFound} from 'next/navigation';
import {catalog} from '@/server/backend';
import {pageMetadata} from '@/server/seo';
import {categoryCoverImage,categoryFamily,categoryFromSlugs,categoryList} from '@aurzen/shared/catalog';
import Store from '../../store';
export const dynamic='force-dynamic';
type Props={params:Promise<{slug:string[]}>};
// /collections/<main>/ and /collections/<main>/<sub>/ — slugs stay the same after a rename.
async function resolve(slug:string[]){
  const data=await catalog();
  const categories=categoryList(data.categoryDetails,data.categories);
  return {data,categories,found:categoryFromSlugs(categories,slug.map(s=>decodeURIComponent(s).toLowerCase()))};
}
export async function generateMetadata({params}:Props){
  const {slug}=await params;
  const {data,categories,found}=await resolve(slug);
  if(!found)return {title:'Collection not found | AURZÉN'};
  const category=found.sub||found.main;
  const count=data.products.filter(p=>categoryFamily(categories,category.name).includes(p.category)).length;
  const name=found.sub?`${found.sub.name} · ${found.main.name}`:found.main.name;
  return pageMetadata({title:`${name} | AURZÉN`,description:`Shop ${count} ${category.name} piece${count===1?'':'s'} at AURZÉN. Cash on delivery across Bangladesh.`,image:categoryCoverImage(found.main,categories,data.products,data.storefront?.covers||{})});
}
export default async function Page({params}:Props){
  const {slug}=await params;
  if(!(await resolve(slug)).found)notFound();
  return <Store initial="collection" collection={slug.map(s=>decodeURIComponent(s).toLowerCase())}/>;
}
