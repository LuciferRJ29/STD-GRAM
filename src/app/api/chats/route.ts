import { NextRequest } from 'next/server';
import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Chat, User, buildDirectKey } from '@/models';
import { createChatSchema } from '@/lib/validators/chat';

export async function GET() {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  await connectDB();

  const chats = await Chat.find({ 'members.userId': ctx.user._id })
    .sort({ lastMessageAt: -1 })
    .populate('lastMessageId')
    .populate('members.userId', 'username displayName avatarFileId isOnline lastSeenAt')
    .lean();

  const formatted = chats.map((chat) => {
    const me = chat.members.find((m) => String(m.userId._id || m.userId) === String(ctx.user._id));
    const otherMember =
      chat.type === 'direct'
        ? chat.members.find((m) => String(m.userId._id || m.userId) !== String(ctx.user._id))
        : null;
    const isGroupLike = chat.type === 'group' || chat.type === 'channel';

    return {
      id: String(chat._id),
      type: chat.type,
      name: isGroupLike ? chat.name : (otherMember?.userId as any)?.displayName,
      username: chat.type === 'direct' ? (otherMember?.userId as any)?.username : undefined,
      avatarFileId: isGroupLike ? chat.avatarFileId : (otherMember?.userId as any)?.avatarFileId,
      isOnline: chat.type === 'direct' ? (otherMember?.userId as any)?.isOnline : undefined,
      lastMessage: chat.lastMessageId
        ? {
            text: (chat.lastMessageId as any).text,
            senderId: (chat.lastMessageId as any).senderId,
            createdAt: (chat.lastMessageId as any).createdAt,
            isDeleted: (chat.lastMessageId as any).isDeleted,
          }
        : null,
      lastMessageAt: chat.lastMessageAt,
      unreadCount: 0,
      isArchived: !!me?.archivedAt,
      isPinned: !!me?.pinnedAt,
      memberCount: isGroupLike ? chat.members.length : undefined,
      role: me?.role,
    };
  });

  return Response.json({ chats: formatted });
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = createChatSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { type, participantIds, name, description, isPublic } = parsed.data;
  await connectDB();

  if (type === 'direct') {
    if (participantIds.length !== 1) {
      return Response.json({ error: 'Direct chats need exactly one other participant' }, { status: 400 });
    }
    const otherUserId = participantIds[0];
    if (otherUserId === String(ctx.user._id)) {
      return Response.json({ error: 'Cannot start a chat with yourself' }, { status: 400 });
    }

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    if (otherUser.blockedUserIds.some((id) => String(id) === String(ctx.user._id))) {
      return Response.json({ error: 'Unable to message this user' }, { status: 403 });
    }

    const directKey = buildDirectKey(String(ctx.user._id), otherUserId);
    let chat = await Chat.findOne({ directKey });
    if (!chat) {
      chat = await Chat.create({
        type: 'direct',
        directKey,
        members: [
          { userId: ctx.user._id, role: 'member', joinedAt: new Date(), isBanned: false, isAnonymousAdmin: false },
          { userId: otherUserId, role: 'member', joinedAt: new Date(), isBanned: false, isAnonymousAdmin: false },
        ],
        createdBy: ctx.user._id,
      });
    }
    return Response.json({ chat: { id: String(chat._id), type: chat.type } }, { status: 201 });
  }

  // Group or channel creation - both support being created solo (no other
  // members required upfront), matching Telegram's "create, then invite later" flow.
  if (!name) {
    return Response.json(
      { error: type === 'channel' ? 'Channel name is required' : 'Group name is required' },
      { status: 400 },
    );
  }

  const members = [
    { userId: ctx.user._id, role: 'owner' as const, joinedAt: new Date(), isBanned: false, isAnonymousAdmin: false },
    ...participantIds
      .filter((id) => id !== String(ctx.user._id))
      .map((id) => ({
        userId: id,
        role: 'member' as const,
        joinedAt: new Date(),
        isBanned: false,
        isAnonymousAdmin: false,
      })),
  ];

  const chat = await Chat.create({
    type,
    name,
    description,
    members,
    isPublic: type === 'channel' ? isPublic : false,
    createdBy: ctx.user._id,
  });

  return Response.json({ chat: { id: String(chat._id), type: chat.type, name: chat.name } }, { status: 201 });
}
