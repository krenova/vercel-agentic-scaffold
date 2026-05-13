import { generateText, type CoreMessage, type CoreTool, type LanguageModel } from 'ai';
import { logTurn } from '../logger/conversationLogger.js';
import type { SessionStore } from '../store/SessionStore.js';
import type { Skill } from './Skill.js';
import { createSkill as createSkillTool } from '../tools/createSkill.js';
import { updateSkill as updateSkillTool } from '../tools/updateSkill.js';

export type HistoryMode = 'full' | 'text-only';

export interface AgentConfig {
  historyMode?: HistoryMode;          // default: 'full'
  maxSteps?: number;                  // default: 5
  maxHistoryTurns?: number | null;    // default: null (unlimited)
  maxRetries?: number;                // default: 3 — retries on transient errors (429, 5xx)
  store?: SessionStore;               // optional external session store
  skills?: Skill[];                   // skill guides injected after the agent's system prompt
  allowSkillManagement?: boolean;     // default: false — adds createSkill + updateSkill tools
}

export abstract class Agent {
  abstract readonly name: string;
  protected abstract readonly systemPrompt: string;
  protected abstract readonly tools: Record<string, CoreTool>;

  protected readonly historyMode: HistoryMode;
  protected readonly maxSteps: number;
  protected readonly maxHistoryTurns: number | null;
  protected readonly maxRetries: number;
  private readonly store?: SessionStore;
  private skills: Skill[];
  private readonly allowSkillManagement: boolean;
  private messages: CoreMessage[] = [];

  constructor(
    protected readonly model: LanguageModel,
    protected readonly sessionId: string,
    config: AgentConfig = {},
  ) {
    this.historyMode = config.historyMode ?? 'full';
    this.maxSteps = config.maxSteps ?? 5;
    this.maxHistoryTurns = config.maxHistoryTurns ?? null;
    this.maxRetries = config.maxRetries ?? 3;
    this.store = config.store;
    this.skills = config.skills ?? [];
    this.allowSkillManagement = config.allowSkillManagement ?? false;
  }

  // Builds the effective system prompt: agent's own prompt + any skill guides appended.
  private get effectiveSystemPrompt(): string {
    if (this.skills.length === 0) return this.systemPrompt;
    const skillBlocks = this.skills
      .map(s => `## ${s.name}\n\n${s.content}`)
      .join('\n\n');
    return (
      `${this.systemPrompt}\n\n---\n\n` +
      `You have the following skill guides. Follow them precisely when handling relevant tasks.\n\n` +
      skillBlocks
    );
  }

  // Merges skill management tools when allowSkillManagement is enabled.
  private get effectiveTools(): Record<string, CoreTool> {
    if (!this.allowSkillManagement) return this.tools;
    return { ...this.tools, createSkill: createSkillTool, updateSkill: updateSkillTool };
  }

  async send(userMessage: string): Promise<string> {
    if (this.store) {
      this.messages = await this.store.load(this.sessionId);
    }

    await logTurn(this.sessionId, 'user', userMessage);
    this.messages.push({ role: 'user', content: userMessage });

    let result: Awaited<ReturnType<typeof generateText>>;
    try {
      result = await generateText({
        model: this.model,
        system: this.effectiveSystemPrompt,
        messages: this.messages,
        tools: this.effectiveTools,
        maxSteps: this.maxSteps,
        maxRetries: this.maxRetries,
        experimental_telemetry: {
          isEnabled: true,
          functionId: this.name,
          metadata: { sessionId: this.sessionId },
        },
      });
    } catch (err) {
      console.error(`[${this.name}][${this.sessionId}] LLM call failed:`, err);
      throw err;
    }

    this.warnToolErrors(result);
    await this.reloadSkillsIfManaged(result);
    this.appendToHistory(result);
    this.trimHistory();

    if (this.store) {
      await this.store.save(this.sessionId, this.messages);
    }

    await logTurn(this.sessionId, 'agent', result.text);
    return result.text;
  }

  private async reloadSkillsIfManaged(
    result: Awaited<ReturnType<typeof generateText>>,
  ): Promise<void> {
    if (!this.allowSkillManagement) return;
    const skillToolUsed = result.steps.some(step =>
      step.toolCalls?.some(
        tc => tc.toolName === 'createSkill' || tc.toolName === 'updateSkill',
      ),
    );
    if (!skillToolUsed) return;
    const { SkillLoader } = await import('./SkillLoader.js');
    this.skills = await SkillLoader.loadAll();
    console.log(`[${this.name}] Skills reloaded — ${this.skills.length} skill(s) now active`);
  }

  private warnToolErrors(result: Awaited<ReturnType<typeof generateText>>): void {
    for (const message of result.response.messages) {
      if (message.role !== 'tool') continue;
      for (const part of message.content) {
        if (part.type === 'tool-result' && part.isError) {
          console.warn(
            `[${this.name}][${this.sessionId}] Tool error — ${part.toolName}:`,
            part.result,
          );
        }
      }
    }
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

  async reset(): Promise<void> {
    this.messages = [];
    if (this.store) {
      await this.store.delete(this.sessionId);
    }
  }

  get length(): number {
    return this.messages.length;
  }

  get history(): CoreMessage[] {
    return [...this.messages];
  }
}
