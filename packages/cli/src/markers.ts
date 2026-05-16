/**
 * Marker-based insertion (DESIGN.md Q8).
 *
 * Base templates declare markers like:
 *
 *     {/* @skillpack:mount * /}
 *
 * (without the space — we cannot embed the literal in this comment).
 * Skills insert content before the marker line. Multiple skills inserting
 * at the same marker append in CLI argument order.
 */
import type { MarkerInsert } from './schema.js';

const MARKER_PREFIX = '@skillpack:';

/** Match `// @skillpack:NAME` or `{/* @skillpack:NAME *\/}` or `<!-- @skillpack:NAME -->`. */
function markerRegex(name: string): RegExp {
  // Match the marker name surrounded by typical comment delimiters.
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `^([ \\t]*)(?://|/\\*|\\{/\\*|<!--)\\s*${MARKER_PREFIX}${escaped}\\b`,
    'm',
  );
}

export class MarkerNotFoundError extends Error {
  constructor(file: string, marker: string) {
    super(`Marker "${MARKER_PREFIX}${marker}" not found in ${file}`);
    this.name = 'MarkerNotFoundError';
  }
}

/**
 * Insert `insertion.insert` immediately before the marker line, preserving
 * the marker's indentation. Returns the modified source.
 */
export function insertAtMarker(source: string, file: string, insertion: MarkerInsert): string {
  const re = markerRegex(insertion.marker);
  const match = re.exec(source);
  if (!match) throw new MarkerNotFoundError(file, insertion.marker);

  const indent = match[1] ?? '';
  const indented = insertion.insert
    .split('\n')
    .map((line) => (line.length > 0 ? indent + line : line))
    .join('\n');

  let result = source.slice(0, match.index) + indented + '\n' + source.slice(match.index);

  if (insertion.imports && insertion.imports.length > 0) {
    result = addImports(result, insertion.imports);
  }
  return result;
}

/**
 * Add import statements to a source file, after any existing imports and
 * before the first non-import statement. Skips imports that already exist
 * (matched by exact source text).
 */
export function addImports(source: string, imports: readonly string[]): string {
  const existing = new Set<string>();
  const lines = source.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (/^\s*import\b/.test(line)) {
      existing.add(line.trim());
      lastImportIdx = i;
    } else if (lastImportIdx >= 0 && line.trim() === '') {
    } else if (lastImportIdx >= 0) {
      break;
    }
  }
  const toAdd = imports.filter((imp) => !existing.has(imp.trim()));
  if (toAdd.length === 0) return source;
  const insertAt = lastImportIdx + 1;
  lines.splice(insertAt, 0, ...toAdd);
  return lines.join('\n');
}
