import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/models';

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { username } = await params;
  await connectDB();

  const profile = await User.findOne({ username });
  if (!profile) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const viewerBlocked = profile.blockedUserIds.some((id) => String(id) === String(ctx.user._id));
  if (viewerBlocked) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const isContact = false; // contacts feature can be added without changing this shape
  const canSee = (level: string) => level === 'everyone' || (level === 'contacts' && isContact);

  return Response.json({
    user: {
      id: String(profile._id),
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarFileId: canSee(profile.privacy.profilePhoto) ? profile.avatarFileId : undefined,
      isPremium: profile.isPremium,
      isVerified: profile.isVerified,
      isOnline: canSee(profile.privacy.lastSeen) ? profile.isOnline : undefined,
      lastSeenAt: canSee(profile.privacy.lastSeen) ? profile.lastSeenAt : undefined,
    },
  });
}
