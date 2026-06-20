import { NextRequest } from 'next/server';
import speakeasy from 'speakeasy';
import { connectDB } from '@/lib/db';
import { User, Session, Device } from '@/models';
import { loginSchema } from '@/lib/validators/auth';
import { comparePassword, REFRESH_COOKIE_NAME, ACCESS_COOKIE_NAME } from '@/lib/crypto';
import { signAccessToken, signRefreshToken } from '@/lib/jwt';
import { rateLimit, rateLimitKey } from '@/lib/rateLimit';
import { getClientIp, getUserAgent } from '@/lib/auth';
import { sendLoginAlertEmail } from '@/lib/mailer';

function parseDeviceName(userAgent: string): string {
  const isMobile = /mobile/i.test(userAgent);
  const browser = /chrome/i.test(userAgent)
    ? 'Chrome'
    : /firefox/i.test(userAgent)
      ? 'Firefox'
      : /safari/i.test(userAgent)
        ? 'Safari'
        : 'Browser';
  const os = /windows/i.test(userAgent)
    ? 'Windows'
    : /mac os/i.test(userAgent)
      ? 'macOS'
      : /android/i.test(userAgent)
        ? 'Android'
        : /iphone|ipad/i.test(userAgent)
          ? 'iOS'
          : /linux/i.test(userAgent)
            ? 'Linux'
            : 'Unknown OS';
  return `${browser} on ${os}${isMobile ? ' (mobile)' : ''}`;
}

export async function POST(req: NextRequest) {
  const ip = await getClientIp();
  const limit = await rateLimit(rateLimitKey(ip, 'login'), 15, 60_000);
  if (!limit.success) {
    return Response.json({ error: 'Too many login attempts. Try again shortly.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { identifier, password, rememberMe, twoFactorCode } = parsed.data;
  await connectDB();

  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
  }).select('+twoFactor.secret +twoFactor.backupCodes');

  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  if (user.isBanned) {
    return Response.json({ error: 'This account has been suspended.' }, { status: 403 });
  }

  const passwordValid = await comparePassword(password, user.passwordHash);
  if (!passwordValid) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  if (!user.isEmailVerified) {
    return Response.json(
      { error: 'Please verify your email first.', code: 'EMAIL_NOT_VERIFIED', email: user.email },
      { status: 403 },
    );
  }

  if (user.twoFactor?.enabled) {
    if (!twoFactorCode) {
      return Response.json(
        { error: 'Two-factor code required', code: 'TWO_FACTOR_REQUIRED' },
        { status: 401 },
      );
    }
    const isValidTotp = speakeasy.totp.verify({
      secret: user.twoFactor.secret as string,
      encoding: 'base32',
      token: twoFactorCode,
      window: 1,
    });
    const isBackupCode = user.twoFactor.backupCodes?.includes(twoFactorCode);
    if (!isValidTotp && !isBackupCode) {
      return Response.json({ error: 'Invalid two-factor code', code: 'TWO_FACTOR_REQUIRED' }, { status: 401 });
    }
    if (isBackupCode) {
      user.twoFactor.backupCodes = user.twoFactor.backupCodes?.filter((c) => c !== twoFactorCode);
      await user.save();
    }
  }

  const userAgent = await getUserAgent();
  const device = await Device.create({
    userId: user._id,
    name: parseDeviceName(userAgent),
    type: /mobile/i.test(userAgent) ? 'mobile' : 'desktop',
  });

  const expiresAt = new Date(Date.now() + (rememberMe ? 90 : 30) * 24 * 60 * 60 * 1000);
  const session = await Session.create({
    userId: user._id,
    deviceId: device._id,
    refreshTokenHash: 'pending',
    tokenVersion: user.tokenVersion,
    rememberMe,
    ip,
    userAgent,
    expiresAt,
  });

  const accessToken = signAccessToken({
    userId: String(user._id),
    username: user.username,
    sessionId: String(session._id),
  });
  const refreshToken = signRefreshToken(
    { userId: String(user._id), sessionId: String(session._id), tokenVersion: user.tokenVersion },
    rememberMe,
  );

  // Store a hash of the refresh token so a leaked DB doesn't leak usable tokens.
  const bcrypt = (await import('bcryptjs')).default;
  session.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await session.save();

  user.lastSeenAt = new Date();
  user.isOnline = true;
  await user.save();

  sendLoginAlertEmail(user.email, device.name, 'Unknown location', ip).catch(() => undefined);

  const res = Response.json({
    user: {
      id: String(user._id),
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      isPremium: user.isPremium,
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
    },
  });

  res.headers.append(
    'Set-Cookie',
    `${ACCESS_COOKIE_NAME}=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${15 * 60}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  );
  res.headers.append(
    'Set-Cookie',
    `${REFRESH_COOKIE_NAME}=${refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${rememberMe ? 90 * 24 * 60 * 60 : 30 * 24 * 60 * 60}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  );

  return res;
}
