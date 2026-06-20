import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User, OtpCode } from '@/models';
import { verifyOtpSchema } from '@/lib/validators/auth';
import { rateLimit, rateLimitKey } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const ip = await getClientIp();
  const limit = await rateLimit(rateLimitKey(ip, 'verify-otp'), 10, 60_000);
  if (!limit.success) {
    return Response.json({ error: 'Too many attempts. Try again shortly.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { email, code } = parsed.data;
  await connectDB();

  const otp = await OtpCode.findOne({ email, purpose: 'verify' }).sort({ createdAt: -1 });
  if (!otp) {
    return Response.json({ error: 'No verification code found. Request a new one.' }, { status: 400 });
  }

  if (otp.attempts >= 5) {
    return Response.json({ error: 'Too many incorrect attempts. Request a new code.' }, { status: 429 });
  }

  const isValid = await bcrypt.compare(code, otp.codeHash);
  if (!isValid) {
    otp.attempts += 1;
    await otp.save();
    return Response.json({ error: 'Incorrect code' }, { status: 400 });
  }

  await User.updateOne({ email }, { isEmailVerified: true });
  await OtpCode.deleteMany({ email, purpose: 'verify' });

  return Response.json({ message: 'Email verified. You can now sign in.' });
}
