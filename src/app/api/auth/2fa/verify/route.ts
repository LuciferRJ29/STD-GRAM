import speakeasy from 'speakeasy';
import { randomBytes } from 'crypto';
import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/models';
import { twoFactorVerifySchema } from '@/lib/validators/auth';

export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = twoFactorVerifySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid code format' }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(ctx.user._id).select('+twoFactor.secret');
  if (!user?.twoFactor?.secret) {
    return Response.json({ error: 'Run 2FA setup first' }, { status: 400 });
  }

  const isValid = speakeasy.totp.verify({
    secret: user.twoFactor.secret,
    encoding: 'base32',
    token: parsed.data.token,
    window: 1,
  });

  if (!isValid) {
    return Response.json({ error: 'Incorrect code' }, { status: 400 });
  }

  const backupCodes = Array.from({ length: 8 }, () => randomBytes(4).toString('hex'));
  user.twoFactor.enabled = true;
  user.twoFactor.backupCodes = backupCodes;
  await user.save();

  return Response.json({ message: 'Two-factor authentication enabled', backupCodes });
}

export async function DELETE() {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  await connectDB();
  await User.updateOne(
    { _id: ctx.user._id },
    { $unset: { 'twoFactor.secret': 1, 'twoFactor.backupCodes': 1 }, 'twoFactor.enabled': false },
  );

  return Response.json({ message: 'Two-factor authentication disabled' });
}
