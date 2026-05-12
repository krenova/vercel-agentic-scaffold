import 'dotenv/config';
import { Conversation } from './conversation.js';

const EXCHANGES = [
  "Hi, I'm looking for a 3-bedroom condo in Singapore under $2M.",
  'What about P001? Can you tell me more about it?',
  'Is it available for viewing this Saturday (2026-05-17)?',
  'What about Sunday the 18th instead?',
  'OK great. What other 3-bedroom condos do you have listed?',
];

async function main() {
  console.log('=== WhatsApp Property Agent — Multi-Turn Conversation ===\n');
  const convo = new Conversation();

  for (const message of EXCHANGES) {
    console.log(`CLIENT: ${message}`);
    const reply = await convo.send(message);
    console.log(`AGENT:  ${reply}`);
    console.log(`--- (${convo.length} messages in history) ---\n`);
  }
}

main().catch(console.error);
