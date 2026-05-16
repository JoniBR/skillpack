/**
 * Scaffolder pipeline (DESIGN.md Q8).
 *
 * Order:
 *   1. Copy boilerplates/<name>/base/ → project.
 *   2. For each skill in arg order: apply `files` (overlay).
 *   3. Merge all deps/devDeps into package.json; merge all jsonPatches.
 *   4. For each skill in arg order: apply marker insertions.
 *   5. For each skill in arg order: run setup.ts (deferred to Phase 2).
 *   6. Install deps (Q7) unless --no-install.
 *   7. Write .claude/skills/ and .pi/skills/ SKILL.md files (Q6).
 *   8. git init + initial commit (Q14 precondition).
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { renderAgentsMd } from './agents-md.js';
import {
  copyTree,
  ensureDir,
  fileExists,
  isDirEmpty,
  listFiles,
  readText,
  writeText,
} from './fs-utils.js';
import { gitCommitAll, gitInit } from './git.js';
import { hashDirectory, sha256 } from './hash.js';
import { deepMerge } from './json-merge.js';
import { insertAtMarker } from './markers.js';
import { detectPackageManager, runInstall, type PackageManager } from './pm.js';
import {
  resolveBoilerplate,
  resolveSkill,
  type ResolvedBoilerplate,
  type ResolvedSkill,
} from './registry.js';
import type { InstalledSkill, ProjectManifest } from './schema.js';

export type Host = 'claude' | 'pi' | 'both';

export interface ScaffoldOptions {
  boilerplate: string;
  skills: string[];
  into: string;
  install: boolean;
  pm?: PackageManager;
  host: Host;
  skillpackVersion: string;
  /** If true, do not error on non-empty cwd. Used by tests/eval. */
  force?: boolean;
}

export interface ScaffoldResult {
  projectDir: string;
  pm: PackageManager;
  boilerplate: ResolvedBoilerplate;
  skills: ResolvedSkill[];
  manifest: ProjectManifest;
}

