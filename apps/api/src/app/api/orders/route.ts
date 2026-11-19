import { createHash } from 'node:crypto';
import { rateLimit } from '../../../lib/auth';
import { normalizePhone } from '@aurzen/shared/phone';
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
    // Rate limits: generous for price checks, tighter for placing orders (shop-wide and per phone).
    if(data.action==='quote'){await rateLimit('quote-global',20000,15*60*1000);return json(await quoteOrder(data));}
    await rateLimit('order-global',300,15*60*1000);
    if(typeof data.phone==='string')await rateLimit('order-phone:'+createHash('sha256').update(normalizePhone(data.phone)).digest('hex'),10,60*60*1000);
    return json(await placeOrder(data),201);
}
catch (e) {
    return failure(e);
} }
