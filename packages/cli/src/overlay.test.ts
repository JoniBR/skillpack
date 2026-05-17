/**
 * Overlay registry tests.
 *
 * Uses a tmp dir as $HOME so we don't touch the real ~/.skill-pack/.
 * A separate tmp dir stands in for the "bundled" boilerplates root.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listOverlayBoilerplates,
  listOverlaySkills,
  resolveOverlayBoilerplate,
  resolveOverlayRoot,
  resolveOverlaySkill,
} from './overlay.js';
import {
  listBoilerplatesWithSource,
  listSkillsWithSource,
  resolveBoilerplate,
  resolveSkill,
} from './registry.js';

interface Ctx {
  home: string;
  bundled: string;
  prevHome: string | undefined;
  prevUserprofile: string | undefined;
}

let ctx: Ctx;

function makeBoilerplate(root: string, name: string, opts: { skills?: string[] } = {}): void {
  const dir = join(root, name);
  mkdirSync(join(dir, 'base'), { recursive: true });
  writeFileSync(
    join(dir, 'boilerplate.json'),
    JSON.stringify({
      schemaVersion: 1,
      name,
      version: '0.1.0',
      description: `${name} bp`,
    }),
  );
  for (const skill of opts.skills ?? []) {
    const sd = join(dir, 'skills', skill);
    mkdirSync(sd, { recursive: true });
    writeFileSync(
      join(sd, 'manifest.json'),
      JSON.stringify({
        schemaVersion: 1,
        name: skill,
        version: '0.1.0',
        description: `${skill} skill`,
      }),
    );
  }
}

function makeOverlayBoilerplate(home: string, name: string): void {
  const dir = join(home, '.skill-pack', 'boilerplates', name);
  mkdirSync(join(dir, 'base'), { recursive: true });
  writeFileSync(
    join(dir, 'boilerplate.json'),
    JSON.stringify({
      schemaVersion: 1,
      name,
      version: '9.9.9',
      description: `overlay ${name}`,
    }),
  );
}

function makeOverlaySkill(home: string, bp: string, skill: string): void {
  const dir = join(home, '.skill-pack', 'skills', bp, skill);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify({
      schemaVersion: 1,
      name: skill,
      version: '9.9.9',
      description: `overlay ${skill} skill`,
    }),
  );
}

beforeEach(() => {
  const home = mkdtempSync(join(tmpdir(), 'skillpack-home-'));
  const bundled = mkdtempSync(join(tmpdir(), 'skillpack-bundled-'));
  ctx = {
    home,
    bundled,
    prevHome: process.env['HOME'],
    prevUserprofile: process.env['USERPROFILE'],
  };
  process.env['HOME'] = home;
  delete process.env['USERPROFILE'];
});

afterEach(() => {
  if (ctx.prevHome === undefined) delete process.env['HOME'];
  else process.env['HOME'] = ctx.prevHome;
  if (ctx.prevUserprofile === undefined) delete process.env['USERPROFILE'];
  else process.env['USERPROFILE'] = ctx.prevUserprofile;
  rmSync(ctx.home, { recursive: true, force: true });
  rmSync(ctx.bundled, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('resolveOverlayRoot', () => {
  it('returns undefined when ~/.skill-pack/ does not exist', () => {
    expect(resolveOverlayRoot()).toBeUndefined();
  });

  it('returns the dir when it exists', () => {
    mkdirSync(join(ctx.home, '.skill-pack'), { recursive: true });
    expect(resolveOverlayRoot()).toBe(join(ctx.home, '.skill-pack'));
  });
});

describe('listOverlayBoilerplates / listOverlaySkills', () => {
  it('returns [] when overlay root missing', () => {
    expect(listOverlayBoilerplates()).toEqual([]);
    expect(listOverlaySkills('react')).toEqual([]);
  });

  it('lists overlay boilerplates with base/ and skills with manifest.json', () => {
    makeOverlayBoilerplate(ctx.home, 'mybp');
    makeOverlaySkill(ctx.home, 'mybp', 'myskill');
    // A dir without base/ should be ignored.
    mkdirSync(join(ctx.home, '.skill-pack', 'boilerplates', 'incomplete'), { recursive: true });
    expect(listOverlayBoilerplates()).toEqual(['mybp']);
    expect(listOverlaySkills('mybp')).toEqual(['myskill']);
  });
});

describe('resolveOverlayBoilerplate / resolveOverlaySkill', () => {
  it('returns undefined when not present', () => {
    expect(resolveOverlayBoilerplate('nope')).toBeUndefined();
    expect(resolveOverlaySkill('nope', 'nope')).toBeUndefined();
  });

  it('resolves an overlay boilerplate with source: overlay', () => {
    makeOverlayBoilerplate(ctx.home, 'mybp');
    const r = resolveOverlayBoilerplate('mybp');
    expect(r).toBeDefined();
    expect(r!.source).toBe('overlay');
    expect(r!.manifest.version).toBe('9.9.9');
    expect(r!.baseDir).toBe(join(ctx.home, '.skill-pack', 'boilerplates', 'mybp', 'base'));
  });

  it('resolves an overlay skill with source: overlay', () => {
    makeOverlaySkill(ctx.home, 'react', 'cool-skill');
    const r = resolveOverlaySkill('react', 'cool-skill');
    expect(r).toBeDefined();
    expect(r!.source).toBe('overlay');
    expect(r!.manifest.version).toBe('9.9.9');
  });
});

describe('registry union (overlay + bundled)', () => {
  it('unions and dedupes boilerplates; bundled-only and overlay-only both appear', () => {
    makeBoilerplate(ctx.bundled, 'react', { skills: ['router'] });
    makeBoilerplate(ctx.bundled, 'vue');
    makeOverlayBoilerplate(ctx.home, 'svelte');
    const entries = listBoilerplatesWithSource(ctx.bundled);
    expect(entries.map((e) => `${e.name}:${e.source}`)).toEqual([
      'react:bundled',
      'svelte:overlay',
      'vue:bundled',
    ]);
    expect(entries.every((e) => !e.shadowsBundled)).toBe(true);
  });

  it('overlay shadows bundled on collision (one entry, marked shadowsBundled)', () => {
    makeBoilerplate(ctx.bundled, 'react');
    makeOverlayBoilerplate(ctx.home, 'react');
    const entries = listBoilerplatesWithSource(ctx.bundled);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ name: 'react', source: 'overlay', shadowsBundled: true });
  });

  it('resolveBoilerplate prefers overlay and emits a warning when shadowing', () => {
    makeBoilerplate(ctx.bundled, 'react');
    makeOverlayBoilerplate(ctx.home, 'react');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const r = resolveBoilerplate('react', ctx.bundled);
    expect(r.source).toBe('overlay');
    expect(r.manifest.version).toBe('9.9.9');
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]![0]).toMatch(/shadow/i);
  });

  it('resolveBoilerplate falls back to bundled with no warning when no overlay', () => {
    makeBoilerplate(ctx.bundled, 'react');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const r = resolveBoilerplate('react', ctx.bundled);
    expect(r.source).toBe('bundled');
    expect(warn).not.toHaveBeenCalled();
  });

  it('resolveSkill prefers overlay and warns when shadowing bundled', () => {
    makeBoilerplate(ctx.bundled, 'react', { skills: ['router'] });
    makeOverlaySkill(ctx.home, 'react', 'router');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const r = resolveSkill('react', 'router', ctx.bundled);
    expect(r.source).toBe('overlay');
    expect(r.manifest.version).toBe('9.9.9');
    expect(warn).toHaveBeenCalledOnce();
  });

  it('listSkillsWithSource unions overlay + bundled', () => {
    makeBoilerplate(ctx.bundled, 'react', { skills: ['router', 'forms'] });
    makeOverlaySkill(ctx.home, 'react', 'forms'); // shadow
    makeOverlaySkill(ctx.home, 'react', 'custom'); // overlay-only
    const entries = listSkillsWithSource('react', ctx.bundled);
    expect(entries.map((e) => `${e.name}:${e.source}:${e.shadowsBundled ?? false}`)).toEqual([
      'custom:overlay:false',
      'forms:overlay:true',
      'router:bundled:false',
    ]);
  });
});
