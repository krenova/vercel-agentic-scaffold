import { createAnthropic } from '@ai-sdk/anthropic';

export const minimax = createAnthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL!,
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const model = minimax('MiniMax-M2.7');
