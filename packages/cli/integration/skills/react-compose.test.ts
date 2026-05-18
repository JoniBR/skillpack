import { describe, it, expect } from 'vitest';
import { exec, expectFiles, fileSize, libScaffold, withTmpDir } from '../_helpers.js';

/**
 * The "compose" test exercises all three react sub-skills together. It would
 * catch marker collisions, jsonPatch script collisions, file-overlay claim
 * conflicts, or AGENTS.md/manifest interleaving regressions that single-skill
 * tests can't see.
 */
describe('react + remotion + recharts + satori (compose)', () => {
  it('scaffolds all three skills together and produces every artefact', async () => {
    await withTmpDir(async (dir) => {
      // libScaffold throws on overlay/marker conflicts — so reaching the
      // install step is itself an assertion that the three skills compose.
      libScaffold({
        boilerplate: 'react',
        skills: ['remotion', 'recharts', 'satori'],
        into: dir,
        install: false,
        host: 'both',
      });

      exec('pnpm install --ignore-workspace', dir);
      exec('pnpm typecheck', dir);
      exec('pnpm test', dir);
      exec('pnpm build', dir);

      // video render — may download Chrome on first run.
      try {
        exec('pnpm video:render', dir);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[retry] video:render failed once, retrying:', (e as Error).message?.slice(0, 200));
        exec('pnpm video:render', dir);
      }

      try {
        exec('pnpm og:generate', dir);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[retry] og:generate failed once, retrying:', (e as Error).message?.slice(0, 200));
        exec('pnpm og:generate', dir);
      }

      expectFiles(dir, ['dist/index.html', 'out/video.mp4', 'public/og/card.png']);
      expect(fileSize(dir, 'out/video.mp4')).toBeGreaterThan(100 * 1024);
      expect(fileSize(dir, 'public/og/card.png')).toBeGreaterThan(50 * 1024);
    });
  });
});
