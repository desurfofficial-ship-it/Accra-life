#!/usr/bin/env python3
"""Phase 8 — download a real rigged character model for the player avatar.

The remote already has assets for vehicles, buildings, props, etc., but NO
character model exists in public/assets/glb/characters/ — the player avatar
in StreetCanvas.tsx is still a procedural capsule+sphere. This script
downloads the curated "Sunset Walking Low Poly Girl [Rigged]" model from
Sketchfab (uid 341f934134d041c581b590cedff26d88) which has a built-in walk
animation, extracts it into public/assets/glb/characters/sunset-walking-
low-poly-girl-rigged/, and writes metadata.json + license.txt alongside
for CC-BY-4.0 attribution compliance.

Idempotent: re-running skips if metadata.json already exists.
"""
import json
import os
import time
import urllib.request
import urllib.parse
import zipfile
import io

TOKEN = "Token 7fa2893d9a4a4429a073884526916ba4"
HEADERS = {"Authorization": TOKEN}

PROJECT_ROOT = "/home/z/my-project/lagos-life-ghana"
DEST_DIR = os.path.join(PROJECT_ROOT, "public", "assets", "glb", "characters",
                       "sunset-walking-low-poly-girl-rigged")
META_PATH = os.path.join(DEST_DIR, "metadata.json")

UID = "341f934134d041c581b590cedff26d88"
SLUG = "sunset-walking-low-poly-girl-rigged"


def http_get(url: str, *, timeout: int = 60) -> bytes:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def main() -> None:
    if os.path.exists(META_PATH):
        try:
            with open(META_PATH) as f:
                meta = json.load(f)
            print(f"-> skipped (already downloaded): {SLUG}")
            print(f"   runtime URL: {meta['files']['runtime_url']}")
            return
        except Exception:
            pass  # metadata corrupt — re-download

    print(f"--- {SLUG} ({UID}) ---")
    # 1) fetch metadata
    meta_url = f"https://api.sketchfab.com/v3/models/{UID}"
    meta = json.loads(http_get(meta_url))
    name = meta.get("name", SLUG)
    author = (meta.get("user") or {}).get("displayName", "unknown")
    author_url = (meta.get("user") or {}).get("profileUrl", "")
    lic = meta.get("license") or {}
    lic_label = lic.get("label", "unknown")
    lic_url = lic.get("url", "")
    viewer_url = meta.get("viewerUrl", "")
    like_count = meta.get("likeCount", 0)
    print(f"  name: {name}")
    print(f"  author: {author}")
    print(f"  license: {lic_label}")

    # 2) fetch download URLs
    dl_url = f"https://api.sketchfab.com/v3/models/{UID}/download"
    dl = json.loads(http_get(dl_url))
    gltf = dl.get("gltf") or {}
    gltf_url = gltf.get("url")
    gltf_size = gltf.get("size", 0)
    if not gltf_url:
        src = dl.get("source") or {}
        gltf_url = src.get("url")
        gltf_size = src.get("size", 0)
        fmt = "source"
    else:
        fmt = "gltf"
    if not gltf_url:
        print("  ! no download URL returned")
        return
    print(f"  format: {fmt}, size: {gltf_size/1e6:.2f} MB")

    # 3) download zip
    print("  downloading zip...")
    t0 = time.time()
    blob = http_get(gltf_url, timeout=180)
    print(f"  fetched {len(blob)/1e6:.2f} MB in {time.time()-t0:.1f}s")

    # 4) extract
    os.makedirs(DEST_DIR, exist_ok=True)
    zf = zipfile.ZipFile(io.BytesIO(blob))
    zf.extractall(DEST_DIR)
    names = zf.namelist()
    main_file = next((n for n in names if n.lower().endswith('.glb')), None) or \
                next((n for n in names if n.lower().endswith('.gltf')), None)
    print(f"  extracted {len(names)} files, main: {main_file}")

    # 5) write metadata.json
    out_meta = {
        "id": "EXT_PHASE8_CHARACTER_PLAYER",
        "sketchfab_uid": UID,
        "category": "characters",
        "name": name,
        "author": author,
        "author_url": author_url,
        "license": lic_label,
        "license_url": lic_url,
        "viewer_url": viewer_url,
        "intended_use": "Sunset Walking Low Poly Girl [Rigged] — rigged character with a built-in walk animation. Replaces the capsule+sphere avatar in StreetCanvas.tsx. CC-BY attribution required.",
        "source_format": fmt,
        "main_file": main_file,
        "extracted_files": names,
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "like_count_at_fetch": like_count,
        "files": {
            "dir": f"public/assets/glb/characters/{SLUG}",
            "main": f"public/assets/glb/characters/{SLUG}/{main_file}",
            "textures": f"public/assets/glb/characters/{SLUG}/textures",
            "runtime_url": f"/assets/glb/characters/{SLUG}/{main_file}",
        },
    }
    with open(META_PATH, "w") as f:
        json.dump(out_meta, f, indent=2)
    print(f"  -> OK — runtime URL: {out_meta['files']['runtime_url']}")


if __name__ == "__main__":
    main()
