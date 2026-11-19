import type {MetadataRoute} from 'next';
import {catalog,content} from '@/server/backend';
import {absoluteUrl} from '@/server/seo';
import {categoryList,categoryPath} from '@aurzen/shared/catalog';
export const dynamic='force-dynamic';
/** Every public page: home, shop, sale, collections, products, published content pages and FAQ. */
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const data=await catalog(),pages=(await content()).pages;
  const categories=categoryList(data.categoryDetails,data.categories);
  const paths=['/','/shop/','/sale/','/collections/','/faq/',...categories.map(c=>categoryPath(categories,c.name)),...data.products.map(p=>'/products/'+p.id+'/'),...pages.map(p=>'/pages/'+p.slug+'/')];
  return Promise.all(Array.from(new Set(paths)).map(async path=>({url:await absoluteUrl(path)})));
}
