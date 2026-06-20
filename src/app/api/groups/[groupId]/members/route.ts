import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getChatForMember, hasRoleAtLeast } from '@/lib/services/chatAccess';
import { addMembersSchema, updateMemberRoleSchema } from '@/lib/validators/chat';
import { Notification } from '@/models';

export async function POST(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { groupId } = await params;
  await connectDB();

  const access = await getChatForMember(groupId, String(ctx.user._id));
  if (!access || access.chat.type !== 'group') return Response.json({ error: 'Group not found' }, { status: 404 });
  if (!hasRoleAtLeast(access.member, 'admin')) {
    return Response.json({ error: 'Admin role required' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = addMembersSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 });

  const existingIds = new Set(access.chat.members.map((m) => String(m.userId)));
  const newMembers = parsed.data.userIds
    .filter((id) => !existingIds.has(id))
    .map((id) => ({
      userId: id,
      role: 'member' as const,
      joinedAt: new Date(),
      isBanned: false,
      isAnonymousAdmin: false,
    })) as unknown as typeof access.chat.members;

  access.chat.members.push(...newMembers);
  await access.chat.save();

  if (newMembers.length) {
    await Notification.insertMany(
      newMembers.map((m) => ({
        userId: m.userId,
        type: 'added_to_group',
        actorId: ctx.user._id,
        chatId: groupId,
        text: `${ctx.user.displayName} added you to ${access.chat.name}`,
      })),
    );
  }

  return Response.json({ message: 'Members added', addedCount: newMembers.length });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { groupId } = await params;
  await connectDB();

  const access = await getChatForMember(groupId, String(ctx.user._id));
  if (!access || access.chat.type !== 'group') return Response.json({ error: 'Group not found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateMemberRoleSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 });

  const target = access.chat.members.find((m) => String(m.userId) === parsed.data.userId);
  if (!target) return Response.json({ error: 'Member not found' }, { status: 404 });

  // Only an owner can grant/revoke admin or owner; admins can manage moderator/member.
  const actingMinRole = ['owner', 'admin'].includes(parsed.data.role) ? 'owner' : 'admin';
  if (!hasRoleAtLeast(access.member, actingMinRole as any)) {
    return Response.json({ error: 'Insufficient permissions for this role change' }, { status: 403 });
  }

  target.role = parsed.data.role;
  await access.chat.save();

  await Notification.create({
    userId: target.userId,
    type: 'role_changed',
    actorId: ctx.user._id,
    chatId: groupId,
    text: `Your role in ${access.chat.name} is now ${parsed.data.role}`,
  });

  return Response.json({ message: 'Role updated' });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { groupId } = await params;
  await connectDB();

  const access = await getChatForMember(groupId, String(ctx.user._id));
  if (!access || access.chat.type !== 'group') return Response.json({ error: 'Group not found' }, { status: 404 });
  if (!hasRoleAtLeast(access.member, 'moderator')) {
    return Response.json({ error: 'Moderator role required' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const userId = body?.userId as string | undefined;
  const ban = Boolean(body?.ban);
  if (!userId) return Response.json({ error: 'userId is required' }, { status: 400 });

  const target = access.chat.members.find((m) => String(m.userId) === userId);
  if (!target) return Response.json({ error: 'Member not found' }, { status: 404 });
  if (target.role === 'owner') {
    return Response.json({ error: "Can't remove the group owner" }, { status: 403 });
  }

  if (ban) {
    target.isBanned = true;
  } else {
    access.chat.members = access.chat.members.filter((m) => String(m.userId) !== userId);
  }
  await access.chat.save();

  return Response.json({ message: ban ? 'Member banned' : 'Member removed' });
}
