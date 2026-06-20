import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/models';
import { blockUserSchema } from '@/lib/validators/user';

export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = blockUserSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 });

  await connectDB();
  await User.updateOne({ _id: ctx.user._id }, { $addToSet: { blockedUserIds: parsed.data.userId } });
  return Response.json({ message: 'User blocked' });
}

export async function DELETE(req: Request) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = blockUserSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 });

  await connectDB();
  await User.updateOne({ _id: ctx.user._id }, { $pull: { blockedUserIds: parsed.data.userId } });
  return Response.json({ message: 'User unblocked' });
}
