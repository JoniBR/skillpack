import { describe, expect, it } from 'vitest';
import { JsonMergeConflict, deepMerge } from './json-merge.js';

describe('deepMerge', () => {
  it('merges plain objects recursively', () => {
    expect(deepMerge({ a: 1, b: { c: 2 } } as never, { b: { d: 3 } } as never)).toEqual({
      a: 1,
      b: { c: 2, d: 3 },
    });
  });

  it('concats and dedupes arrays', () => {
    expect(deepMerge(['a', 'b'] as never, ['b', 'c'] as never)).toEqual(['a', 'b', 'c']);
  });

  it('lets equal scalars pass', () => {
    expect(deepMerge('foo' as never, 'foo' as never)).toBe('foo');
  });

  it('throws on conflicting scalars', () => {
    expect(() => deepMerge({ a: 1 } as never, { a: 2 } as never)).toThrow(JsonMergeConflict);
  });

  it('reports the conflicting path', () => {
    try {
      deepMerge({ scripts: { dev: 'vite' } } as never, { scripts: { dev: 'webpack' } } as never);
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as JsonMergeConflict).path).toBe('scripts.dev');
    }
  });

  it('merges package.json-shaped deps', () => {
    const base = { dependencies: { react: '^18' } };
    const patch = { dependencies: { remotion: '^4' } };
    expect(deepMerge(base as never, patch as never)).toEqual({
      dependencies: { react: '^18', remotion: '^4' },
    });
  });

  it('returns patch when base is null', () => {
    expect(deepMerge(null as never, { a: 1 } as never)).toEqual({ a: 1 });
  });
});
