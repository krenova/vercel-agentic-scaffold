import 'dotenv/config';
import { createPropertyAgentAssistant } from '../agents/PropertyAgentAssistant.js';
import { makeSessionId, startAgentRepl } from './lib.js';

const sessionId = makeSessionId('property');
const agent = createPropertyAgentAssistant(sessionId);

console.log(`\n=== Property Agent REPL — Session: ${sessionId} ===\n`);
console.log(`Variables in scope:`);
console.log(`  agent      — PropertyAgentAssistant instance`);
console.log(`  sessionId  — current session ID`);
console.log(`  save()     — export full history to logs/exports/\n`);
console.log(`Examples:`);
console.log(`  await agent.send("I'm looking for a 3-bedroom condo in Singapore under $2M")`);
console.log(`  await agent.send("Can you tell me more about P001?")`);
console.log(`  await agent.send("Is P001 available for viewing this Saturday?")`);
console.log(`  await agent.send("How long does it take to get from Tampines MRT to Orchard Road?")`);
console.log(`  await agent.send("Tell me about P002 and how far it is from Raffles Place MRT")`);
console.log(`  agent.history.filter(m => m.role === 'tool')  // tool calls only`);
console.log(`  agent.length                                   // message count`);
console.log(`  save()                                         // export to JSON`);
console.log(`  await agent.reset()                            // clear history`);
console.log(`\nType .quit to flush Langfuse traces and exit.\n`);

startAgentRepl({ prompt: 'property> ', sessionId, agent });
