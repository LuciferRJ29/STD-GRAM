import jwt, { type SignOptions } from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('Missing JWT secrets in environment variables');
}

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

export function signAccessToken(payload: AccessTokenPayload): string {
  const opts: SignOptions = {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, ACCESS_SECRET, opts);
}

export function signRefreshToken(payload: RefreshTokenPayload, rememberMe = false): string {
  const expiresIn = rememberMe
    ? (process.env.JWT_REFRESH_EXPIRES_IN_REMEMBER || '90d')
    : (process.env.JWT_REFRESH_EXPIRES_IN || '30d');
  const opts: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, REFRESH_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    return null;
  }
}
