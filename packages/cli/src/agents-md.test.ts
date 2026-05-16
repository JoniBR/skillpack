import { describe, expect, it } from 'vitest';
import { parseAgentsMd, renderAgentsMd } from './agents-md.js';
import type { ProjectManifest } from './schema.js';

const manifest: ProjectManifest = {
  schemaVersion: 1,
  skillpackVersion: '0.1.0',
  boilerplate: {
    name: 'react',
    version: '0.1.0',
    contentHash: 'sha256:aaaa',
  },
  skills: [{ name: 'remotion', version: '0.1.0', contentHash: 'sha256:bbbb', source: 'bundled' }],
};

describe('renderAgentsMd / parseAgentsMd', () => {
  it('round-trips the manifest block', () => {
    const md = renderAgentsMd({
      projectName: 'my-app',
      boilerplate: {
        name: 'react',
        dir: '/x',
        baseDir: '/x/base',
        manifest: {
          schemaVersion: 1,
          name: 'react',
          version: '0.1.0',
          description: 'React boilerplate.',
        },
        source: 'bundled',
      },
      skills: [
        {
          name: 'remotion',
          dir: '/x/skills/remotion',
          manifest: {
            schemaVersion: 1,
            name: 'remotion',
            version: '0.1.0',
            description: 'Remotion video.',
            deps: {},
            devDeps: {},
            files: [],
            jsonPatches: [],
            markers: [],
            skillMd: 'SKILL.md',
          },
          source: 'bundled',
        },
      ],
      manifest,
      scripts: [{ name: 'dev', description: 'start dev server' }],
      treeText: 'src\n├── App.tsx',
    });

    expect(md).toContain('# Project: my-app');
    expect(md).toContain('Scaffolded by skillpack: `react` + `remotion`.');
    expect(md).toContain('react-remotion'); // skill folder name appears in skills list
    const parsed = parseAgentsMd(md);
    expect(parsed).toEqual(manifest);
  });

  it('returns undefined when no manifest block is present', () => {
    expect(parseAgentsMd('# random project\nno manifest here.')).toBeUndefined();
  });
});
