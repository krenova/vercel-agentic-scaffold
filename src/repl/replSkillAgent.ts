import 'dotenv/config';
import { defaultAgentModel } from '../provider.js';
import { SkillLoader } from '../core/SkillLoader.js';
import { SkillAgent } from '../core/SkillAgent.js';
import { lookupProperty, checkAvailability } from '../tools.js';
import { fetchPage } from '../tools/fetchPage.js';
import { makeSessionId, startAgentRepl } from './lib.js';

const sessionId = makeSessionId('skills');
const skills = await SkillLoader.loadAll();

const agent = new SkillAgent(defaultAgentModel, sessionId, {
  name: 'SkillAgent',
  basePrompt: 'You are a property assistant for a Singapore agency.',
  skills,
  tools: { lookupProperty, checkAvailability, fetchPage },
  allowSkillManagement: true,
  config: { maxSteps: 50 },
});

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

startAgentRepl({ prompt: 'skills> ', sessionId, agent, extraContext: { skills } });
