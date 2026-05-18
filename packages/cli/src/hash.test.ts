import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hashDirectory, sha256 } from './hash.js';

describe('sha256', () => {
  it('is deterministic across calls', () => {
    expect(sha256('hello')).toBe(sha256('hello'));
    expect(sha256('')).toBe(sha256(''));
  });

  it('produces distinct outputs for distinct inputs', () => {
    const inputs = ['a', 'b', 'hello', 'hello ', 'HELLO'];
    const hashes = new Set(inputs.map(sha256));
    expect(hashes.size).toBe(inputs.length);
  });
});

describe('hashDirectory', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sp-hash-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns a stable hash for an empty directory (no throw)', () => {
    const h = hashDirectory(dir);
    expect(h).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(hashDirectory(dir)).toBe(h);
  });

  it('is deterministic for the same content', () => {
    mkdirSync(join(dir, 'sub'), { recursive: true });
    writeFileSync(join(dir, 'a.txt'), 'alpha');
    writeFileSync(join(dir, 'sub', 'b.txt'), 'beta');
    expect(hashDirectory(dir)).toBe(hashDirectory(dir));
  });

  it('differs when a file changes content', () => {
    writeFileSync(join(dir, 'a.txt'), 'alpha');
    const before = hashDirectory(dir);
    writeFileSync(join(dir, 'a.txt'), 'alpha2');
    expect(hashDirectory(dir)).not.toBe(before);
  });

  it('excludes entries listed in `ignore`', () => {
    writeFileSync(join(dir, 'a.txt'), 'alpha');
    mkdirSync(join(dir, 'node_modules'), { recursive: true });
    writeFileSync(join(dir, 'node_modules', 'junk.js'), 'noise');
    const without = hashDirectory(dir, new Set(['node_modules']));
    // Now drop node_modules entirely and compare.
    rmSync(join(dir, 'node_modules'), { recursive: true, force: true });
    const baseline = hashDirectory(dir);
    expect(without).toBe(baseline);
    // And differs when we don't ignore it.
    mkdirSync(join(dir, 'node_modules'), { recursive: true });
    writeFileSync(join(dir, 'node_modules', 'junk.js'), 'noise');
    expect(hashDirectory(dir)).not.toBe(baseline);
  });
});
