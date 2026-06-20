import type { StorageProvider } from './StorageProvider';
import { megaStorageProvider } from './MegaStorageProvider';

/**
 * Single entry point the rest of the app imports from.
 * Swapping the backend later (e.g. to S3) means writing a new class that
 * implements `StorageProvider` and changing this one export - nothing
 * else in the codebase needs to change.
 */
export const storageProvider: StorageProvider = megaStorageProvider;

export * from './StorageProvider';
