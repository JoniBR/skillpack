/**
 * meta/skill-file-overlays-source-exist.test.ts
 *
 * For every bundled skill manifest `files[]` entry:
 *   - the source (`<skill-dir>/<from>`) exists on disk
 *   - the destination (`<to>`) is a relative path (no leading slash, no
 *     `..` segments) — otherwise scaffolds escape the project root
 */
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  bundledSkillDir,
  listBundledBoilerplateNames,
  listBundledSkillNames,
} from '../_helpers.js';
import { SkillManifestSchema } from '../../src/schema.js';

interface Row {
  label: string;
  boilerplate: string;
  skill: string;
  from: string;
  to: string;
}

const rows: Row[] = [];
for (const bp of listBundledBoilerplateNames()) {
  for (const skill of listBundledSkillNames(bp)) {
    const skillDir = bundledSkillDir(bp, skill);
    let parsed: unknown;
    try { parsed = JSON.parse(readFileSync(join(skillDir, 'manifest.json'), 'utf8')); }
    catch { continue; }
    const r = SkillManifestSchema.safeParse(parsed);
    if (!r.success) continue;
    for (const f of r.data.files ?? []) {
      rows.push({
        label: `${bp}/${skill}: ${f.from} → ${f.to}`,
        boilerplate: bp,
        skill,
        from: f.from,
        to: f.to,
      });
    }
  }
}

describe('skill file overlay sources exist + dests are safe', () => {
  if (rows.length === 0) {
    it('(no skill file overlays declared)', () => { expect(true).toBe(true); });
    return;
  }
  it.each(rows)('$label', ({ boilerplate, skill, from, to }) => {
    const src = join(bundledSkillDir(boilerplate, skill), from);
    expect(
      existsSync(src),
      `overlay source missing: ${src}`,
    ).toBe(true);
    expect(
      isAbsolute(to),
      `overlay destination is absolute (must be relative): ${to}`,
    ).toBe(false);
    const segments = to.split(/[\\/]/);
    expect(
      segments.includes('..'),
      `overlay destination contains ".." segment (escapes project root): ${to}`,
    ).toBe(false);
  });
});
