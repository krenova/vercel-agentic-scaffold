import 'dotenv/config';
import { sdk } from './instrumentation.js';
import { createResearchAgent } from './agents/ResearchAgent.js';

const QUERIES = [
  'What are the current HDB resale price trends in Singapore in 2026?',
  'Compare rental yields of condos in Orchard vs Tampines Singapore',
];

async function main() {
  const sessionId = `research-${Date.now()}`;
  console.log(`=== Research Agent — Session: ${sessionId} ===\n`);

  const agent = createResearchAgent(sessionId);

  try {
    for (const query of QUERIES) {
      console.log(`QUERY:  ${query}`);
      const reply = await agent.send(query);
      console.log(`AGENT:\n${reply}`);
      console.log(`--- (${agent.length} messages in history) ---\n`);
    }
  } finally {
    await sdk.shutdown();
    console.log(`\nSession logged → logs/conversations/${sessionId}.jsonl`);
    console.log(`Traces available → http://192.168.1.3:2999`);
  }
}

main().catch(console.error);
