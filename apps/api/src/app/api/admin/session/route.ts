import { createSession, isAdmin, logout, passwordMatches, rateLimit } from '../../../../lib/auth';
import { assert, body, failure, json, sameOrigin } from '../../../../lib/http';
export const runtime = 'nodejs';
export async function GET() { return json({ authenticated: await isAdmin(), configured: !!process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 16 }); }
export async function POST(request: Request) {
    try {
        sameOrigin(request);
        await rateLimit('admin-login', 20, 15 * 60 * 1000);
        const data = await body(request);
        assert(typeof data.password === 'string' && data.password.length <= 256, 'Invalid password.');
        assert(passwordMatches(data.password), 'Incorrect password.', 401);
        await createSession();
        return json({ ok: true });
    }
    catch (e) {
        return failure(e);
    }
}
export async function DELETE(request: Request) { try {
    sameOrigin(request);
    await logout();
    return json({ ok: true });
}
catch (e) {
    return failure(e);
} }
