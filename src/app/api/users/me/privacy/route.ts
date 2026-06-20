import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/models';
import { updatePrivacySchema } from '@/lib/validators/user';

export async function PATCH(req: Request) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = updatePrivacySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 });
  }

  await connectDB();
  const updates: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value) updates[`privacy.${key}`] = value;
  }

  await User.updateOne({ _id: ctx.user._id }, { $set: updates });
  return Response.json({ message: 'Privacy settings updated' });
}
