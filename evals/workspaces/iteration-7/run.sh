#!/usr/bin/env bash
# iter-7 single-run orchestrator. Args: trial# cell.
# Cells: no_skill | remotion_skill | skillpack
#
# Records per-run JSON with: scaffold_ms, install_ms (skillpack only),
# agent_ms, total_ms, stream-json path. The agent's tokens/turns/cost
# live in the stream-json file.
set -euo pipefail

TRIAL="$1"
CELL="$2"
EVAL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPT_FILE="$EVAL_ROOT/PROMPT.md"
PROMPT="$(cat "$PROMPT_FILE")"
MODEL="${MODEL:-claude-sonnet-4-6}"
SKILLPACK_CLI="${SKILLPACK_CLI:-$EVAL_ROOT/../../../packages/cli/dist/bin/skillpack.js}"
UPSTREAM_SKILL_DIR="${UPSTREAM_SKILL_DIR:-$EVAL_ROOT/../../../boilerplates/react/skills/remotion/upstream}"

CELL_DIR="$EVAL_ROOT/trial-$TRIAL/$CELL"
STREAM_JSONL="$EVAL_ROOT/trial-$TRIAL.$CELL.stream.jsonl"
TIMING_JSON="$EVAL_ROOT/trial-$TRIAL.$CELL.timing.json"

now_ms() { python3 -c "import time; print(int(time.time()*1000))"; }

rm -rf "$CELL_DIR"
mkdir -p "$CELL_DIR"

T_total_start=$(now_ms)
scaffold_ms=0
install_ms=0

case "$CELL" in
  no_skill)
    # Empty cwd. No skill files. Agent does literally everything.
    ;;
  remotion_skill)
    # cwd contains ONLY the Remotion team's official skill, project-local at
    # .claude/skills/remotion-best-practices/. Claude Code auto-discovers it.
    mkdir -p "$CELL_DIR/.claude/skills/remotion-best-practices"
    cp "$UPSTREAM_SKILL_DIR/SKILL.md" "$CELL_DIR/.claude/skills/remotion-best-practices/SKILL.md"
    cp -r "$UPSTREAM_SKILL_DIR/rules" "$CELL_DIR/.claude/skills/remotion-best-practices/rules"
    ;;
  skillpack)
    # Time INCLUDES the scaffold + install — that's the user-facing experience.
    T_scaffold_start=$(now_ms)
    node "$SKILLPACK_CLI" scaffold react remotion \
      --into "$CELL_DIR" --no-install --host both --force >/dev/null
    T_scaffold_end=$(now_ms)
    scaffold_ms=$((T_scaffold_end - T_scaffold_start))

    T_install_start=$(now_ms)
    (cd "$CELL_DIR" && pnpm --ignore-workspace install >/dev/null 2>&1)
    T_install_end=$(now_ms)
    install_ms=$((T_install_end - T_install_start))
    ;;
  *)
    echo "Unknown cell: $CELL" >&2
    exit 2
    ;;
esac

T_agent_start=$(now_ms)
# Real Claude Code mode (no --bare). AGENTS.md and project-local
# .claude/skills/ auto-discover from the process cwd.
(
  cd "$CELL_DIR"
  echo "$PROMPT" | claude -p \
    --dangerously-skip-permissions \
    --output-format=stream-json --verbose \
    --model "$MODEL" \
    --add-dir "$CELL_DIR" \
    > "$STREAM_JSONL" 2> "$EVAL_ROOT/trial-$TRIAL.$CELL.stderr" \
    || true
)
T_agent_end=$(now_ms)
agent_ms=$((T_agent_end - T_agent_start))
total_ms=$((T_agent_end - T_total_start))

# Render success / mp4 path / size
mp4_path=""
mp4_size=0
while IFS= read -r p; do
  [ -z "$p" ] && continue
  case "$p" in
    *node_modules*) continue ;;
  esac
  sz=$(stat -f%z "$p" 2>/dev/null || stat -c%s "$p" 2>/dev/null || echo 0)
  if [ "$sz" -gt "$mp4_size" ]; then
    mp4_size=$sz
    mp4_path="${p#$CELL_DIR/}"
  fi
done < <(find "$CELL_DIR" -name "*.mp4" 2>/dev/null)

cat > "$TIMING_JSON" <<EOF
{
  "trial": $TRIAL,
  "cell": "$CELL",
  "scaffold_ms": $scaffold_ms,
  "install_ms": $install_ms,
  "agent_ms": $agent_ms,
  "total_ms": $total_ms,
  "mp4_path": "$mp4_path",
  "mp4_bytes": $mp4_size
}
EOF

echo "[trial-$TRIAL.$CELL] scaffold=${scaffold_ms}ms install=${install_ms}ms agent=${agent_ms}ms total=${total_ms}ms mp4=${mp4_size}B"
