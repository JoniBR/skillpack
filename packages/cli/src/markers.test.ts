import { describe, expect, it } from 'vitest';
import { addImports, insertAtMarker, MarkerNotFoundError } from './markers.js';

const APP = `import React from 'react';

// @skillpack:imports

export function App() {
  return (
    <main>
      <h1>Hello</h1>
      {/* @skillpack:mount */}
    </main>
  );
}
`;

describe('insertAtMarker', () => {
  it('inserts before the marker with matching indentation', () => {
    const out = insertAtMarker(APP, 'App.tsx', {
      file: 'App.tsx',
      marker: 'mount',
      insert: '<Foo />',
    });
    expect(out).toContain('      <Foo />\n      {/* @skillpack:mount */}');
  });

  it('inserts and adds imports', () => {
    const out = insertAtMarker(APP, 'App.tsx', {
      file: 'App.tsx',
      marker: 'mount',
      insert: '<Foo />',
      imports: ["import { Foo } from './foo.js';"],
    });
    expect(out).toContain("import { Foo } from './foo.js';");
    expect(out).toContain('<Foo />');
  });

  it('appends multiple insertions in arg order', () => {
    const once = insertAtMarker(APP, 'App.tsx', {
      file: 'App.tsx',
      marker: 'mount',
      insert: '<A />',
    });
    const twice = insertAtMarker(once, 'App.tsx', {
      file: 'App.tsx',
      marker: 'mount',
      insert: '<B />',
    });
    const aIdx = twice.indexOf('<A />');
    const bIdx = twice.indexOf('<B />');
    expect(aIdx).toBeGreaterThan(0);
    expect(bIdx).toBeGreaterThan(aIdx);
    expect(bIdx).toBeLessThan(twice.indexOf('@skillpack:mount'));
  });

  it('throws on missing marker', () => {
    expect(() =>
      insertAtMarker(APP, 'App.tsx', {
        file: 'App.tsx',
        marker: 'no-such-marker',
        insert: '<Foo />',
      }),
    ).toThrow(MarkerNotFoundError);
  });
});

describe('addImports', () => {
  it('appends new imports after the last existing one', () => {
    const out = addImports(`import a from 'a';\nimport b from 'b';\n\nconst x = 1;\n`, [
      "import c from 'c';",
    ]);
    const lines = out.split('\n');
    expect(lines[0]).toBe("import a from 'a';");
    expect(lines[1]).toBe("import b from 'b';");
    expect(lines[2]).toBe("import c from 'c';");
  });

  it('does not duplicate existing imports', () => {
    const src = `import a from 'a';\n`;
    const out = addImports(src, ["import a from 'a';"]);
    expect(out).toBe(src);
  });
});
