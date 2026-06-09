import type { z } from 'zod';
import type { Message } from './Message.js';

export interface ToolExecutionOptions {
  toolCallId: string;
  messages: Message[];
  abortSignal?: AbortSignal;
}

export interface Tool<Parameters extends z.ZodTypeAny = z.ZodTypeAny, Result = unknown> {
  description?: string;
  parameters: Parameters;
  execute?: (
    args: z.infer<Parameters>,
    options: ToolExecutionOptions,
  ) => PromiseLike<Result>;
}

export type AnyTool = Tool<any, any>;

export type ToolSet = Record<string, AnyTool>;

export function defineTool<Parameters extends z.ZodTypeAny, Result>(
  tool: Tool<Parameters, Result>,
): Tool<Parameters, Result> {
  return tool;
}
