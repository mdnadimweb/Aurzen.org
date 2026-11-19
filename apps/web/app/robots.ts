import type {MetadataRoute} from 'next';
import {site} from '@/server/backend';
import {absoluteUrl} from '@/server/seo';
export const dynamic='force-dynamic';
// Search engines may crawl the shop only when ordering is open and Studio → SEO allows indexing.
export default async function robots():Promise<MetadataRoute.Robots>{
  const open=process.env.CHECKOUT_ENABLED==='true'&&(await site()).seo.indexing;
  return open?{rules:{userAgent:'*',allow:'/',disallow:['/admin/','/api/','/cart/','/tracking/']},sitemap:await absoluteUrl('/sitemap.xml')}:{rules:{userAgent:'*',disallow:'/'}};
}
