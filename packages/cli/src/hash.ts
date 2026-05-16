/** Content-hash helpers for skill and file integrity (DESIGN.md Q15). */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export function sha256(input: string | Buffer): string {
  return 'sha256:' + createHash('sha256').update(input).digest('hex');
}

/**
 * Stable hash of a directory's contents: deterministic across platforms.
 * Walks files in sorted order, hashes `<relpath>\0<sha256(contents)>\n` per file.
 */
export function hashDirectory(dir: string, ignore: ReadonlySet<string> = new Set()): string {
  const entries: string[] = [];
  const walk = (current: string): void => {
    for (const name of readdirSync(current).sort()) {
      if (ignore.has(name)) continue;
      const full = join(current, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else if (st.isFile()) {
        const rel = relative(dir, full).split(sep).join('/');
        const fileHash = sha256(readFileSync(full));
        entries.push(`${rel}\0${fileHash}`);
      }
    }
  };
  walk(dir);
  return sha256(entries.join('\n'));
}
