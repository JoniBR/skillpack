/** Filesystem helpers used by the scaffolder. */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export function writeText(target: string, content: string): void {
  ensureDir(dirname(target));
  writeFileSync(target, content, 'utf8');
}

export function readText(target: string): string {
  return readFileSync(target, 'utf8');
}

/** Recursively copy `src` into `dest`. Files are copied verbatim; dirs preserved. */
export function copyTree(src: string, dest: string): void {
  const st = statSync(src);
  if (st.isDirectory()) {
    ensureDir(dest);
    for (const name of readdirSync(src)) {
      copyTree(join(src, name), join(dest, name));
    }
  } else if (st.isFile()) {
    ensureDir(dirname(dest));
    copyFileSync(src, dest);
  }
}

/** List relative file paths under `dir`. */
export function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (st.isFile()) out.push(relative(dir, full).split(sep).join('/'));
    }
  };
  walk(dir);
  return out;
}

export function isDirEmpty(dir: string): boolean {
  if (!existsSync(dir)) return true;
  const entries = readdirSync(dir).filter((n) => n !== '.git');
  return entries.length === 0;
}

export function fileExists(p: string): boolean {
  return existsSync(p);
}
