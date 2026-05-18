/**
 * meta/manifest-valid.test.ts
 *
 * Walks every bundled boilerplate and skill manifest in the repo and
 * asserts it (a) parses as JSON, (b) parses through the appropriate zod
 * schema, (c) has a `name` matching its directory, (d) is on the current
 * schemaVersion, and (e) has a semver-shaped `version`.
 *
 * One `it.each` row per manifest so failures point at a specific file.
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  bundledBoilerplateDir,
  bundledSkillDir,
  listBundledBoilerplateNames,
  listBundledSkillNames,
} from '../_helpers.js';
import {
  BoilerplateManifestSchema,
  CURRENT_SCHEMA_VERSION,
  SkillManifestSchema,
} from '../../src/schema.js';

const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

interface BpRow {
  label: string;
  manifestPath: string;
  expectedName: string;
}
interface SkillRow {
  label: string;
  manifestPath: string;
  expectedName: string;
}

const bpRows: BpRow[] = listBundledBoilerplateNames().map((bp) => ({
  label: `boilerplates/${bp}/boilerplate.json`,
  manifestPath: join(bundledBoilerplateDir(bp), 'boilerplate.json'),
  expectedName: bp,
}));

const skillRows: SkillRow[] = listBundledBoilerplateNames().flatMap((bp) =>
  listBundledSkillNames(bp).map((skill) => ({
    label: `boilerplates/${bp}/skills/${skill}/manifest.json`,
    manifestPath: join(bundledSkillDir(bp, skill), 'manifest.json'),
    expectedName: skill,
  })),
);

describe('boilerplate manifests', () => {
  it.each(bpRows)('$label parses + validates', ({ manifestPath, expectedName }) => {
    expect(existsSync(manifestPath), `missing: ${manifestPath}`).toBe(true);
    const raw = readFileSync(manifestPath, 'utf8');
    let parsed: unknown;
    expect(() => {
      parsed = JSON.parse(raw);
    }, `invalid JSON: ${manifestPath}`).not.toThrow();
    const result = BoilerplateManifestSchema.safeParse(parsed);
    expect(result.success, `zod: ${result.success ? '' : JSON.stringify(result.error.format())}`).toBe(true);
    if (!result.success) return;
    expect(result.data.name, `name must match dir basename`).toBe(expectedName);
    expect(result.data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.data.version, `version not semver: ${result.data.version}`).toMatch(SEMVER_RE);
  });
});

describe('skill manifests', () => {
  if (skillRows.length === 0) {
    it('(no bundled skills found)', () => {
      expect(true).toBe(true);
    });
    return;
  }
  it.each(skillRows)('$label parses + validates', ({ manifestPath, expectedName }) => {
    expect(existsSync(manifestPath), `missing: ${manifestPath}`).toBe(true);
    const raw = readFileSync(manifestPath, 'utf8');
    let parsed: unknown;
    expect(() => {
      parsed = JSON.parse(raw);
    }, `invalid JSON: ${manifestPath}`).not.toThrow();
    const result = SkillManifestSchema.safeParse(parsed);
    expect(result.success, `zod: ${result.success ? '' : JSON.stringify(result.error.format())}`).toBe(true);
    if (!result.success) return;
    expect(result.data.name, `name must match dir basename`).toBe(expectedName);
    expect(basename(expectedName)).toBe(expectedName);
    expect(result.data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.data.version, `version not semver: ${result.data.version}`).toMatch(SEMVER_RE);
  });
});
