#!/usr/bin/env node
/** Entry point for the `skillpack` CLI. */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import kleur from 'kleur';
import { prime } from '../prime.js';
import { listBoilerplates, listSkills } from '../registry.js';
import { scaffold, type Host } from '../scaffold.js';
import type { PackageManager } from '../pm.js';

function readSkillpackVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/bin/ → dist/ → package root
  for (const candidate of [
    join(here, '..', '..', 'package.json'),
    join(here, '..', 'package.json'),
  ]) {
    if (existsSync(candidate)) {
      try {
        return JSON.parse(readFileSync(candidate, 'utf8')).version as string;
      } catch {
        /* fall through */
      }
    }
  }
  return '0.0.0';
}

const VERSION = readSkillpackVersion();

const program = new Command();
program
  .name('skillpack')
  .description('Scaffold projects + agent skills in one command.')
  .version(VERSION);

program
  .command('scaffold')
  .description('Scaffold a project from a boilerplate + skills.')
  .argument('<boilerplate>', 'boilerplate name (e.g. react)')
  .argument('[skills...]', 'skill names within that boilerplate')
  .option('--into <path>', 'target directory (default: cwd if empty)')
  .option('--no-install', 'skip package install')
  .option('--pm <pm>', 'force a package manager (pnpm|npm|yarn|bun)')
  .option('--host <host>', 'target agent host (claude|pi|both)', 'both')
  .option('--force', 'scaffold into non-empty directory (DANGEROUS)', false)
  .action((boilerplate: string, skills: string[], opts: Record<string, unknown>) => {
    try {
      const target = resolve(typeof opts['into'] === 'string' ? opts['into'] : process.cwd());
      const result = scaffold({
        boilerplate,
        skills,
        into: target,
        install: opts['install'] !== false,
        pm: opts['pm'] as PackageManager | undefined,
        host: (opts['host'] as Host) ?? 'both',
        skillpackVersion: VERSION,
        force: opts['force'] === true,
      });
      console.log(
        kleur.green(
          `\n✔ Scaffolded ${result.boilerplate.name} + [${result.skills.map((s) => s.name).join(', ')}] into ${result.projectDir}`,
        ),
      );
      console.log(`  Package manager: ${kleur.cyan(result.pm)}`);
      console.log(`  Manifest schema: v${result.manifest.schemaVersion}`);
      console.log(`  See AGENTS.md for the agent primer.`);
    } catch (err) {
      handle(err);
    }
  });

program
  .command('prime')
  .description('Emit a clean-context primer for a subagent.')
  .requiredOption('--boilerplate <name>', 'boilerplate name')
  .requiredOption('--skills <list>', 'comma-separated skill names', (v: string) => v)
  .option('--project <path>', 'project directory (for the tree)', process.cwd())
  .action((opts: Record<string, unknown>) => {
    try {
      const skills = ((opts['skills'] as string) ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const out = prime({
        boilerplate: opts['boilerplate'] as string,
        skills,
        projectDir: opts['project'] as string,
      });
      process.stdout.write(out);
    } catch (err) {
      handle(err);
    }
  });

const listCmd = program.command('list').description('List bundled boilerplates or skills.');

listCmd
  .command('boilerplates')
  .description('List bundled boilerplates.')
  .action(() => {
    try {
      for (const name of listBoilerplates()) console.log(name);
    } catch (err) {
      handle(err);
    }
  });

listCmd
  .command('skills <boilerplate>')
  .description('List skills available for a boilerplate.')
  .action((boilerplate: string) => {
    try {
      for (const name of listSkills(boilerplate)) console.log(name);
    } catch (err) {
      handle(err);
    }
  });

const skillCmd = program.command('skill').description('Skill-authoring helpers.');
skillCmd
  .command('scaffold')
  .description('Create an empty skill skeleton for skill-creator to fill in.')
  .requiredOption('--boilerplate <name>', 'target boilerplate')
  .requiredOption('--name <skill>', 'new skill name (kebab-case)')
  .option('--into <path>', 'override target directory (default: bundled location)')
  .action((opts: Record<string, unknown>) => {
    try {
      scaffoldEmptySkill(
        opts['boilerplate'] as string,
        opts['name'] as string,
        opts['into'] as string | undefined,
      );
    } catch (err) {
      handle(err);
    }
  });

function scaffoldEmptySkill(boilerplate: string, name: string, into: string | undefined): void {
  const { mkdirSync, writeFileSync, existsSync } = require('node:fs') as typeof import('node:fs');
  const root = into ?? join(process.env['HOME'] ?? '~', '.skillpack', 'skills', boilerplate, name);
  if (existsSync(root)) {
    throw new Error(`Skill directory already exists: ${root}`);
  }
  mkdirSync(join(root, 'files'), { recursive: true });
  mkdirSync(join(root, 'references'), { recursive: true });
  writeFileSync(
    join(root, 'manifest.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        name,
        version: '0.1.0',
        description: `TODO: describe the ${name} skill for the ${boilerplate} boilerplate.`,
        deps: {},
        devDeps: {},
        files: [],
        jsonPatches: [],
        markers: [],
        skillMd: 'SKILL.md',
      },
      null,
      2,
    ) + '\n',
  );
  writeFileSync(
    join(root, 'SKILL.md'),
    `---
name: ${boilerplate}-${name}
description: TODO. Use when the user wants ${name} in a ${boilerplate} project.
---

# ${name}

TODO: project conventions, snippet cheatsheet, pointers to references/.
`,
  );
  console.log(kleur.green(`✔ Skill skeleton created at ${root}`));
  console.log(kleur.dim(`  Now invoke skill-creator to fill in manifest + SKILL.md.`));
}

function handle(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(kleur.red(`✗ ${msg}`));
  process.exit(1);
}

program.parseAsync(process.argv).catch(handle);
