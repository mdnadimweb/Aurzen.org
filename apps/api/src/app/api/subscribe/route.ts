import { database } from '../../../lib/database';
import { rateLimit } from '../../../lib/auth';
import { assert, body, failure, json, sameOrigin, text } from '../../../lib/http';
import { normalizePhone } from '@aurzen/shared/phone';
export const runtime = 'nodejs';
/** Newsletter / phone signup from the footer. Stores only the email or phone number. */
export async function POST(request: Request) { try {
    sameOrigin(request);
    const d = await body(request);
    const raw = text(d.contact, 5, 120, 'Email or phone');
    const phone = normalizePhone(raw);
    const contact = /^01[3-9]\d{8}$/.test(phone) ? phone : raw.toLowerCase();
    assert(contact === phone || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact), 'Enter a valid email or Bangladesh mobile number.');
    await rateLimit('subscribe-global', 300, 60 * 60 * 1000);
    await (await database()).prepare('INSERT INTO subscribers(contact,created) VALUES(?,?) ON CONFLICT(contact) DO NOTHING').run(contact, new Date().toISOString());
    return json({ ok: true });
}
catch (e) {
    return failure(e);
} }
