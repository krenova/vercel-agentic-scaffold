import type { CoreMessage } from 'ai';
import type { SessionStore } from './SessionStore.js';

// ─── Activate Redis support ────────────────────────────────────────────────
// 1. pnpm add ioredis
// 2. Uncomment the import below
// 3. Uncomment `private readonly client: Redis` and remove the stub line
// 4. Uncomment constructor body and all method bodies; delete the throw statements
// ──────────────────────────────────────────────────────────────────────────
// import Redis from 'ioredis';

export interface RedisStoreOptions {
  /** Redis connection URL. Falls back to REDIS_URL env var or redis://localhost:6379. */
  url?: string;
  /** Session key TTL in seconds. Default: 86400 (24 h). */
  ttl?: number;
}

export class RedisStore implements SessionStore {
  // private readonly client: Redis;
  private readonly url: string;
  private readonly ttl: number;

  constructor(options: RedisStoreOptions = {}) {
    this.url = options.url ?? process.env['REDIS_URL'] ?? 'redis://localhost:6379';
    this.ttl = options.ttl ?? 86_400;
    // this.client = new Redis(this.url);
  }

  async load(sessionId: string): Promise<CoreMessage[]> {
    throw new Error('RedisStore not active — run `pnpm add ioredis` and uncomment src/store/RedisStore.ts');
    // const raw = await this.client.get(`session:${sessionId}`);
    // return raw ? (JSON.parse(raw) as CoreMessage[]) : [];
  }

  async save(sessionId: string, messages: CoreMessage[]): Promise<void> {
    throw new Error('RedisStore not active — run `pnpm add ioredis` and uncomment src/store/RedisStore.ts');
    // await this.client.set(`session:${sessionId}`, JSON.stringify(messages), 'EX', this.ttl);
  }

  async delete(sessionId: string): Promise<void> {
    throw new Error('RedisStore not active — run `pnpm add ioredis` and uncomment src/store/RedisStore.ts');
    // await this.client.del(`session:${sessionId}`);
  }

  /** Call on process exit to cleanly close the Redis connection. */
  async quit(): Promise<void> {
    throw new Error('RedisStore not active — run `pnpm add ioredis` and uncomment src/store/RedisStore.ts');
    // await this.client.quit();
  }
}
