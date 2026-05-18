/**
 * Prime tests — exercise the bundled react boilerplate + remotion skill.
 *
 * $HOME is pointed at an empty tmp dir to keep overlay out of the picture.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prime } from './prime.js';

let prevHome: string | undefined;
let prevUserprofile: string | undefined;
let isolatedHome: string;

beforeEach(() => {
  isolatedHome = mkdtempSync(join(tmpdir(), 'sp-prime-home-'));
  prevHome = process.env['HOME'];
  prevUserprofile = process.env['USERPROFILE'];
  process.env['HOME'] = isolatedHome;
  delete process.env['USERPROFILE'];
});

afterEach(() => {
  if (prevHome === undefined) delete process.env['HOME'];
  else process.env['HOME'] = prevHome;
  if (prevUserprofile === undefined) delete process.env['USERPROFILE'];
  else process.env['USERPROFILE'] = prevUserprofile;
  rmSync(isolatedHome, { recursive: true, force: true });
});

describe('prime', () => {
  it('includes the skill header for each requested skill', () => {
    const out = prime({ boilerplate: 'react', skills: ['remotion'] });
    expect(out).toContain('## Skill: remotion');
  });

  it("includes the boilerplate's base SKILL.md body (frontmatter stripped)", () => {
    const out = prime({ boilerplate: 'react', skills: [] });
    expect(out).toContain('## Boilerplate: react');
    // Frontmatter delimiter '---\n' should not appear at the start of the skill body block.
    // The body begins with '# react (skillpack base)' per the bundled file.
    expect(out).toContain('# react (skillpack base)');
    // The raw frontmatter line `name: react` should not have leaked through (it would only
    // appear within a '---' fence; assert no fence remains).
    expect(out).not.toMatch(/^---\nname: react/m);
  });

  it("includes the requested skill's SKILL.md body (frontmatter stripped)", () => {
    const out = prime({ boilerplate: 'react', skills: ['remotion'] });
    // The remotion SKILL.md frontmatter contains a long description line; assert it's gone.
    expect(out).not.toMatch(/^---\nname: react-remotion/m);
    // And the skill section header is present.
    expect(out).toContain('## Skill: remotion');
  });

  it('includes a `## Project tree` section when projectDir is set, omits it otherwise', () => {
    const proj = mkdtempSync(join(tmpdir(), 'sp-prime-proj-'));
    try {
      mkdirSync(join(proj, 'src'));
      writeFileSync(join(proj, 'src', 'index.ts'), '');
      const withDir = prime({ boilerplate: 'react', skills: [], projectDir: proj });
      const withoutDir = prime({ boilerplate: 'react', skills: [] });
      expect(withDir).toContain('## Project tree');
      expect(withoutDir).not.toContain('## Project tree');
    } finally {
      rmSync(proj, { recursive: true, force: true });
    }
  });

  it('with empty skills still includes boilerplate content', () => {
    const out = prime({ boilerplate: 'react', skills: [] });
    expect(out).toContain('## Boilerplate: react');
    expect(out).toContain('(no extra skills)');
  });

  it('throws for an unknown skill (delegates to resolveSkill)', () => {
    expect(() => prime({ boilerplate: 'react', skills: ['nonexistent-xyz'] })).toThrow(
      /Unknown skill/,
    );
  });
});
