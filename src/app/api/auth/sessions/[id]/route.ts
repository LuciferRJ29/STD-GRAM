import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Session } from '@/models';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { id } = await params;
  await connectDB();

  const session = await Session.findOne({ _id: id, userId: ctx.user._id });
  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  session.isRevoked = true;
  await session.save();

  return Response.json({ success: true });
}
