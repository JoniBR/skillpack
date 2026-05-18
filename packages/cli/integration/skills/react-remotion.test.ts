import { execSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';
import { exec, expectFiles, fileSize, libScaffold, withTmpDir } from '../_helpers.js';

/**
 * Retry helper: framework first-run downloads (Remotion's Chrome Headless
 * Shell ~94MB) can fail transiently. Run `fn` once, retry once on throw.
 */
function withRetry(label: string, fn: () => void): void {
  try {
    fn();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`[retry] ${label} failed once, retrying:`, (e as Error).message?.slice(0, 200));
    fn();
  }
}

describe('react + remotion end-to-end', () => {
  it('scaffolds, installs, builds, renders MP4, honours OUT override, and gitignores output', async () => {
    await withTmpDir(async (dir) => {
      libScaffold({ boilerplate: 'react', skills: ['remotion'], into: dir, install: false, host: 'both' });

      exec('pnpm install --ignore-workspace', dir);
      exec('pnpm typecheck', dir);
      exec('pnpm test', dir);
      exec('pnpm build', dir);

      // Default render → out/video.mp4. May download Chrome Headless on first run.
      withRetry('video:render default', () => exec('pnpm video:render', dir));
      expectFiles(dir, ['out/video.mp4']);
      expect(fileSize(dir, 'out/video.mp4')).toBeGreaterThan(100 * 1024);

      // Env-var override.
      exec('pnpm video:render', dir, { OUT: 'out/jetpack.mp4' });
      expectFiles(dir, ['out/jetpack.mp4']);
      expect(fileSize(dir, 'out/jetpack.mp4')).toBeGreaterThan(100 * 1024);

      // out/.gitignore must shield rendered MP4s from git. scaffold() already
      // ran `git init` + initial commit, so just stage current state and list.
      const tracked = execSync('git add -A && git ls-files out/', {
        cwd: dir,
        encoding: 'utf8',
      })
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      expect(tracked).toEqual(['out/.gitignore']);
    });
  });
});
