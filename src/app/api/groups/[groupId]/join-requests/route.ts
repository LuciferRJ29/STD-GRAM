import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getChatForMember, hasRoleAtLeast } from '@/lib/services/chatAccess';
import { User } from '@/models';

export async function GET(_req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { groupId } = await params;
  await connectDB();

  const access = await getChatForMember(groupId, String(ctx.user._id));
  if (!access || access.chat.type !== 'group') return Response.json({ error: 'Group not found' }, { status: 404 });
  if (!hasRoleAtLeast(access.member, 'admin')) return Response.json({ error: 'Admin role required' }, { status: 403 });

  const requesters = await User.find({ _id: { $in: access.chat.pendingJoinRequests } })
    .select('username displayName avatarFileId')
    .lean();

  return Response.json({ requests: requesters.map((u) => ({ id: String(u._id), ...u })) });
}

export async function POST(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { groupId } = await params;
  await connectDB();

  const access = await getChatForMember(groupId, String(ctx.user._id));
  if (!access || access.chat.type !== 'group') return Response.json({ error: 'Group not found' }, { status: 404 });
  if (!hasRoleAtLeast(access.member, 'admin')) return Response.json({ error: 'Admin role required' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const userId = body?.userId as string | undefined;
  const approve = Boolean(body?.approve);
  if (!userId) return Response.json({ error: 'userId is required' }, { status: 400 });

  access.chat.pendingJoinRequests = access.chat.pendingJoinRequests.filter((id) => String(id) !== userId);

  if (approve) {
    access.chat.members.push({
      userId,
      role: 'member',
      joinedAt: new Date(),
      isBanned: false,
      isAnonymousAdmin: false,
    } as any);
  }

  await access.chat.save();
  return Response.json({ message: approve ? 'Request approved' : 'Request denied' });
}
