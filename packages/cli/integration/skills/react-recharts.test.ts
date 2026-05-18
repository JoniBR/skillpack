import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { exec, libScaffold, withTmpDir } from '../_helpers.js';

describe('react + recharts end-to-end', () => {
  it('scaffolds, installs, typechecks, tests cleanly, and ships an accessible chart bundle', async () => {
    await withTmpDir(async (dir) => {
      libScaffold({ boilerplate: 'react', skills: ['recharts'], into: dir, install: false, host: 'both' });

      exec('pnpm install --ignore-workspace', dir);
      exec('pnpm typecheck', dir);

      // Capture combined stdio so we can scan for recharts width/height warnings,
      // which would indicate the responsive container in <Dashboard /> failed.
      const testOut = execSync('pnpm test 2>&1', {
        cwd: dir,
        encoding: 'utf8',
        env: process.env,
      });
      expect(testOut).not.toMatch(/width\(0\) and height\(0\) of chart/);

      exec('pnpm build', dir);

      // Locate the hashed dist/assets/index-*.js bundle.
      const assetsDir = join(dir, 'dist', 'assets');
      const bundle = readdirSync(assetsDir).find(
        (f) => /^index-.*\.js$/.test(f),
      );
      expect(bundle, `expected dist/assets/index-*.js in ${assetsDir}`).toBeTruthy();
      const bundleSrc = readFileSync(join(assetsDir, bundle!), 'utf8');
      // Proves the scaffolded Dashboard's a11y prop made it into the bundle.
      expect(bundleSrc).toContain('accessibilityLayer');
    });
  });
});
