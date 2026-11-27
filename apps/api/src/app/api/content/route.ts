import { content } from '../../../lib/database';
import { json, failure } from '../../../lib/http';
import { publicReview } from '../../../lib/review-submit';
export const runtime = 'nodejs';
/** Public pages, FAQ and approved reviews only (drafts and unapproved reviews stay private). */
export async function GET() { try {
    const c = await content();
    return json({ pages: c.pages.filter(p => p.published), faq: c.faq.filter(g => !g.hidden).map(g => ({ ...g, items: g.items.filter(i => !i.hidden) })), reviews: c.reviews.filter(r => r.approved).map(publicReview) });
}
catch (e) {
    return failure(e);
} }
