import { database } from '../../../lib/database';
import { json, failure } from '../../../lib/http';
import { mergeSite } from '@aurzen/shared/site';
export const runtime = 'nodejs';
/** Old → new addresses for the web proxy (Studio → SEO & integrations → Redirects). */
export async function GET() { try {
    const row = await (await database()).prepare("SELECT value FROM settings WHERE key='site'").get();
    return json(mergeSite(row ? JSON.parse(String(row.value)) : null).redirects.items);
}
catch (e) {
    return failure(e);
} }
