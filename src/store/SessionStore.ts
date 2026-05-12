import type { CoreMessage } from 'ai';

export interface SessionStore {
  load(sessionId: string): Promise<CoreMessage[]>;
  save(sessionId: string, messages: CoreMessage[]): Promise<void>;
  delete(sessionId: string): Promise<void>;
}
