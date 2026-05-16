/**
 * Zod schemas for skillpack manifests.
 *
 * Two manifest shapes live here:
 *   1. SkillManifest   — `boilerplates/<bp>/skills/<name>/manifest.json`
 *   2. ProjectManifest — the JSON block embedded in a scaffolded project's
 *                        `AGENTS.md` under `<!-- skillpack:manifest -->`.
 *
 * Both carry `schemaVersion: 1` (see DESIGN.md Q15b).
 */
import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 1 as const;

/** A single file overlay from `files/` into the project. */
export const FileOverlaySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  /** If true, replace existing file. If false (default), error on collision. */
  overwrite: z.boolean().optional(),
});
export type FileOverlay = z.infer<typeof FileOverlaySchema>;

/** Deep-merge a JSON file (package.json, tsconfig.json, etc.). */
export const JsonPatchSchema = z.object({
  file: z.string().min(1),
  merge: z.record(z.unknown()),
});
export type JsonPatch = z.infer<typeof JsonPatchSchema>;

/** Insert content at a named marker in an existing source file. */
export const MarkerInsertSchema = z.object({
  file: z.string().min(1),
  /** Marker name, e.g. 'mount' matches a @skillpack:mount comment in source. */
  marker: z.string().min(1),
  /** Content to insert. May be multi-line. Inserted as a sibling before the marker. */
  insert: z.string(),
  /** Imports to add at the top of the file. */
  imports: z.array(z.string()).optional(),
});
export type MarkerInsert = z.infer<typeof MarkerInsertSchema>;

export const SkillManifestSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  deps: z.record(z.string()).optional().default({}),
  devDeps: z.record(z.string()).optional().default({}),
  files: z.array(FileOverlaySchema).optional().default([]),
  jsonPatches: z.array(JsonPatchSchema).optional().default([]),
  markers: z.array(MarkerInsertSchema).optional().default([]),
  /** Relative path to the skill's SKILL.md file. Defaults to 'SKILL.md'. */
  skillMd: z.string().optional().default('SKILL.md'),
  /** Optional escape hatch script (relative path), invoked after declarative steps. */
  setup: z.string().optional(),
});
export type SkillManifest = z.infer<typeof SkillManifestSchema>;

export const BoilerplateManifestSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
});
export type BoilerplateManifest = z.infer<typeof BoilerplateManifestSchema>;

/** Each installed skill recorded in the project's AGENTS.md manifest block. */
export const InstalledSkillSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  contentHash: z.string().min(1),
  source: z.enum(['bundled', 'overlay', 'remote']),
});
export type InstalledSkill = z.infer<typeof InstalledSkillSchema>;

export const ProjectManifestSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  skillpackVersion: z.string().min(1),
  boilerplate: z.object({
    name: z.string().min(1),
    version: z.string().min(1),
    contentHash: z.string().min(1),
  }),
  skills: z.array(InstalledSkillSchema),
});
export type ProjectManifest = z.infer<typeof ProjectManifestSchema>;
