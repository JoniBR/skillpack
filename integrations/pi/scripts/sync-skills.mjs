/**
 * Build step for @skill-pack/pi: copy meta-skills into ./skills/ so the
 * published package is self-contained. Run via `pnpm build` in this package.
 *
 * Source of truth for the meta-skills lives at the monorepo root in
 * `meta-skills/`. We copy them in rather than symlink so the published
 * tarball works after `npm install`.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const monorepoRoot = resolve(pkgRoot, '..', '..');

const sources = [
  { from: join(monorepoRoot, 'meta-skills', 'skill-creator'), to: join(pkgRoot, 'skills', 'skill-creator') },
  // Add boilerplate-creator and skill-migrator here when they exist (v0.2/v0.3).
];

const vendor = join(monorepoRoot, 'vendor', 'anthropic-skill-creator');
if (existsSync(vendor)) {
  sources.push({ from: vendor, to: join(pkgRoot, 'skills', 'anthropic-skill-creator') });
}

mkdirSync(join(pkgRoot, 'skills'), { recursive: true });

for (const { from, to } of sources) {
  if (!existsSync(from)) {
    console.warn(`[sync-skills] source missing, skipping: ${from}`);
    continue;
  }
  if (existsSync(to)) rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
  console.log(`[sync-skills] ${from} → ${to}`);
}

console.log('✔ pi extension skills synced.');
