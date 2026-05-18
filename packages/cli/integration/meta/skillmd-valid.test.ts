/**
 * meta/skillmd-valid.test.ts
 *
 * Walks every SKILL.md under boilerplates/, meta-skills/, and vendored
 * upstream/ trees and asserts:
 *   - has YAML frontmatter delimited by `---`
 *   - frontmatter exposes a kebab-case `name` and a `description` ≥ 80 chars
 *     (skillpack house style; short descriptions undertrigger Claude's skill
 *     matching heuristic)
 *   - body is ≥ 200 chars (catches near-empty stubs)
 *
 * Regex-only parse — no yaml dep.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../_helpers.js';

const KEBAB_RE = /^[a-z][a-z0-9-]*$/;

function walk(root: string, out: string[] = []): string[] {
  if (!existsSync(root)) return out;
  for (const entry of readdirSync(root)) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
    const p = join(root, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (entry === 'SKILL.md') out.push(p);
  }
  return out;
}

interface Row {
  label: string;
  path: string;
}

const roots = [
  join(REPO_ROOT, 'boilerplates'),
  join(REPO_ROOT, 'meta-skills'),
  join(REPO_ROOT, 'vendor'),
];

const rows: Row[] = roots
  .flatMap((r) => walk(r))
  .map((p) => ({ label: relative(REPO_ROOT, p), path: p }));

interface Frontmatter {
  name?: string;
  description?: string;
  body: string;
}

function parseFrontmatter(text: string): Frontmatter | null {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return null;
  // Find closing --- on its own line within first 4000 bytes.
  const head = text.slice(0, 4000);
  const m = head.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  const fm = m[1];
  const body = text.slice(m[0].length);
  const nameMatch = fm.match(/^name:\s*(.+?)\s*$/m);
  const descMatch = fm.match(/^description:\s*((?:.|\n[ \t]+\S)+)/m);
  // description can be a folded multi-line scalar; pull until next top-level key
  let description: string | undefined;
  if (descMatch) {
    // Re-extract greedily: take everything from `description:` to next ^key: or EOF
    const after = fm.slice(descMatch.index!);
    const greedy = after.match(/^description:\s*([\s\S]*?)(?:\n[a-zA-Z_][\w-]*:\s|\s*$)/);
    description = (greedy ? greedy[1] : descMatch[1]).trim();
    // Strip surrounding quotes if any
    if ((description.startsWith('"') && description.endsWith('"')) ||
        (description.startsWith("'") && description.endsWith("'"))) {
      description = description.slice(1, -1);
    }
  }
  return {
    name: nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, '') : undefined,
    description,
    body,
  };
}

describe('SKILL.md frontmatter + body', () => {
  if (rows.length === 0) {
    it('(no SKILL.md files found)', () => {
      expect(true).toBe(true);
    });
    return;
  }
  // House-style checks (≥80 char description, kebab name) apply only to
  // our own SKILL.md files. Vendored upstream content (under any `upstream/`
  // or `vendor/` subtree) keeps whatever shape the upstream maintainer
  // shipped — we don't rewrite their content.
  const isVendored = (p: string): boolean =>
    p.includes(`${join('boilerplates')}/`) && p.includes(`${join('upstream', 'SKILL.md')}`)
    || p.includes(`${join('vendor')}/`);

  it.each(rows)('$label is well-formed', ({ path }) => {
    expect(existsSync(path)).toBe(true);
    const text = readFileSync(path, 'utf8');
    const fm = parseFrontmatter(text);
    expect(fm, `no YAML frontmatter (must start with --- and have closing ---)`).not.toBeNull();
    if (!fm) return;
    expect(fm.name, `missing name:`).toBeTruthy();
    expect(fm.description, `missing description:`).toBeTruthy();
    // Body length applies to everything; vendored content is also expected
    // to be substantive.
    expect(
      fm.body.length,
      `body too short (${fm.body.length} chars; need ≥50) — near-empty stub?`,
    ).toBeGreaterThanOrEqual(50);
    if (isVendored(path)) return;
    // Skillpack-authored content gets the stricter checks.
    expect(fm.name!, `name not kebab-case: ${fm.name}`).toMatch(KEBAB_RE);
    expect(
      fm.description!.length,
      `description too short (${fm.description!.length} chars; need ≥80): ${fm.description}`,
    ).toBeGreaterThanOrEqual(80);
    expect(
      fm.body.length,
      `body too short (${fm.body.length} chars; need ≥200) — near-empty stub?`,
    ).toBeGreaterThanOrEqual(200);
  });
});
