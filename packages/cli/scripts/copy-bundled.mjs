/**
 * Pre-publish: stage repo-root bundled assets inside packages/cli/ so the
 * published npm tarball is self-contained.
 *
 * Source of truth lives at the monorepo root (boilerplates/, meta-skills/,
 * vendor/) — keeping it there means the rest of the workspace can reference
 * a single canonical copy. This script mirrors those into packages/cli/
 * right before publish; the staged copies are gitignored.
 *
 * Runs as `prepublishOnly` so it's automatic for `npm publish` and
 * `changeset publish`.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const monorepoRoot = resolve(pkgRoot, '..', '..');

const sources = [
  { from: 'boilerplates', to: 'boilerplates' },
  { from: 'meta-skills', to: 'meta-skills' },
  { from: 'vendor', to: 'vendor' },
];

for (const { from, to } of sources) {
  const src = join(monorepoRoot, from);
  const dst = join(pkgRoot, to);
  if (!existsSync(src)) {
    console.warn(`[copy-bundled] source missing, skipping: ${src}`);
    continue;
  }
  if (existsSync(dst)) rmSync(dst, { recursive: true, force: true });
  mkdirSync(dirname(dst), { recursive: true });
  cpSync(src, dst, { recursive: true });
  console.log(`[copy-bundled] ${from}/ → packages/cli/${to}/`);
}

console.log('✔ Bundled assets staged for publish.');
