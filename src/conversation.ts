import { generateText, type CoreMessage } from 'ai';
import { model } from './provider.js';
import { lookupProperty, checkAvailability } from './tools.js';
import { logTurn } from './logger/conversationLogger.js';

const SYSTEM_PROMPT = `You are a professional property agent assistant based in Singapore.
You help the agent manage WhatsApp messages from potential buyers and tenants.
Your job is to respond in a warm, helpful, and concise manner — the way a good agent would reply on WhatsApp.
Keep replies short (2-4 sentences max) unless the client asks for detailed information.
Always use the available tools to look up accurate property data before answering.
If you don't have enough information to answer, ask one clarifying question.`;

export class Conversation {
  private messages: CoreMessage[] = [];

  constructor(private readonly sessionId: string) {}

  async send(userMessage: string): Promise<string> {
    await logTurn(this.sessionId, 'user', userMessage);
    this.messages.push({ role: 'user', content: userMessage });

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: this.messages,
      tools: { lookupProperty, checkAvailability },
      maxSteps: 5,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'property-agent',
        metadata: { sessionId: this.sessionId },
      },
    });

    // Append everything the model produced (tool calls + results + final assistant text).
    // Using result.response.messages preserves intermediate tool call/result pairs in
    // the history so the model won't re-lookup things it already knows next turn.
    this.messages.push(...result.response.messages);

    await logTurn(this.sessionId, 'agent', result.text);
    return result.text;
  }

  reset(): void {
    this.messages = [];
  }

  get length(): number {
    return this.messages.length;
  }
}
