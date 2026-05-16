/**
 * Package manager detection (DESIGN.md Q7).
 *
 * Order: lockfile walk → $npm_config_user_agent → first-available fallback
 *        (pnpm > npm > yarn > bun).
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

const LOCKFILES: Record<string, PackageManager> = {
  'pnpm-lock.yaml': 'pnpm',
  'bun.lockb': 'bun',
  'bun.lock': 'bun',
  'yarn.lock': 'yarn',
  'package-lock.json': 'npm',
};

export function detectFromLockfile(startDir: string): PackageManager | undefined {
  let dir = startDir;
  const { root } = parse(dir);
  while (true) {
    for (const [file, pm] of Object.entries(LOCKFILES)) {
      if (existsSync(join(dir, file))) return pm;
    }
    if (dir === root) return undefined;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

export function detectFromUserAgent(): PackageManager | undefined {
  const ua = process.env['npm_config_user_agent'];
  if (!ua) return undefined;
  const name = ua.split('/')[0];
  if (name === 'pnpm' || name === 'npm' || name === 'yarn' || name === 'bun') return name;
  return undefined;
}

export function detectFromPath(): PackageManager | undefined {
  const order: PackageManager[] = ['pnpm', 'npm', 'yarn', 'bun'];
  for (const pm of order) {
    const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [pm], {
      encoding: 'utf8',
    });
    if (r.status === 0 && r.stdout.trim()) return pm;
  }
  return undefined;
}

export function detectPackageManager(cwd: string): PackageManager {
  return (
    detectFromLockfile(cwd) ?? detectFromUserAgent() ?? detectFromPath() ?? 'npm'
  );
}

export function installCommand(pm: PackageManager): string[] {
  switch (pm) {
    case 'pnpm':
      return ['pnpm', 'install'];
    case 'yarn':
      return ['yarn'];
    case 'bun':
      return ['bun', 'install'];
    case 'npm':
    default:
      return ['npm', 'install'];
  }
}

export function runInstall(cwd: string, pm: PackageManager): void {
  const [cmd, ...args] = installCommand(pm);
  if (!cmd) throw new Error('No install command available');
  execSync([cmd, ...args].join(' '), { cwd, stdio: 'inherit' });
}
