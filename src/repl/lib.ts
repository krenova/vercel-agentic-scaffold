import * as nodeRepl from 'node:repl';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { sdk } from '../instrumentation.js';
import type { Agent } from '../core/Agent.js';

const EXPORT_DIR = join(process.cwd(), 'logs', 'exports');
const LANGFUSE_URL = 'http://192.168.1.3:2999';

export function makeSessionId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

export function makeSave(sessionId: string, agent: Agent) {
  return function save(label?: string): string {
    mkdirSync(EXPORT_DIR, { recursive: true });
    const suffix = label ?? Date.now().toString();
    const filename = `${sessionId}_${suffix}.json`;
    const filepath = join(EXPORT_DIR, filename);
    const payload = {
      sessionId,
      exportedAt: new Date().toISOString(),
      messageCount: agent.length,
      history: agent.history,
    };
    writeFileSync(filepath, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`Saved → logs/exports/${filename}`);
    return filepath;
  };
}

export interface ReplOptions {
  prompt: string;
  sessionId: string;
  agent: Agent;
  extraContext?: Record<string, unknown>;
}

export function startAgentRepl(options: ReplOptions): nodeRepl.REPLServer {
  const { prompt, sessionId, agent, extraContext } = options;
  const save = makeSave(sessionId, agent);

  const server = nodeRepl.start({ prompt, ignoreUndefined: true });

  server.context.agent = agent;
  server.context.sessionId = sessionId;
  server.context.save = save;

  if (extraContext) {
    for (const [key, val] of Object.entries(extraContext)) {
      server.context[key] = val;
    }
  }

  server.defineCommand('quit', {
    help: 'Flush Langfuse traces and exit cleanly',
    action: async () => {
      await sdk.shutdown();
      console.log(`\nSession logged → logs/conversations/${sessionId}.jsonl`);
      console.log(`Traces         → ${LANGFUSE_URL}`);
      process.exit(0);
    },
  });

  return server;
}
