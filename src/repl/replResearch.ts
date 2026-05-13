import 'dotenv/config';
import { createResearchAgent } from '../agents/ResearchAgent.js';
import { makeSessionId, startAgentRepl } from './lib.js';

const sessionId = makeSessionId('research');
const agent = createResearchAgent(sessionId);

console.log(`\n=== Research Agent REPL — Session: ${sessionId} ===\n`);
console.log(`Variables in scope:`);
console.log(`  agent      — ResearchAgent instance`);
console.log(`  sessionId  — current session ID`);
console.log(`  save()     — export full history to logs/exports/\n`);
console.log(`Examples:`);
console.log(`  await agent.send("Why has Workiva stock price fallen so much yesterday?")`);
console.log(`  await agent.send("Is Ferraria Park Condominium a good investment in terms of capital appreciation and rental yield?")`);
console.log(`  await agent.send("What are current HDB resale price trends in Singapore in 2026?")`);
console.log(`  agent.history                                   // full message array`);
console.log(`  agent.history.filter(m => m.role === 'tool')   // tool messages only`);
console.log(`  agent.length                                    // message count`);
console.log(`  save()                                          // export to JSON`);
console.log(`  save("after-query-1")                          // export with a label`);
console.log(`  await agent.reset()                             // clear history`);
console.log(`\nType .quit to flush Langfuse traces and exit.\n`);

startAgentRepl({ prompt: 'research> ', sessionId, agent });
