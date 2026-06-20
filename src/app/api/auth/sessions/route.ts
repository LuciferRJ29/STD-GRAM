import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Session, Device } from '@/models';

export async function GET() {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  await connectDB();
  const sessions = await Session.find({ userId: ctx.user._id, isRevoked: false })
    .sort({ lastActiveAt: -1 })
    .populate('deviceId')
    .lean();

  return Response.json({
    sessions: sessions.map((s) => ({
      id: String(s._id),
      isCurrent: String(s._id) === ctx.sessionId,
      device: (s.deviceId as any)?.name || 'Unknown device',
      ip: s.ip,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      rememberMe: s.rememberMe,
    })),
  });
}
