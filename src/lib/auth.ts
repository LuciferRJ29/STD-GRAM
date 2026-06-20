import { cookies, headers } from 'next/headers';
import { verifyAccessToken } from './jwt';
import { connectDB } from './db';
import { User, Session, type IUser } from '@/models';
import { ACCESS_COOKIE_NAME } from './crypto';

export interface AuthContext {
  user: IUser;
  sessionId: string;
}

/**
 * Resolves the authenticated user from the access-token cookie.
 * Returns null if there is no valid session - callers respond 401.
 * Does NOT auto-refresh; the client calls POST /api/auth/refresh on 401
 * and retries the original request once.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifyAccessToken(token);
  if (!payload) return null;

  await connectDB();

  const [user, session] = await Promise.all([
    User.findById(payload.userId),
    Session.findById(payload.sessionId),
  ]);

  if (!user || user.isBanned) return null;
  if (!session || session.isRevoked) return null;

  // Update last-active timestamp (fire and forget, don't block the request)
  Session.updateOne({ _id: session._id }, { lastActiveAt: new Date() }).catch(() => undefined);

  return { user, sessionId: String(session._id) };
}

/** Throws-style helper for routes that require auth - returns a 401 Response if unauthenticated. */
export async function requireAuth(): Promise<AuthContext | Response> {
  const ctx = await getAuthContext();
  if (!ctx) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' }, { status: 401 });
  }
  return ctx;
}

export function isAuthContext(value: AuthContext | Response): value is AuthContext {
  return !(value instanceof Response);
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return h.get('x-real-ip') || '0.0.0.0';
}

export async function getUserAgent(): Promise<string> {
  const h = await headers();
  return h.get('user-agent') || 'unknown';
}
