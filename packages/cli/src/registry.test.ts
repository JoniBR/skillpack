/**
 * Registry tests — bundled-only path. Overlay precedence is covered in overlay.test.ts.
 *
 * We point $HOME at an empty tmp dir so the real ~/.skill-pack/ can't influence results.
 */
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  listBoilerplates,
  listBoilerplatesWithSource,
  listSkills,
  resolveBoilerplate,
  resolveBundledRoot,
  resolveSkill,
} from './registry.js';

let prevHome: string | undefined;
let prevUserprofile: string | undefined;
let isolatedHome: string;

beforeEach(() => {
  isolatedHome = mkdtempSync(join(tmpdir(), 'sp-reg-home-'));
  prevHome = process.env['HOME'];
  prevUserprofile = process.env['USERPROFILE'];
  process.env['HOME'] = isolatedHome;
  delete process.env['USERPROFILE'];
});

afterEach(() => {
  if (prevHome === undefined) delete process.env['HOME'];
  else process.env['HOME'] = prevHome;
  if (prevUserprofile === undefined) delete process.env['USERPROFILE'];
  else process.env['USERPROFILE'] = prevUserprofile;
  rmSync(isolatedHome, { recursive: true, force: true });
});

describe('resolveBundledRoot', () => {
  it('returns an existing directory', () => {
    const root = resolveBundledRoot();
    expect(existsSync(root)).toBe(true);
    expect(statSync(root).isDirectory()).toBe(true);
  });
});

describe('listBoilerplates / listBoilerplatesWithSource', () => {
  it('includes both bundled boilerplates (react, slidev)', () => {
    const names = listBoilerplates();
    expect(names).toContain('react');
    expect(names).toContain('slidev');
  });

  it('listBoilerplatesWithSource includes a source field for each entry', () => {
    const entries = listBoilerplatesWithSource();
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.source).toMatch(/^(bundled|overlay)$/);
      expect(typeof e.name).toBe('string');
    }
  });
});

describe('listSkills', () => {
  it("returns react's skills sorted and unique", () => {
    const skills = listSkills('react');
    expect(skills).toContain('remotion');
    expect(skills).toContain('recharts');
    expect(skills).toContain('satori');
    expect([...skills].sort()).toEqual(skills);
    expect(new Set(skills).size).toBe(skills.length);
  });
});

describe('resolveBoilerplate', () => {
  it('resolves react with source: bundled', () => {
    const r = resolveBoilerplate('react');
    expect(r.name).toBe('react');
    expect(r.source).toBe('bundled');
    expect(r.manifest.name).toBe('react');
    expect(existsSync(r.baseDir)).toBe(true);
  });

  it('throws a helpful error listing available boilerplates', () => {
    expect(() => resolveBoilerplate('nonexistent-xyz')).toThrow(/Unknown boilerplate/);
    try {
      resolveBoilerplate('nonexistent-xyz');
    } catch (e) {
      expect((e as Error).message).toMatch(/react/);
    }
  });
});

describe('resolveSkill', () => {
  it('resolves react/remotion with a valid manifest', () => {
    const r = resolveSkill('react', 'remotion');
    expect(r.name).toBe('remotion');
    expect(r.source).toBe('bundled');
    expect(r.manifest.name.length).toBeGreaterThan(0);
    expect(r.manifest.schemaVersion).toBe(1);
  });

  it('throws a helpful error listing available skills for the boilerplate', () => {
    expect(() => resolveSkill('react', 'nonexistent-xyz')).toThrow(/Unknown skill/);
    try {
      resolveSkill('react', 'nonexistent-xyz');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toMatch(/react/);
      expect(msg).toMatch(/remotion/);
    }
  });
});
