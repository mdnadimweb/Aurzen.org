import { createSession, currentUser, logout, passwordMatches, rateLimit, verifyPassword } from '../../../../lib/auth';
import { database } from '../../../../lib/database';
import { assert, body, failure, json, sameOrigin } from '../../../../lib/http';
export const runtime = 'nodejs';
export async function GET() {
    const user = await currentUser();
    return json({ authenticated: !!user, user, configured: !!process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 16 });
}
/** Owner: password only. Staff: username + password (Studio → Users & roles). */
export async function POST(request: Request) {
    try {
        sameOrigin(request);
        await rateLimit('admin-login', 60, 15 * 60 * 1000);
        const data = await body(request);
        assert(typeof data.password === 'string' && data.password.length <= 256, 'Invalid password.');
        const username = typeof data.username === 'string' ? data.username.trim().toLowerCase() : '';
        if (!username) {
            await rateLimit('admin-login-owner', 20, 15 * 60 * 1000);
            assert(passwordMatches(data.password), 'Incorrect password.', 401);
            await createSession();
            return json({ ok: true });
        }
        assert(username.length <= 60, 'Incorrect username or password.', 401);
        await rateLimit('admin-login:' + username, 10, 15 * 60 * 1000);
        const user = await (await database()).prepare('SELECT id,hash,disabled FROM users WHERE username=?').get(username);
        // Same message for unknown users, wrong passwords and disabled accounts.
        assert(user && !Number(user.disabled) && verifyPassword(data.password, String(user.hash)), 'Incorrect username or password.', 401);
        await createSession(String(user!.id));
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
