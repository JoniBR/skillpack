/**
 * Shared helpers for skillpack integration tests.
 *
 * Two test tiers live under `packages/cli/integration/`:
 *   - cli/   — call scaffold()/prime()/listBoilerplates() as a library
 *              against the real bundled dirs; fast (~ms-s per test).
 *   - meta/  — cross-cutting validators that walk the repo tree.
 *   - skills/ — per-skill end-to-end (mktemp + scaffold + real `pnpm install`
 *              + run the framework's verification). Slow; in vitest.integration.config.ts.
 *
 * All test files import from this module; don't duplicate primitives.
 */
import { execSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scaffold as libScaffoldImpl, type ScaffoldOptions, type ScaffoldResult } from '../src/scaffold.js';

// ─── paths ────────────────────────────────────────────────────────────

const HERE = dirname(fileURLToPath(import.meta.url));

/** Repo root (the monorepo root, not the CLI package root). */
export const REPO_ROOT = resolve(HERE, '..', '..', '..');

/** Path to the built CLI bin (must be built before integration tests run). */
export const CLI_BIN = resolve(HERE, '..', 'dist', 'bin', 'skillpack.js');

// ─── tmp dirs ─────────────────────────────────────────────────────────

/**
 * Create a tmp dir, pass to `fn`, then clean up (even on throw). Use this
 * for every integration test that touches the filesystem. Each call gets
 * its own dir so tests can run in parallel.
 */
export async function withTmpDir<T>(
  fn: (dir: string) => Promise<T> | T,
  prefix = 'skillpack-test-',
): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  try {
    return await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ─── file assertions ──────────────────────────────────────────────────

/** Assert each relative path exists under `dir`. Throws a helpful message. */
export function expectFiles(dir: string, paths: string[]): void {
  const missing: string[] = [];
  for (const p of paths) {
    if (!existsSync(join(dir, p))) missing.push(p);
  }
  if (missing.length) {
    throw new Error(
      `Expected files missing under ${dir}:\n  - ${missing.join('\n  - ')}`,
    );
  }
}

/** Assert each relative path does NOT exist under `dir`. */
export function expectNoFiles(dir: string, paths: string[]): void {
  const present: string[] = [];
  for (const p of paths) {
    if (existsSync(join(dir, p))) present.push(p);
  }
  if (present.length) {
    throw new Error(
      `Expected absent files actually present under ${dir}:\n  - ${present.join('\n  - ')}`,
    );
  }
}

/** Read a file under `dir` as utf-8. Convenience for assertions. */
export function readUtf8(dir: string, rel: string): string {
  return readFileSync(join(dir, rel), 'utf8');
}

/** File size in bytes under `dir`. Throws if missing. */
export function fileSize(dir: string, rel: string): number {
  return statSync(join(dir, rel)).size;
}

// ─── CLI invocation ───────────────────────────────────────────────────

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run the built CLI as a subprocess. Use for tests that exercise the
 * commander parsing / argv handling. For tests that only care about the
 * scaffolder logic, prefer `libScaffold()` — much faster.
 */
export function runCli(
  args: string[],
  cwd: string,
  env: Record<string, string> = {},
): CliResult {
  if (!existsSync(CLI_BIN)) {
    throw new Error(
      `CLI bin not found at ${CLI_BIN}. Run \`pnpm --filter @skill-pack/cli build\` first.`,
    );
  }
  const r = spawnSync('node', [CLI_BIN, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return {
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
    exitCode: r.status ?? 1,
  };
}

/** Run an arbitrary shell command in `cwd`. Throws non-zero. Returns stdout. */
export function exec(cmd: string, cwd: string, env: Record<string, string> = {}): string {
  return execSync(cmd, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

// ─── library scaffold ─────────────────────────────────────────────────

export type LibScaffoldOptions = Omit<ScaffoldOptions, 'skillpackVersion'> & {
  skillpackVersion?: string;
};

/**
 * Call the scaffolder as a library — no subprocess, no commander, no
 * install. Roughly an order of magnitude faster than `runCli(['scaffold', ...])`.
 * Use for orchestration / state-file / manifest tests; use `runCli` when
 * commander behaviour itself is under test.
 *
 * Defaults `install: false` and `host: 'both'` if the caller didn't set them.
 */
export function libScaffold(opts: LibScaffoldOptions): ScaffoldResult {
  return libScaffoldImpl({
    skillpackVersion: 'test-0.0.0',
    ...opts,
    install: opts.install ?? false,
    host: opts.host ?? 'both',
  });
}

// ─── repo introspection (for meta tests) ──────────────────────────────

import { readdirSync } from 'node:fs';

/** List all bundled boilerplate names. */
export function listBundledBoilerplateNames(): string[] {
  const root = join(REPO_ROOT, 'boilerplates');
  return readdirSync(root).filter((n) => existsSync(join(root, n, 'base')));
}

/** List all skill paths under a bundled boilerplate. */
export function listBundledSkillNames(boilerplate: string): string[] {
  const dir = join(REPO_ROOT, 'boilerplates', boilerplate, 'skills');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => existsSync(join(dir, n, 'manifest.json')));
}

/** Resolve a bundled skill's directory. */
export function bundledSkillDir(boilerplate: string, skill: string): string {
  return join(REPO_ROOT, 'boilerplates', boilerplate, 'skills', skill);
}

/** Resolve a bundled boilerplate's directory. */
export function bundledBoilerplateDir(boilerplate: string): string {
  return join(REPO_ROOT, 'boilerplates', boilerplate);
}
