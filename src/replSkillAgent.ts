import 'dotenv/config';
import * as nodeRepl from 'node:repl';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { sdk } from './instrumentation.js';
import { model } from './provider.js';
import { SkillLoader } from './core/SkillLoader.js';
import { SkillAgent } from './core/SkillAgent.js';
import { lookupProperty, checkAvailability } from './tools.js';
import { fetchPage } from './tools/fetchPage.js';

const sessionId = `skills-${Date.now()}`;
const EXPORT_DIR = join(process.cwd(), 'logs', 'exports');

const skills = await SkillLoader.loadAll();

const agent = new SkillAgent(model, sessionId, {
  name: 'SkillAgent',
  basePrompt: 'You are a property assistant for a Singapore agency.',
  skills,
  tools: { lookupProperty, checkAvailability, fetchPage },
  allowSkillManagement: true,
  config: { maxSteps: 50 }
});

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

console.log(`\n=== Skill Agent REPL — Session: ${sessionId} ===\n`);
if (skills.length === 0) {
  console.log(`No skills loaded. Add .md files to the skills/ directory.\n`);
} else {
  console.log(`Loaded skills (${skills.length}):`);
  for (const s of skills) console.log(`  • ${s.name}  (${s.fileName})`);
  console.log();
}
console.log(`Variables in scope:`);
console.log(`  agent      — SkillAgent instance (allowSkillManagement: true)`);
console.log(`  skills     — array of loaded Skill objects`);
console.log(`  sessionId  — current session ID`);
console.log(`  save()     — export full history to logs/exports/\n`);
console.log(`Examples:`);
console.log(`  await agent.send("Find a 3-bedroom condo in Bukit Timah under $2M")`);
console.log(`  await agent.send("Update the client communication skill to always mention viewing slots")`);
console.log(`  await agent.send("Create a skill for navigating the URA website")`);
console.log(`  skills                                          // loaded skill list`);
console.log(`  agent.history.filter(m => m.role === 'tool')  // tool calls only`);
console.log(`  save("after-skill-update")                     // export history`);
console.log(`\nType .quit to flush Langfuse traces and exit.\n`);

const server = nodeRepl.start({
  prompt: 'skills> ',
  ignoreUndefined: true,
});

server.context.agent = agent;
server.context.skills = skills;
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
