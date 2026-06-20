import { NextRequest } from 'next/server';
import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User, Chat, Message, File as FileModel } from '@/models';

/** Global search across users, chats/groups, messages, and media filenames. */
export async function GET(req: NextRequest) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const q = req.nextUrl.searchParams.get('q')?.trim();
  const scope = req.nextUrl.searchParams.get('scope'); // optional: users|chats|messages|media
  if (!q) return Response.json({ users: [], chats: [], messages: [], media: [] });

  await connectDB();
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const myChatIds = (await Chat.find({ 'members.userId': ctx.user._id }, { _id: 1 }).lean()).map((c) => c._id);

  const [users, chats, messages, media] = await Promise.all([
    !scope || scope === 'users'
      ? User.find({ _id: { $ne: ctx.user._id }, $or: [{ username: regex }, { displayName: regex }] })
          .limit(15)
          .select('username displayName avatarFileId isVerified')
          .lean()
      : [],
    !scope || scope === 'chats'
      ? Chat.find({ _id: { $in: myChatIds }, name: regex }).limit(15).select('name type avatarFileId').lean()
      : [],
    !scope || scope === 'messages'
      ? Message.find({ chatId: { $in: myChatIds }, isDeleted: false, text: regex })
          .limit(30)
          .sort({ createdAt: -1 })
          .select('chatId senderId text createdAt')
          .lean()
      : [],
    !scope || scope === 'media'
      ? FileModel.find({ uploaderId: ctx.user._id, originalName: regex }).limit(20).lean()
      : [],
  ]);

  return Response.json({ users, chats, messages, media });
}
