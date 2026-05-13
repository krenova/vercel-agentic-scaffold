import 'dotenv/config';
import { createOrchestrator } from '../agents/OrchestratorAgent.js';
import { makeSessionId, startAgentRepl } from './lib.js';

const sessionId = makeSessionId('orchestrator');
const agent = createOrchestrator(sessionId);

console.log(`\n=== Orchestrator REPL — Session: ${sessionId} ===\n`);
console.log(`Variables in scope:`);
console.log(`  agent      — OrchestratorAgent instance`);
console.log(`  sessionId  — current session ID`);
console.log(`  save()     — export full history to logs/exports/\n`);
console.log(`Examples:`);
console.log(`  await agent.send("I'm looking for a 3-bedroom condo in Singapore under $2M. What do you have?")`);
console.log(`  await agent.send("Can I arrange a viewing for P001 this Saturday at 2pm?")`);
console.log(`  await agent.send("What are rental yields like for condos in Bukit Timah vs Tampines?")`);
console.log(`  await agent.send("I'm a Singapore PR buying my second property at $1.5M — calculate my ABSD and draft a WhatsApp message to the seller")`);
console.log(`  agent.history.filter(m => m.role === 'tool')  // tool calls only`);
console.log(`  agent.length                                   // message count`);
console.log(`  save()                                         // export to JSON`);
console.log(`  await agent.reset()                            // clear history`);
console.log(`\nType .quit to flush Langfuse traces and exit.\n`);

startAgentRepl({ prompt: 'orchestrator> ', sessionId, agent });
