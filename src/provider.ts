import { createAnthropic } from '@ai-sdk/anthropic';

export const minimax = createAnthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL!,
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export function getModel(modelName = process.env.ANTHROPIC_MODEL ?? 'MiniMax-M2.7') {
  return minimax(modelName);
}

export const defaultAgentModel = getModel();
export const model = defaultAgentModel;
