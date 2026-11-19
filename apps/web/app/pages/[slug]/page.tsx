import {notFound} from 'next/navigation';
import Store from '../../store';
import {content,site} from '@/server/backend';
import {pageMetadata} from '@/server/seo';
import {pageTitle} from '@aurzen/shared/site';
export const dynamic='force-dynamic';
type Props={params:Promise<{slug:string}>};
const find=async(slug:string)=>(await content()).pages.find(p=>p.slug===slug&&p.published);
export async function generateMetadata({params}:Props){
  const page=await find((await params).slug),settings=await site();
  if(!page)return {title:pageTitle(settings,'Page not found')};
  return pageMetadata({title:page.seoTitle||pageTitle(settings,page.title),description:page.seoDescription||page.body.replace(/[#*_\[\]()]/g,'').replace(/\s+/g,' ').slice(0,160)});
}
export default async function Page({params}:Props){
  const page=await find((await params).slug);
  if(!page)notFound();
  return <Store initial="page" page={page}/>;
}
