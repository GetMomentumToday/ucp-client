#!/usr/bin/env bash
set -euo pipefail

# Detect WHAT-comments (descriptive comments that restate the code).
# Allowed: WHY-comments, TODOs, eslint directives, type annotations.

PATTERN='^\s*//\s*(Get|Set|Create|Update|Delete|Return|Check|Initialize|Import|Export|Define|Declare|Add|Remove|Call|Send|Fetch|Handle|Parse|Convert|Transform|Map|Filter|Reduce|Loop|Iterate|Increment|Decrement|Assign|Store|Save|Load|Read|Write|Log|Print|Display|Show|Hide|Enable|Disable|Start|Stop|Open|Close|Connect|Disconnect|Build|Compile|Run|Execute)\s'

# Support both monorepo (packages/*/src) and single-package (src/) layouts
FILES=$(find packages/*/src src -maxdepth 10 -name '*.ts' ! -name '*.test.ts' ! -name '*.d.ts' 2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "No source files found — skipping comment check."
  exit 0
fi

VIOLATIONS=$(echo "$FILES" | xargs grep -nE "$PATTERN" 2>/dev/null || true)

if [ -n "$VIOLATIONS" ]; then
  echo "❌ Descriptive comments found (explain WHY, not WHAT):"
  echo "$VIOLATIONS"
  exit 1
fi

echo "✅ No descriptive comments found."
