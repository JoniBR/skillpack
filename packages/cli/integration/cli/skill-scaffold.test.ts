/**
 * Tier 1b CLI integration tests — `skill scaffold` subcommand (overlay creation).
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SkillManifestSchema } from '../../src/schema.js';
import { runCli } from '../_helpers.js';

describe('skill scaffold', () => {
  let tmpHome: string;
  beforeEach(() => {
    tmpHome = mkdtempSync(join(tmpdir(), 'skillpack-home-'));
  });
  afterEach(() => {
    rmSync(tmpHome, { recursive: true, force: true });
  });

  it('creates a skill skeleton under ~/.skill-pack/skills/<bp>/<name>/', () => {
    const r = runCli(
      ['skill', 'scaffold', '--boilerplate', 'react', '--name', 'test-skill'],
      tmpHome,
      { HOME: tmpHome, USERPROFILE: tmpHome },
    );
    expect(r.exitCode).toBe(0);
    const root = join(tmpHome, '.skill-pack', 'skills', 'react', 'test-skill');
    expect(existsSync(join(root, 'SKILL.md'))).toBe(true);
    expect(existsSync(join(root, 'manifest.json'))).toBe(true);
    const md = readFileSync(join(root, 'SKILL.md'), 'utf8');
    expect(md.startsWith('---\n')).toBe(true);
    expect(md).toContain('name: react-test-skill');
  });

  it('generated manifest.json passes the SkillManifest zod schema', () => {
    const r = runCli(
      ['skill', 'scaffold', '--boilerplate', 'react', '--name', 'schema-skill'],
      tmpHome,
      { HOME: tmpHome, USERPROFILE: tmpHome },
    );
    expect(r.exitCode).toBe(0);
    const manifest = JSON.parse(
      readFileSync(
        join(tmpHome, '.skill-pack', 'skills', 'react', 'schema-skill', 'manifest.json'),
        'utf8',
      ),
    );
    const parsed = SkillManifestSchema.parse(manifest);
    expect(parsed.name).toBe('schema-skill');
    expect(parsed.schemaVersion).toBe(1);
  });

  it('rejects when the skill dir already exists', () => {
    const first = runCli(
      ['skill', 'scaffold', '--boilerplate', 'react', '--name', 'dup-skill'],
      tmpHome,
      { HOME: tmpHome, USERPROFILE: tmpHome },
    );
    expect(first.exitCode).toBe(0);
    const second = runCli(
      ['skill', 'scaffold', '--boilerplate', 'react', '--name', 'dup-skill'],
      tmpHome,
      { HOME: tmpHome, USERPROFILE: tmpHome },
    );
    expect(second.exitCode).not.toBe(0);
    expect(second.stderr).toMatch(/already exists/i);
  });

  it('rejects when the parent boilerplate does not exist, suggesting boilerplate scaffold', () => {
    const r = runCli(
      ['skill', 'scaffold', '--boilerplate', 'no-such-bp', '--name', 'whatever'],
      tmpHome,
      { HOME: tmpHome, USERPROFILE: tmpHome },
    );
    expect(r.exitCode).not.toBe(0);
    expect(r.stderr).toMatch(/not found/i);
    expect(r.stderr).toMatch(/boilerplate scaffold/);
  });
});
