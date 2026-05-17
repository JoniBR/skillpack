#!/usr/bin/env python3
"""Iter-7 aggregator. Parses stream-json + per-run timing.json files into a
single summary.json with mean+/-stddev per cell. Also counts tool calls by
type and validates MP4 existence + first-attempt render success."""

import json
import re
import statistics
from pathlib import Path

EVAL_ROOT = Path(__file__).parent
TRIALS = [1, 2, 3]
CELLS = ["no_skill", "remotion_skill", "skillpack"]

# Match a real `remotion render` invocation regardless of binary-path style.
RENDER_PAT = re.compile(
    r"(?:(?:^|[/\s])remotion\s+render\b"
    r"|\bvideo:render\b"
    r"|(?:^|\s)(?:pnpm|npm|yarn|bun)\s+render\b)",
    re.IGNORECASE,
)


def is_render_cmd(cmd: str) -> bool:
    head = cmd.lstrip().split("\n", 1)[0].strip()
    if head.startswith(("cat ", "printf", "echo ", "tee ", "jq ", "sed ", "awk ")):
        return False
    for seg in re.split(r"(?:&&|\|\||;|\n)", cmd):
        s = re.sub(r"^(?:[A-Z_]+=\S+\s+)+", "", seg.strip())
        if not s:
            continue
        first = s.split()[0]
        if first in {"cat", "printf", "echo", "tee", "jq", "sed", "awk"}:
            continue
        if RENDER_PAT.search(s):
            return True
    return False


def analyze_run(trial: int, cell: str):
    stream_path = EVAL_ROOT / f"trial-{trial}.{cell}.stream.jsonl"
    timing_path = EVAL_ROOT / f"trial-{trial}.{cell}.timing.json"
    timing = json.loads(timing_path.read_text())

    tool_calls = {}  # tool_name -> count
    render_attempts = []  # list of bool (is_error)
    pending = {}  # tool_use_id -> {name, command_if_bash}
    last_result = None

    with stream_path.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                ev = json.loads(line)
            except json.JSONDecodeError:
                continue
            if ev.get("type") == "result":
                last_result = ev
            for block in ev.get("message", {}).get("content", []) or []:
                if not isinstance(block, dict):
                    continue
                if block.get("type") == "tool_use":
                    name = block.get("name", "?")
                    tool_calls[name] = tool_calls.get(name, 0) + 1
                    if name == "Bash":
                        pending[block.get("id")] = block.get("input", {}).get(
                            "command", ""
                        )
                elif block.get("type") == "tool_result":
                    cmd = pending.pop(block.get("tool_use_id"), None)
                    if cmd and is_render_cmd(cmd):
                        render_attempts.append(bool(block.get("is_error")))

    u = (last_result or {}).get("usage", {})
    return {
        "trial": trial,
        "cell": cell,
        "scaffold_ms": timing["scaffold_ms"],
        "install_ms": timing["install_ms"],
        "agent_ms": timing["agent_ms"],
        "total_ms": timing["total_ms"],
        "mp4_bytes": timing["mp4_bytes"],
        "mp4_path": timing["mp4_path"],
        "turns": (last_result or {}).get("num_turns", 0),
        "cost_usd": (last_result or {}).get("total_cost_usd", 0.0),
        "input_tokens": u.get("input_tokens", 0),
        "output_tokens": u.get("output_tokens", 0),
        "cache_read_tokens": u.get("cache_read_input_tokens", 0),
        "cache_create_tokens": u.get("cache_creation_input_tokens", 0),
        "tool_calls_total": sum(tool_calls.values()),
        "tool_calls_by_type": tool_calls,
        "render_attempts": len(render_attempts),
        "first_render_success": (not render_attempts[0]) if render_attempts else False,
    }


def stats(values):
    if not values:
        return {"mean": 0, "stddev": 0, "min": 0, "max": 0, "n": 0}
    mean = statistics.fmean(values)
    sd = statistics.stdev(values) if len(values) > 1 else 0.0
    return {
        "mean": mean,
        "stddev": sd,
        "min": min(values),
        "max": max(values),
        "n": len(values),
    }


