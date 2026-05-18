/**
 * Tier 1b CLI integration tests — `boilerplate scaffold` subcommand.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BoilerplateManifestSchema } from '../../src/schema.js';
import { runCli } from '../_helpers.js';

describe('boilerplate scaffold', () => {
  let tmpHome: string;
  beforeEach(() => {
    tmpHome = mkdtempSync(join(tmpdir(), 'skillpack-home-'));
  });
  afterEach(() => {
    rmSync(tmpHome, { recursive: true, force: true });
  });

  it('creates the boilerplate skeleton under ~/.skill-pack/boilerplates/<name>/', () => {
    const r = runCli(['boilerplate', 'scaffold', '--name', 'test-bp'], tmpHome, {
      HOME: tmpHome,
      USERPROFILE: tmpHome,
    });
    expect(r.exitCode).toBe(0);
    const root = join(tmpHome, '.skill-pack', 'boilerplates', 'test-bp');
    expect(existsSync(join(root, 'boilerplate.json'))).toBe(true);
    expect(existsSync(join(root, 'base', '.gitkeep'))).toBe(true);
    expect(existsSync(join(root, 'base-skill', 'SKILL.md'))).toBe(true);
  });

  it('generated boilerplate.json passes the BoilerplateManifest zod schema', () => {
    const r = runCli(['boilerplate', 'scaffold', '--name', 'schema-bp'], tmpHome, {
      HOME: tmpHome,
      USERPROFILE: tmpHome,
    });
    expect(r.exitCode).toBe(0);
    const raw = JSON.parse(
      readFileSync(
        join(tmpHome, '.skill-pack', 'boilerplates', 'schema-bp', 'boilerplate.json'),
        'utf8',
      ),
    );
    const parsed = BoilerplateManifestSchema.parse(raw);
    expect(parsed.name).toBe('schema-bp');
    expect(parsed.schemaVersion).toBe(1);
  });

  it('rejects when the boilerplate dir already exists', () => {
    const first = runCli(['boilerplate', 'scaffold', '--name', 'dup-bp'], tmpHome, {
      HOME: tmpHome,
      USERPROFILE: tmpHome,
    });
    expect(first.exitCode).toBe(0);
    const second = runCli(['boilerplate', 'scaffold', '--name', 'dup-bp'], tmpHome, {
      HOME: tmpHome,
      USERPROFILE: tmpHome,
    });
    expect(second.exitCode).not.toBe(0);
    expect(second.stderr).toMatch(/already exists/i);
  });

  it('the new boilerplate appears in `list boilerplates` with the (overlay) marker', () => {
    const create = runCli(['boilerplate', 'scaffold', '--name', 'visible-bp'], tmpHome, {
      HOME: tmpHome,
      USERPROFILE: tmpHome,
    });
    expect(create.exitCode).toBe(0);
    const list = runCli(['list', 'boilerplates'], tmpHome, {
      HOME: tmpHome,
      USERPROFILE: tmpHome,
    });
    expect(list.exitCode).toBe(0);
    expect(list.stdout).toMatch(/visible-bp\s+\(overlay\)/);
  });
});
