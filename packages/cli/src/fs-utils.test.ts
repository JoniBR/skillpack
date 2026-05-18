import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { copyTree, fileExists, isDirEmpty, listFiles } from './fs-utils.js';

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'sp-fs-'));
});
afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('copyTree', () => {
  it('recursively copies nested dirs and files', () => {
    const src = join(tmp, 'src');
    mkdirSync(join(src, 'a', 'b'), { recursive: true });
    writeFileSync(join(src, 'top.txt'), 'top');
    writeFileSync(join(src, 'a', 'mid.txt'), 'mid');
    writeFileSync(join(src, 'a', 'b', 'leaf.txt'), 'leaf');

    const dest = join(tmp, 'dest');
    copyTree(src, dest);

    expect(readFileSync(join(dest, 'top.txt'), 'utf8')).toBe('top');
    expect(readFileSync(join(dest, 'a', 'mid.txt'), 'utf8')).toBe('mid');
    expect(readFileSync(join(dest, 'a', 'b', 'leaf.txt'), 'utf8')).toBe('leaf');
  });

  it('creates the dest dir if missing', () => {
    const src = join(tmp, 'src2');
    mkdirSync(src);
    writeFileSync(join(src, 'x.txt'), 'x');
    const dest = join(tmp, 'newly', 'made', 'dest');
    copyTree(src, dest);
    expect(readFileSync(join(dest, 'x.txt'), 'utf8')).toBe('x');
  });
});

describe('listFiles', () => {
  it('lists files in sorted order with forward-slash relative paths, recursing into subdirs', () => {
    mkdirSync(join(tmp, 'sub'), { recursive: true });
    // Create in non-alphabetical order.
    writeFileSync(join(tmp, 'z.txt'), '');
    writeFileSync(join(tmp, 'a.txt'), '');
    writeFileSync(join(tmp, 'sub', 'm.txt'), '');

    const files = listFiles(tmp);
    expect(files).toContain('a.txt');
    expect(files).toContain('z.txt');
    expect(files).toContain('sub/m.txt');
    // No backslashes even on Windows-style paths (sanity check).
    for (const f of files) expect(f).not.toMatch(/\\/);
    // Sorted assertion.
    expect([...files].sort()).toEqual(files);
  });
});

describe('isDirEmpty', () => {
  it('returns true for an empty dir', () => {
    expect(isDirEmpty(tmp)).toBe(true);
  });

  it('returns true for a dir containing only .git', () => {
    mkdirSync(join(tmp, '.git'));
    expect(isDirEmpty(tmp)).toBe(true);
  });

  it('returns false when any other file is present', () => {
    writeFileSync(join(tmp, 'file.txt'), '');
    expect(isDirEmpty(tmp)).toBe(false);
  });
});

describe('fileExists', () => {
  it('returns false for missing files', () => {
    expect(fileExists(join(tmp, 'nope.txt'))).toBe(false);
  });
  it('returns true for present files', () => {
    writeFileSync(join(tmp, 'yes.txt'), '');
    expect(fileExists(join(tmp, 'yes.txt'))).toBe(true);
  });
});
