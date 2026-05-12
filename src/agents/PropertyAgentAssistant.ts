import { Agent, type AgentConfig } from '../core/Agent.js';
import { model } from '../provider.js';
import { lookupProperty, checkAvailability } from '../tools.js';

export class PropertyAgentAssistant extends Agent {
  readonly name = 'PropertyAgentAssistant';

  protected readonly systemPrompt = `You are a professional property agent assistant based in Singapore.
You help the agent manage WhatsApp messages from potential buyers and tenants.
Your job is to respond in a warm, helpful, and concise manner — the way a good agent would reply on WhatsApp.
Keep replies short (2-4 sentences max) unless the client asks for detailed information.
Always use the available tools to look up accurate property data before answering.
If you don't have enough information to answer, ask one clarifying question.`;

  protected readonly tools = { lookupProperty, checkAvailability };
}

export function createPropertyAgentAssistant(
  sessionId: string,
  config?: AgentConfig,
): PropertyAgentAssistant {
  return new PropertyAgentAssistant(model, sessionId, config);
}
