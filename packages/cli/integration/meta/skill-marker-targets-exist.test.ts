/**
 * meta/skill-marker-targets-exist.test.ts
 *
 * For every bundled skill manifest's `markers[]` entry:
 *   - the target file (relative to the boilerplate's base/) must exist
 *   - the named marker comment (e.g. `@skillpack:mount`) must actually
 *     appear in that base file
 *
 * Catches the silent failure where a skill targets a marker the base
 * doesn't expose — scaffolds produce a broken project with no error.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  bundledBoilerplateDir,
  bundledSkillDir,
  listBundledBoilerplateNames,
  listBundledSkillNames,
} from '../_helpers.js';
import { SkillManifestSchema } from '../../src/schema.js';

interface Row {
  label: string;
  boilerplate: string;
  skill: string;
  file: string;
  marker: string;
}

const rows: Row[] = [];
for (const bp of listBundledBoilerplateNames()) {
  const baseDir = join(bundledBoilerplateDir(bp), 'base');
  for (const skill of listBundledSkillNames(bp)) {
    const manifestPath = join(bundledSkillDir(bp, skill), 'manifest.json');
    let parsed: unknown;
    try { parsed = JSON.parse(readFileSync(manifestPath, 'utf8')); }
    catch { continue; } // bad JSON is the manifest-valid test's job
    const r = SkillManifestSchema.safeParse(parsed);
    if (!r.success) continue;
    for (const m of r.data.markers ?? []) {
      rows.push({
        label: `${bp}/${skill} → base/${m.file}@${m.marker}`,
        boilerplate: bp,
        skill,
        file: m.file,
        marker: m.marker,
      });
    }
    void baseDir;
  }
}

describe('skill marker targets exist in base/', () => {
  if (rows.length === 0) {
    it('(no skill markers declared)', () => { expect(true).toBe(true); });
    return;
  }
  it.each(rows)('$label', ({ boilerplate, file, marker }) => {
    const baseFile = join(bundledBoilerplateDir(boilerplate), 'base', file);
    expect(
      existsSync(baseFile),
      `marker target file missing: boilerplates/${boilerplate}/base/${file}`,
    ).toBe(true);
    const text = readFileSync(baseFile, 'utf8');
    const needle = `@skillpack:${marker}`;
    expect(
      text.includes(needle),
      `marker "${needle}" not found in boilerplates/${boilerplate}/base/${file}`,
    ).toBe(true);
  });
});
