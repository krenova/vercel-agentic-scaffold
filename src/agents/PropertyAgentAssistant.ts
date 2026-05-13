import { Agent, type AgentConfig } from '../core/Agent.js';
import { model } from '../provider.js';
import { lookupProperty, checkAvailability } from '../tools.js';
import { getTravelTime } from '../tools/travelTime.js';

export class PropertyAgentAssistant extends Agent {
  readonly name = 'PropertyAgentAssistant';

  protected readonly systemPrompt = `You are a property data specialist for a Singapore property agent.
Your job is to look up accurate property information using the available tools and return it as structured data.

Always use the tools to fetch property details before responding — never answer from memory.
Return factual data only: property ID, name, price, bedrooms, location, type, availability status,
travel times, and any other fields returned by the tools.
If a property is not found, state that clearly.
Do not add conversational framing, recommendations, or client-facing language — your output
will be processed by another agent before it reaches the client.`;

  protected readonly tools = { lookupProperty, checkAvailability, getTravelTime };
}

export function createPropertyAgentAssistant(
  sessionId: string,
  config?: AgentConfig,
): PropertyAgentAssistant {
  return new PropertyAgentAssistant(model, sessionId, config);
}
