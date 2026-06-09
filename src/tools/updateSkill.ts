import { z } from 'zod';
import { defineTool } from '../core/Tool.js';
import { SkillLoader } from '../core/SkillLoader.js';

export const updateSkill = defineTool({
  description: `Rewrite an existing skill guide file with improved or corrected instructions.
IMPORTANT: Only call this when the user explicitly asks you to update or improve a skill.
Never update skills autonomously or without a direct user request.`,
  parameters: z.object({
    fileName: z
      .string()
      .describe('The existing skill filename to update, e.g. "property-portal-navigation.md"'),
    content: z
      .string()
      .min(1)
      .describe('The complete new markdown content for the skill file'),
    reason: z.string().describe('One sentence: what changed and why'),
  }),
  execute: async ({ fileName, content, reason }) => {
    const existing = await SkillLoader.loadByName(fileName);
    if (!existing) {
      return {
        success: false,
        error: `Skill file "${fileName}" not found. Use createSkill to create a new one.`,
      };
    }
    try {
      await SkillLoader.update(fileName, content);
      return { success: true, fileName, reason };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
});
