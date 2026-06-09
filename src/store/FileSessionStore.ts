import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Message } from '../core/Message.js';
import type { SessionStore } from './SessionStore.js';

export interface FileSessionStoreOptions {
  dir?: string;
}

export class FileSessionStore implements SessionStore {
  private readonly dir: string;

  constructor(options: FileSessionStoreOptions = {}) {
    this.dir = options.dir ?? join(process.cwd(), 'logs', 'sessions');
  }

  async load(sessionId: string): Promise<Message[]> {
    try {
      const raw = await readFile(this.pathFor(sessionId), 'utf-8');
      const parsed = JSON.parse(raw) as Message[];
      return Array.isArray(parsed) ? [...parsed] : [];
    } catch (err) {
      if (this.isNotFound(err)) return [];
      throw err;
    }
  }

  async save(sessionId: string, messages: Message[]): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.pathFor(sessionId), JSON.stringify(messages, null, 2), 'utf-8');
  }

  async delete(sessionId: string): Promise<void> {
    await rm(this.pathFor(sessionId), { force: true });
  }

  private pathFor(sessionId: string): string {
    return join(this.dir, `${Buffer.from(sessionId).toString('base64url')}.json`);
  }

  private isNotFound(err: unknown): boolean {
    return err instanceof Error && 'code' in err && err.code === 'ENOENT';
  }
}
