/**
 * meta/vendor-attribution.test.ts
 *
 * Every `upstream/` directory under boilerplates/ and `vendor/` must
 * carry attribution: a VENDOR.md (with github.com URL), a `.vendor-commit`
 * with a 40-char hex SHA, and (if upstream shipped a license) the LICENSE
 * file must be preserved in the vendored copy.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../_helpers.js';

const SHA_RE = /\b[0-9a-f]{40}\b/;

function findUpstreamDirs(root: string, out: string[] = []): string[] {
  if (!existsSync(root)) return out;
  for (const entry of readdirSync(root)) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
    const p = join(root, entry);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    if (entry === 'upstream') out.push(p);
    else findUpstreamDirs(p, out);
  }
  return out;
}

const vendoredRoots: string[] = [];
// upstream/ dirs anywhere under boilerplates/
findUpstreamDirs(join(REPO_ROOT, 'boilerplates'), vendoredRoots);
// vendor/* is itself the "upstream" dir per-package
const vendorRoot = join(REPO_ROOT, 'vendor');
if (existsSync(vendorRoot)) {
  for (const entry of readdirSync(vendorRoot)) {
    const p = join(vendorRoot, entry);
    if (statSync(p).isDirectory()) vendoredRoots.push(p);
  }
}

const rows = vendoredRoots.map((p) => ({
  label: relative(REPO_ROOT, p),
  dir: p,
}));

describe('vendor attribution', () => {
  if (rows.length === 0) {
    it('(no vendored upstream dirs found)', () => {
      expect(true).toBe(true);
    });
    return;
  }
  it.each(rows)('$label has VENDOR.md + .vendor-commit + license preserved', ({ dir }) => {
    const vendorMd = join(dir, 'VENDOR.md');
    const vendorCommit = join(dir, '.vendor-commit');
    expect(existsSync(vendorMd), `missing VENDOR.md in ${dir}`).toBe(true);
    expect(existsSync(vendorCommit), `missing .vendor-commit in ${dir}`).toBe(true);
    const md = readFileSync(vendorMd, 'utf8');
    expect(md, 'VENDOR.md must reference an upstream github.com URL').toMatch(/github\.com/);
    const commit = readFileSync(vendorCommit, 'utf8').trim();
    expect(commit, `bad SHA in .vendor-commit: ${JSON.stringify(commit)}`).toMatch(SHA_RE);
    // License preservation: if any LICENSE* file exists, fine. The rule is
    // "if upstream had one, preserve it"; we can't know upstream from here,
    // but for every vendored copy we observed, a license file is expected.
    const hasLicense =
      existsSync(join(dir, 'LICENSE')) ||
      existsSync(join(dir, 'LICENSE.txt')) ||
      existsSync(join(dir, 'LICENSE.md')) ||
      existsSync(join(dir, 'LICENSE.repo.txt')) ||
      // NOTICE.md is acceptable when upstream itself shipped no LICENSE
      // (e.g. remotion-dev/skills at the vendored commit). Documenting
      // that explicitly is the best we can do.
      existsSync(join(dir, 'NOTICE.md')) ||
      existsSync(join(dir, 'NOTICE'));
    expect(
      hasLicense,
      `no LICENSE / LICENSE.md / NOTICE.md under ${dir} — if upstream lacks a license, add NOTICE.md documenting that`,
    ).toBe(true);
  });
});
