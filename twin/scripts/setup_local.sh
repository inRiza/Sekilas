#!/usr/bin/env bash
# Pasang alat Visual Twin mode lokal untuk macOS Apple Silicon ke twin/.tools/
#   - COLMAP 4.2.1 resmi (build Homebrew crash di matcher CPU)
#   - Brush 0.3.0 (Gaussian splat lewat Metal, Apache-2.0)
# Butuh: curl, unzip, tar, shasum, ffmpeg (brew install ffmpeg), uv.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
tools="$root/.tools"
mkdir -p "$tools"
[[ "$(uname -sm)" == "Darwin arm64" ]] || { echo "Skrip ini untuk macOS Apple Silicon" >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg belum ada: brew install ffmpeg" >&2; exit 1; }

fetch() { # url sha256 out
  curl -fL --retry 3 -o "$3" "$1"
  echo "$2  $3" | shasum -a 256 -c -
}

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

if [[ ! -x "$tools/COLMAP.app/Contents/MacOS/colmap" ]]; then
  echo "== COLMAP 4.2.1"
  fetch https://github.com/colmap/colmap/releases/download/4.2.1/colmap-arm64-macos.zip \
    1fe9d65bddd61e0598f3087641cb14c4d4d4c74529e9f58911e8a5238a140a04 "$tmp/colmap.zip"
  unzip -q "$tmp/colmap.zip" -d "$tmp" && unzip -q "$tmp/COLMAP-mac.zip" -d "$tmp"
  mv "$tmp/COLMAP.app" "$tools/COLMAP.app"
  xattr -dr com.apple.quarantine "$tools/COLMAP.app" 2>/dev/null || true
fi

if [[ ! -x "$tools/brush_app" ]]; then
  echo "== Brush 0.3.0"
  fetch https://github.com/ArthurBrussee/brush/releases/download/v0.3.0/brush-app-aarch64-apple-darwin.tar.xz \
    65b2631398c839be3c1d4d7160fe2326389dec87830aac0710985e6690a1048c "$tmp/brush.tar.xz"
  tar -xf "$tmp/brush.tar.xz" -C "$tmp"
  mv "$tmp/brush-app-aarch64-apple-darwin/brush_app" "$tools/brush_app"
  xattr -d com.apple.quarantine "$tools/brush_app" 2>/dev/null || true
fi

(cd "$root" && uv sync --quiet)
"$tools/COLMAP.app/Contents/MacOS/colmap" -h | head -1
"$tools/brush_app" --version
echo "Siap. Coba: ./scripts/make_testcase.sh && ./scripts/local_twin.sh testdata/south-building.mp4 south-building --fps 3"
