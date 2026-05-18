/**
 * meta/npm-pack-dryrun.test.ts
 *
 * Runs `npm pack --dry-run --json` for each publishable package and
 * inspects the resulting file list:
 *   - never ships .env, node_modules, .git, *.test.ts, *.spec.ts
 *   - @skill-pack/cli specifically includes the staged bundled assets
 *     (dist/bin/skillpack.js, boilerplates/<bp>/boilerplate.json,
 *      meta-skills/skill-creator/SKILL.md, vendor/<v>/SKILL.md)
 *
 * `prepublishOnly` for @skill-pack/cli stages those copies via
 * scripts/copy-bundled.mjs; we run it in beforeAll so this test works
 * before publish.
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../_helpers.js';

interface PackEntry {
  path: string;
}
interface PackResult {
  files: PackEntry[];
}

function pack(cwd: string): PackResult[] {
  // --ignore-scripts: skip prepublishOnly. Without this, `npm pack`
  // triggers the prepublish chain (copy-bundled.mjs + tsc build), which
  // rmSync's packages/cli/boilerplates/ mid-flight. Any parallel test
  // that lists boilerplates via the CLI then sees a partial tree. The
  // global setup (integration/_setup.ts) has already staged everything,
  // so prepublish is redundant here anyway.
  const r = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, npm_config_loglevel: 'error' },
  });
  if (r.status !== 0) {
    throw new Error(`npm pack failed in ${cwd}:\n${r.stderr}\n${r.stdout}`);
  }
  // npm pack --json emits a JSON array even for a single package; sometimes
  // npm prints warnings on stderr before the JSON. Slice from the first '['.
  const out = r.stdout;
  const start = out.indexOf('[');
  if (start < 0) throw new Error(`no JSON in npm pack output:\n${out}`);
  return JSON.parse(out.slice(start)) as PackResult[];
}

const BANNED = [
  /(^|\/)\.env$/,
  /(^|\/)node_modules\//,
  /(^|\/)\.git\//,
  /\.test\.ts$/,
  /\.spec\.ts$/,
];

// Staging is handled by vitest globalSetup (`integration/_setup.ts`) ONCE
// before any test file runs. We do NOT repeat it here — doing so would
// race with parallel list / scaffold tests that read packages/cli/boilerplates/
// while copy-bundled.mjs is in its rmSync-then-cpSync window.

const packages = [
  {
    rel: 'packages/cli',
    requireFiles: [
      'dist/bin/skillpack.js',
      'boilerplates/react/boilerplate.json',
      'boilerplates/slidev/boilerplate.json',
      'meta-skills/skill-creator/SKILL.md',
      'vendor/anthropic-skill-creator/SKILL.md',
    ],
  },
  { rel: 'integrations/claude-code', requireFiles: [] as string[] },
  { rel: 'integrations/pi', requireFiles: [] as string[] },
];

describe('npm pack --dry-run hygiene', () => {
  it.each(packages)(
    '$rel tarball: no junk, expected files present',
    ({ rel, requireFiles }) => {
      const cwd = join(REPO_ROOT, rel);
      const results = pack(cwd);
      expect(results.length).toBeGreaterThan(0);
      const files = results[0].files.map((f) => f.path);

      const offenders: string[] = [];
      for (const f of files) {
        if (BANNED.some((re) => re.test(f))) offenders.push(f);
      }
      expect(offenders, `banned files in ${rel} tarball:\n  - ${offenders.join('\n  - ')}`).toEqual(
        [],
      );

      const missing = requireFiles.filter((rf) => !files.includes(rf));
      expect(
        missing,
        `expected files MISSING from ${rel} tarball (did prepublishOnly stage them?):\n  - ${missing.join('\n  - ')}`,
      ).toEqual([]);
    },
    30_000,
  );
});
