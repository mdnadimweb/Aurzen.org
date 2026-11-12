import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { database } from './database';
import { assert, HttpError } from './http';
import { maxImageBytes } from '@aurzen/shared/upload-limits';
export { maxImageBytes } from '@aurzen/shared/upload-limits';
export const imagePath = /^\/media\/[a-f0-9-]{36}\.webp$/;
export async function uploadForm(request: Request) {
    assert(request.headers.get('content-type')?.startsWith('multipart/form-data'), 'Choose a photo to upload.');
    const limit = maxImageBytes + 64 * 1024;
    assert(Number(request.headers.get('content-length') || 0) <= limit, 'Photo must be 4 MB or smaller.', 413);
    assert(request.body, 'Choose a photo to upload.');
    const reader = request.body.getReader(), chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            size += value.length;
            if (size > limit) {
                await reader.cancel();
                throw new HttpError(413, 'Photo must be 4 MB or smaller.');
            }
            chunks.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    try {
        return await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers.get('content-type')! } }).formData();
    }
    catch {
        throw new HttpError(400, 'Unable to read this upload. Please choose the photo again.');
    }
}
export async function saveImage(file: File) {
    assert(file.size > 0 && file.size <= maxImageBytes, 'Photo must be between 1 byte and 4 MB.', 413);
    assert(['image/jpeg', 'image/png', 'image/webp'].includes(file.type), 'Use a JPG, PNG or WebP photo.');
    let data: Buffer;
    try {
        const input = Buffer.from(await file.arrayBuffer());
        const image = sharp(input, { limitInputPixels: 25000000, animated: false });
        const metadata = await image.metadata();
        assert(['jpeg', 'png', 'webp'].includes(metadata.format || '') && (metadata.pages || 1) === 1, 'Use a still JPG, PNG or WebP photo.');
        // Re-encode to strip metadata, normalize orientation and avoid serving arbitrary file contents.
        data = await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    }
    catch (error) {
        if (error instanceof HttpError)
            throw error;
        throw new HttpError(400, 'This photo could not be read. Choose a valid JPG, PNG or WebP under 25 megapixels.');
    }
    assert(data.length <= maxImageBytes, 'The optimized photo is too large.', 413);
    const id = randomUUID() + '.webp';
    await (await database()).prepare('INSERT INTO images(id,data) VALUES(?,?)').run(id, data);
    return { url: '/media/' + id };
}
