import { notFound } from 'next/navigation';
import { catalog, content } from '@/server/backend';
import { pageMetadata, absoluteUrl } from '@/server/seo';
import { productPricing } from '@aurzen/shared/catalog';
import { plainText } from '@aurzen/shared/site';
import Store from '../../store';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const product = (await catalog()).products.find(p => String(p.id) === id);
    if (!product) return { title: 'Product not found | AURZÉN' };
    return pageMetadata({ title: `${product.name} | AURZÉN`, description: (plainText(product.description || '') || `${product.name} from AURZÉN. Cash on delivery across Bangladesh.`).slice(0, 200), image: product.image, path: '/products/'+product.id+'/' });
}
export default async function Page({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const product = (await catalog()).products.find(p => String(p.id) === id);
    if (!product)
        notFound();
    const reviews=(await content()).reviews.filter(r=>r.product===product.id),pricing=productPricing(product);
    // Product details for search engines (price, stock, rating).
    const schema={'@context':'https://schema.org','@type':'Product',name:product.name,description:plainText(product.description||'')||undefined,image:product.image&&product.image!=='box'?[await absoluteUrl(product.image)]:undefined,sku:String(product.id),category:product.category,offers:{'@type':'Offer',priceCurrency:'BDT',price:pricing.unitPrice,availability:'https://schema.org/'+(product.stock>0?'InStock':'OutOfStock'),url:await absoluteUrl('/products/'+product.id+'/')},...(reviews.length?{aggregateRating:{'@type':'AggregateRating',ratingValue:(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1),reviewCount:reviews.length}}:{})};
    return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,String.fromCharCode(92)+'u003c')}}/><Store initial="product" product={product} reviews={reviews}/></>;
}
