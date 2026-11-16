import {redirect} from 'next/navigation';
import {catalog} from '@/server/backend';
import {categoryList,categoryPath} from '@aurzen/shared/catalog';
import Store from '../store';
export const dynamic='force-dynamic';
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
// Older links (/shop/?category=Name) move to the shareable collection URL. Every other
// query parameter, such as utm_source or fbclid from an ad, is kept.
export default async function Page({searchParams}:Props){
  const query=await searchParams;
  const category=typeof query.category==='string'?query.category:'';
  if(category&&category!=='All'){
    const data=await catalog();
    const categories=categoryList(data.categoryDetails,data.categories);
    if(categories.some(c=>c.name===category)){
      const rest=new URLSearchParams();
      for(const [key,value] of Object.entries(query))if(key!=='category')for(const v of Array.isArray(value)?value:[value])if(typeof v==='string')rest.append(key,v);
      redirect(categoryPath(categories,category)+(rest.size?'?'+rest:''));
    }
  }
  return <Store initial="shop"/>;
}
