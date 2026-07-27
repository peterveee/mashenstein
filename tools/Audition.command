#!/bin/sh
# Double-clickable launcher for the plugin audition tool.
# Finder opens .command files in Terminal, which is what we want here: the
# render progress and any plugin complaints stay visible.
cd "$(dirname "$0")/.." || exit 1
./tools/audition "$@"
STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo ""
  echo "exited with status $STATUS — press return to close"
  read -r _
fi
