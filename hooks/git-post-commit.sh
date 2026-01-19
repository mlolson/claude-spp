#!/bin/bash
# Dojo post-commit hook - tracks human lines from commits
# Skips commits co-authored by Claude to avoid double-counting

# Check if Claude co-authored this commit
if git log -1 --format="%B" | grep -qi "Co-Authored-By:.*Claude"; then
    # Claude wrote this code - already tracked via post-response hook
    exit 0
fi

# Handle first commit (no HEAD~1)
if ! git rev-parse HEAD~1 >/dev/null 2>&1; then
    # First commit - count all lines in tracked files
    LINES_ADDED=$(git diff --shortstat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD 2>/dev/null | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
else
    # Normal commit - count lines added
    LINES_ADDED=$(git diff --shortstat HEAD~1 HEAD 2>/dev/null | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
fi

if [ -n "$LINES_ADDED" ] && [ "$LINES_ADDED" -gt 0 ]; then
    # Find the dojo CLI (relative to repo root)
    REPO_ROOT=$(git rev-parse --show-toplevel)
    if [ -f "$REPO_ROOT/dist/cli.js" ]; then
        node "$REPO_ROOT/dist/cli.js" add-lines human "$LINES_ADDED" 2>/dev/null
        echo "Dojo: +$LINES_ADDED lines (human)"
    fi
fi
