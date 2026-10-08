#!/usr/bin/env bash
# optimize-assets.sh — compress GLBs with draco + webp textures.
# Usage: npm run optimize:assets
# Props/food/furniture: --texture-size 512. Buildings/markets: --texture-size 1024.
set -euo pipefail

# Props, food, furniture, beach, interior (smaller objects → 512 textures)
for f in \
  "glb/beach/beach_kit" \
  "glb/beach/beach_reef" \
  "glb/beach/beach_table" \
  "glb/furniture/chair_table_wardrobe_suitcase_furniture" \
  "glb/furniture/furniture_set" \
  "glb/furniture/some_furniture" \
  "glb/interior/house_1f_interior" \
  "glb/interior/room_apartment_furniture"; do
  src="assets-src/$f.glb"
  dst="public/assets/$f.glb"
  [ -f "$src" ] || continue
  echo "  optimizing $f.glb (512)..."
  npx @gltf-transform/cli optimize "$src" "$dst" --compress draco --texture-compress webp --texture-size 512
done

# Buildings, markets (larger structures → 1024 textures)
for f in \
  "glb/buildings/building_office_room_curtain" \
  "glb/buildings/building_office_room_window" \
  "glb/markets/cat-market/cat_market" \
  "glb/markets/chinese-market/chinese_market" \
  "glb/markets/mini-market/mini_market" \
  "glb/markets/super-market/super_market"; do
  src="assets-src/$f.glb"
  dst="public/assets/$f.glb"
  [ -f "$src" ] || continue
  echo "  optimizing $f.glb (1024)..."
  npx @gltf-transform/cli optimize "$src" "$dst" --compress draco --texture-compress webp --texture-size 1024
done

echo "Done."
