import { submitReview } from '../../../lib/review-submit';
import { body, failure, json, sameOrigin } from '../../../lib/http';
export const runtime = 'nodejs';
/** A customer review from a product page; saved hidden until the owner approves it. */
export async function POST(request: Request) { try {
    sameOrigin(request);
    return json(await submitReview(await body(request)), 201);
}
catch (e) {
    return failure(e);
} }
