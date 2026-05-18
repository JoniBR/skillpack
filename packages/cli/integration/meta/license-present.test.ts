/**
 * meta/license-present.test.ts
 *
 * Repo-root LICENSE is MIT, and every publishable package declares
 * license: MIT and either ships its own LICENSE file or has the root
 * LICENSE wired into its publish flow (the CLI package gets it via its
 * `files: ["LICENSE"]` entry; see packages/cli/package.json).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../_helpers.js';

const publishable = [
  'packages/cli',
  'integrations/claude-code',
  'integrations/pi',
];

describe('repo-root LICENSE', () => {
  it('exists, is MIT, starts with "MIT License"', () => {
    const p = join(REPO_ROOT, 'LICENSE');
    expect(existsSync(p), `missing root LICENSE`).toBe(true);
    const text = readFileSync(p, 'utf8');
    expect(text.startsWith('MIT License'), `LICENSE must start with "MIT License"`).toBe(true);
    expect(text).toMatch(/MIT/);
  });
});

describe('publishable packages', () => {
  it.each(publishable.map((rel) => ({ label: rel, rel })))(
    '$label declares license: MIT and ships a LICENSE',
    ({ rel }) => {
      const pkgDir = join(REPO_ROOT, rel);
      const pkgJsonPath = join(pkgDir, 'package.json');
      expect(existsSync(pkgJsonPath), `missing ${pkgJsonPath}`).toBe(true);
      const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as {
        license?: string;
        files?: string[];
      };
      expect(pkg.license, `${rel}/package.json must declare "license": "MIT"`).toBe('MIT');

      const ownLicense =
        existsSync(join(pkgDir, 'LICENSE')) ||
        existsSync(join(pkgDir, 'LICENSE.txt')) ||
        existsSync(join(pkgDir, 'LICENSE.md'));
      const filesIncludesLicense = Array.isArray(pkg.files)
        ? pkg.files.some((f) => /^LICENSE(\b|$)/.test(f))
        : false;
      expect(
        ownLicense || filesIncludesLicense,
        `${rel} ships no LICENSE file and package.json#files does not name LICENSE — npm tarball will omit license text`,
      ).toBe(true);
    },
  );
});
