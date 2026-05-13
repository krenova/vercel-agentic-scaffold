import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import type { Skill } from './Skill.js';

const SKILLS_DIR = join(process.cwd(), 'skills');

function nameFromContent(content: string, fileName: string): string {
  const h1 = content.match(/^#\s+(.+)/m);
  if (h1) return h1[1].trim();
  // Fall back to filename: "property-portal-navigation" → "Property Portal Navigation"
  return basename(fileName, '.md')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export class SkillLoader {
  static async loadAll(): Promise<Skill[]> {
    let entries: string[];
    try {
      entries = await readdir(SKILLS_DIR);
    } catch {
      return []; // skills/ directory doesn't exist yet — not an error
    }

    const skills: Skill[] = [];
    for (const entry of entries) {
      if (extname(entry) !== '.md') continue;
      try {
        const content = await readFile(join(SKILLS_DIR, entry), 'utf-8');
        skills.push({ name: nameFromContent(content, entry), fileName: entry, content });
      } catch (err) {
        console.warn(`[SkillLoader] Could not read skill file "${entry}":`, err);
      }
    }
    return skills;
  }

  static async loadByName(nameOrFile: string): Promise<Skill | null> {
    const all = await SkillLoader.loadAll();
    return (
      all.find(
        s =>
          s.fileName === nameOrFile ||
          s.name.toLowerCase() === nameOrFile.toLowerCase(),
      ) ?? null
    );
  }

  static async list(): Promise<string[]> {
    const all = await SkillLoader.loadAll();
    return all.map(s => s.name);
  }

  static async create(fileName: string, content: string): Promise<void> {
    const filePath = join(SKILLS_DIR, fileName);
    // writeFile with 'wx' flag fails if file already exists
    await writeFile(filePath, content, { encoding: 'utf-8', flag: 'wx' });
  }

  static async update(fileName: string, content: string): Promise<void> {
    const filePath = join(SKILLS_DIR, fileName);
    await writeFile(filePath, content, 'utf-8');
  }
}
