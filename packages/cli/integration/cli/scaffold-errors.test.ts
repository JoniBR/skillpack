/**
 * Tier 1b CLI integration tests — failure paths for libScaffold().
 *
 * Uses a file-level isolated HOME that snapshots the bundled boilerplates as
 * overlay entries so resolution doesn't race the meta `copy-bundled` test.
 * Per-test overlay skills are written into the same home then removed.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { libScaffold, withTmpDir } from '../_helpers.js';
import { setupIsolatedHome, type IsolatedHome } from './_fixtures/isolated-home.js';

const BASE = { install: false as const, host: 'both' as const };

let iso: IsolatedHome;
beforeAll(() => {
  iso = setupIsolatedHome();
});
afterAll(() => {
  iso?.cleanup();
});

function writeOverlaySkill(
  home: string,
  name: string,
  manifest: Record<string, unknown>,
  filesContent?: Record<string, string>,
): string {
  const skillDir = join(home, '.skill-pack', 'skills', 'react', name);
  mkdirSync(skillDir, { recursive: true });
  if (filesContent) {
    for (const [rel, content] of Object.entries(filesContent)) {
      const dest = join(skillDir, rel);
      mkdirSync(join(dest, '..'), { recursive: true });
      writeFileSync(dest, content, 'utf8');
    }
  }
  writeFileSync(
    join(skillDir, 'manifest.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        name,
        version: '0.0.1',
        description: `fixture ${name}`,
        ...manifest,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(skillDir, 'SKILL.md'),
    `---\nname: react-${name}\ndescription: fixture.\n---\n\n# ${name}\n`,
  );
  return skillDir;
}

describe('scaffold (failure paths)', () => {
  it('unknown boilerplate lists available boilerplates in the error', async () => {
    await withTmpDir(async (dir) => {
      try {
        libScaffold({ boilerplate: 'does-not-exist', skills: [], into: dir, ...BASE });
        throw new Error('expected libScaffold to throw');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        expect(msg).toMatch(/unknown boilerplate/i);
        expect(msg).toMatch(/react/);
      }
    });
  });

  it('unknown skill lists available skills for that boilerplate', async () => {
    await withTmpDir(async (dir) => {
      try {
        libScaffold({
          boilerplate: 'react',
          skills: ['nope-skill'],
          into: dir,
          ...BASE,
        });
        throw new Error('expected libScaffold to throw');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        expect(msg).toMatch(/unknown skill "nope-skill"/i);
        expect(msg).toMatch(/remotion|recharts|satori/);
      }
    });
  });
});

describe('scaffold (overlay collision)', () => {
  const fixtures: string[] = [];
  afterAll(() => {
    for (const d of fixtures) rmSync(d, { recursive: true, force: true });
  });

  it('throws naming the conflicting destination path', async () => {
    for (const name of ['collide-a', 'collide-b']) {
      fixtures.push(
        writeOverlaySkill(
          iso.home,
          name,
          { files: [{ from: 'files/thing.txt', to: 'src/thing.txt' }] },
          { 'files/thing.txt': `from ${name}\n` },
        ),
      );
    }
    await withTmpDir(async (dir) => {
      try {
        libScaffold({
          boilerplate: 'react',
          skills: ['collide-a', 'collide-b'],
          into: dir,
          ...BASE,
        });
        throw new Error('expected collision error');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        expect(msg).toMatch(/conflict/i);
        expect(msg).toContain('src/thing.txt');
      }
    });
  });
});

describe('scaffold (jsonPatch + marker target validation)', () => {
  const fixtures: string[] = [];
  afterAll(() => {
    for (const d of fixtures) rmSync(d, { recursive: true, force: true });
  });

  it('jsonPatch on a missing file throws with the missing path', async () => {
    fixtures.push(
      writeOverlaySkill(iso.home, 'missing-patch', {
        jsonPatches: [{ file: 'no-such.json', merge: { x: 1 } }],
      }),
    );
    await withTmpDir(async (dir) => {
      expect(() =>
        libScaffold({
          boilerplate: 'react',
          skills: ['missing-patch'],
          into: dir,
          ...BASE,
        }),
      ).toThrow(/no-such\.json/);
    });
  });

  it('marker targeting an unknown marker throws MarkerNotFoundError', async () => {
    fixtures.push(
      writeOverlaySkill(iso.home, 'bad-marker', {
        markers: [
          {
            file: 'src/App.tsx',
            marker: 'nonexistent-marker-xyz',
            insert: '<Nope />',
          },
        ],
      }),
    );
    await withTmpDir(async (dir) => {
      expect(() =>
        libScaffold({
          boilerplate: 'react',
          skills: ['bad-marker'],
          into: dir,
          ...BASE,
        }),
      ).toThrow(/@skillpack:nonexistent-marker-xyz/);
    });
  });
});
