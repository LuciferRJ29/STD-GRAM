import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Message } from '@/models';
import { getChatForMember } from '@/lib/services/chatAccess';
import { publishEphemeralEvent } from '@/lib/realtime';

export async function POST(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { chatId } = await params;
  await connectDB();

  const access = await getChatForMember(chatId, String(ctx.user._id));
  if (!access) return Response.json({ error: 'Chat not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const messageId = body?.messageId;

  const filter: Record<string, unknown> = { chatId, readBy: { $ne: ctx.user._id } };
  if (messageId) filter._id = { $lte: messageId };

  await Message.updateMany(filter, {
    $addToSet: { readBy: ctx.user._id, deliveredTo: ctx.user._id },
  });

  access.member.lastReadMessageId = messageId || access.chat.lastMessageId;
  access.member.lastReadAt = new Date();
  await access.chat.save();

  await publishEphemeralEvent({
    type: 'chat:read',
    chatId,
    userId: String(ctx.user._id),
    messageId: messageId || String(access.chat.lastMessageId || ''),
  });

  return Response.json({ success: true });
}
