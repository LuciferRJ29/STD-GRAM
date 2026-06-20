import { NextRequest } from 'next/server';
import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Chat } from '@/models';

/** Discovery feed of public groups the user hasn't joined yet. */
export async function GET(req: NextRequest) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const q = req.nextUrl.searchParams.get('q')?.trim();
  await connectDB();

  const filter: Record<string, unknown> = {
    type: 'group',
    isPublic: true,
    'members.userId': { $ne: ctx.user._id },
  };
  if (q) filter.$text = { $search: q };

  const groups = await Chat.find(filter).limit(30).select('name description avatarFileId members').lean();

  return Response.json({
    groups: groups.map((g) => ({
      id: String(g._id),
      name: g.name,
      description: g.description,
      avatarFileId: g.avatarFileId,
      memberCount: g.members.length,
    })),
  });
}
