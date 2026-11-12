import { catalog } from '../../../lib/database';
import { json, failure } from '../../../lib/http';
export const runtime = 'nodejs';
export async function GET() { try {
    return json(await catalog());
}
catch (e) {
    return failure(e);
} }
