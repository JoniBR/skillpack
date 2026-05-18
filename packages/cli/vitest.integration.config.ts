import { defineConfig } from 'vitest/config';

// Slow integration test config — per-skill end-to-end (real `pnpm install`
// + framework verification). Runs via `pnpm test:integration` or in a
// dedicated CI job; NOT on every PR.
//
// Each test scaffolds into a tmp dir, runs `pnpm install`, runs the skill's
// verification commands (typecheck / build / render / og:generate /
// slidev build), and asserts the resulting artefact. Several minutes per
// test on first run (Chrome / Playwright downloads dominate).
export default defineConfig({
  test: {
    include: ['integration/skills/**/*.test.ts'],
    globalSetup: ['./integration/_setup.ts'],
    // Slow tests; bump default 5 s timeout to 10 min per test.
    testTimeout: 10 * 60 * 1000,
    hookTimeout: 10 * 60 * 1000,
    // Each test owns a tmp dir; parallelism is fine.
    pool: 'threads',
    poolOptions: { threads: { singleThread: false } },
  },
});
