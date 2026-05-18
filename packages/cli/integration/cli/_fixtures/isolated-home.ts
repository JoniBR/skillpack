/**
 * Build a per-file isolated HOME that mirrors the repo's bundled boilerplates
 * into `<tmpHome>/.skill-pack/` so resolveOverlay{Boilerplate,Skill} can
 * satisfy lookups from a stable location.
 *
 * Why: the meta `npm-pack-dryrun.test.ts` runs `scripts/copy-bundled.mjs` in
 * its beforeAll, which momentarily `rmSync`s `packages/cli/boilerplates/`.
 * Library scaffold calls (and the dist CLI) resolve to that path first via
 * resolveBundledRoot(), so concurrent test files race against the
 * delete-then-copy window. Re-rooting tests through an overlay HOME makes
 * them immune to that race because overlay resolution wins and reads from a
 * directory only this file owns.
 *
 * Test files that depend on bundled boilerplates/skills should call
 * `setupIsolatedHome()` in `beforeAll` and `tearDownIsolatedHome()` in
 * `afterAll`. The returned `home` is also exported via process.env.HOME for
 * library calls; pass it explicitly into `runCli(..., { HOME, USERPROFILE })`
 * for subprocess tests.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from '../../_helpers.js';

export interface IsolatedHome {
  home: string;
  /** Restore previous HOME / USERPROFILE values and remove the tmp dir. */
  cleanup: () => void;
}

/**
 * Snapshot REPO_ROOT/boilerplates into a fresh tmpHome's overlay layout:
 *   - <home>/.skill-pack/boilerplates/<bp>/...   (full copy)
 *   - <home>/.skill-pack/skills/<bp>/<skill>/... (mirrors bundled skills)
 *
 * Mutates process.env.HOME (and USERPROFILE on Windows) for the duration.
 */
export function setupIsolatedHome(): IsolatedHome {
  const home = mkdtempSync(join(tmpdir(), 'skillpack-isohome-'));
  const overlayBpRoot = join(home, '.skill-pack', 'boilerplates');
  const overlaySkillRoot = join(home, '.skill-pack', 'skills');
  mkdirSync(overlayBpRoot, { recursive: true });
  mkdirSync(overlaySkillRoot, { recursive: true });

  const src = join(REPO_ROOT, 'boilerplates');
  for (const bp of readdirSync(src)) {
    const bpSrc = join(src, bp);
    if (!safeIsDir(bpSrc)) continue;
    if (!existsSync(join(bpSrc, 'base'))) continue;
    cpSync(bpSrc, join(overlayBpRoot, bp), { recursive: true });
    const skillsSrc = join(bpSrc, 'skills');
    if (existsSync(skillsSrc) && safeIsDir(skillsSrc)) {
      for (const skill of readdirSync(skillsSrc)) {
        const skSrc = join(skillsSrc, skill);
        if (!safeIsDir(skSrc)) continue;
        if (!existsSync(join(skSrc, 'manifest.json'))) continue;
        cpSync(skSrc, join(overlaySkillRoot, bp, skill), { recursive: true });
      }
    }
  }

  const prevHome = process.env['HOME'];
  const prevUserProfile = process.env['USERPROFILE'];
  // Set git author identity for the scaffold's `git init && git commit`.
  // The tmp HOME has no ~/.gitconfig, so without these env vars the commit
  // would fail with 'Please tell me who you are.'
  const prevGitName = process.env['GIT_AUTHOR_NAME'];
  const prevGitEmail = process.env['GIT_AUTHOR_EMAIL'];
  const prevGitCommitterName = process.env['GIT_COMMITTER_NAME'];
  const prevGitCommitterEmail = process.env['GIT_COMMITTER_EMAIL'];
  process.env['HOME'] = home;
  process.env['USERPROFILE'] = home;
  process.env['GIT_AUTHOR_NAME'] = 'skillpack test';
  process.env['GIT_AUTHOR_EMAIL'] = 'test@skillpack.invalid';
  process.env['GIT_COMMITTER_NAME'] = 'skillpack test';
  process.env['GIT_COMMITTER_EMAIL'] = 'test@skillpack.invalid';

  return {
    home,
    cleanup: () => {
      const restore = (k: string, v: string | undefined): void => {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      };
      restore('HOME', prevHome);
      restore('USERPROFILE', prevUserProfile);
      restore('GIT_AUTHOR_NAME', prevGitName);
      restore('GIT_AUTHOR_EMAIL', prevGitEmail);
      restore('GIT_COMMITTER_NAME', prevGitCommitterName);
      restore('GIT_COMMITTER_EMAIL', prevGitCommitterEmail);
      rmSync(home, { recursive: true, force: true });
    },
  };
}

function safeIsDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}
