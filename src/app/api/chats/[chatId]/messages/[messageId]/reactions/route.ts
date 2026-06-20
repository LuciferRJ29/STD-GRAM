import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Message, Notification } from '@/models';
import { getChatForMember } from '@/lib/services/chatAccess';
import { reactionSchema } from '@/lib/validators/chat';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string; messageId: string }> },
) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { chatId, messageId } = await params;
  await connectDB();

  const access = await getChatForMember(chatId, String(ctx.user._id));
  if (!access) return Response.json({ error: 'Chat not found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 });

  const message = await Message.findOne({ _id: messageId, chatId });
  if (!message || message.isDeleted) return Response.json({ error: 'Message not found' }, { status: 404 });

  // Toggle: same emoji from same user removes it, otherwise replace their existing reaction with the new one.
  const existingIdx = message.reactions.findIndex((r) => String(r.userId) === String(ctx.user._id));
  if (existingIdx !== -1 && message.reactions[existingIdx].emoji === parsed.data.emoji) {
    message.reactions.splice(existingIdx, 1);
  } else if (existingIdx !== -1) {
    message.reactions[existingIdx].emoji = parsed.data.emoji;
    message.reactions[existingIdx].createdAt = new Date();
  } else {
    message.reactions.push({ userId: ctx.user._id, emoji: parsed.data.emoji, createdAt: new Date() });

    if (String(message.senderId) !== String(ctx.user._id)) {
      await Notification.create({
        userId: message.senderId,
        type: 'reaction',
        actorId: ctx.user._id,
        chatId,
        messageId: message._id,
        text: `${ctx.user.displayName} reacted ${parsed.data.emoji} to your message`,
      });
    }
  }

  await message.save();
  return Response.json({ reactions: message.reactions });
}
