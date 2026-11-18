import sharp from 'sharp';
import { database } from '../../../lib/database';
import { mediaWidths } from '@aurzen/shared/upload-limits';
export const runtime = 'nodejs';
export async function GET(request: Request, { params }: {
    params: Promise<{
        id: string;
        width?: string | null;
    }>;
}) {
    const { id, width: requested } = await params;
    if (!/^[a-f0-9-]{36}\.webp$/.test(id))
        return new Response(null, { status: 404 });
    // ?w=400|800|1200 returns a smaller copy for phones and product cards. Only these fixed sizes
    // are allowed, so the CDN caches a handful of copies per photo and nobody can request others.
    const raw = requested ?? new URL(request.url).searchParams.get('w');
    const width = raw ? Number(raw) : 0;
    if (raw && !mediaWidths.includes(width))
        return new Response(null, { status: 404 });
    const image = await (await database()).prepare('SELECT data FROM images WHERE id=?').get(id);
    if (!image)
        return new Response(null, { status: 404 });
    let data = new Uint8Array(image.data as ArrayBuffer);
    if (width)
        data = new Uint8Array(await sharp(data).resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer());
    return new Response(data, { headers: {
            'Content-Type': 'image/webp', 'Content-Length': String(data.byteLength),
            'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff',
            ...(width ? { 'X-Aurzen-Width': String(width) } : {}),
        } });
}
