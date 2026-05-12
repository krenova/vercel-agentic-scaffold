import { generateText } from 'ai';
import { model } from './provider.js';
import { lookupProperty, checkAvailability } from './tools.js';

const SYSTEM_PROMPT = `You are a professional property agent assistant based in Singapore.
You help the agent manage WhatsApp messages from potential buyers and tenants.
Your job is to respond in a warm, helpful, and concise manner — the way a good agent would reply on WhatsApp.
Keep replies short (2-4 sentences max) unless the client asks for detailed information.
Always use the available tools to look up accurate property data before answering.
If you don't have enough information to answer, ask one clarifying question.`;

export async function runPropertyAgent(message: string): Promise<string> {
  const result = await generateText({
    model,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: message }],
    tools: { lookupProperty, checkAvailability },
    maxSteps: 5, // allows multi-step tool calling (tool call → result → final response)
  });

  // Log tool usage so you can see what's happening under the hood
  for (const step of result.steps) {
    for (const toolCall of step.toolCalls ?? []) {
      console.log(`  [tool call] ${toolCall.toolName}(${JSON.stringify(toolCall.args)})`);
    }
    for (const toolResult of step.toolResults ?? []) {
      console.log(`  [tool result] ${JSON.stringify(toolResult.result)}`);
    }
  }

  return result.text;
}
