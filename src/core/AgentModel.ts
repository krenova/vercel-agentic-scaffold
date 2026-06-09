import type { Message } from './Message.js';
import type { ToolSet } from './Tool.js';

export interface GenerateRequest {
  system?: string;
  messages: Message[];
  tools?: ToolSet;
  maxSteps?: number;
  maxRetries?: number;
  telemetry?: {
    isEnabled: boolean;
    functionId: string;
    metadata?: Record<string, unknown>;
  };
}

export interface ToolCall {
  toolCallId: string;
  toolName: string;
  args: unknown;
}

export interface ToolError {
  toolCallId: string;
  toolName: string;
  result: unknown;
}

export interface GenerateResult {
  text: string;
  messages: Message[];
  toolCalls: ToolCall[];
  toolErrors: ToolError[];
}

export interface AgentModel {
  generate(request: GenerateRequest): Promise<GenerateResult>;
}
