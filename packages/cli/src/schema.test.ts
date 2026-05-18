import { describe, expect, it } from 'vitest';
import {
  BoilerplateManifestSchema,
  InstalledSkillSchema,
  ProjectManifestSchema,
  SkillManifestSchema,
} from './schema.js';

const validSkill = {
  schemaVersion: 1,
  name: 'remotion',
  version: '0.1.0',
  description: 'A skill',
};

describe('SkillManifestSchema', () => {
  it('parses a minimal valid manifest (defaults applied)', () => {
    const parsed = SkillManifestSchema.parse(validSkill);
    expect(parsed.name).toBe('remotion');
    expect(parsed.deps).toEqual({});
    expect(parsed.devDeps).toEqual({});
    expect(parsed.files).toEqual([]);
    expect(parsed.jsonPatches).toEqual([]);
    expect(parsed.markers).toEqual([]);
    expect(parsed.skillMd).toBe('SKILL.md');
  });

  it('rejects when required `name` is missing', () => {
    const { name: _omit, ...rest } = validSkill;
    const r = SkillManifestSchema.safeParse(rest);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(JSON.stringify(r.error.issues)).toMatch(/name/);
    }
  });

  it('rejects schemaVersion: 2', () => {
    const r = SkillManifestSchema.safeParse({ ...validSkill, schemaVersion: 2 });
    expect(r.success).toBe(false);
  });

  it('rejects markers[].imports when it is a string instead of array', () => {
    const r = SkillManifestSchema.safeParse({
      ...validSkill,
      markers: [{ file: 'a.ts', marker: 'mount', insert: 'x', imports: 'not-an-array' }],
    });
    expect(r.success).toBe(false);
  });

  it('rejects files[].from and files[].to when empty strings', () => {
    const r1 = SkillManifestSchema.safeParse({
      ...validSkill,
      files: [{ from: '', to: 'dest' }],
    });
    expect(r1.success).toBe(false);
    const r2 = SkillManifestSchema.safeParse({
      ...validSkill,
      files: [{ from: 'src', to: '' }],
    });
    expect(r2.success).toBe(false);
  });
});

describe('BoilerplateManifestSchema', () => {
  it('parses a valid manifest', () => {
    const r = BoilerplateManifestSchema.parse({
      schemaVersion: 1,
      name: 'react',
      version: '0.1.0',
      description: 'React bp',
    });
    expect(r.name).toBe('react');
  });
});

describe('ProjectManifestSchema', () => {
  const valid = {
    schemaVersion: 1,
    skillpackVersion: '0.1.0',
    boilerplate: { name: 'react', version: '0.1.0', contentHash: 'sha256:abc' },
    skills: [
      { name: 'remotion', version: '0.1.0', contentHash: 'sha256:def', source: 'bundled' },
    ],
  };

  it('parses a valid project manifest', () => {
    const r = ProjectManifestSchema.parse(valid);
    expect(r.skills).toHaveLength(1);
  });

  it("only accepts skills[].source ∈ {bundled, overlay, remote}", () => {
    for (const source of ['bundled', 'overlay', 'remote'] as const) {
      expect(
        ProjectManifestSchema.safeParse({
          ...valid,
          skills: [{ ...valid.skills[0], source }],
        }).success,
      ).toBe(true);
    }
    expect(
      ProjectManifestSchema.safeParse({
        ...valid,
        skills: [{ ...valid.skills[0], source: 'github' }],
      }).success,
    ).toBe(false);
  });
});

describe('InstalledSkillSchema', () => {
  it('round-trips through JSON', () => {
    const original = {
      name: 'remotion',
      version: '0.1.0',
      contentHash: 'sha256:deadbeef',
      source: 'overlay' as const,
    };
    const parsed = InstalledSkillSchema.parse(JSON.parse(JSON.stringify(original)));
    expect(parsed).toStrictEqual(original);
  });
});
