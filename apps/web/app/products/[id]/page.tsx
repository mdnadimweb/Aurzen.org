import { notFound } from 'next/navigation';
import { catalog } from '@/server/backend';
import Store from '../../store';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const product = (await catalog()).products.find(p => String(p.id) === id);
    return { openGraph:product&&product.image!=='box'?{images:[product.image]}:undefined, title: product ? `${product.name} | AURZÉN` : 'Product not found | AURZÉN' };
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
