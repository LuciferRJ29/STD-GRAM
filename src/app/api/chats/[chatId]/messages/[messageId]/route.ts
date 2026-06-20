import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Message } from '@/models';
import { getChatForMember, hasRoleAtLeast } from '@/lib/services/chatAccess';
import { editMessageSchema } from '@/lib/validators/chat';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ chatId: string; messageId: string }> },
) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { chatId, messageId } = await params;
  await connectDB();

  const access = await getChatForMember(chatId, String(ctx.user._id));
  if (!access) return Response.json({ error: 'Chat not found' }, { status: 404 });

  const message = await Message.findOne({ _id: messageId, chatId });
  if (!message || message.isDeleted) return Response.json({ error: 'Message not found' }, { status: 404 });
  if (String(message.senderId) !== String(ctx.user._id)) {
    return Response.json({ error: 'You can only edit your own messages' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = editMessageSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 });

  message.text = parsed.data.text;
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();

  return Response.json({ message });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ chatId: string; messageId: string }> },
) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { chatId, messageId } = await params;
  await connectDB();

  const access = await getChatForMember(chatId, String(ctx.user._id));
  if (!access) return Response.json({ error: 'Chat not found' }, { status: 404 });

  const message = await Message.findOne({ _id: messageId, chatId });
  if (!message || message.isDeleted) return Response.json({ error: 'Message not found' }, { status: 404 });

  const isOwner = String(message.senderId) === String(ctx.user._id);
  const canModerate = hasRoleAtLeast(access.member, 'moderator');
  if (!isOwner && !canModerate) {
    return Response.json({ error: 'Not allowed to delete this message' }, { status: 403 });
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.text = undefined;
  await message.save();

  return Response.json({ message: 'Message deleted' });
}
