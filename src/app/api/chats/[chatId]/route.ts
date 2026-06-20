import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getChatForMember, hasRoleAtLeast } from '@/lib/services/chatAccess';
import { updateGroupSchema } from '@/lib/validators/chat';

export async function GET(_req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { chatId } = await params;
  await connectDB();

  const access = await getChatForMember(chatId, String(ctx.user._id));
  if (!access) return Response.json({ error: 'Chat not found' }, { status: 404 });

  const chat = await access.chat.populate('members.userId', 'username displayName avatarFileId isOnline lastSeenAt');

  return Response.json({
    chat: {
      id: String(chat._id),
      type: chat.type,
      name: chat.name,
      description: chat.description,
      avatarFileId: chat.avatarFileId,
      isPublic: chat.isPublic,
      inviteCode: hasRoleAtLeast(access.member, 'admin') ? chat.inviteCode : undefined,
      slowModeSeconds: chat.slowModeSeconds,
      pinnedMessageIds: chat.pinnedMessageIds,
      myRole: access.member.role,
      members: chat.members.map((m: any) => ({
        userId: String(m.userId._id || m.userId),
        username: m.userId.username,
        displayName: m.userId.displayName,
        avatarFileId: m.userId.avatarFileId,
        role: m.role,
        isBanned: m.isBanned,
        isAnonymousAdmin: m.isAnonymousAdmin,
        joinedAt: m.joinedAt,
      })),
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { chatId } = await params;
  await connectDB();

  const access = await getChatForMember(chatId, String(ctx.user._id));
  if (!access) return Response.json({ error: 'Chat not found' }, { status: 404 });
  if (access.chat.type !== 'group') return Response.json({ error: 'Only groups can be updated' }, { status: 400 });
  if (!hasRoleAtLeast(access.member, 'admin')) {
    return Response.json({ error: 'Admin role required' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateGroupSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 });

  Object.assign(access.chat, parsed.data);
  await access.chat.save();

  return Response.json({ message: 'Group updated' });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { chatId } = await params;
  await connectDB();

  const access = await getChatForMember(chatId, String(ctx.user._id));
  if (!access) return Response.json({ error: 'Chat not found' }, { status: 404 });

  // Leaving a group removes membership; leaving a direct chat just archives it for you.
  if (access.chat.type === 'group') {
    access.chat.members = access.chat.members.filter((m) => String(m.userId) !== String(ctx.user._id));
    if (access.chat.members.length === 0) {
      await access.chat.deleteOne();
    } else {
      // Promote the oldest remaining admin/member to owner if the owner left.
      if (access.member.role === 'owner' && !access.chat.members.some((m) => m.role === 'owner')) {
        const successor =
          access.chat.members.find((m) => m.role === 'admin') || access.chat.members[0];
        if (successor) successor.role = 'owner';
      }
      await access.chat.save();
    }
  } else {
    access.member.archivedAt = new Date();
    await access.chat.save();
  }

  return Response.json({ message: 'Left chat' });
}
