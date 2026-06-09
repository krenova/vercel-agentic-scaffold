import type { Message } from '../core/Message.js';
import type { SessionStore } from './SessionStore.js';

export class InMemoryStore implements SessionStore {
  private readonly map = new Map<string, Message[]>();

  async load(sessionId: string): Promise<Message[]> {
    const stored = this.map.get(sessionId);
    return stored ? [...stored] : [];
  }

  async save(sessionId: string, messages: Message[]): Promise<void> {
    this.map.set(sessionId, [...messages]);
  }

  async delete(sessionId: string): Promise<void> {
    this.map.delete(sessionId);
  }
}
