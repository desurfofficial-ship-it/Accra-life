#!/usr/bin/env bash
# check-asset-paths.sh — fail if any source file uses absolute '/assets/'
# path literals instead of the assetUrl() helper.
#
# Background: vite.config.ts uses base: './'. On GitHub Pages the site is
# served at https://host/Accra-life/ — absolute paths like '/assets/...'
# resolve to https://host/assets/... and 404. The assetUrl() helper
# prepends import.meta.env.BASE_URL so paths resolve correctly on both
# localhost and Pages.
#
# This script is the CI guardrail — runs after typecheck in the workflow.
# Locally: bash scripts/check-asset-paths.sh
set -euo pipefail

# Match any quote character followed by '/assets/' — covers single-quote,
# double-quote, and backtick-delimited strings.
# rg (ripgrep) is preferred for performance + cleaner output, but fall
# back to grep -rn if rg isn't installed (CI runners have rg by default).
if command -v rg >/dev/null 2>&1; then
  matches=$(rg -n "['\"\`]/assets/" src/ || true)
else
  matches=$(grep -rnE "['\"\`]/assets/" src/ || true)
fi

if [ -n "$matches" ]; then
  echo "ERROR: found absolute '/assets/' paths in src/ — these 404 on GitHub Pages."
  echo "Use the assetUrl() helper instead (import from '../assetUrl' or './assetUrl')."
  echo ""
  echo "$matches"
  exit 1
fi

echo "OK: no absolute '/assets/' paths in src/."
exit 0
