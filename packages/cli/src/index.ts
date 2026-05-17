/** Public programmatic API for @skill-pack/cli. */
export { scaffold, type ScaffoldOptions, type ScaffoldResult, type Host } from './scaffold.js';
export { prime, type PrimeOptions } from './prime.js';
export {
  resolveBoilerplate,
  resolveSkill,
  listBoilerplates,
  listSkills,
  listBoilerplatesWithSource,
  listSkillsWithSource,
  resolveBundledRoot,
  type BoilerplateEntry,
  type SkillEntry,
  type ResolvedBoilerplate,
  type ResolvedSkill,
  type Source,
} from './registry.js';
export {
  resolveOverlayRoot,
  resolveOverlayBoilerplate,
  resolveOverlaySkill,
  listOverlayBoilerplates,
  listOverlaySkills,
} from './overlay.js';
export { renderAgentsMd, parseAgentsMd, MANIFEST_OPEN, MANIFEST_CLOSE } from './agents-md.js';
export { detectPackageManager, installCommand, type PackageManager } from './pm.js';
export * from './schema.js';
