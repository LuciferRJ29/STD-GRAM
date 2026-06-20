import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/models';

export async function POST() {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  await connectDB();

  const secret = speakeasy.generateSecret({
    name: `${process.env.TWO_FACTOR_APP_NAME || 'TelegramClone'} (${ctx.user.username})`,
  });

  // Store secret but keep 2FA disabled until the user verifies a code
  // (prevents lockout if they never complete setup).
  await User.updateOne(
    { _id: ctx.user._id },
    { 'twoFactor.secret': secret.base32, 'twoFactor.enabled': false },
  );

  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url as string);

  return Response.json({
    secret: secret.base32,
    qrCodeDataUrl,
  });
}
