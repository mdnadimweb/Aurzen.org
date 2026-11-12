import { database } from '../../../lib/database';
export const runtime = 'nodejs';
export async function GET(request: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    if (!/^[a-f0-9-]{36}\.webp$/.test(id))
        return new Response(null, { status: 404 });
    const image = await (await database()).prepare('SELECT data FROM images WHERE id=?').get(id);
    if (!image)
        return new Response(null, { status: 404 });
    const data = new Uint8Array(image.data as ArrayBuffer);
    return new Response(data, { headers: {
            'Content-Type': 'image/webp', 'Content-Length': String(data.byteLength),
            'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff',
        } });
}
