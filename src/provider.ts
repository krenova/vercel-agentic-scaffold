import { createAnthropic } from '@ai-sdk/anthropic';
import { VercelAiAgentModel } from './core/adapters/VercelAiAgentModel.js';
import type { AgentModel } from './core/AgentModel.js';

export const minimax = createAnthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL!,
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export function getModel(modelName = process.env.ANTHROPIC_MODEL ?? 'MiniMax-M2.7'): AgentModel {
  return new VercelAiAgentModel(minimax(modelName));
}

export const defaultAgentModel = getModel();
export const model = defaultAgentModel;
