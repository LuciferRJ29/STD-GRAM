import { nanoid } from 'nanoid';
import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getChatForMember, hasRoleAtLeast } from '@/lib/services/chatAccess';

/** Generates (or rotates) the group's invite link. Admin+ only. */
export async function POST(_req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { groupId } = await params;
  await connectDB();

  const access = await getChatForMember(groupId, String(ctx.user._id));
  if (!access || !['group','channel'].includes(access.chat.type)) return Response.json({ error: 'Group not found' }, { status: 404 });
  if (!hasRoleAtLeast(access.member, 'admin')) {
    return Response.json({ error: 'Admin role required' }, { status: 403 });
  }

  access.chat.inviteCode = nanoid(12);
  await access.chat.save();

  return Response.json({
    inviteCode: access.chat.inviteCode,
    inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/join/${access.chat.inviteCode}`,
  });
}
