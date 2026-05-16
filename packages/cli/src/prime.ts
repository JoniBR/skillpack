/**
 * `skillpack prime` — emits a single primer string for a clean-context subagent
 * (DESIGN.md Q6).
 *
 * Inputs:
 *   - boilerplate name
 *   - skills list
 *   - optional project path (defaults to cwd, used to render the tree)
 *
 * Output (stdout):
 *   - a header "scaffolded by skillpack: <bp> + <skills>"
 *   - a project tree (depth 3, gitignore-aware best-effort)
 *   - each SKILL.md content concatenated with separators
 *
 * The parent agent pipes this into the subagent's first user message.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { resolveBoilerplate, resolveSkill } from './registry.js';

export interface PrimeOptions {
  boilerplate: string;
  skills: string[];
  projectDir?: string;
}

export function prime(opts: PrimeOptions): string {
  const bp = resolveBoilerplate(opts.boilerplate);
  const skills = opts.skills.map((s) => resolveSkill(opts.boilerplate, s));

  const parts: string[] = [];
  parts.push(
    `# Skillpack subagent primer`,
    ``,
    `This project was scaffolded with: \`${bp.name}\` + ${skills.map((s) => '`' + s.name + '`').join(', ') || '(no extra skills)'}.`,
    ``,
  );

  if (opts.projectDir && existsSync(opts.projectDir)) {
    parts.push(`## Project tree`, '```', renderTree(opts.projectDir, 3), '```', '');
  }

  parts.push(`## Boilerplate: ${bp.name}`, '');
  const baseSkillMd = join(bp.dir, 'base-skill', 'SKILL.md');
  if (existsSync(baseSkillMd)) {
    parts.push(stripFrontmatter(readFileSync(baseSkillMd, 'utf8')), '');
  } else {
    parts.push(`_(${bp.name} ships no base SKILL.md)_`, '');
  }

  for (const skill of skills) {
    parts.push(`## Skill: ${skill.name}`, '');
    const skillMd = join(skill.dir, skill.manifest.skillMd ?? 'SKILL.md');
    parts.push(stripFrontmatter(readFileSync(skillMd, 'utf8')), '');
  }

  return parts.join('\n');
}

function stripFrontmatter(md: string): string {
  if (!md.startsWith('---\n')) return md;
  const end = md.indexOf('\n---\n', 4);
  if (end < 0) return md;
  return md.slice(end + 5);
}

function renderTree(dir: string, maxDepth: number): string {
  const lines: string[] = [];
  const walk = (current: string, depth: number, prefix: string): void => {
    if (depth > maxDepth) return;
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    entries = entries
      .filter((n) => n !== 'node_modules' && n !== '.git')
      .sort();
    for (let i = 0; i < entries.length; i++) {
      const name = entries[i]!;
      const isLast = i === entries.length - 1;
      lines.push(prefix + (isLast ? '└── ' : '├── ') + name);
      const full = join(current, name);
      try {
        if (statSync(full).isDirectory()) {
          walk(full, depth + 1, prefix + (isLast ? '    ' : '│   '));
        }
      } catch {
        /* ignore */
      }
    }
  };
  walk(dir, 0, '');
  return lines.length ? lines.join('\n') : '(empty)';
}
