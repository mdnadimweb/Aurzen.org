import { placeOrder, quoteOrder, checkoutSettings } from '../../../lib/checkout';
import { body, failure, json, sameOrigin } from '../../../lib/http';
export const runtime = 'nodejs';
export async function GET() { try {
    return json(await checkoutSettings());
}
catch (e) {
    return failure(e);
} }
export async function POST(request: Request) { try {
    sameOrigin(request);
    const data=await body(request);
    return data.action==='quote'?json(await quoteOrder(data)):json(await placeOrder(data),201);
}
catch (e) {
    return failure(e);
} }
