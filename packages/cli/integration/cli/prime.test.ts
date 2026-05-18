/**
 * Tier 1b CLI integration tests — `prime` library + CLI smoke.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prime } from '../../src/prime.js';
import { libScaffold, runCli, withTmpDir } from '../_helpers.js';
import { setupIsolatedHome, type IsolatedHome } from './_fixtures/isolated-home.js';

const BASE = { install: false as const, host: 'both' as const };

let iso: IsolatedHome;
beforeAll(() => {
  iso = setupIsolatedHome();
});
afterAll(() => {
  iso?.cleanup();
});

describe('prime (library)', () => {
  it('returns a string containing the base skill body (frontmatter stripped)', () => {
    const out = prime({ boilerplate: 'react', skills: [] });
    expect(typeof out).toBe('string');
    // base-skill content should be present, frontmatter delimiter should not
    // appear at the start of the embedded skill body
    expect(out).toContain('# react (skillpack base)');
    expect(out).toContain('## Boilerplate: react');
  });

  it('includes a tree section when projectDir is provided', async () => {
    await withTmpDir(async (dir) => {
      libScaffold({ boilerplate: 'react', skills: [], into: dir, ...BASE });
      const withTree = prime({ boilerplate: 'react', skills: [], projectDir: dir });
      const noTree = prime({ boilerplate: 'react', skills: [] });
      expect(withTree).toContain('## Project tree');
      expect(noTree).not.toContain('## Project tree');
    });
  });

  it('includes skill content (remotion)', () => {
    const out = prime({ boilerplate: 'react', skills: ['remotion'] });
    expect(out.toLowerCase()).toContain('remotion');
    expect(out).toContain('## Skill: remotion');
  });

  it('still works with an empty skills list', () => {
    const out = prime({ boilerplate: 'react', skills: [] });
    expect(out).toContain('## Boilerplate: react');
    expect(out).not.toContain('## Skill:');
  });
});

describe('prime (CLI smoke)', () => {
  it('runCli([prime …]) exits 0 and mirrors the library output', async () => {
    await withTmpDir(async (dir) => {
      const result = runCli(
        ['prime', '--boilerplate', 'react', '--skills', 'remotion', '--project', dir],
        dir,
        { HOME: iso.home, USERPROFILE: iso.home },
      );
      expect(result.exitCode).toBe(0);
      const libOut = prime({
        boilerplate: 'react',
        skills: ['remotion'],
        projectDir: dir,
      });
      expect(result.stdout).toBe(libOut);
    });
  });
});
