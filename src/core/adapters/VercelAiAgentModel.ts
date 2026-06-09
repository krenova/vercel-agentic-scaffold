import {
  generateText,
  tool as vercelTool,
  type CoreMessage,
  type CoreTool,
  type GenerateTextResult,
  type LanguageModel,
  type ToolSet as VercelToolSet,
} from 'ai';
import type {
  AgentModel,
  GenerateRequest,
  GenerateResult,
  ToolCall,
  ToolError,
} from '../AgentModel.js';
import type { Message } from '../Message.js';
import type { Tool, ToolSet } from '../Tool.js';

export class VercelAiAgentModel implements AgentModel {
  constructor(private readonly languageModel: LanguageModel) {}

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const result = await generateText({
      model: this.languageModel,
      system: request.system,
      messages: this.toCoreMessages(request.messages),
      tools: request.tools ? this.toVercelTools(request.tools) : undefined,
      maxSteps: request.maxSteps,
      maxRetries: request.maxRetries,
      experimental_telemetry: (request.telemetry
        ? {
            isEnabled: request.telemetry.isEnabled,
            functionId: request.telemetry.functionId,
            metadata: request.telemetry.metadata,
          }
        : undefined) as never,
    });

    return {
      text: result.text,
      messages: this.fromCoreMessages(result.response.messages),
      toolCalls: this.getToolCalls(result),
      toolErrors: this.getToolErrors(result),
    };
  }

  private toCoreMessages(messages: Message[]): CoreMessage[] {
    return messages as CoreMessage[];
  }

  private fromCoreMessages(messages: CoreMessage[]): Message[] {
    return messages as Message[];
  }

  private toVercelTools(tools: ToolSet): VercelToolSet {
    return Object.fromEntries(
      Object.entries(tools).map(([name, localTool]) => [
        name,
        this.toVercelTool(localTool),
      ]),
    );
  }

  private toVercelTool(localTool: Tool): CoreTool {
    if (!localTool.execute) {
      return vercelTool({
        description: localTool.description,
        parameters: localTool.parameters,
      });
    }

    return vercelTool({
      description: localTool.description,
      parameters: localTool.parameters,
      execute: async (args, options) =>
        localTool.execute?.(args, {
          toolCallId: options.toolCallId,
          messages: this.fromCoreMessages(options.messages),
          abortSignal: options.abortSignal,
        }),
    });
  }

  private getToolCalls(result: GenerateTextResult<VercelToolSet, never>): ToolCall[] {
    return result.steps.flatMap(step =>
      step.toolCalls.map(toolCall => ({
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        args: toolCall.args,
      })),
    );
  }

  private getToolErrors(result: GenerateTextResult<VercelToolSet, never>): ToolError[] {
    return result.response.messages.flatMap(message => {
      if (message.role !== 'tool') return [];
      return message.content
        .filter(part => part.type === 'tool-result' && part.isError)
        .map(part => ({
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          result: part.result,
        }));
    });
  }
}
