import { defineConfig } from 'vitest/config';

// Fast test config — runs on every PR.
//
//   - src/<file>.test.ts                — unit tests
//   - integration/meta/<file>.test.ts   — cross-cutting validators
//                                          (walk repo, no install)
//   - integration/cli/<file>.test.ts    — CLI library/subprocess tests
//                                          (real fs in tmp, no install)
//
// Slow per-skill tests (real `pnpm install` + framework verification)
// live in `integration/skills/` and run via `pnpm test:integration`
// instead — see vitest.integration.config.ts.
//
// The `exclude` list keeps vitest from descending into the
// staged-for-publish bundles inside `packages/cli/` (boilerplates/,
// vendor/, meta-skills/), which contain template *.test.tsx files for
// user projects.
export default defineConfig({
  test: {
    include: [
      'src/**/*.test.ts',
      'integration/meta/**/*.test.ts',
      'integration/cli/**/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'boilerplates/**',
      'meta-skills/**',
      'vendor/**',
    ],
  },
});
