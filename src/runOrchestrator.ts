import 'dotenv/config';
import { sdk } from './instrumentation.js';
import { createOrchestrator } from './agents/OrchestratorAgent.js';

const EXCHANGES = [
  // Single-specialist messages (one domain each)
  "Hi, I'm looking for a 3-bedroom condo in Singapore under $2M. What do you have available?",
  "Can I arrange a viewing for P001 this Saturday the 16th at 2pm?",
  "What are rental yields like for condos in Bukit Timah compared to Tampines?",
  // Multi-specialist message (compliance + listing writer in parallel)
  "I'm a Singapore PR buying my second property at $1.5M. Can you calculate my ABSD, and also draft a short WhatsApp message I can send to the seller expressing serious interest?",
];

async function main() {
  const sessionId = `orchestrator-${Date.now()}`;
  console.log(`=== Property Agent Orchestrator — Session: ${sessionId} ===\n`);

  const agent = createOrchestrator(sessionId);

  try {
    for (const message of EXCHANGES) {
      console.log(`CLIENT:  ${message}`);
      const reply = await agent.send(message);
      console.log(`AGENT:\n${reply}`);
      console.log(`--- (${agent.length} messages in orchestrator history) ---\n`);
    }
  } finally {
    await sdk.shutdown();
    console.log(`\nSession logged → logs/conversations/${sessionId}.jsonl`);
    console.log(`Traces available → http://192.168.1.3:2999`);
  }
}

main().catch(console.error);
