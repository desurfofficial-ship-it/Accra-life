#!/usr/bin/env bash
# Fails if any <Html in src/r3f uses distanceFactor while the scene uses
# OrthographicCamera (drei objectScale returns camera.zoom → giant labels).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
R3F="$ROOT/src/r3f"

if ! rg -q "OrthographicCamera" "$R3F" --glob '*.tsx'; then
  echo "check-html-labels: no OrthographicCamera found — skip"
  exit 0
fi

# Match distanceFactor= on the same line as <Html, or numeric distanceFactor={
hits=$(rg -n --glob '*.tsx' -U '<Html[^>]*distanceFactor|distanceFactor=\{[0-9]' "$R3F" || true)
# Filter out comments
real=$(echo "$hits" | grep -v '^\s*$' | grep -v '//.*distanceFactor' | grep -v '\*.*distanceFactor' || true)

if [ -n "$real" ]; then
  echo "FAIL: <Html distanceFactor> is forbidden under OrthographicCamera"
  echo "      (drei scales by camera.zoom → labels ~100× too big on phone)"
  echo "$real"
  echo ""
  echo "Fix: remove distanceFactor, use fixed screen size + zIndexRange={[40,0]}"
  echo "See LivingVendor.tsx and src/r3f/worldLabel.ts"
  exit 1
fi

echo "check-html-labels: OK (no distanceFactor on <Html>)"
