import { connectDB } from '@/lib/db';
import { Session, User } from '@/models';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/jwt';
import { REFRESH_COOKIE_NAME, ACCESS_COOKIE_NAME } from '@/lib/crypto';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) {
    return Response.json({ error: 'No refresh token' }, { status: 401 });
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return Response.json({ error: 'Invalid refresh token' }, { status: 401 });
  }

  await connectDB();
  const session = await Session.findById(payload.sessionId);
  const user = await User.findById(payload.userId);

  if (!session || session.isRevoked || !user || user.isBanned) {
    return Response.json({ error: 'Session no longer valid' }, { status: 401 });
  }

  if (session.tokenVersion !== payload.tokenVersion || user.tokenVersion !== payload.tokenVersion) {
    return Response.json({ error: 'Session invalidated' }, { status: 401 });
  }

  const tokenMatches = await bcrypt.compare(refreshToken, session.refreshTokenHash);
  if (!tokenMatches) {
    // Possible token theft/reuse - revoke the session defensively.
    session.isRevoked = true;
    await session.save();
    return Response.json({ error: 'Refresh token mismatch' }, { status: 401 });
  }

  const newAccessToken = signAccessToken({
    userId: String(user._id),
    username: user.username,
    sessionId: String(session._id),
  });
  const newRefreshToken = signRefreshToken(
    { userId: String(user._id), sessionId: String(session._id), tokenVersion: user.tokenVersion },
    session.rememberMe,
  );

  session.refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
  session.lastActiveAt = new Date();
  await session.save();

  const res = Response.json({ success: true });
  res.headers.append(
    'Set-Cookie',
    `${ACCESS_COOKIE_NAME}=${newAccessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${15 * 60}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  );
  res.headers.append(
    'Set-Cookie',
    `${REFRESH_COOKIE_NAME}=${newRefreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${session.rememberMe ? 90 * 24 * 60 * 60 : 30 * 24 * 60 * 60}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  );
  return res;
}
