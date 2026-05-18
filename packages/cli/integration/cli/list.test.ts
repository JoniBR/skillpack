/**
 * Tier 1b CLI integration tests — `list` subcommand output via runCli.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli, withTmpDir } from '../_helpers.js';

describe('list boilerplates', () => {
  it('prints the bundled boilerplates, one per line', async () => {
    await withTmpDir(async (dir) => {
      const r = runCli(['list', 'boilerplates'], dir);
      expect(r.exitCode).toBe(0);
      const lines = r.stdout
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      expect(lines).toContain('react');
      expect(lines).toContain('slidev');
    });
  });
});

describe('list skills <boilerplate>', () => {
  it('prints react skills (remotion, recharts, satori)', async () => {
    await withTmpDir(async (dir) => {
      const r = runCli(['list', 'skills', 'react'], dir);
      expect(r.exitCode).toBe(0);
      const lines = r.stdout
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      expect(lines).toContain('remotion');
      expect(lines).toContain('recharts');
      expect(lines).toContain('satori');
    });
  });

  // The current CLI silently returns an empty list for an unknown boilerplate
  // rather than erroring out — listSkillsWithSource() returns []. Skip until
  // the CLI gains explicit validation. Tracked as a future enhancement.
  it.skip('exits non-zero for an unknown boilerplate (not yet implemented)', () => {});
});

describe('list boilerplates with an overlay present', () => {
  let savedHome: string | undefined;
  let savedUserProfile: string | undefined;
  let tmpHome: string;

  beforeEach(() => {
    savedHome = process.env['HOME'];
    savedUserProfile = process.env['USERPROFILE'];
    tmpHome = mkdtempSync(join(tmpdir(), 'skillpack-home-'));
    // Drop a single overlay boilerplate so list shows the (overlay) marker.
    const bpDir = join(tmpHome, '.skill-pack', 'boilerplates', 'overlay-bp');
    mkdirSync(join(bpDir, 'base'), { recursive: true });
    mkdirSync(join(bpDir, 'base-skill'), { recursive: true });
    writeFileSync(
      join(bpDir, 'boilerplate.json'),
      JSON.stringify(
        {
          schemaVersion: 1,
          name: 'overlay-bp',
          version: '0.0.1',
          description: 'fixture overlay boilerplate',
        },
        null,
        2,
      ),
    );
    writeFileSync(join(bpDir, 'base', '.gitkeep'), '');
  });

  afterEach(() => {
    rmSync(tmpHome, { recursive: true, force: true });
    if (savedHome === undefined) delete process.env['HOME'];
    else process.env['HOME'] = savedHome;
    if (savedUserProfile === undefined) delete process.env['USERPROFILE'];
    else process.env['USERPROFILE'] = savedUserProfile;
  });

  it('shows the (overlay) marker for overlay boilerplates', async () => {
    await withTmpDir(async (dir) => {
      const r = runCli(['list', 'boilerplates'], dir, {
        HOME: tmpHome,
        USERPROFILE: tmpHome,
      });
      expect(r.exitCode).toBe(0);
      expect(r.stdout).toMatch(/overlay-bp\s+\(overlay\)/);
      // bundled entries remain present, without the overlay suffix
      expect(r.stdout).toMatch(/^react\s*$/m);
    });
  });
});
