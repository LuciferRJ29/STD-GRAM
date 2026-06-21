import { NextRequest } from 'next/server';
import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Chat } from '@/models';

/** Discovery feed of public groups/channels the user hasn't joined yet. */
export async function GET(req: NextRequest) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const q = req.nextUrl.searchParams.get('q')?.trim();
  const kind = req.nextUrl.searchParams.get('type'); // 'group' | 'channel' | omitted = both

  await connectDB();

  const filter: Record<string, unknown> = {
    type: kind === 'group' || kind === 'channel' ? kind : { $in: ['group', 'channel'] },
    isPublic: true,
    'members.userId': { $ne: ctx.user._id },
  };
  if (q) filter.$text = { $search: q };

  const results = await Chat.find(filter).limit(30).select('name description avatarFileId members type').lean();

  return Response.json({
    groups: results.map((g) => ({
      id: String(g._id),
      type: g.type,
      name: g.name,
      description: g.description,
      avatarFileId: g.avatarFileId,
      memberCount: g.members.length,
    })),
  });
}
