import { mkdir, appendFile } from 'fs/promises';
import { join } from 'path';

const LOG_DIR = join(process.cwd(), 'logs', 'conversations');

interface ConversationTurn {
  sessionId: string;
  role: 'user' | 'agent';
  message: string;
  timestamp: string;
}

async function ensureLogDir(): Promise<void> {
  await mkdir(LOG_DIR, { recursive: true });
}

export async function logTurn(
  sessionId: string,
  role: 'user' | 'agent',
  message: string,
): Promise<void> {
  await ensureLogDir();
  const entry: ConversationTurn = {
    sessionId,
    role,
    message,
    timestamp: new Date().toISOString(),
  };
  const filePath = join(LOG_DIR, `${sessionId}.jsonl`);
  await appendFile(filePath, JSON.stringify(entry) + '\n', 'utf-8');
}
