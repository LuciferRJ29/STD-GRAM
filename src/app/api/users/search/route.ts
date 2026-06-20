import { NextRequest } from 'next/server';
import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/models';

export async function GET(req: NextRequest) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 1) {
    return Response.json({ users: [] });
  }

  await connectDB();
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const users = await User.find({
    _id: { $ne: ctx.user._id },
    $or: [{ username: regex }, { displayName: regex }],
  })
    .limit(20)
    .select('username displayName avatarFileId isPremium isVerified')
    .lean();

  return Response.json({
    users: users.map((u) => ({
      id: String(u._id),
      username: u.username,
      displayName: u.displayName,
      avatarFileId: u.avatarFileId,
      isPremium: u.isPremium,
      isVerified: u.isVerified,
    })),
  });
}
