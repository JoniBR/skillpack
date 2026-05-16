/** Git helpers (DESIGN.md Q14). */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function isGitRepo(cwd: string): boolean {
  return existsSync(join(cwd, '.git'));
}

export function isGitTreeClean(cwd: string): boolean {
  if (!isGitRepo(cwd)) return true;
  const r = spawnSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8' });
  if (r.status !== 0) return true; // No git? Treat as clean.
  return r.stdout.trim() === '';
}

export function gitInit(cwd: string): void {
  if (isGitRepo(cwd)) return;
  execSync('git init -q -b main', { cwd, stdio: 'inherit' });
}

export function gitCommitAll(cwd: string, message: string): void {
  execSync('git add -A', { cwd, stdio: 'inherit' });
  // Use --allow-empty so we can commit even when nothing changed
  // (rare, but possible during eval/no-install scaffolds).
  execSync(`git commit -q --allow-empty -m ${JSON.stringify(message)}`, {
    cwd,
    stdio: 'inherit',
  });
}
