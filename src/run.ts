import 'dotenv/config';
import { sdk } from './instrumentation.js'; // must be imported before any AI calls
import { Conversation } from './conversation.js';

const EXCHANGES = [
  "Hi, I'm looking for a 3-bedroom condo in Singapore under $2M.",
  'What about P001? Can you tell me more about it?',
  'Is it available for viewing this Saturday (2026-05-17)?',
  'What about Sunday the 18th instead?',
  'OK great. What other 3-bedroom condos do you have listed?',
];

async function main() {
  const sessionId = `session-${Date.now()}`;
  console.log(`=== WhatsApp Property Agent — Session: ${sessionId} ===\n`);

  const convo = new Conversation(sessionId);

  try {
    for (const message of EXCHANGES) {
      console.log(`CLIENT: ${message}`);
      const reply = await convo.send(message);
      console.log(`AGENT:  ${reply}`);
      console.log(`--- (${convo.length} messages in history) ---\n`);
    }
  } finally {
    // Always flush pending OTel spans to Langfuse, even if an exchange throws
    await sdk.shutdown();
    console.log(`\nSession logged → logs/conversations/${sessionId}.jsonl`);
    console.log(`Traces available → http://192.168.1.3:2999`);
  }
}

main().catch(console.error);