export function scaffold(opts: ScaffoldOptions): ScaffoldResult {
  const target = opts.into;
  if (!opts.force && !isDirEmpty(target)) {
    throw new Error(
      `Target directory ${target} is not empty. Pass --into <path> to scaffold ` +
        `into a subdirectory, or --force to scaffold here anyway.`,
    );
  }
  ensureDir(target);

  const bp = resolveBoilerplate(opts.boilerplate);
  const skills = opts.skills.map((s) => resolveSkill(opts.boilerplate, s));

  // 1. Copy base
  copyTree(bp.baseDir, target);

  // 2. File overlays — detect collisions across skills
  const overlayClaim = new Map<string, string>(); // to → skill name
  for (const skill of skills) {
    for (const overlay of skill.manifest.files ?? []) {
      const prior = overlayClaim.get(overlay.to);
      if (prior && !overlay.overwrite) {
        throw new Error(
          `File overlay conflict: skills "${prior}" and "${skill.name}" both target ${overlay.to}. ` +
            `One of them must declare overwrite:true or use markers/setup instead.`,
        );
      }
      overlayClaim.set(overlay.to, skill.name);
      copyTree(join(skill.dir, overlay.from), join(target, overlay.to));
    }
  }

  // 3. Merge deps + jsonPatches
  const pkgPath = join(target, 'package.json');
  if (existsSync(pkgPath)) {
    let pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
    for (const skill of skills) {
      const deps = skill.manifest.deps ?? {};
      const devDeps = skill.manifest.devDeps ?? {};
      if (Object.keys(deps).length) {
        pkg = deepMerge(pkg as never, { dependencies: deps } as never) as Record<string, unknown>;
      }
      if (Object.keys(devDeps).length) {
        pkg = deepMerge(pkg as never, { devDependencies: devDeps } as never) as Record<
          string,
          unknown
        >;
      }
    }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  }

  for (const skill of skills) {
    for (const patch of skill.manifest.jsonPatches ?? []) {
      const file = join(target, patch.file);
      if (!existsSync(file)) {
        throw new Error(
          `jsonPatch in skill "${skill.name}" targets ${patch.file}, which does not exist.`,
        );
      }
      const current = JSON.parse(readFileSync(file, 'utf8'));
      const merged = deepMerge(current, patch.merge as never);
      writeFileSync(file, JSON.stringify(merged, null, 2) + '\n', 'utf8');
    }
  }

  // 4. Marker insertions (in CLI arg order)
  for (const skill of skills) {
    for (const marker of skill.manifest.markers ?? []) {
      const file = join(target, marker.file);
      if (!existsSync(file)) {
        throw new Error(
          `marker in skill "${skill.name}" targets ${marker.file}, which does not exist.`,
        );
      }
      const src = readText(file);
      const next = insertAtMarker(src, marker.file, marker);
      writeText(file, next);
    }
  }

  // 5. setup.ts — deferred to v0.2 (no current bundled skill needs it)
  for (const skill of skills) {
    if (skill.manifest.setup) {
      console.warn(
        `[skillpack] skill "${skill.name}" declares a setup script (${skill.manifest.setup}); ` +
          `setup-script execution lands in v0.2.`,
      );
    }
  }

  // 6. Install
  const pm = opts.pm ?? detectPackageManager(target);
  if (opts.install) {
    runInstall(target, pm);
  }

  // 7. Write SKILL.md files (boilerplate + each skill) for the requested host(s).
  const targets: Array<{ host: 'claude' | 'pi'; dir: string }> = [];
  if (opts.host === 'claude' || opts.host === 'both') {
    targets.push({ host: 'claude', dir: join(target, '.claude', 'skills') });
  }
  if (opts.host === 'pi' || opts.host === 'both') {
    targets.push({ host: 'pi', dir: join(target, '.pi', 'skills') });
  }

  const baseSkillMd = join(bp.dir, 'base-skill', 'SKILL.md');
  if (existsSync(baseSkillMd)) {
    for (const t of targets) {
      const dest = join(t.dir, bp.name, 'SKILL.md');
      writeText(dest, readText(baseSkillMd));
    }
  }
  // Skill-directory aux contents to copy alongside SKILL.md. Anything in the
  // skill dir that isn't `files/`, `manifest.json`, or the skillMd itself is
  // treated as agent-facing reference material and ships through.
  const SKILL_AUX_SKIP = new Set(['files', 'manifest.json']);
  for (const skill of skills) {
    const skillMdName = skill.manifest.skillMd ?? 'SKILL.md';
    const src = join(skill.dir, skillMdName);
    if (!existsSync(src)) {
      throw new Error(`Skill "${skill.name}" is missing its SKILL.md at ${src}`);
    }
    const auxEntries = readdirSync(skill.dir).filter(
      (n) => !SKILL_AUX_SKIP.has(n) && n !== skillMdName,
    );
    for (const t of targets) {
      const skillDir = join(t.dir, `${bp.name}-${skill.name}`);
      writeText(join(skillDir, 'SKILL.md'), readText(src));
      for (const name of auxEntries) {
        const from = join(skill.dir, name);
        if (statSync(from).isDirectory()) {
          copyTree(from, join(skillDir, name));
        }
      }
    }
  }

  // 8. Compute manifest, write AGENTS.md, git init + commit
  const installedSkills: InstalledSkill[] = skills.map((s) => ({
    name: s.name,
    version: s.manifest.version,
    contentHash: hashDirectory(s.dir),
    source: 'bundled',
  }));
  const manifest: ProjectManifest = {
    schemaVersion: 1,
    skillpackVersion: opts.skillpackVersion,
    boilerplate: {
      name: bp.name,
      version: bp.manifest.version,
      contentHash: hashDirectory(bp.baseDir),
    },
    skills: installedSkills,
  };

  const treeText = renderTree(target);
  const scripts = derivePackageScripts(target);
  const projectName = basename(target);

  const agentsMd = renderAgentsMd({
    projectName,
    boilerplate: bp,
    skills,
    manifest,
    scripts,
    treeText,
  });
  writeText(join(target, 'AGENTS.md'), agentsMd);

  // Per-skill state files (DESIGN.md Q14)
  for (const inst of installedSkills) {
    const statePath = join(target, '.skillpack', 'state', `${inst.name}.json`);
    writeText(statePath, JSON.stringify({ schemaVersion: 1, ...inst }, null, 2) + '\n');
  }

  gitInit(target);
  gitCommitAll(
    target,
    `chore: scaffold via skillpack ${bp.name} ${skills.map((s) => s.name).join(' ')}`.trim(),
  );

  return { projectDir: target, pm, boilerplate: bp, skills, manifest };
}

function renderTree(dir: string, maxDepth = 3): string {
  const lines: string[] = [];
  const walk = (current: string, depth: number, prefix: string): void => {
    if (depth > maxDepth) return;
    let entries: string[];
    try {
      entries = listDirShallow(current);
    } catch {
      return;
    }
    entries = entries
      .filter((n) => n !== 'node_modules' && n !== '.git' && n !== '.skillpack')
      .sort();
    for (let i = 0; i < entries.length; i++) {
      const name = entries[i]!;
      const isLast = i === entries.length - 1;
      lines.push(prefix + (isLast ? '└── ' : '├── ') + name);
      const full = join(current, name);
      try {
        if (statSync(full).isDirectory()) {
          walk(full, depth + 1, prefix + (isLast ? '    ' : '│   '));
        }
      } catch {
        /* ignore */
      }
    }
  };
  walk(dir, 0, '');
  return lines.length ? lines.join('\n') : '(empty)';
}

function listDirShallow(dir: string): string[] {
  return readdirSync(dir);
}

function derivePackageScripts(projectDir: string): Array<{ name: string; description: string }> {
  const pkgPath = join(projectDir, 'package.json');
  if (!existsSync(pkgPath)) return [];
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { scripts?: Record<string, string> };
  const descriptions: Record<string, string> = {
    dev: 'start the dev server',
    build: 'production build',
    test: 'run tests',
    lint: 'run linter',
    typecheck: 'run typechecker',
    preview: 'preview the production build',
  };
  return Object.keys(pkg.scripts ?? {}).map((name) => ({
    name,
    description: descriptions[name] ?? `runs \`${pkg.scripts?.[name]}\``,
  }));
}

// Silence unused-import warning for helpers that are used indirectly.
void listFiles;
void relative;
void sep;
void sha256;
void fileExists;
