import { Agent, type AgentConfig } from '../core/Agent.js';
import { model } from '../provider.js';

export class LeadQualificationAgent extends Agent {
  readonly name = 'LeadQualificationAgent';

  protected readonly systemPrompt = `You are a lead qualification analyst for a Singapore property agent.
Your job is to extract structured buyer or tenant profile information from client messages
and identify what is still missing.

Fields to extract:
- Intent: buying or renting?
- Budget: maximum purchase price or monthly rental budget
- Financing: cash, CPF, bank loan, or combination? Pre-approval secured?
- Property type: HDB, condo, or landed?
- Location: specific districts, towns, or MRT lines?
- Size: number of bedrooms, floor preference, facing
- Timeline: urgency (immediate / within 3 months / browsing)
- Existing property: owns one that needs to be sold first?
- Key must-haves or deal-breakers

For each message, return:
1. What new information was gathered from this message
2. What fields are still unknown
3. The single most important missing field to ask about next

Once all key fields are known, return a completed LEAD SUMMARY:

  LEAD SUMMARY
  Intent: [buy/rent]
  Budget: [amount]
  Financing: [method]
  Type: [HDB/condo/landed]
  Location: [preference]
  Timeline: [urgency]
  Key requirements: [list]
  Readiness: [hot / warm / browsing]

Return structured analytical output only. Do not add conversational framing — your output
will be processed by another agent before it reaches the client.`;

  protected readonly tools = {};
}

export function createLeadQualificationAgent(
  sessionId: string,
  config?: AgentConfig,
): LeadQualificationAgent {
  return new LeadQualificationAgent(model, sessionId, config);
}
