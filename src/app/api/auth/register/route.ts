import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { User, OtpCode } from '@/models';
import { registerSchema } from '@/lib/validators/auth';
import { hashPassword, generateOtp, otpExpiryDate } from '@/lib/crypto';
import { sendOtpEmail } from '@/lib/mailer';
import { rateLimit, rateLimitKey } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const ip = await getClientIp();
  const limit = await rateLimit(rateLimitKey(ip, 'register'), 10, 60_000);
  if (!limit.success) {
    return Response.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { email, username, displayName, password } = parsed.data;

  await connectDB();

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    return Response.json(
      { error: existing.email === email ? 'Email already in use' : 'Username already taken' },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email,
    username,
    displayName,
    passwordHash,
    isEmailVerified: false,
  });

  const code = generateOtp(6);
  const codeHash = await bcrypt.hash(code, 10);
  await OtpCode.create({
    email,
    codeHash,
    purpose: 'verify',
    expiresAt: otpExpiryDate(10),
  });

  try {
    await sendOtpEmail(email, code, 'verify');
  } catch {
    // Don't fail registration if email sending has a transient issue -
    // the user can request a resend.
  }

  return Response.json({
    message: 'Account created. Check your email for a verification code.',
    userId: String(user._id),
    email,
  });
}
