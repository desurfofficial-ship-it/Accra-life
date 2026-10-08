#!/usr/bin/env bash
# check-asset-budget.sh — fail if any runtime asset is over 3MB,
# or if the total of all .glb/.gltf/.fbx under public/assets/ is over 25MB.
#
# Mobile perf guardrail (per PR spec point 3e). Run in CI after typecheck.
# Locally: bash scripts/check-asset-budget.sh
set -euo pipefail

ASSET_DIR="public/assets"
MAX_SINGLE_FILE_MB=3
MAX_TOTAL_MB=25

python3 << 'PYEOF'
import os, sys

asset_dir = "public/assets"
max_single_mb = 3
max_total_mb = 25
max_single_bytes = max_single_mb * 1024 * 1024
max_total_bytes = max_total_mb * 1024 * 1024

if not os.path.isdir(asset_dir):
    print(f"OK: no {asset_dir} directory — skipping budget check.")
    sys.exit(0)

extensions = ('.glb', '.gltf', '.fbx', '.FBX', '.obj')
files = []
for root, dirs, filenames in os.walk(asset_dir):
    for fn in filenames:
        if fn.endswith(extensions):
            path = os.path.join(root, fn)
            size = os.path.getsize(path)
            files.append((path, size))

if not files:
    print(f"OK: no 3D asset files found under {asset_dir}.")
    sys.exit(0)

total_bytes = sum(s for _, s in files)
total_mb = total_bytes / (1024 * 1024)

violations = []
for path, size in sorted(files, key=lambda x: -x[1]):
    size_mb = size / (1024 * 1024)
    if size > max_single_bytes:
        violations.append(f"  OVER LIMIT: {path} ({size_mb:.1f}MB > {max_single_mb}MB)")

if total_bytes > max_total_bytes:
    violations.append(f"  TOTAL OVER LIMIT: {total_mb:.1f}MB > {max_total_mb}MB (across all assets)")

if violations:
    print("ERROR: asset budget exceeded.")
    print(f"\nLimits: max single file = {max_single_mb}MB, max total = {max_total_mb}MB")
    print(f"Current total: {total_mb:.1f}MB across {len(files)} files\n")
    for v in violations:
        print(v)
    print("\nTo fix: compress GLBs >1MB with:")
    print("  npx @gltf-transform/cli optimize in.glb out.glb --compress draco --texture-compress webp --texture-size 1024")
    print("Then move un-optimized originals to assets-src/ (outside public/).")
    sys.exit(1)

print(f"OK: all assets within budget. Total: {total_mb:.1f}MB (limit {max_total_mb}MB).")
sys.exit(0)
PYEOF