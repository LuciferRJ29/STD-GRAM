/**
 * Manages a pool of Mega.nz accounts: connecting, rotating which account
 * receives the next upload, tracking health, and failing over to the next
 * healthy account when one errors out or is near capacity.
 *
 * Owner-provided accounts come from MEGA_ACCOUNTS env var:
 *   [{"id":"mega1","email":"...","password":"..."}, ...]
 */
import { Storage } from 'megajs';

export interface MegaAccountConfig {
  id: string;
  email: string;
  password: string;
}

interface AccountState {
  config: MegaAccountConfig;
  client: InstanceType<typeof Storage> | null;
  isHealthy: boolean;
  lastError?: string;
  usedBytes: number;
  totalBytes: number;
  activeUploads: number;
  lastUsedAt: number;
}

const MAX_PARALLEL_PER_ACCOUNT = Number(process.env.MEGA_MAX_PARALLEL_UPLOADS || 3);
const ROOT_FOLDER_NAME = process.env.MEGA_ROOT_FOLDER || 'TelegramCloneStorage';

class MegaAccountManager {
  private accounts: AccountState[] = [];
  private initPromise: Promise<void> | null = null;

  private loadConfigs(): MegaAccountConfig[] {
    try {
      const raw = process.env.MEGA_ACCOUNTS || '[]';
      const parsed = JSON.parse(raw) as MegaAccountConfig[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('MEGA_ACCOUNTS is empty - add at least one Mega account to the env var.');
      }
      return parsed;
    } catch (err) {
      throw new Error(`Failed to parse MEGA_ACCOUNTS env var: ${(err as Error).message}`);
    }
  }

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const configs = this.loadConfigs();
      this.accounts = configs.map((config) => ({
        config,
        client: null,
        isHealthy: true,
        usedBytes: 0,
        totalBytes: 0,
        activeUploads: 0,
        lastUsedAt: 0,
      }));

      // Connect accounts in parallel; failures mark the account unhealthy
      // rather than aborting startup (so other accounts still work).
      await Promise.all(this.accounts.map((acct) => this.connectAccount(acct)));
    })();

    return this.initPromise;
  }

  private async connectAccount(acct: AccountState): Promise<void> {
    try {
      const storage = new Storage({
        email: acct.config.email,
        password: acct.config.password,
        keepalive: false,
      });
      await storage.ready;
      acct.client = storage;
      acct.isHealthy = true;
      acct.usedBytes = (storage as any).spaceUsed ?? 0;
      acct.totalBytes = (storage as any).spaceTotal ?? 0;

      // Ensure root upload folder exists for this account
      const existing = Object.values(storage.root.children || {}).find(
        (n) => n.name === ROOT_FOLDER_NAME && n.directory,
      );
      if (!existing) {
        await storage.root.mkdir(ROOT_FOLDER_NAME);
      }
    } catch (err) {
      acct.isHealthy = false;
      acct.lastError = (err as Error).message;
    }
  }

  /** Picks the healthiest account with the most free space and fewest active uploads (rotation + balancing). */
  private pickAccount(excludeIds: Set<string> = new Set()): AccountState | null {
    const candidates = this.accounts.filter(
      (a) => a.isHealthy && a.client && !excludeIds.has(a.config.id) && a.activeUploads < MAX_PARALLEL_PER_ACCOUNT,
    );
    if (candidates.length === 0) return null;

    // Balance by remaining free space, then by least-recently-used for rotation.
    candidates.sort((a, b) => {
      const freeA = a.totalBytes - a.usedBytes;
      const freeB = b.totalBytes - b.usedBytes;
      if (freeB !== freeA) return freeB - freeA;
      return a.lastUsedAt - b.lastUsedAt;
    });

    return candidates[0];
  }

  private getRootFolder(client: InstanceType<typeof Storage>) {
    const folder = Object.values(client.root.children || {}).find(
      (n) => n.name === ROOT_FOLDER_NAME && n.directory,
    );
    if (!folder) throw new Error('Root upload folder missing on Mega account');
    return folder;
  }

  /**
   * Runs `fn` against a healthy account, automatically retrying on the
   * next-best account if the chosen one throws (failover).
   */
  async withAccount<T>(fn: (acct: AccountState) => Promise<T>): Promise<T> {
    await this.init();

    const tried = new Set<string>();
    let lastErr: Error | null = null;

    for (let attempt = 0; attempt < this.accounts.length; attempt++) {
      const acct = this.pickAccount(tried);
      if (!acct) break;

      tried.add(acct.config.id);
      acct.activeUploads += 1;
      acct.lastUsedAt = Date.now();

      try {
        const result = await fn(acct);
        acct.activeUploads -= 1;
        return result;
      } catch (err) {
        acct.activeUploads -= 1;
        acct.isHealthy = false;
        acct.lastError = (err as Error).message;
        lastErr = err as Error;
        // Try to reconnect this account in the background for future requests.
        this.connectAccount(acct).catch(() => undefined);
      }
    }

    throw new Error(`All Mega accounts unavailable for this operation. Last error: ${lastErr?.message}`);
  }

  getClientById(accountId: string) {
    const acct = this.accounts.find((a) => a.config.id === accountId);
    if (!acct || !acct.client) throw new Error(`Mega account ${accountId} not connected`);
    return acct.client;
  }

  getRootFolderForAccount(accountId: string) {
    const client = this.getClientById(accountId);
    return this.getRootFolder(client);
  }

  async getHealthSnapshot() {
    await this.init();
    return this.accounts.map((a) => ({
      accountId: a.config.id,
      isHealthy: a.isHealthy,
      usedBytes: a.usedBytes,
      totalBytes: a.totalBytes,
      lastError: a.lastError,
    }));
  }
}

// Singleton across the serverless function's lifetime / dev server.
declare global {
  // eslint-disable-next-line no-var
  var _megaAccountManager: MegaAccountManager | undefined;
}

export const megaAccountManager: MegaAccountManager =
  global._megaAccountManager || (global._megaAccountManager = new MegaAccountManager());
