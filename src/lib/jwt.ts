import jwt, { type SignOptions } from 'jsonwebtoken';

export interface AccessTokenPayload {
  userId: string;
  username: string;
  sessionId: string;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  tokenVersion: number;
}

// Read lazily (at call time) rather than at module import time. Next.js's
// build step imports every route module to collect page data - throwing
// here at import time crashes the build itself, even on routes that never
// end up calling these functions during that step. Throwing only when a
// token is actually signed/verified affects real requests only.
function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('Missing JWT_ACCESS_SECRET environment variable');
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('Missing JWT_REFRESH_SECRET environment variable');
  return secret;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const opts: SignOptions = {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, getAccessSecret(), opts);
}

export function signRefreshToken(payload: RefreshTokenPayload, rememberMe = false): string {
  const expiresIn = rememberMe
    ? (process.env.JWT_REFRESH_EXPIRES_IN_REMEMBER || '90d')
    : (process.env.JWT_REFRESH_EXPIRES_IN || '30d');
  const opts: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, getRefreshSecret(), opts);
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    return jwt.verify(token, getAccessSecret()) as AccessTokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    return jwt.verify(token, getRefreshSecret()) as RefreshTokenPayload;
  } catch {
    return null;
  }
}
