#!/bin/bash
# PreToolUse(Bash) guard for a SHARED WORKING TREE.
#
# Several Claude sessions and Peter himself work in /Users/Peter/mashenstein at
# the same time. Any command that rewrites the tree wholesale takes other
# people's in-progress edits with it — on 4 Sep 2026 a `git stash` run to answer
# a read-only question ("does HEAD pass the tests?") pulled an hour of another
# session's work out from under it, and the `stash pop` afterwards half-applied
# against files that had changed underneath.
#
# The old rule was a note in memory listing forbidden commands. It did not work:
# `git stash` was not on the list, so it read as allowed. This is the same rule
# with the harness enforcing it, which is the only version that binds a session
# that has not read the note — or has read it and reasoned its way around it.
#
# The escape hatch is `git worktree add`: a separate checkout, at any revision,
# that touches nobody's files. Reading another revision never needs the tree at
# all — `git show <rev>:<path>` and `git diff <rev> -- <path>` are enough.
#
# Fails OPEN (exit 0, no output) on anything it cannot parse: this is a
# guardrail against a routine mistake, not a security boundary.
set -u

cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[ -z "$cmd" ] && exit 0

deny() {
  jq -n --arg r "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $r
    }
  }' 2>/dev/null
  exit 0
}

WORKTREE_HINT='This tree is SHARED — other sessions are editing it right now, and this command would rewrite their uncommitted work.
To test or inspect another revision, use a separate checkout instead:
  git worktree add /tmp/check HEAD     # a real tree, touches nobody
  git show <rev>:<path>                # read one file at a revision
  git diff <rev> -- <path>             # what changed vs a revision
If you genuinely need this, ask Peter first and let him run it.'

# Split the command line into segments on ; && || | and newlines, so
# `cd /tmp && git reset --hard` is caught but `echo "git reset"` is not.
segments=$(printf '%s\n' "$cmd" | sed -E 's/(\|\||&&|;|\|)/\n/g')

while IFS= read -r seg; do
  # trim surrounding whitespace and any subshell/grouping punctuation
  seg=$(printf '%s' "$seg" | sed -E 's/^[[:space:](){]+//; s/[[:space:])}]+$//')
  [ -z "$seg" ] && continue
  # strip leading VAR=value assignments and common wrappers
  seg=$(printf '%s' "$seg" | sed -E 's/^([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*//')
  seg=$(printf '%s' "$seg" | sed -E 's/^(sudo|command|time|nohup|xargs)[[:space:]]+//')

  case "$seg" in
    git|git\ *) ;;
    *) continue ;;
  esac

  read -ra toks <<< "$seg"
  # Walk past git's global options to find the actual subcommand.
  i=1
  sub=""
  n=${#toks[@]}
  while [ "$i" -lt "$n" ]; do
    t="${toks[$i]}"
    case "$t" in
      -C|-c)                       i=$((i + 2)); continue ;;
      --git-dir=*|--work-tree=*|--namespace=*|--exec-path=*)
                                   i=$((i + 1)); continue ;;
      -*)                          i=$((i + 1)); continue ;;
      *)                           sub="$t"; break ;;
    esac
  done
  [ -z "$sub" ] && continue
  next="${toks[$((i + 1))]:-}"

  case "$sub" in
    checkout|switch|restore|reset|clean)
      deny "BLOCKED: \`git $sub\` in the mashenstein working tree.

$WORKTREE_HINT"
      ;;
    stash)
      # `git stash list` / `git stash show` only read; everything else
      # (push, pop, apply, drop, clear, and a bare `git stash`) moves the tree.
      case "$next" in
        list|show) ;;
        *)
          deny "BLOCKED: \`git stash${next:+ $next}\` in the mashenstein working tree.

This is the exact command that cost an hour of work on 4 Sep 2026. A stash
removes every session's uncommitted changes at once, and \`stash pop\` cannot
put them back cleanly once anyone has written to those files in between.

$WORKTREE_HINT

Read-only stash commands are still allowed: \`git stash list\`, \`git stash show\`."
          ;;
      esac
      ;;
    add)
      j=$((i + 1))
      while [ "$j" -lt "$n" ]; do
        case "${toks[$j]}" in
          -A|--all|.|:/|-Am|-am)
            deny "BLOCKED: \`git add ${toks[$j]}\` stages EVERY session's work, not just yours.

Peter handles commits in this repo. If something really must be staged, name the
individual paths — never -A, --all or '.'."
            ;;
        esac
        j=$((j + 1))
      done
      ;;
  esac
done <<EOF
$segments
EOF

exit 0
