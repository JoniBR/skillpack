/**
 * Boilerplate & skill resolver.
 *
 * v0.1: bundled-only. The CLI package ships boilerplates under
 * `<package-root>/boilerplates/`. Phase 2 will add overlay (`~/.skillpack/skills/`)
 * and remote registry (`degit` → `~/.skillpack/cache/`) tiers.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BoilerplateManifestSchema,
  SkillManifestSchema,
  type BoilerplateManifest,
  type SkillManifest,
} from './schema.js';

/**
 * Locate the bundled `boilerplates/` directory. In dev (running from source),
 * that's `<repo>/boilerplates/`. After publish, it's bundled alongside `dist/`.
 *
 * We resolve relative to this module's URL and walk up looking for the dir.
 */
export function resolveBundledRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  let dir = here;
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, 'boilerplates');
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `Could not locate bundled boilerplates/ relative to ${here}. ` +
      `Did the build skip copying boilerplates?`,
  );
}

export interface ResolvedBoilerplate {
  name: string;
  dir: string;
  baseDir: string;
  manifest: BoilerplateManifest;
  source: 'bundled';
}

export interface ResolvedSkill {
  name: string;
  dir: string;
  manifest: SkillManifest;
  source: 'bundled';
}

export function listBoilerplates(root = resolveBundledRoot()): string[] {
  return readdirSync(root)
    .filter((n) => statSync(join(root, n)).isDirectory())
    .filter((n) => existsSync(join(root, n, 'base')));
}

export function listSkills(boilerplate: string, root = resolveBundledRoot()): string[] {
  const skillsDir = join(root, boilerplate, 'skills');
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir).filter((n) => existsSync(join(skillsDir, n, 'manifest.json')));
}

export function resolveBoilerplate(name: string, root = resolveBundledRoot()): ResolvedBoilerplate {
  const dir = join(root, name);
  const baseDir = join(dir, 'base');
  const manifestPath = join(dir, 'boilerplate.json');
  if (!existsSync(baseDir)) {
    const available = listBoilerplates(root).join(', ') || '(none)';
    throw new Error(`Unknown boilerplate "${name}". Available: ${available}`);
  }
  const raw = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : { schemaVersion: 1, name, version: '0.0.0', description: '' };
  const manifest = BoilerplateManifestSchema.parse(raw);
  return { name, dir: resolve(dir), baseDir: resolve(baseDir), manifest, source: 'bundled' };
}

export function resolveSkill(
  boilerplate: string,
  skill: string,
  root = resolveBundledRoot(),
): ResolvedSkill {
  const dir = join(root, boilerplate, 'skills', skill);
  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    const available = listSkills(boilerplate, root).join(', ') || '(none)';
    throw new Error(
      `Unknown skill "${skill}" for boilerplate "${boilerplate}". Available: ${available}`,
    );
  }
  const manifest = SkillManifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
  return { name: skill, dir: resolve(dir), manifest, source: 'bundled' };
}
