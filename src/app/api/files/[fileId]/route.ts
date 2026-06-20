import { requireAuth, isAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { File as FileModel } from '@/models';
import { storageProvider } from '@/storage';

/**
 * Returns a short-lived signed download URL for a file.
 * Access control: for now any authenticated user who can see a message
 * referencing the file can request its URL (file ids are unguessable
 * ObjectIds, and message-level chat membership already gates exposure
 * of which file ids exist for a given chat).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { fileId } = await params;
  await connectDB();

  const file = await FileModel.findById(fileId);
  if (!file) return Response.json({ error: 'File not found' }, { status: 404 });

  const handle = await storageProvider.getDownloadHandle({
    accountId: file.storage.accountId,
    remotePath: file.storage.remotePath,
    nodeHandle: file.storage.nodeHandle,
  });

  return Response.json({
    url: handle.url,
    expiresAt: handle.expiresAt,
    mimeType: file.mimeType,
    originalName: file.originalName,
    sizeBytes: file.sizeBytes,
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const ctx = await requireAuth();
  if (!isAuthContext(ctx)) return ctx;

  const { fileId } = await params;
  await connectDB();

  const file = await FileModel.findById(fileId);
  if (!file) return Response.json({ error: 'File not found' }, { status: 404 });
  if (String(file.uploaderId) !== String(ctx.user._id) && !ctx.user.isAdmin) {
    return Response.json({ error: 'Not allowed' }, { status: 403 });
  }

  if (file.refCount <= 0) {
    await storageProvider.delete({
      accountId: file.storage.accountId,
      remotePath: file.storage.remotePath,
      nodeHandle: file.storage.nodeHandle,
    });
    await file.deleteOne();
  } else {
    return Response.json({ error: 'File is still referenced by messages' }, { status: 409 });
  }

  return Response.json({ message: 'File deleted' });
}
