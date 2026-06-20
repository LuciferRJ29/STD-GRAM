import { NextRequest } from 'next/server';
import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Notification } from '@/models';

export async function GET(req: NextRequest) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  await connectDB();
  const unreadOnly = req.nextUrl.searchParams.get('unread') === 'true';

  const filter: Record<string, unknown> = { userId: ctx.user._id };
  if (unreadOnly) filter.isRead = false;

  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  const unreadCount = await Notification.countDocuments({ userId: ctx.user._id, isRead: false });

  return Response.json({ notifications, unreadCount });
}

export async function PATCH(req: Request) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  await connectDB();

  if (body?.markAllRead) {
    await Notification.updateMany({ userId: ctx.user._id, isRead: false }, { isRead: true });
  } else if (body?.notificationId) {
    await Notification.updateOne({ _id: body.notificationId, userId: ctx.user._id }, { isRead: true });
  }

  return Response.json({ success: true });
}
