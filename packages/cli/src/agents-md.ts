/**
 * AGENTS.md emitter (DESIGN.md Q13).
 *
 * The dropped AGENTS.md always carries an embedded JSON manifest block
 * delimited by `<!-- skillpack:manifest -->` / `<!-- /skillpack:manifest -->`
 * so lifecycle commands can read it back later (Q14, Q15).
 */
import type { ProjectManifest } from './schema.js';
import type { ResolvedBoilerplate, ResolvedSkill } from './registry.js';

export const MANIFEST_OPEN = '<!-- skillpack:manifest -->';
export const MANIFEST_CLOSE = '<!-- /skillpack:manifest -->';

export interface AgentsMdInput {
  projectName: string;
  boilerplate: ResolvedBoilerplate;
  skills: ResolvedSkill[];
  manifest: ProjectManifest;
  scripts: Array<{ name: string; description: string }>;
  treeText: string;
}

export function renderAgentsMd(input: AgentsMdInput): string {
  const { projectName, boilerplate, skills, manifest, scripts, treeText } = input;

  const skillList = skills.length
    ? skills
        .map(
          (s) =>
            `- **${s.name}** — ${s.manifest.description} See \`.claude/skills/${boilerplate.name}-${s.name}/SKILL.md\`.`,
        )
        .join('\n')
    : '- _(no skills installed)_';

  const skillSummary = skills.length
    ? `\`${boilerplate.name}\` + ${skills.map((s) => '`' + s.name + '`').join(', ')}`
    : `\`${boilerplate.name}\``;

  const scriptList = scripts.length
    ? scripts.map((s) => `- \`${s.name}\` — ${s.description}`).join('\n')
    : '- _(see `package.json`)_';

  return `# Project: ${projectName}

Scaffolded by skillpack: ${skillSummary}.

## Scripts
${scriptList}

## Tree
\`\`\`
${treeText}
\`\`\`

## Skills installed
${skillList}

- **${boilerplate.name}** (boilerplate) — ${boilerplate.manifest.description} See \`.claude/skills/${boilerplate.name}/SKILL.md\`.

## Skillpack metadata
${MANIFEST_OPEN}
\`\`\`json
${JSON.stringify(manifest, null, 2)}
\`\`\`
${MANIFEST_CLOSE}
`;
}

/** Extract the embedded manifest from an existing AGENTS.md, or undefined. */
export function parseAgentsMd(content: string): ProjectManifest | undefined {
  const open = content.indexOf(MANIFEST_OPEN);
  const close = content.indexOf(MANIFEST_CLOSE);
  if (open < 0 || close < 0 || close <= open) return undefined;
  const between = content.slice(open + MANIFEST_OPEN.length, close);
  const fence = /```(?:json)?\s*([\s\S]*?)```/m.exec(between);
  if (!fence) return undefined;
  try {
    return JSON.parse(fence[1] ?? '') as ProjectManifest;
  } catch {
    return undefined;
  }
}
