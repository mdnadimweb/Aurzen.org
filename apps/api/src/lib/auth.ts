import { cookies } from './cookies';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { database, type Database } from './database';
import { assert } from './http';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const cookieName = 'aurzen_admin';
/** Who is signed in. The owner signs in with ADMIN_PASSWORD (id null); staff accounts live in `users`. */
export type Staff = { id: string | null; name: string; role: 'owner' | 'staff'; mustReset: boolean };
const configured = () => !!process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 16;
export async function currentUser(): Promise<Staff | null> {
    if (!configured()) return null;
    const token = (await cookies()).get(cookieName)?.value;
    if (!token) return null;
    const db = await database();
    const session = await db.prepare('SELECT expires,user_id FROM sessions WHERE token=?').get(hash(token));
    if (!session || Number(session.expires) <= Date.now()) return null;
    if (!session.user_id) return { id: null, name: 'Owner', role: 'owner', mustReset: false };
    const user = await db.prepare('SELECT id,name,role,disabled,must_reset FROM users WHERE id=?').get(String(session.user_id));
    // A disabled or deleted account loses access on its next request.
    if (!user || Number(user.disabled)) return null;
    return { id: String(user.id), name: String(user.name), role: user.role === 'owner' ? 'owner' : 'staff', mustReset: !!Number(user.must_reset) };
}
export async function isAdmin() { return !!await currentUser(); }
export async function requireAdmin() { const user = await currentUser(); assert(user, 'Please sign in to the studio.', 401); return user!; }
export async function requireOwner() { const user = await requireAdmin(); assert(user.role === 'owner', 'Only an owner can do this.', 403); return user; }
/** The hosting password (ADMIN_PASSWORD). Before the owner sets a studio password it signs in; afterwards it is only the recovery key. */
export function passwordMatches(password: string) {
    const configuredPassword = process.env.ADMIN_PASSWORD;
    assert(configuredPassword && configuredPassword.length >= 16, 'Admin access needs configuration. Set ADMIN_PASSWORD to at least 16 characters in the API runtime environment.', 503);
    return timingSafeEqual(Buffer.from(hash(password)), Buffer.from(hash(configuredPassword!)));
}
const ownerKey = 'ownerPassword';
/** The owner's own studio password, if one was chosen (Studio → My password). */
async function ownerHash(db: Database) {
    const row = await db.prepare('SELECT value FROM settings WHERE key=?').get(ownerKey);
    return row ? String(JSON.parse(String(row.value))) : '';
}
/** Owner sign-in: the studio password once set, otherwise ADMIN_PASSWORD. */
export async function ownerPasswordMatches(password: string, db?: Database) {
    const stored = await ownerHash(db || await database());
    // Always check the hosting configuration first so a missing ADMIN_PASSWORD still reports 503.
    const hosting = passwordMatches(password);
    return stored ? verifyPassword(password, stored) : hosting;
}
export async function setOwnerPassword(db: Database, password: string) {
    await db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(ownerKey, JSON.stringify(hashPassword(password)));
}
/** Ends owner sessions; with keepCurrent the browser making this request stays signed in. */
export async function endOwnerSessions(db: Database, keepCurrent = false) {
    const token = keepCurrent ? (await cookies()).get(cookieName)?.value : undefined;
    if (token) await db.prepare('DELETE FROM sessions WHERE user_id IS NULL AND token<>?').run(hash(token));
    else await db.prepare('DELETE FROM sessions WHERE user_id IS NULL').run();
}
/** scrypt with a random salt: "salt:hash". */
export function hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function verifyPassword(password: string, stored: string) {
    const [salt, expected] = stored.split(':');
    if (!salt || !expected) return false;
    const actual = scryptSync(password, salt, 64), wanted = Buffer.from(expected, 'hex');
    return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}
export function checkNewPassword(password: unknown) {
    assert(typeof password === 'string' && password.length >= 10 && password.length <= 200, 'Use a password of 10 to 200 characters.');
    assert(!/^(.)\1+$/.test(password as string) && !/^(password|1234567890|aurzen)/i.test(password as string), 'Choose a less guessable password.');
    return password as string;
}
export async function createSession(userId: string | null = null) {
    const token = randomBytes(32).toString('hex');
    const db = await database();
    await db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
    await db.prepare('INSERT INTO sessions(token,expires,user_id) VALUES(?,?,?)').run(hash(token), Date.now() + 8 * 60 * 60 * 1000, userId);
    (await cookies()).set(cookieName, token, { httpOnly: true, sameSite: 'Strict', secure: process.env.COOKIE_SECURE !== 'false', path: '/', maxAge: 8 * 60 * 60 });
}
/** Ends every session of one staff account (after disabling it or resetting its password). */
export async function endSessionsOf(userId: string, db?: Database) {
    // Inside a write transaction pass its handle: a second connection would wait on the open transaction.
    await (db || await database()).prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
}
export async function logout() {
    const jar = await cookies();
    const token = jar.get(cookieName)?.value;
    if (token)
        await (await database()).prepare('DELETE FROM sessions WHERE token=?').run(hash(token));
    jar.delete(cookieName);
}
export const newUserId = () => randomUUID();
export async function rateLimit(key: string, max: number, windowMs: number) {
    const db = await database();
    await db.prepare('DELETE FROM rate_limits WHERE expires < ?').run(Date.now());
    const row = await db.prepare('INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=rate_limits.count+1 RETURNING count').get(key, Date.now() + windowMs);
    assert(Number(row?.count) <= max, 'Too many attempts. Please try again later.', 429);
}
