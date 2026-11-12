import { cookies } from './cookies';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { database } from './database';
import { assert } from './http';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const cookieName = 'aurzen_admin';
export async function isAdmin() {
    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 16)
        return false;
    const token = (await cookies()).get(cookieName)?.value;
    if (!token)
        return false;
    const session = await (await database()).prepare('SELECT expires FROM sessions WHERE token=?').get(hash(token));
    return !!session && Number(session.expires) > Date.now();
}
export async function requireAdmin() { assert(await isAdmin(), 'Please sign in to the studio.', 401); }
export function passwordMatches(password: string) {
    const configured = process.env.ADMIN_PASSWORD;
    assert(configured && configured.length >= 16, 'Admin access needs configuration. Set ADMIN_PASSWORD to at least 16 characters in the API runtime environment.', 503);
    return timingSafeEqual(Buffer.from(hash(password)), Buffer.from(hash(configured)));
}
export async function createSession() {
    const token = randomBytes(32).toString('hex');
    await (await database()).prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
    await (await database()).prepare('INSERT INTO sessions VALUES(?,?)').run(hash(token), Date.now() + 8 * 60 * 60 * 1000);
    (await cookies()).set(cookieName, token, { httpOnly: true, sameSite: 'Strict', secure: process.env.COOKIE_SECURE !== 'false', path: '/', maxAge: 8 * 60 * 60 });
}
export async function logout() {
    const jar = await cookies();
    const token = jar.get(cookieName)?.value;
    if (token)
        await (await database()).prepare('DELETE FROM sessions WHERE token=?').run(hash(token));
    jar.delete(cookieName);
}
export async function rateLimit(key: string, max: number, windowMs: number) {
    const db = await database();
    await db.prepare('DELETE FROM rate_limits WHERE expires < ?').run(Date.now());
    const row = await db.prepare('INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=rate_limits.count+1 RETURNING count').get(key, Date.now() + windowMs);
    assert(Number(row?.count) <= max, 'Too many attempts. Please try again later.', 429);
}
