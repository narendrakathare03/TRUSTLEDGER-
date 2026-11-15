import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'trustledger_session';
function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
  return new TextEncoder().encode(value);
}
export type SessionUser = { userId: number; username: string; role: 'admin' | 'user' };
export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user).setProtectedHeader({ alg: 'HS256' }).setIssuedAt()
    .setExpirationTime('7d').sign(secret());
  cookies().set(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 });
}
export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { const { payload } = await jwtVerify(token, secret()); return payload as unknown as SessionUser; }
  catch { return null; }
}
export function clearSession() { cookies().delete(COOKIE_NAME); }
