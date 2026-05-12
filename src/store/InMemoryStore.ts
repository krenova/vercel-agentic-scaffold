import type { CoreMessage } from 'ai';
import type { SessionStore } from './SessionStore.js';

export class InMemoryStore implements SessionStore {
  private readonly map = new Map<string, CoreMessage[]>();

  async load(sessionId: string): Promise<CoreMessage[]> {
    const stored = this.map.get(sessionId);
    return stored ? [...stored] : [];
  }

  async save(sessionId: string, messages: CoreMessage[]): Promise<void> {
    this.map.set(sessionId, [...messages]);
  }

  async delete(sessionId: string): Promise<void> {
    this.map.delete(sessionId);
  }
}
