/**
 * Tier 1b CLI integration tests — AGENTS.md round-trip across two scaffolded projects.
 */
import { describe, expect, it } from 'vitest';
import { parseAgentsMd } from '../../src/agents-md.js';
import { ProjectManifestSchema } from '../../src/schema.js';
import { libScaffold, readUtf8, withTmpDir } from '../_helpers.js';

const BASE = { install: false as const, host: 'both' as const };

describe('AGENTS.md cross-project round-trip', () => {
  it('two scaffolds with the same args yield matching schemaVersion/boilerplate/skills', async () => {
    await withTmpDir(async (dirA) => {
      await withTmpDir(async (dirB) => {
        libScaffold({
          boilerplate: 'react',
          skills: ['remotion'],
          into: dirA,
          ...BASE,
        });
        libScaffold({
          boilerplate: 'react',
          skills: ['remotion'],
          into: dirB,
          ...BASE,
        });

        const mA = parseAgentsMd(readUtf8(dirA, 'AGENTS.md'));
        const mB = parseAgentsMd(readUtf8(dirB, 'AGENTS.md'));
        expect(mA).toBeDefined();
        expect(mB).toBeDefined();

        expect(mA!.schemaVersion).toBe(mB!.schemaVersion);
        expect(mA!.boilerplate).toEqual(mB!.boilerplate);
        expect(mA!.skills.map((s) => ({ name: s.name, version: s.version }))).toEqual(
          mB!.skills.map((s) => ({ name: s.name, version: s.version })),
        );
        expect(mA!.skills.map((s) => s.contentHash)).toEqual(mB!.skills.map((s) => s.contentHash));
      });
    });
  });

  it('the embedded manifest validates against ProjectManifestSchema', async () => {
    await withTmpDir(async (dir) => {
      libScaffold({
        boilerplate: 'react',
        skills: ['remotion', 'recharts'],
        into: dir,
        ...BASE,
      });
      const m = parseAgentsMd(readUtf8(dir, 'AGENTS.md'));
      expect(m).toBeDefined();
      const parsed = ProjectManifestSchema.parse(m);
      expect(parsed.boilerplate.name).toBe('react');
      expect(parsed.skills.map((s) => s.name).sort()).toEqual(['recharts', 'remotion']);
    });
  });
});
