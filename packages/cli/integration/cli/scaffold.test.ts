/**
 * Tier 1b CLI integration tests — the core `scaffold` library entry point.
 * Uses libScaffold() for speed; real fs + real bundled boilerplates/skills;
 * no `pnpm install`.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseAgentsMd } from '../../src/agents-md.js';
import {
  exec,
  expectFiles,
  expectNoFiles,
  libScaffold,
  readUtf8,
  withTmpDir,
} from '../_helpers.js';
import { setupIsolatedHome, type IsolatedHome } from './_fixtures/isolated-home.js';

const BASE = { install: false as const, host: 'both' as const };

let iso: IsolatedHome;
beforeAll(() => {
  iso = setupIsolatedHome();
});
afterAll(() => {
  iso?.cleanup();
});

describe('scaffold (react base)', () => {
  it('drops the expected file set into an empty cwd', async () => {
    await withTmpDir(async (dir) => {
      libScaffold({ boilerplate: 'react', skills: ['remotion'], into: dir, ...BASE });
      expectFiles(dir, [
        'AGENTS.md',
        'src/App.tsx',
        'package.json',
        'vite.config.ts',
        '.gitignore',
        '.claude/skills/react/SKILL.md',
        '.pi/skills/react/SKILL.md',
        '.skillpack/state',
      ]);
    });
  });

  it('refuses to scaffold into a non-empty cwd without force', async () => {
    await withTmpDir(async (dir) => {
      writeFileSync(join(dir, 'preexisting.txt'), 'hi', 'utf8');
      expect(() => libScaffold({ boilerplate: 'react', skills: [], into: dir, ...BASE })).toThrow(
        /not empty/i,
      );
    });
  });

  it('scaffolds into a non-empty cwd when force=true', async () => {
    await withTmpDir(async (dir) => {
      writeFileSync(join(dir, 'preexisting.txt'), 'hi', 'utf8');
      libScaffold({
        boilerplate: 'react',
        skills: [],
        into: dir,
        force: true,
        ...BASE,
      });
      expectFiles(dir, ['package.json', 'AGENTS.md', 'preexisting.txt']);
    });
  });
});

describe('scaffold (react + remotion)', () => {
  it('lays down SKILL.md, files, deps, scripts, and marker insertion', async () => {
    await withTmpDir(async (dir) => {
      libScaffold({ boilerplate: 'react', skills: ['remotion'], into: dir, ...BASE });

      expectFiles(dir, [
        '.claude/skills/react-remotion/SKILL.md',
        '.pi/skills/react-remotion/SKILL.md',
        'src/video/Root.tsx',
        'src/video/MyVideo.tsx',
        'src/components/VideoPreview.tsx',
        'remotion.config.ts',
      ]);

      const pkg = JSON.parse(readUtf8(dir, 'package.json'));
      expect(pkg.dependencies?.remotion).toBeTruthy();
      expect(pkg.scripts?.['video:render']).toContain('remotion render');

      const app = readUtf8(dir, 'src/App.tsx');
      expect(app).toContain('<VideoPreview />');
      // mount marker is still present after insertion
      expect(app).toContain('@skillpack:mount');
    });
  });
});

describe('scaffold host targeting', () => {
  it('host=claude writes .claude/skills only', async () => {
    await withTmpDir(async (dir) => {
      libScaffold({
        boilerplate: 'react',
        skills: [],
        into: dir,
        install: false,
        host: 'claude',
      });
      expectFiles(dir, ['.claude/skills/react/SKILL.md']);
      expectNoFiles(dir, ['.pi/skills/react/SKILL.md', '.pi']);
    });
  });

  it('host=pi writes .pi/skills only', async () => {
    await withTmpDir(async (dir) => {
      libScaffold({
        boilerplate: 'react',
        skills: [],
        into: dir,
        install: false,
        host: 'pi',
      });
      expectFiles(dir, ['.pi/skills/react/SKILL.md']);
      expectNoFiles(dir, ['.claude/skills/react/SKILL.md', '.claude']);
    });
  });

  it("host='both' (default) writes both", async () => {
    await withTmpDir(async (dir) => {
      libScaffold({ boilerplate: 'react', skills: [], into: dir, ...BASE });
      expectFiles(dir, ['.claude/skills/react/SKILL.md', '.pi/skills/react/SKILL.md']);
    });
  });
});

describe('scaffold state + AGENTS.md + git', () => {
  it('writes .skillpack/state/<skill>.json with name/version/contentHash/source', async () => {
    await withTmpDir(async (dir) => {
      libScaffold({
        boilerplate: 'react',
        skills: ['remotion', 'recharts'],
        into: dir,
        ...BASE,
      });
      for (const name of ['remotion', 'recharts']) {
        const state = JSON.parse(readUtf8(dir, `.skillpack/state/${name}.json`));
        expect(state.name).toBe(name);
        expect(typeof state.version).toBe('string');
        expect(typeof state.contentHash).toBe('string');
        // Source can be 'bundled' or 'overlay' depending on whether the test
        // harness has populated the overlay (see _fixtures/isolated-home.ts).
        // We assert it's one of the valid values, not which one.
        expect(['bundled', 'overlay']).toContain(state.source);
      }
    });
  });

  it('AGENTS.md round-trips through parseAgentsMd', async () => {
    await withTmpDir(async (dir) => {
      const result = libScaffold({
        boilerplate: 'react',
        skills: ['remotion'],
        into: dir,
        ...BASE,
      });
      const md = readUtf8(dir, 'AGENTS.md');
      const parsed = parseAgentsMd(md);
      expect(parsed).toBeDefined();
      expect(parsed).toEqual(result.manifest);
    });
  });

  it('initialises git and creates a single initial commit', async () => {
    await withTmpDir(async (dir) => {
      libScaffold({ boilerplate: 'react', skills: [], into: dir, ...BASE });
      expect(existsSync(join(dir, '.git'))).toBe(true);
      const lines = exec('git log --oneline', dir).trim().split('\n').filter(Boolean);
      expect(lines.length).toBe(1);
    });
  });

  it('install:false does not create node_modules', async () => {
    await withTmpDir(async (dir) => {
      libScaffold({ boilerplate: 'react', skills: [], into: dir, ...BASE });
      expectNoFiles(dir, ['node_modules']);
    });
  });
});
