import { generateText, type CoreMessage, type CoreTool, type LanguageModel } from 'ai';
import { logTurn } from '../logger/conversationLogger.js';

export type HistoryMode = 'full' | 'text-only';

export interface AgentConfig {
  historyMode?: HistoryMode;   // default: 'full'
  maxSteps?: number;           // default: 5
  maxHistoryTurns?: number | null; // default: null (unlimited)
}

export abstract class Agent {
  abstract readonly name: string;
  protected abstract readonly systemPrompt: string;
  protected abstract readonly tools: Record<string, CoreTool>;

  protected readonly historyMode: HistoryMode;
  protected readonly maxSteps: number;
  protected readonly maxHistoryTurns: number | null;
  private messages: CoreMessage[] = [];

  constructor(
    protected readonly model: LanguageModel,
    protected readonly sessionId: string,
    config: AgentConfig = {},
  ) {
    this.historyMode = config.historyMode ?? 'full';
    this.maxSteps = config.maxSteps ?? 5;
    this.maxHistoryTurns = config.maxHistoryTurns ?? null;
  }

  async send(userMessage: string): Promise<string> {
    await logTurn(this.sessionId, 'user', userMessage);
    this.messages.push({ role: 'user', content: userMessage });

    const result = await generateText({
      model: this.model,
      system: this.systemPrompt,
      messages: this.messages,
      tools: this.tools,
      maxSteps: this.maxSteps,
      experimental_telemetry: {
        isEnabled: true,
        functionId: this.name,
        metadata: { sessionId: this.sessionId },
      },
    });

    this.appendToHistory(result);
    this.trimHistory();

    await logTurn(this.sessionId, 'agent', result.text);
    return result.text;
  }

  private appendToHistory(result: Awaited<ReturnType<typeof generateText>>): void {
    if (this.historyMode === 'full') {
      this.messages.push(...result.response.messages);
    } else {
      this.messages.push({ role: 'assistant', content: result.text });
    }
  }

  // Keeps only the last maxHistoryTurns complete exchange cycles.
  // Always trims at a user-message boundary so tool call chains are never split.
  private trimHistory(): void {
    if (this.maxHistoryTurns === null) return;

    const userIndices = this.messages
      .map((msg, i) => (msg.role === 'user' ? i : -1))
      .filter((i): i is number => i !== -1);

    if (userIndices.length <= this.maxHistoryTurns) return;

    const keepFromIndex = userIndices[userIndices.length - this.maxHistoryTurns];
    this.messages = this.messages.slice(keepFromIndex);
  }

  reset(): void {
    this.messages = [];
  }

  get length(): number {
    return this.messages.length;
  }

  get history(): CoreMessage[] {
    return [...this.messages];
  }
}
