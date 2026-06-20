import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db';
import { Session } from '@/models';
import { verifyAccessToken } from '@/lib/jwt';
import { REFRESH_COOKIE_NAME, ACCESS_COOKIE_NAME } from '@/lib/crypto';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) {
      await connectDB();
      await Session.updateOne({ _id: payload.sessionId }, { isRevoked: true });
    }
  }

  const res = Response.json({ success: true });
  res.headers.append('Set-Cookie', `${ACCESS_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
  res.headers.append('Set-Cookie', `${REFRESH_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
  return res;
}
