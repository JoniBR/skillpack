#!/usr/bin/env python3
"""Parse claude -p stream-json output, extract render-attempt + summary metrics."""

import json
import re
from pathlib import Path

EVAL_ROOT = Path(__file__).parent
CELLS = ["baseline", "upstream_only", "skillpack"]

# Patterns that count as "render attempt"
RENDER_PAT = re.compile(
    r"(remotion render|video:render|remotion\s+render|npx remotion render)",
    re.IGNORECASE,
)
# Patterns that strongly hint a TYPECHECK call
TYPECHECK_PAT = re.compile(
    r"(pnpm typecheck|npm run typecheck|tsc --noEmit|tsc -b)", re.IGNORECASE
)


RUNNER_PREFIXES = {"remotion", "npx", "pnpm", "npm", "yarn", "bun", "pnpx"}
# Broader render pattern: explicit `remotion render`, `video:render`, or any
# `<runner> render` (e.g. baseline's `pnpm render` script).
RENDER_INVOCATION_PAT = re.compile(
    r"(remotion render|video:render|\brender\b)",
    re.IGNORECASE,
)


def is_real_render_invocation(cmd: str) -> bool:
    """True iff the command actually invokes a video render (npx remotion render,
    pnpm video:render, or a custom `<runner> render` script), not a heredoc or
    `cat >` whose body happens to include those strings."""
    head = cmd.lstrip().split("\n", 1)[0].strip()
    if head.startswith(("cat ", "printf", "echo ", "tee ", "jq ", "sed ", "awk ")):
        return False
    segments = re.split(r"(?:&&|\|\||;|\n)", cmd)
    for seg in segments:
        s = re.sub(r"^(?:[A-Z_]+=\S+\s+)+", "", seg.strip())
        parts = s.split()
        if not parts:
            continue
        first = parts[0]
        if first not in RUNNER_PREFIXES:
            continue
        # `pnpm render`, `pnpm run render`, `npm run video:render`, `npx remotion render`, etc.
        rest = " ".join(parts[1:])
        if RENDER_INVOCATION_PAT.search(rest) or RENDER_INVOCATION_PAT.search(s):
            return True
    return False


def stream_events(path: Path):
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def analyze(label: str):
    stream = list(stream_events(EVAL_ROOT / f"{label}.stream.jsonl"))
    render_attempts = []  # list of (command_str, exit_code or None)
    typecheck_attempts = []
    # We pair Bash tool_use (id) → tool_result (tool_use_id) to recover exit codes.
    pending_bash = {}  # id → {command}
    for ev in stream:
        if ev.get("type") != "assistant" and ev.get("type") != "user":
            continue
        msg = ev.get("message", {})
        for block in msg.get("content", []) or []:
            if not isinstance(block, dict):
                continue
            if block.get("type") == "tool_use" and block.get("name") == "Bash":
                inp = block.get("input", {})
                cmd = inp.get("command", "")
                pending_bash[block.get("id")] = cmd
            elif block.get("type") == "tool_result":
                tu_id = block.get("tool_use_id")
                cmd = pending_bash.pop(tu_id, None)
                if cmd is None:
                    continue
                content = block.get("content", "")
                if isinstance(content, list):
                    content = " ".join(
                        c.get("text", "") if isinstance(c, dict) else str(c)
                        for c in content
                    )
                is_error = bool(block.get("is_error"))
                if is_real_render_invocation(cmd):
                    render_attempts.append((cmd, is_error, content[:300]))
                if TYPECHECK_PAT.search(cmd):
                    typecheck_attempts.append((cmd, is_error))

    # Final summary
    result_ev = next((e for e in reversed(stream) if e.get("type") == "result"), None)
    usage = (result_ev or {}).get("usage", {}) if result_ev else {}

    # MP4 existence anywhere under the cell dir
    cell_dir = EVAL_ROOT / label
    mp4s = []
    for p in cell_dir.rglob("*.mp4"):
        if "node_modules" in p.parts:
            continue
        mp4s.append((str(p.relative_to(cell_dir)), p.stat().st_size))

    return {
        "label": label,
        "duration_s": (result_ev or {}).get("duration_ms", 0) / 1000,
        "cost_usd": (result_ev or {}).get("total_cost_usd", 0),
        "turns": (result_ev or {}).get("num_turns", 0),
        "input_tokens": usage.get("input_tokens", 0),
        "output_tokens": usage.get("output_tokens", 0),
        "cache_read": usage.get("cache_read_input_tokens", 0),
        "cache_create": usage.get("cache_creation_input_tokens", 0),
        "render_attempts": len(render_attempts),
        "first_render_success": (
            (not render_attempts[0][1]) if render_attempts else False
        ),
        "render_history": render_attempts,
        "typecheck_attempts": len(typecheck_attempts),
        "mp4s": mp4s,
        "final_mp4": next(((p, s) for p, s in mp4s if s > 50 * 1024), None),
    }


def main():
    results = [analyze(c) for c in CELLS]
    out = EVAL_ROOT / "metrics.json"
    out.write_text(json.dumps(results, indent=2, default=str))

    # Print table
    print(
        f"\n{'cell':<16}{'turns':>7}{'render#':>9}{'1st-ok':>8}{'mp4':>14}{'cost':>9}{'dur_s':>8}"
    )
    print("-" * 80)
    for r in results:
        mp4 = f"{r['final_mp4'][1] // 1024} KB" if r["final_mp4"] else "MISSING"
        print(
            f"{r['label']:<16}"
            f"{r['turns']:>7}"
            f"{r['render_attempts']:>9}"
            f"{('✓' if r['first_render_success'] else '✗'):>8}"
            f"{mp4:>14}"
            f"{('$%.3f' % r['cost_usd']):>9}"
            f"{r['duration_s']:>8.1f}"
        )
    print()
    print("Render-history details:")
    for r in results:
        print(f"  [{r['label']}] {r['render_attempts']} render attempt(s):")
        for i, (cmd, err, out_snip) in enumerate(r["render_history"], 1):
            print(f"    {i}. {'FAIL' if err else 'OK  '}  {cmd[:80]}")
            if err:
                print(f"       err snippet: {out_snip[:160]!r}")


if __name__ == "__main__":
    main()
