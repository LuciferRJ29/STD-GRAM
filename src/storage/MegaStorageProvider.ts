import { createHash } from 'crypto';
import { File as MegaFile } from 'megajs';
import { megaAccountManager } from './MegaAccountManager';
import type { DownloadHandle, StorageProvider, UploadResult } from './StorageProvider';

const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB chunks for resumable-style progress reporting

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export class MegaStorageProvider implements StorageProvider {
  readonly name = 'mega' as const;

  async upload(params: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    onProgress?: (percent: number) => void;
  }): Promise<UploadResult> {
    const { buffer, filename, onProgress } = params;
    const checksum = sha256(buffer);

    const result = await megaAccountManager.withAccount(async (acct) => {
      if (!acct.client) throw new Error('Mega client not connected');
      const folder = (await import('./MegaAccountManager')).megaAccountManager.getRootFolderForAccount(
        acct.config.id,
      );

      // megajs exposes an upload stream; we feed it in chunks so we can
      // report progress and keep memory usage bounded for large files.
      const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
      const uploadStream = folder.upload({ name: safeName, size: buffer.length });

      let uploaded = 0;
      for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
        const chunk = buffer.subarray(offset, Math.min(offset + CHUNK_SIZE, buffer.length));
        uploadStream.write(chunk);
        uploaded += chunk.length;
        onProgress?.(Math.round((uploaded / buffer.length) * 100));
      }
      uploadStream.end();

      const node = await new Promise<InstanceType<typeof MegaFile>>((resolve, reject) => {
        uploadStream.on('complete', (n: InstanceType<typeof MegaFile>) => resolve(n));
        uploadStream.on('error', reject);
      });

      return {
        accountId: acct.config.id,
        remotePath: `${folder.name}/${safeName}`,
        nodeHandle: node.nodeId,
        sizeBytes: buffer.length,
        checksum,
      };
    });

    return result;
  }

  async getDownloadHandle(params: {
    accountId: string;
    remotePath: string;
    nodeHandle?: string;
  }): Promise<DownloadHandle> {
    const client = megaAccountManager.getClientById(params.accountId);
    if (!params.nodeHandle) {
      throw new Error('Mega download requires a node handle');
    }

    // megajs nodes can produce a temporary, signed download link.
    const node = client.root.children
      ? this.findNodeByHandle(client.root, params.nodeHandle)
      : null;
    if (!node) throw new Error('File not found on Mega account');

    const url: string = await new Promise((resolve, reject) => {
      node.link((err: Error | null, link: string) => {
        if (err) reject(err);
        else resolve(link);
      });
    });

    return { url, expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000) }; // links practically don't expire, but we cache-bust every 6h
  }

  async delete(params: { accountId: string; remotePath: string; nodeHandle?: string }): Promise<void> {
    const client = megaAccountManager.getClientById(params.accountId);
    if (!params.nodeHandle) return;
    const node = this.findNodeByHandle(client.root, params.nodeHandle);
    if (node) {
      await new Promise<void>((resolve, reject) => {
        node.delete(true, (err: Error | null) => (err ? reject(err) : resolve()));
      });
    }
  }

  async getHealth() {
    return megaAccountManager.getHealthSnapshot();
  }

  // megajs doesn't index by handle directly from JS objects in all versions;
  // walk the tree once (folders are shallow: root -> app root folder -> files).
  private findNodeByHandle(root: any, handle: string): any {
    const stack = [root];
    while (stack.length) {
      const node = stack.pop();
      if (!node) continue;
      if (node.nodeId === handle) return node;
      if (node.children) stack.push(...Object.values(node.children));
    }
    return null;
  }
}

export const megaStorageProvider = new MegaStorageProvider();
