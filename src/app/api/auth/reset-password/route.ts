import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User, OtpCode, Session } from '@/models';
import { resetPasswordSchema } from '@/lib/validators/auth';
import { hashPassword } from '@/lib/crypto';
import { rateLimit, rateLimitKey } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const ip = await getClientIp();
  const limit = await rateLimit(rateLimitKey(ip, 'reset-password'), 10, 60_000);
  if (!limit.success) {
    return Response.json({ error: 'Too many attempts. Try again shortly.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { email, code, newPassword } = parsed.data;
  await connectDB();

  const otp = await OtpCode.findOne({ email, purpose: 'reset' }).sort({ createdAt: -1 });
  if (!otp || otp.attempts >= 5) {
    return Response.json({ error: 'Invalid or expired code. Request a new one.' }, { status: 400 });
  }

  const isValid = await bcrypt.compare(code, otp.codeHash);
  if (!isValid) {
    otp.attempts += 1;
    await otp.save();
    return Response.json({ error: 'Incorrect code' }, { status: 400 });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return Response.json({ error: 'Account not found' }, { status: 404 });
  }

  user.passwordHash = await hashPassword(newPassword);
  user.tokenVersion += 1; // invalidates all existing refresh tokens
  await user.save();

  await OtpCode.deleteMany({ email, purpose: 'reset' });
  await Session.updateMany({ userId: user._id }, { isRevoked: true }); // log out everywhere

  return Response.json({ message: 'Password reset. Please sign in again.' });
}
