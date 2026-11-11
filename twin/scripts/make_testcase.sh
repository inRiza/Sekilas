#!/usr/bin/env bash
# Siapkan video test case dari dataset resmi COLMAP "south-building"
# (128 foto berurutan mengelilingi sebuah gedung) -> twin/testdata/south-building.mp4
#
# Pakai: ./scripts/make_testcase.sh [fps]
#   fps default 3  -> ±43 detik, 1280 px (lolos cek dasbor: 20 dtk-3 mnt, >=720p)
set -euo pipefail

fps="${1:-3}"
root="$(cd "$(dirname "$0")/.." && pwd)"
raw="$root/testdata/raw"
zip="$raw/south-building.zip"
out="$root/testdata/south-building.mp4"
url="https://github.com/colmap/colmap/releases/download/3.11.1/south-building.zip"

mkdir -p "$raw"
if [[ ! -f "$zip" ]]; then
  echo "Mengunduh dataset (±400 MB)..."
  curl -fL --retry 3 -o "$zip" "$url"
fi

if [[ ! -d "$raw/south-building/images" ]]; then
  echo "Mengekstrak..."
  unzip -q -o "$zip" -d "$raw"
fi

echo "Membuat video ${fps} fps..."
ffmpeg -y -loglevel error -framerate "$fps" -pattern_type glob -i "$raw/south-building/images/*.JPG" \
  -vf "scale=1280:-2,format=yuv420p" -c:v libx264 -crf 20 "$out"

dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out")
echo "Selesai: $out (${dur%.*} detik)"
