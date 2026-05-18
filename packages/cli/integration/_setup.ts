/**
 * Vitest globalSetup — runs ONCE before any test file starts.
 *
 * Stages the monorepo-root bundled assets into the CLI package so:
 *   - `node packages/cli/dist/bin/skillpack.js list boilerplates` sees both
 *     `react` and `slidev` (otherwise it'd see only what was staged at the
 *     last build, which races with npm-pack tests that re-stage mid-run);
 *   - the npm-pack-dryrun meta test finds the expected files in the tarball;
 *   - per-skill integration tests (Tier 2) find the bundled skills.
 *
 * Without this, tests run before any staging see a stale or empty
 * `packages/cli/{boilerplates,meta-skills,vendor}/` and fail with
 * confusing "missing boilerplate" or "missing manifest" errors.
 *
 * Also re-syncs `integrations/pi/skills/` from the monorepo root so pi
 * integration tests find the meta-skills.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './_helpers.js';

export async function setup(): Promise<void> {
  const stageCli = join(REPO_ROOT, 'packages/cli/scripts/copy-bundled.mjs');
  const stagePi = join(REPO_ROOT, 'integrations/pi/scripts/sync-skills.mjs');
  if (existsSync(stageCli)) {
    execSync(`node ${JSON.stringify(stageCli)}`, { stdio: 'pipe' });
  }
  if (existsSync(stagePi)) {
    execSync(`node ${JSON.stringify(stagePi)}`, { stdio: 'pipe' });
  }
}
