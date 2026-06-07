import { tool, type CoreTool } from 'ai';
import { z } from 'zod';
import { Agent, type AgentConfig } from '../core/Agent.js';
import type { AgentModel } from '../core/AgentModel.js';
import { defaultAgentModel } from '../provider.js';
import { createPropertyAgentAssistant } from './PropertyAgentAssistant.js';
import { createResearchAgent } from './ResearchAgent.js';
import { createSchedulingAgent } from './SchedulingAgent.js';
import { createComplianceAgent } from './ComplianceAgent.js';
import { createMarketAnalysisAgent } from './MarketAnalysisAgent.js';
import { createSynthesizer } from './SynthesizerAgent.js';

interface SpecialistRegistry {
  property: ReturnType<typeof createPropertyAgentAssistant>;
  research: ReturnType<typeof createResearchAgent>;
  scheduling: ReturnType<typeof createSchedulingAgent>;
  compliance: ReturnType<typeof createComplianceAgent>;
  marketAnalysis: ReturnType<typeof createMarketAnalysisAgent>;
  synthesizer: ReturnType<typeof createSynthesizer>;
}

function delegateTo(agent: Agent, description: string): CoreTool {
  return tool({
    description,
    parameters: z.object({
      message: z.string().describe('The user message to forward to this specialist'),
    }),
    execute: async ({ message }) => agent.send(message),
  });
}

export class OrchestratorAgent extends Agent {
  readonly name = 'OrchestratorAgent';
  protected readonly systemPrompt: string;
  protected readonly tools: Record<string, CoreTool>;

  constructor(
    agentModel: AgentModel,
    sessionId: string,
    specialists: SpecialistRegistry,
    config?: AgentConfig,
  ) {
    super(agentModel, sessionId, {
      historyMode: 'text-only',
      maxSteps: 10,
      maxHistoryTurns: 20,
      ...config,
    });

    this.systemPrompt = `You are a personal assistant to a Singapore property agent, managing WhatsApp conversations.
Today's date is ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.

You receive messages from clients (buyers, tenants) or the agent themselves.
Your job is to gather the right information from specialist agents and hand it to composeReply.

Specialists available:
- askPropertyAssistant  — specific listings, prices, bedrooms, location, features, viewing availability, travel time between two Singapore locations
- askSchedulingAgent    — book, reschedule, or cancel viewing appointments; confirm time slots
- askComplianceAgent    — ABSD, BSD, stamp duty, CPF usage, HDB eligibility, TDSR/LTV loan rules
- askMarketAnalysis     — price trends, rental yields, investment returns, district comparisons
- askResearchAgent      — general web research not covered by the specialists above

Workflow — follow this for every message:
1. Identify all specialists needed to fully answer the message.
2. Call independent specialists in parallel (same step). Call dependent ones sequentially.
3. Never call the same specialist twice in one turn.
4. Once you have all results, call composeReply — ALWAYS, even for a single specialist.
   Pass the original user question and a clear summary of all specialist results,
   labelled by specialist name.
5. Output ONLY the exact text returned by composeReply. Add nothing.`;

    this.tools = {
      askPropertyAssistant: delegateTo(
        specialists.property,
        'Answer questions about specific property listings: price, number of bedrooms, location, property type, and features. Also use for checking viewing availability, or estimating travel time / commute time between two Singapore locations.',
      ),
      askSchedulingAgent: delegateTo(
        specialists.scheduling,
        'Book, reschedule, or cancel a property viewing appointment. Use when the client or agent wants to confirm a specific time slot, change an existing booking, or list upcoming viewings.',
      ),
      askComplianceAgent: delegateTo(
        specialists.compliance,
        'Answer Singapore property regulation questions: ABSD rates by citizenship and number of properties owned, BSD calculations, CPF usage rules for property, HDB eligibility (MOP, income ceiling, ethnic quota), and TDSR/LTV loan limits.',
      ),
      askMarketAnalysis: delegateTo(
        specialists.marketAnalysis,
        'Analyse the Singapore property market: price trends by district, HDB resale comparables, rental yield comparisons across areas, investment return estimates, and neighbourhood price benchmarks.',
      ),
      askResearchAgent: delegateTo(
        specialists.research,
        'Research general topics not covered by the other specialists: company news, economic trends, non-property regulatory matters, or any open-ended research question requiring live web search.',
      ),
      composeReply: tool({
        description:
          'ALWAYS call this as your final step once you have gathered all specialist results. Pass the original user question and a clear summary of everything the specialists provided, labelled by specialist name. This tool composes the final WhatsApp reply to send to the user.',
        parameters: z.object({
          userQuestion: z.string().describe('The exact question or message from the user'),
          gatheredInformation: z.string().describe(
            'All information gathered from specialist agents. Format clearly: one section per specialist, labelled with the specialist name.',
          ),
        }),
        execute: async ({ userQuestion, gatheredInformation }) =>
          specialists.synthesizer.send(
            `Client message: ${userQuestion}\n\nInformation gathered from specialists:\n${gatheredInformation}`,
          ),
      }),
    };
  }
}

/**
 * Factory function for creating a fully wired OrchestratorAgent.
 *
 * Instantiates all specialist agents and the synthesizer with derived session IDs,
 * then creates and returns the orchestrator with those agents injected as tools.
 *
 * @param sessionId  Root session identifier. Specialist sessions are derived as
 *                   `${sessionId}-{specialist}` so their logs remain correlated.
 * @param config     Optional overrides applied to the orchestrator (not to specialists).
 */
export function createOrchestrator(
  sessionId: string,
  config?: AgentConfig,
  agentModel: AgentModel = defaultAgentModel,
): OrchestratorAgent {
  const specialistConfig: AgentConfig | undefined = config?.store
    ? { store: config.store }
    : undefined;

  const specialists: SpecialistRegistry = {
    property:          createPropertyAgentAssistant(`${sessionId}-property`, specialistConfig, agentModel),
    research:          createResearchAgent(`${sessionId}-research`, specialistConfig, agentModel),
    scheduling:        createSchedulingAgent(`${sessionId}-scheduling`, specialistConfig, agentModel),
    compliance:        createComplianceAgent(`${sessionId}-compliance`, specialistConfig, agentModel),
    marketAnalysis:    createMarketAnalysisAgent(`${sessionId}-market`, specialistConfig, agentModel),
    synthesizer:       createSynthesizer(`${sessionId}-synthesizer`, specialistConfig, agentModel),
  };

  return new OrchestratorAgent(agentModel, sessionId, specialists, config);
}
