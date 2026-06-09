import type { Message } from '../core/Message.js';

export interface SessionStore {
  load(sessionId: string): Promise<Message[]>;
  save(sessionId: string, messages: Message[]): Promise<void>;
  delete(sessionId: string): Promise<void>;
}
