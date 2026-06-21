import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Chat } from '@/models';

/** Joins a group by invite code, or submits a join request if approval is required. */
export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const inviteCode = body?.inviteCode as string | undefined;
  if (!inviteCode) return Response.json({ error: 'inviteCode is required' }, { status: 400 });

  await connectDB();
  const chat = await Chat.findOne({ inviteCode, type: { $in: ['group', 'channel'] } });
  if (!chat) return Response.json({ error: 'Invalid or expired invite link' }, { status: 404 });

  const alreadyMember = chat.members.some((m) => String(m.userId) === String(ctx.user._id));
  if (alreadyMember) {
    return Response.json({ chatId: String(chat._id), message: 'Already a member' });
  }

  if (chat.requireJoinApproval) {
    if (!chat.pendingJoinRequests.some((id) => String(id) === String(ctx.user._id))) {
      chat.pendingJoinRequests.push(ctx.user._id);
      await chat.save();
    }
    return Response.json({ message: 'Join request submitted', pending: true });
  }

  chat.members.push({
    userId: ctx.user._id,
    role: 'member',
    joinedAt: new Date(),
    isBanned: false,
    isAnonymousAdmin: false,
  } as any);
  await chat.save();

  return Response.json({ chatId: String(chat._id), message: chat.type === 'channel' ? 'Joined channel' : 'Joined group' });
}
