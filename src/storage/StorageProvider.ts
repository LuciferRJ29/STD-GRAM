/**
 * Provider-agnostic storage interface.
 *
 * Every storage backend (Mega, S3, local disk, ...) implements this
 * contract. App code (upload route, message attachments, avatars) only
 * ever talks to `StorageProvider`, never to a specific backend - so the
 * backend can be replaced later (e.g. Mega -> S3) without touching
 * anything above the storage layer.
 */

export interface UploadResult {
  accountId: string; // which underlying account/bucket stored the file
  remotePath: string; // canonical path/handle within that account
  nodeHandle?: string; // backend-specific fast-lookup handle (e.g. Mega node handle)
  sizeBytes: number;
  checksum: string; // sha256 hex digest of the file content
}

export interface DownloadHandle {
  /** A short-lived, directly fetchable URL, OR a readable stream if the backend has no signed-URL concept. */
  url?: string;
  stream?: NodeJS.ReadableStream;
  expiresAt?: Date;
}

export interface StorageProvider {
  readonly name: 'mega' | 's3' | 'local';

  /** Uploads a buffer/stream and returns where it ended up. Handles chunking internally for large files. */
  upload(params: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    onProgress?: (percent: number) => void;
  }): Promise<UploadResult>;

  /** Produces a way for the client to download the file (signed URL preferred, stream as fallback). */
  getDownloadHandle(params: { accountId: string; remotePath: string; nodeHandle?: string }): Promise<DownloadHandle>;

  /** Permanently deletes the file from the backend. */
  delete(params: { accountId: string; remotePath: string; nodeHandle?: string }): Promise<void>;

  /** Returns current health/capacity info for all underlying accounts (for monitoring dashboards). */
  getHealth(): Promise<
    Array<{ accountId: string; isHealthy: boolean; usedBytes?: number; totalBytes?: number; lastError?: string }>
  >;
}
