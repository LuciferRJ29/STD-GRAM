import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User, OtpCode } from '@/models';
import { resendOtpSchema } from '@/lib/validators/auth';
import { generateOtp, otpExpiryDate } from '@/lib/crypto';
import { sendOtpEmail } from '@/lib/mailer';
import { rateLimit, rateLimitKey } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const ip = await getClientIp();
  const limit = await rateLimit(rateLimitKey(ip, 'resend-otp'), 5, 60_000);
  if (!limit.success) {
    return Response.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = resendOtpSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { email, purpose } = parsed.data;
  await connectDB();

  const user = await User.findOne({ email });
  // Always return success-shaped response to avoid leaking which emails exist.
  if (!user) {
    return Response.json({ message: 'If that email exists, a new code has been sent.' });
  }

  const code = generateOtp(6);
  const codeHash = await bcrypt.hash(code, 10);
  await OtpCode.deleteMany({ email, purpose });
  await OtpCode.create({ email, codeHash, purpose, expiresAt: otpExpiryDate(10) });

  await sendOtpEmail(email, code, purpose).catch(() => undefined);

  return Response.json({ message: 'If that email exists, a new code has been sent.' });
}
