import { describe, it, expect } from 'vitest';
import { exec, expectFiles, fileSize, libScaffold, withTmpDir } from '../_helpers.js';

describe('react + satori end-to-end', () => {
  it('scaffolds, installs, typechecks, and generates an OG card PNG', async () => {
    await withTmpDir(async (dir) => {
      libScaffold({ boilerplate: 'react', skills: ['satori'], into: dir, install: false, host: 'both' });

      exec('pnpm install --ignore-workspace', dir);
      exec('pnpm typecheck', dir);

      // Satori's first run may need to fetch a font; retry once on flake.
      try {
        exec('pnpm og:generate', dir);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[retry] og:generate failed once, retrying:', (e as Error).message?.slice(0, 200));
        exec('pnpm og:generate', dir);
      }

      expectFiles(dir, ['public/og/card.png']);
      expect(fileSize(dir, 'public/og/card.png')).toBeGreaterThan(50 * 1024);
    });
  });
});
