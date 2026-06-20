import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Generates a numeric one-time code, e.g. for email OTP verification. */
export function generateOtp(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += randomInt(0, 10).toString();
  }
  return code;
}

export function otpExpiryDate(minutes = 10): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export const REFRESH_COOKIE_NAME = 'tg_refresh_token';
export const ACCESS_COOKIE_NAME = 'tg_access_token';

export function refreshCookieOptions(rememberMe = false) {
  const maxAge = rememberMe ? 90 * 24 * 60 * 60 : 30 * 24 * 60 * 60;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function accessCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 15 * 60,
  };
}
