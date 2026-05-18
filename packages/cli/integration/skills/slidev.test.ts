import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { exec, expectFiles, libScaffold, withTmpDir } from '../_helpers.js';

function countFilesRec(dir: string): number {
  let n = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) n += countFilesRec(full);
    else n += 1;
  }
  return n;
}

describe('slidev boilerplate end-to-end', () => {
  it('scaffolds, installs, builds, and ships the upstream skill references tree', async () => {
    await withTmpDir(async (dir) => {
      libScaffold({ boilerplate: 'slidev', skills: [], into: dir, install: false, host: 'both' });

      exec('pnpm install --ignore-workspace', dir);
      exec('pnpm build', dir);

      expectFiles(dir, ['dist/index.html']);

      // The boilerplate-aux pass must have copied upstream/ into each host's
      // skill tree. Check the claude side for ≥50 reference files.
      const refsDir = join(dir, '.claude', 'skills', 'slidev', 'upstream', 'references');
      const count = countFilesRec(refsDir);
      expect(count).toBeGreaterThanOrEqual(50);
    });
  });
});
