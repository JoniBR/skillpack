/**
 * Overlay resolver: user-authored boilerplates + skills under `~/.skill-pack/`.
 *
 * DESIGN.md Q10a → option C: overlay merges with bundled at resolve time.
 * On name collisions, overlay wins with a console.warn (see registry.ts).
 *
 * Layout:
 *   ~/.skill-pack/boilerplates/<name>/{boilerplate.json, base/, base-skill/, skills/}
 *   ~/.skill-pack/skills/<boilerplate>/<name>/{manifest.json, SKILL.md, files/, references/}
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  BoilerplateManifestSchema,
  SkillManifestSchema,
  type BoilerplateManifest,
  type SkillManifest,
} from './schema.js';

export const OVERLAY_DIR_NAME = '.skill-pack';

/** Locate the user's HOME directory (cross-platform). */
function getHome(): string | undefined {
  return process.env['HOME'] ?? process.env['USERPROFILE'];
}

/**
 * Return the overlay root (`~/.skill-pack/`) if it exists, else undefined.
 * Does NOT create the directory.
 */
export function resolveOverlayRoot(): string | undefined {
  const home = getHome();
  if (!home) return undefined;
  const dir = join(home, OVERLAY_DIR_NAME);
  if (!existsSync(dir)) return undefined;
  try {
    if (!statSync(dir).isDirectory()) return undefined;
  } catch {
    return undefined;
  }
  return dir;
}

/** Boilerplate names under `~/.skill-pack/boilerplates/` that have a `base/` dir. */
export function listOverlayBoilerplates(): string[] {
  const root = resolveOverlayRoot();
  if (!root) return [];
  const bpRoot = join(root, 'boilerplates');
  if (!existsSync(bpRoot)) return [];
  let entries: string[];
  try {
    entries = readdirSync(bpRoot);
  } catch {
    return [];
  }
  return entries
    .filter((n) => {
      try {
        return statSync(join(bpRoot, n)).isDirectory();
      } catch {
        return false;
      }
    })
    .filter((n) => existsSync(join(bpRoot, n, 'base')));
}

/** Skill names under `~/.skill-pack/skills/<boilerplate>/` with a `manifest.json`. */
export function listOverlaySkills(boilerplate: string): string[] {
  const root = resolveOverlayRoot();
  if (!root) return [];
  const skillsDir = join(root, 'skills', boilerplate);
  if (!existsSync(skillsDir)) return [];
  let entries: string[];
  try {
    entries = readdirSync(skillsDir);
  } catch {
    return [];
  }
  return entries.filter((n) => existsSync(join(skillsDir, n, 'manifest.json')));
}

export interface ResolvedOverlayBoilerplate {
  name: string;
  dir: string;
  baseDir: string;
  manifest: BoilerplateManifest;
  source: 'overlay';
}

export interface ResolvedOverlaySkill {
  name: string;
  dir: string;
  manifest: SkillManifest;
  source: 'overlay';
}

export function resolveOverlayBoilerplate(name: string): ResolvedOverlayBoilerplate | undefined {
  const root = resolveOverlayRoot();
  if (!root) return undefined;
  const dir = join(root, 'boilerplates', name);
  const baseDir = join(dir, 'base');
  if (!existsSync(baseDir)) return undefined;
  const manifestPath = join(dir, 'boilerplate.json');
  const raw = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : { schemaVersion: 1, name, version: '0.0.0', description: '' };
  const manifest = BoilerplateManifestSchema.parse(raw);
  return {
    name,
    dir: resolve(dir),
    baseDir: resolve(baseDir),
    manifest,
    source: 'overlay',
  };
}

export function resolveOverlaySkill(
  boilerplate: string,
  skill: string,
): ResolvedOverlaySkill | undefined {
  const root = resolveOverlayRoot();
  if (!root) return undefined;
  const dir = join(root, 'skills', boilerplate, skill);
  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) return undefined;
  const manifest = SkillManifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
  return { name: skill, dir: resolve(dir), manifest, source: 'overlay' };
}
