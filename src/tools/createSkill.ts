import { z } from 'zod';
import { defineTool } from '../core/Tool.js';
import { SkillLoader } from '../core/SkillLoader.js';

export const createSkill = defineTool({
  description: `Write a new skill guide file to the skills/ directory.
IMPORTANT: Only call this when the user explicitly asks you to create a new skill.
Never create skills autonomously or without a direct user request.`,
  parameters: z.object({
    fileName: z
      .string()
      .regex(/^[\w-]+\.md$/, 'Must be a valid filename ending in .md, e.g. "ura-navigation.md"')
      .describe('Filename for the new skill, e.g. "ura-navigation.md"'),
    content: z
      .string()
      .min(1)
      .describe('Full markdown content for the skill file, starting with a # Heading'),
    reason: z.string().describe('One sentence: what this skill is for'),
  }),
  execute: async ({ fileName, content, reason }) => {
    const existing = await SkillLoader.loadByName(fileName);
    if (existing) {
      return {
        success: false,
        error: `A skill file named "${fileName}" already exists. Use updateSkill to modify it.`,
      };
    }
    try {
      await SkillLoader.create(fileName, content);
      return { success: true, fileName, reason };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
});
