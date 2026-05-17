/**
 * Boilerplate & skill resolver.
 *
 * Two tiers (DESIGN.md Q10a → option C):
 *   1. Overlay: `~/.skill-pack/{boilerplates,skills}/` — user-authored.
 *   2. Bundled: `<package-root>/boilerplates/` — ships with the CLI.
 *
 * On name collisions, overlay wins; we emit a console.warn so the user knows
 * a bundled item has been shadowed (DESIGN.md Q10a → option b).
 *
 * A future Phase will add a remote registry tier (`degit` → cache).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  listOverlayBoilerplates,
  listOverlaySkills,
  resolveOverlayBoilerplate,
  resolveOverlaySkill,
} from './overlay.js';
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

export type Source = 'bundled' | 'overlay';

export interface BoilerplateEntry {
  name: string;
  source: Source;
  /** True if this name exists in both tiers and overlay is shadowing bundled. */
  shadowsBundled?: boolean;
}

export interface SkillEntry {
  name: string;
  source: Source;
  shadowsBundled?: boolean;
}

export interface ResolvedBoilerplate {
  name: string;
  dir: string;
  baseDir: string;
  manifest: BoilerplateManifest;
  source: Source;
}

export interface ResolvedSkill {
  name: string;
  dir: string;
  manifest: SkillManifest;
  source: Source;
}

/** Bundled-only boilerplate names. Kept for back-compat and internal use. */
function listBundledBoilerplates(root = resolveBundledRoot()): string[] {
  return readdirSync(root)
    .filter((n) => {
      try {
        return statSync(join(root, n)).isDirectory();
      } catch {
        return false;
      }
    })
    .filter((n) => existsSync(join(root, n, 'base')));
}

function listBundledSkills(boilerplate: string, root = resolveBundledRoot()): string[] {
  const skillsDir = join(root, boilerplate, 'skills');
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir).filter((n) => existsSync(join(skillsDir, n, 'manifest.json')));
}

/**
 * List boilerplate names (overlay + bundled, deduped). Overlay wins on collision
 * but the bundled name is not duplicated in the returned list. Sorted alphabetically.
 *
 * Back-compat: returns a flat string[]. Use `listBoilerplatesWithSource()` to get
 * source info.
 */
export function listBoilerplates(root = resolveBundledRoot()): string[] {
  return listBoilerplatesWithSource(root).map((e) => e.name);
}

export function listBoilerplatesWithSource(root = resolveBundledRoot()): BoilerplateEntry[] {
  const overlay = new Set(listOverlayBoilerplates());
  const bundled = listBundledBoilerplates(root);
  const out: BoilerplateEntry[] = [];
  // Overlay first (with shadow flag when applicable).
  for (const name of [...overlay].sort()) {
    out.push({
      name,
      source: 'overlay',
      ...(bundled.includes(name) ? { shadowsBundled: true } : {}),
    });
  }
  for (const name of bundled) {
    if (!overlay.has(name)) out.push({ name, source: 'bundled' });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function listSkills(boilerplate: string, root = resolveBundledRoot()): string[] {
  return listSkillsWithSource(boilerplate, root).map((e) => e.name);
}

export function listSkillsWithSource(
  boilerplate: string,
  root = resolveBundledRoot(),
): SkillEntry[] {
  const overlay = new Set(listOverlaySkills(boilerplate));
  const bundled = listBundledSkills(boilerplate, root);
  const out: SkillEntry[] = [];
  for (const name of [...overlay].sort()) {
    out.push({
      name,
      source: 'overlay',
      ...(bundled.includes(name) ? { shadowsBundled: true } : {}),
    });
  }
  for (const name of bundled) {
    if (!overlay.has(name)) out.push({ name, source: 'bundled' });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveBoilerplate(name: string, root = resolveBundledRoot()): ResolvedBoilerplate {
  const overlay = resolveOverlayBoilerplate(name);
  const bundledExists = existsSync(join(root, name, 'base'));
  if (overlay) {
    if (bundledExists) {
      console.warn(
        `⚠ Overlay boilerplate "${name}" at ${overlay.dir} is shadowing the bundled version.`,
      );
    }
    return overlay;
  }
  const dir = join(root, name);
  const baseDir = join(dir, 'base');
  const manifestPath = join(dir, 'boilerplate.json');
  if (!bundledExists) {
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
  const overlay = resolveOverlaySkill(boilerplate, skill);
  const bundledDir = join(root, boilerplate, 'skills', skill);
  const bundledExists = existsSync(join(bundledDir, 'manifest.json'));
  if (overlay) {
    if (bundledExists) {
      console.warn(
        `⚠ Overlay skill "${boilerplate}/${skill}" at ${overlay.dir} is shadowing the bundled version.`,
      );
    }
    return overlay;
  }
  const manifestPath = join(bundledDir, 'manifest.json');
  if (!bundledExists) {
    const available = listSkills(boilerplate, root).join(', ') || '(none)';
    throw new Error(
      `Unknown skill "${skill}" for boilerplate "${boilerplate}". Available: ${available}`,
    );
  }
  const manifest = SkillManifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
  return { name: skill, dir: resolve(bundledDir), manifest, source: 'bundled' };
}