def aggregate():
    per_run = {c: [analyze_run(t, c) for t in TRIALS] for c in CELLS}
    summary = {}
    for cell, runs in per_run.items():
        summary[cell] = {
            "n": len(runs),
            "first_render_success_rate": sum(
                1 for r in runs if r["first_render_success"]
            )
            / max(len(runs), 1),
            "mp4_success_rate": sum(1 for r in runs if r["mp4_bytes"] > 50 * 1024)
            / max(len(runs), 1),
            "render_attempts": stats([r["render_attempts"] for r in runs]),
            "agent_ms": stats([r["agent_ms"] for r in runs]),
            "total_ms": stats([r["total_ms"] for r in runs]),
            "scaffold_ms": stats([r["scaffold_ms"] for r in runs]),
            "install_ms": stats([r["install_ms"] for r in runs]),
            "turns": stats([r["turns"] for r in runs]),
            "cost_usd": stats([r["cost_usd"] for r in runs]),
            "input_tokens": stats([r["input_tokens"] for r in runs]),
            "output_tokens": stats([r["output_tokens"] for r in runs]),
            "cache_read_tokens": stats([r["cache_read_tokens"] for r in runs]),
            "cache_create_tokens": stats([r["cache_create_tokens"] for r in runs]),
            "tool_calls_total": stats([r["tool_calls_total"] for r in runs]),
            "mp4_bytes": stats([r["mp4_bytes"] for r in runs if r["mp4_bytes"] > 0]),
            "per_trial": runs,
        }
    return summary


def fmt(s, digits=0, divisor=1, prefix=""):
    m = s["mean"] / divisor
    sd = s["stddev"] / divisor
    if digits == 0:
        return f"{prefix}{m:.0f}±{sd:.0f}"
    return f"{prefix}{m:.{digits}f}±{sd:.{digits}f}"


def print_tables(summary):
    headers = [
        "cell",
        "n",
        "mp4✓",
        "1st-ok",
        "turns",
        "tools",
        "in_tok",
        "out_tok",
        "cost",
        "agent_s",
        "total_s",
    ]
    rows = [headers]
    for cell in CELLS:
        s = summary[cell]
        rows.append(
            [
                cell,
                str(s["n"]),
                f"{s['mp4_success_rate']:.0%}",
                f"{s['first_render_success_rate']:.0%}",
                fmt(s["turns"]),
                fmt(s["tool_calls_total"]),
                fmt(s["input_tokens"]),
                fmt(s["output_tokens"]),
                fmt(s["cost_usd"], digits=3, prefix="$"),
                fmt(s["agent_ms"], digits=0, divisor=1000),
                fmt(s["total_ms"], digits=0, divisor=1000),
            ]
        )
    widths = [max(len(r[i]) for r in rows) for i in range(len(headers))]
    fmtline = "  ".join(f"{{:<{w}}}" for w in widths)
    print(fmtline.format(*rows[0]))
    print("  ".join("-" * w for w in widths))
    for row in rows[1:]:
        print(fmtline.format(*row))
    print()
    print("Tool-call mix (mean per run):")
    for cell in CELLS:
        runs = summary[cell]["per_trial"]
        agg = {}
        for r in runs:
            for k, v in r["tool_calls_by_type"].items():
                agg[k] = agg.get(k, 0) + v / len(runs)
        items = sorted(agg.items(), key=lambda kv: -kv[1])
        print(f"  {cell:<16} " + ", ".join(f"{k}={v:.1f}" for k, v in items))
    print()
    print("Per-trial render-success:")
    for cell in CELLS:
        per = summary[cell]["per_trial"]
        marks = "".join("✓" if r["first_render_success"] else "✗" for r in per)
        print(f"  {cell:<16} {marks}")


def main():
    summary = aggregate()
    (EVAL_ROOT / "summary.json").write_text(json.dumps(summary, indent=2, default=str))
    print_tables(summary)


if __name__ == "__main__":
    main()
