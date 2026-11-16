import { notFound } from 'next/navigation';
import { catalog } from '@/server/backend';
import { pageMetadata } from '@/server/seo';
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
    return pageMetadata({ title: `${product.name} | AURZÉN`, description: (product.description || `${product.name} from AURZÉN. Cash on delivery across Bangladesh.`).slice(0, 200), image: product.image });
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
    return <Store initial="product" product={product}/>;
}
