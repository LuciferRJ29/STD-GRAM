import { NextRequest } from 'next/server';
import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Chat, Message, File, Notification, User } from '@/models';
import { getChatForMember, isSlowModeBlocked, hasRoleAtLeast } from '@/lib/services/chatAccess';
import { sendMessageSchema } from '@/lib/validators/chat';
import { Types } from 'mongoose';

function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z][a-zA-Z0-9_]{4,31})/g) || [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#(\w{2,64})/g) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { chatId } = await params;
  await connectDB();

  const access = await getChatForMember(chatId, String(ctx.user._id));
  if (!access) return Response.json({ error: 'Chat not found' }, { status: 404 });

  const before = req.nextUrl.searchParams.get('before');
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 50), 100);

  const query: Record<string, unknown> = {
    chatId,
    isSent: true,
    $or: [{ scheduledFor: { $exists: false } }, { scheduledFor: { $lte: new Date() } }],
  };
  if (before && Types.ObjectId.isValid(before)) {
    query._id = { $lt: new Types.ObjectId(before) };
  }

  const messages = await Message.find(query)
    .sort({ _id: -1 })
    .limit(limit)
    .populate('fileIds')
    .populate('senderId', 'username displayName avatarFileId')
    .lean();

  return Response.json({ messages: messages.reverse(), hasMore: messages.length === limit });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { chatId } = await params;
  await connectDB();

  const access = await getChatForMember(chatId, String(ctx.user._id));
  if (!access) return Response.json({ error: 'Chat not found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { text, replyToMessageId, forwardedFromMessageId, fileIds, silent, scheduledFor } = parsed.data;

  if (!text && (!fileIds || fileIds.length === 0) && !forwardedFromMessageId) {
    return Response.json({ error: 'Message must have text or attachments' }, { status: 400 });
  }

  const lastMessage = await Message.findOne({ chatId, senderId: ctx.user._id }).sort({ createdAt: -1 });
  if (isSlowModeBlocked(access.chat, access.member, lastMessage?.createdAt)) {
    return Response.json({ error: 'Slow mode is active. Please wait before sending again.' }, { status: 429 });
  }

  if (access.chat.type === 'channel' && !hasRoleAtLeast(access.member, 'admin')) {
    return Response.json({ error: 'Only channel admins can post. Subscribers can view but not send.' }, { status: 403 });
  }

  let mentionUserIds: Types.ObjectId[] = [];
  let hashtags: string[] = [];
  let forwardedFromChatId: Types.ObjectId | undefined;
  let forwardedFromUserId: Types.ObjectId | undefined;
  let finalText = text;
  let finalFileIds = fileIds || [];

  if (forwardedFromMessageId) {
    const original = await Message.findById(forwardedFromMessageId);
    if (!original) return Response.json({ error: 'Original message not found' }, { status: 404 });
    finalText = finalText || original.text;
    finalFileIds = finalFileIds.length ? finalFileIds : original.fileIds.map(String);
    forwardedFromChatId = original.chatId;
    forwardedFromUserId = original.senderId;
  }

  if (finalText) {
    const usernames = extractMentions(finalText);
    hashtags = extractHashtags(finalText);
    if (usernames.length) {
      const mentioned = await User.find({ username: { $in: usernames } }, { _id: 1 });
      mentionUserIds = mentioned.map((u) => u._id);
    }
  }

  const isScheduled = scheduledFor && new Date(scheduledFor) > new Date();

  const message = await Message.create({
    chatId,
    senderId: ctx.user._id,
    text: finalText,
    fileIds: finalFileIds,
    replyToMessageId,
    forwardedFromMessageId,
    forwardedFromChatId,
    forwardedFromUserId,
    mentions: mentionUserIds,
    hashtags,
    isSilent: silent,
    scheduledFor: isScheduled ? new Date(scheduledFor) : undefined,
    isSent: !isScheduled,
    deliveredTo: [ctx.user._id],
    readBy: [ctx.user._id],
  });

  if (finalFileIds.length) {
    await File.updateMany({ _id: { $in: finalFileIds } }, { isOrphaned: false, $inc: { refCount: 1 } });
  }

  if (!isScheduled) {
    await Chat.updateOne({ _id: chatId }, { lastMessageId: message._id, lastMessageAt: message.createdAt });

    const recipientIds = access.chat.members
      .map((m) => String(m.userId))
      .filter((id) => id !== String(ctx.user._id));

    const notifTargets = new Set<string>(mentionUserIds.map(String));
    if (access.chat.type === 'direct') {
      recipientIds.forEach((id) => notifTargets.add(id));
    }

    if (notifTargets.size && !silent) {
      await Notification.insertMany(
        Array.from(notifTargets).map((userId) => ({
          userId,
          type: mentionUserIds.map(String).includes(userId) ? 'mention' : 'message',
          actorId: ctx.user._id,
          chatId,
          messageId: message._id,
          text: `${ctx.user.displayName}: ${finalText?.slice(0, 80) || 'sent an attachment'}`,
        })),
      );
    }
  }

  const populated = await Message.findById(message._id)
    .populate('fileIds')
    .populate('senderId', 'username displayName avatarFileId');

  return Response.json({ message: populated }, { status: 201 });
}
