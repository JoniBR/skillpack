/**
 * meta/marker-presence.test.ts
 *
 * Every bundled boilerplate's base/ directory must contain at least one
 * `@skillpack:<name>` marker comment in some file. A boilerplate with no
 * markers has nowhere for skills to attach insertions — silently broken.
 *
 * We also collect which marker names appear per boilerplate (logged via
 * the test name) so future skill authors can grep failures to see what's
 * available.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  bundledBoilerplateDir,
  listBundledBoilerplateNames,
} from '../_helpers.js';

const MARKER_RE = /@skillpack:([a-z][a-z0-9-]*)\b/g;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next']);

function walkFiles(root: string, out: string[] = []): string[] {
  for (const entry of readdirSync(root)) {
    if (SKIP_DIRS.has(entry)) continue;
    const p = join(root, entry);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, out);
    else if (st.isFile()) out.push(p);
  }
  return out;
}

function findMarkers(baseDir: string): { markers: Set<string>; files: Map<string, Set<string>> } {
  const markers = new Set<string>();
  const files = new Map<string, Set<string>>();
  for (const f of walkFiles(baseDir)) {
    const text = readFileSync(f, 'utf8');
    const matches = text.matchAll(MARKER_RE);
    for (const m of matches) {
      markers.add(m[1]);
      const rel = relative(baseDir, f);
      if (!files.has(rel)) files.set(rel, new Set());
      files.get(rel)!.add(m[1]);
    }
  }
  return { markers, files };
}

const rows = listBundledBoilerplateNames().map((bp) => {
  const baseDir = join(bundledBoilerplateDir(bp), 'base');
  return { bp, baseDir };
});

describe('boilerplate base/ has @skillpack markers', () => {
  if (rows.length === 0) {
    it('(no bundled boilerplates found)', () => { expect(true).toBe(true); });
    return;
  }
  it.each(rows)('boilerplates/$bp/base contains at least one @skillpack marker', ({ bp, baseDir }) => {
    const { markers, files } = findMarkers(baseDir);
    const debug = Array.from(files.entries())
      .map(([f, ms]) => `    ${f}: ${Array.from(ms).join(', ')}`)
      .join('\n');
    expect(
      markers.size,
      `boilerplate "${bp}" base/ has NO @skillpack markers — skills have nothing to attach to.\nfound files+markers:\n${debug || '    (none)'}`,
    ).toBeGreaterThan(0);
  });
});
