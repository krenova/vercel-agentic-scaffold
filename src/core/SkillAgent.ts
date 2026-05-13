import { type CoreTool, type LanguageModel } from 'ai';
import { Agent, type AgentConfig } from './Agent.js';
import type { Skill } from './Skill.js';

export interface SkillAgentOptions {
  name: string;
  basePrompt: string;               // the agent's core persona — skills are appended after this
  skills: Skill[];
  tools: Record<string, CoreTool>;  // provided by the developer
  allowSkillManagement?: boolean;   // default: false
  config?: Omit<AgentConfig, 'skills' | 'allowSkillManagement'>;
}

/**
 * A fully dynamic agent whose capabilities come entirely from skills at runtime.
 * Use this when you want to compose an agent without hardcoding a system prompt in code.
 *
 * For existing concrete agents (PropertyAgentAssistant, SynthesizerAgent, etc.),
 * pass `skills` and `allowSkillManagement` through AgentConfig instead — they are
 * supported by the base Agent class directly.
 */
export class SkillAgent extends Agent {
  readonly name: string;
  protected readonly systemPrompt: string;
  protected readonly tools: Record<string, CoreTool>;

  constructor(model: LanguageModel, sessionId: string, options: SkillAgentOptions) {
    super(model, sessionId, {
      ...options.config,
      skills: options.skills,
      allowSkillManagement: options.allowSkillManagement,
    });
    this.name = options.name;
    this.systemPrompt = options.basePrompt;
    this.tools = options.tools;
  }
}
