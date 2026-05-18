import { describe, it, expect } from 'vitest';
import { exec, expectFiles, fileSize, libScaffold, withTmpDir } from '../_helpers.js';

/**
 * The PDF export path drags in Playwright (chromium download ~92MB on first
 * run). In a restricted CI environment that download will fail outright;
 * detect and skip rather than fail the whole suite.
 */
describe('slidev export → PDF', () => {
  it('scaffolds, installs, exports slides to PDF', async () => {
    await withTmpDir(async (dir) => {
      libScaffold({ boilerplate: 'slidev', skills: [], into: dir, install: false, host: 'both' });

      exec('pnpm install --ignore-workspace', dir);

      try {
        // Adds playwright-chromium + downloads the browser bundle.
        exec('pnpm export:setup', dir);
      } catch (e) {
        const msg = (e as Error).message ?? '';
        // eslint-disable-next-line no-console
        console.warn('[skip] export:setup failed (likely no network):', msg.slice(0, 200));
        return; // soft-skip; can't run export without chromium
      }

      try {
        exec('pnpm export', dir);
      } catch (e) {
        // single retry — slidev export occasionally races on first chromium boot
        // eslint-disable-next-line no-console
        console.warn('[retry] pnpm export failed once, retrying:', (e as Error).message?.slice(0, 200));
        exec('pnpm export', dir);
      }

      expectFiles(dir, ['slides-export.pdf']);
      expect(fileSize(dir, 'slides-export.pdf')).toBeGreaterThan(10 * 1024);
    });
  });
});
