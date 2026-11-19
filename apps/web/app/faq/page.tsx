import Store from '../store';
import {content,site} from '@/server/backend';
import {pageMetadata} from '@/server/seo';
import {pageTitle} from '@aurzen/shared/site';
export const dynamic='force-dynamic';
export async function generateMetadata(){
  return pageMetadata({title:pageTitle(await site(),'Frequently asked questions'),description:'Answers about ordering, delivery, payment and returns.'});
}
export default async function Page(){return <Store initial="faq" faq={(await content()).faq}/>;}
