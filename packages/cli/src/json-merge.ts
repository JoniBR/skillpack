/**
 * Deep-merge for JSON patches (DESIGN.md Q8).
 *
 * Rules:
 *   - Plain objects are recursively merged.
 *   - Arrays are concatenated and deduplicated by JSON-stringify identity.
 *   - Scalars: incoming wins iff equal to existing OR existing is undefined;
 *     otherwise throws `JsonMergeConflict` (caller decides whether to surface).
 */

export class JsonMergeConflict extends Error {
  constructor(
    public readonly path: string,
    public readonly existing: unknown,
    public readonly incoming: unknown,
  ) {
    super(
      `JSON merge conflict at "${path}": existing=${JSON.stringify(existing)} vs incoming=${JSON.stringify(incoming)}`,
    );
    this.name = 'JsonMergeConflict';
  }
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

function isPlainObject(v: unknown): v is { [k: string]: JsonValue } {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function deepMerge(
  base: JsonValue,
  patch: JsonValue,
  path = '',
): JsonValue {
  if (patch === undefined) return base;
  if (base === undefined || base === null) return patch;

  if (Array.isArray(base) && Array.isArray(patch)) {
    const seen = new Set(base.map((x) => JSON.stringify(x)));
    const merged: JsonValue[] = [...base];
    for (const item of patch) {
      const key = JSON.stringify(item);
      if (!seen.has(key)) {
        merged.push(item);
        seen.add(key);
      }
    }
    return merged;
  }

  if (isPlainObject(base) && isPlainObject(patch)) {
    const out: { [k: string]: JsonValue } = { ...base };
    for (const [k, v] of Object.entries(patch)) {
      const childPath = path ? `${path}.${k}` : k;
      if (k in out) {
        out[k] = deepMerge(out[k] as JsonValue, v, childPath);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  // Scalars / mismatched shapes.
  if (JSON.stringify(base) === JSON.stringify(patch)) return base;
  throw new JsonMergeConflict(path || '<root>', base, patch);
}
