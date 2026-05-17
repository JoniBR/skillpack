import { defineConfig } from 'vitest/config';

// Vitest config for @skill-pack/cli.
//
// Why this file exists: at prepublish time, `scripts/copy-bundled.mjs` stages
// the monorepo-root `boilerplates/`, `meta-skills/`, and `vendor/` directories
// into this package so the published tarball is self-contained. Those dirs
// contain template `.test.tsx` files (e.g. the React boilerplate's App.test
// shipped to user projects) that vitest would otherwise try to run here and
// fail because their runtime deps (react, vite, etc.) aren't installed in
// the CLI package.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'boilerplates/**',
      'meta-skills/**',
      'vendor/**',
    ],
  },
});
