import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User, OtpCode } from '@/models';
import { forgotPasswordSchema } from '@/lib/validators/auth';
import { generateOtp, otpExpiryDate } from '@/lib/crypto';
import { sendOtpEmail } from '@/lib/mailer';
import { rateLimit, rateLimitKey } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const ip = await getClientIp();
  const limit = await rateLimit(rateLimitKey(ip, 'forgot-password'), 5, 60_000);
  if (!limit.success) {
    return Response.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { email } = parsed.data;
  await connectDB();
  const user = await User.findOne({ email });

  // Always respond identically whether or not the account exists.
  if (user) {
    const code = generateOtp(6);
    const codeHash = await bcrypt.hash(code, 10);
    await OtpCode.deleteMany({ email, purpose: 'reset' });
    await OtpCode.create({ email, codeHash, purpose: 'reset', expiresAt: otpExpiryDate(10) });
    await sendOtpEmail(email, code, 'reset').catch(() => undefined);
  }

  return Response.json({ message: 'If that email exists, a reset code has been sent.' });
}
