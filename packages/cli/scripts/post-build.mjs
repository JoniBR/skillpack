/**
 * Post-build: ensure the shebang on the bin entry survives + chmod +x.
 */
import { chmodSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const bin = resolve('dist/bin/skillpack.js');
if (existsSync(bin)) {
  const src = readFileSync(bin, 'utf8');
  if (!src.startsWith('#!')) {
    writeFileSync(bin, `#!/usr/bin/env node\n${src}`);
  }
  chmodSync(bin, 0o755);
  console.log(`✔ post-build: ${bin}`);
} else {
  console.error(`✗ post-build: ${bin} not found`);
  process.exit(1);
}
