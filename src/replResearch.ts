import 'dotenv/config';
import * as nodeRepl from 'node:repl';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { sdk } from './instrumentation.js';
import { createResearchAgent } from './agents/ResearchAgent.js';

const sessionId = `research-${Date.now()}`;
const agent = createResearchAgent(sessionId);
const EXPORT_DIR = join(process.cwd(), 'logs', 'exports');

/**
 * Export agent history to a JSON file under logs/exports/.
 *
 * @param label  Optional label appended to the filename (e.g. 'after-query-1').
 *               Defaults to a timestamp. Saved as:
 *               logs/exports/{sessionId}_{label}.json
 */
function save(label?: string): string {
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
}

console.log(`\n=== Research Agent REPL — Session: ${sessionId} ===\n`);
console.log(`Variables in scope:`);
console.log(`  agent      — ResearchAgent instance`);
console.log(`  sessionId  — current session ID`);
console.log(`  save()     — export full history to logs/exports/\n`);
console.log(`Examples:`);
console.log(`  await agent.send("Why has Workiva stock price fallen so much yesterday? It seems to be a company specific issue as the software industry in general did not suffer from a similar selloff.")`);
console.log(`  await agent.send("Is feraria park condominium considered a good investment? in terms of the potential capital appreciate and rental yield. what do you think of it as an investment in terms of total returns?")`);
console.log(`  agent.history                                   // full message array`);
console.log(`  agent.history.filter(m => m.role === 'tool')   // tool messages only`);
console.log(`  agent.length                                    // message count`);
console.log(`  save()                                          // export to JSON`);
console.log(`  save("after-query-1")                          // export with a label`);
console.log(`  await agent.reset()                             // clear history`);
console.log(`\nType .quit to flush Langfuse traces and exit.\n`);

const server = nodeRepl.start({
  prompt: 'research> ',
  ignoreUndefined: true,
});

server.context.agent = agent;
server.context.sessionId = sessionId;
server.context.save = save;

server.defineCommand('quit', {
  help: 'Flush Langfuse traces and exit cleanly',
  action: async () => {
    await sdk.shutdown();
    console.log(`\nSession logged → logs/conversations/${sessionId}.jsonl`);
    console.log(`Traces         → http://192.168.1.3:2999`);
    process.exit(0);
  },
});
