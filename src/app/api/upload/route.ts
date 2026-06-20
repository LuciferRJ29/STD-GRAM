import { createHash } from 'crypto';
import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { File as FileModel, type FileKind } from '@/models';
import { storageProvider } from '@/storage';
import { rateLimit, rateLimitKey } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/auth';

const MAX_SIZE_FREE = 50 * 1024 * 1024; // 50MB
const MAX_SIZE_PREMIUM = 2 * 1024 * 1024 * 1024; // 2GB

const KIND_BY_MIME: Array<{ test: (mime: string) => boolean; kind: FileKind }> = [
  { test: (m) => m.startsWith('image/gif'), kind: 'gif' },
  { test: (m) => m.startsWith('image/'), kind: 'image' },
  { test: (m) => m.startsWith('video/'), kind: 'video' },
  { test: (m) => m === 'audio/webm' || m === 'audio/ogg', kind: 'voice' },
  { test: (m) => m.startsWith('audio/'), kind: 'audio' },
];

function detectKind(mimeType: string): FileKind {
  return KIND_BY_MIME.find((rule) => rule.test(mimeType))?.kind || 'document';
}

// Block executable/script types outright regardless of declared mime, by extension.
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.scr', '.msi', '.dll', '.com'];

export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const ip = await getClientIp();
  const limit = await rateLimit(rateLimitKey(ip, 'upload'), 30, 60_000);
  if (!limit.success) {
    return Response.json({ error: 'Upload rate limit reached. Try again shortly.' }, { status: 429 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get('file');
  if (!file || !(file instanceof Blob)) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  const originalName = 'name' in file ? (file as File).name : 'upload';
  const ext = originalName.slice(originalName.lastIndexOf('.')).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return Response.json({ error: 'This file type is not allowed' }, { status: 400 });
  }

  const maxSize = ctx.user.isPremium ? MAX_SIZE_PREMIUM : MAX_SIZE_FREE;
  if (file.size > maxSize) {
    return Response.json(
      { error: `File exceeds the ${Math.round(maxSize / (1024 * 1024))}MB limit for your account` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = createHash('sha256').update(buffer).digest('hex');

  await connectDB();

  // Deduplication: if this exact file was already uploaded by this user, reuse it.
  const existing = await FileModel.findOne({ checksum, uploaderId: ctx.user._id });
  if (existing) {
    return Response.json({ file: existing }, { status: 200 });
  }

  const mimeType = file.type || 'application/octet-stream';
  const kind = detectKind(mimeType);

  const uploadResult = await storageProvider.upload({
    buffer,
    filename: originalName,
    mimeType,
  });

  const fileDoc = await FileModel.create({
    uploaderId: ctx.user._id,
    kind,
    originalName,
    mimeType,
    sizeBytes: uploadResult.sizeBytes,
    checksum: uploadResult.checksum,
    storage: {
      provider: storageProvider.name,
      accountId: uploadResult.accountId,
      remotePath: uploadResult.remotePath,
      nodeHandle: uploadResult.nodeHandle,
    },
    isOrphaned: true,
    refCount: 0,
  });

  return Response.json({ file: fileDoc }, { status: 201 });
}
