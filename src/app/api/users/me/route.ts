import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/models';
import { updateProfileSchema } from '@/lib/validators/user';

export async function GET() {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const u = ctx.user;
  return Response.json({
    user: {
      id: String(u._id),
      email: u.email,
      username: u.username,
      displayName: u.displayName,
      bio: u.bio,
      avatarFileId: u.avatarFileId,
      isPremium: u.isPremium,
      isVerified: u.isVerified,
      isAdmin: u.isAdmin,
      isFounder: u.isFounder,
      isEmailVerified: u.isEmailVerified,
      twoFactorEnabled: u.twoFactor?.enabled || false,
      privacy: u.privacy,
      lastSeenAt: u.lastSeenAt,
    },
  });
}

export async function PATCH(req: Request) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  await User.updateOne({ _id: ctx.user._id }, { $set: parsed.data });

  return Response.json({ message: 'Profile updated' });
}
