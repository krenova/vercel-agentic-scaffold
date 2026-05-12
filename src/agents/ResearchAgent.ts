import { Agent, type AgentConfig } from '../core/Agent.js';
import { model } from '../provider.js';
import { braveSearch } from '../tools/braveSearch.js';
import { fetchPage } from '../tools/fetchPage.js';

/**
 * A general-purpose web research agent.
 *
 * Uses Brave Search to discover relevant pages and @mozilla/readability to extract
 * clean content from those pages. Always cites sources in its responses.
 *
 * Tool call pattern per query:
 *   braveSearch(query) → inspect results → fetchPage(url) → synthesise → respond
 *
 * Uses maxSteps: 10 to allow multi-round search → read → refine cycles.
 */
export class ResearchAgent extends Agent {
  readonly name = 'ResearchAgent';

  protected readonly systemPrompt = `You are a thorough and accurate research assistant.
Your job is to find, read, and synthesise information from the web to answer questions.

Guidelines:
- Always use braveSearch first to find relevant pages — never answer from memory alone.
- After getting search results, use fetchPage on the most relevant URLs to read the actual content.
- If the first search results are insufficient, refine your query and search again.
- Always include the source URL when citing a fact.
- Keep responses structured: use bullet points for lists of facts, prose for synthesis.
- Be honest when information is incomplete or conflicting across sources.`;

  protected readonly tools = { braveSearch, fetchPage };
}

/**
 * Factory function for creating a `ResearchAgent`.
 *
 * @param sessionId  Unique identifier for this research session (used for logging and tracing).
 * @param config     Optional Agent config. Defaults: historyMode 'full', maxSteps 10.
 */
export function createResearchAgent(
  sessionId: string,
  config?: AgentConfig,
): ResearchAgent {
  return new ResearchAgent(model, sessionId, { maxSteps: 10, ...config });
}
