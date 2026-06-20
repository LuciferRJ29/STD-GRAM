import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getChatForMember } from '@/lib/services/chatAccess';
import { typingSchema } from '@/lib/validators/chat';
import { publishEphemeralEvent } from '@/lib/realtime';

export async function POST(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { chatId } = await params;
  await connectDB();

  const access = await getChatForMember(chatId, String(ctx.user._id));
  if (!access) return Response.json({ error: 'Chat not found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = typingSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 });

  await publishEphemeralEvent({
    type: 'typing',
    chatId,
    userId: String(ctx.user._id),
    isTyping: parsed.data.isTyping,
  });

  return Response.json({ success: true });
}
