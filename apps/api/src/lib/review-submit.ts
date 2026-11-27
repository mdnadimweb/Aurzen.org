import { createHash, randomUUID } from 'node:crypto';
import { catalog, content, saveSetting, transaction } from './database';
import { rateLimit } from './auth';
import { assert, text } from './http';
import { normalizePhone } from '@aurzen/shared/phone';
import type { Order } from '@aurzen/shared/catalog';
import type { Review } from '@aurzen/shared/site';

/**
 * A review written by a customer on a product page. It is saved hidden ("waiting") and only appears
 * after the owner approves it in Studio → Reviews. The phone number is never shown on the shop: it
 * limits how often someone can post and marks the review "Verified buyer" when that phone has a
 * delivered order containing the product.
 */
export async function submitReview(d: Record<string, unknown>, now = Date.now()) {
    const product = Number(d.product);
    assert(Number.isSafeInteger(product) && product > 0, 'Choose a product to review.');
    const name = text(d.name, 2, 60, 'Name');
    const phone = normalizePhone(text(d.phone, 11, 20, 'Phone number'));
    assert(/^01[3-9]\d{8}$/.test(phone), 'Enter a valid Bangladesh mobile number.');
    const rating = Number(d.rating);
    assert(Number.isSafeInteger(rating) && rating >= 1 && rating <= 5, 'Choose a rating from 1 to 5 stars.');
    const body = typeof d.text === 'string' ? d.text.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() : '';
    assert(body.length >= 10, 'Please write at least a few words (10 characters).');
    assert(body.length <= 1000, 'A review can be at most 1,000 characters.');

    const { products } = await catalog();
    assert(products.some(p => p.id === product), 'This product is not available for reviews.', 404);

    // Limits: shop-wide per day, and per phone per day, so the queue cannot be flooded.
    const phoneKey = createHash('sha256').update(phone).digest('hex');
    await rateLimit('review-global', 200, 24 * 60 * 60 * 1000);
    await rateLimit('review-phone:' + phoneKey, 3, 24 * 60 * 60 * 1000);

    return transaction(async db => {
        const current = await content(db);
        assert(!current.reviews.some(r => r.phone === phone && r.product === product), 'You have already reviewed this product. Thank you!', 409);
        assert(current.reviews.length < 500, 'We cannot take new reviews right now. Please message us instead.', 503);
        const orders = (await db.prepare('SELECT payload FROM orders').all()).map(r => JSON.parse(String(r.payload)) as Order);
        const verified = orders.some(o => o.phone === phone && o.status === 'Delivered' && o.items.some(i => i.id === product));
        const review: Review = { id: 'review-' + randomUUID().slice(0, 12), name, rating, text: body, photo: '', product, date: new Date(now).toISOString(), approved: false, fromCustomer: true, phone, ...(verified ? { verified: true } : {}) };
        await saveSetting(db, 'content', { ...current, reviews: [review, ...current.reviews] });
        return { ok: true, verified };
    });
}

/** What the shop may show of a review: never the phone number. */
export const publicReview = ({ phone: _phone, ...review }: Review) => review;
