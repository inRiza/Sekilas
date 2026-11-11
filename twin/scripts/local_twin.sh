#!/usr/bin/env bash
# Visual Twin mode lokal (Mac Apple Silicon / tanpa GPU NVIDIA).
#
#   video -> frame (ffmpeg) -> pose + awan titik renggang (COLMAP, CPU)
#         -> twin.ply + camera_path.json
#   opsional --splat: Gaussian splat dengan Brush (Metal) -> twin.splat
#
# Pakai:
#   ./scripts/local_twin.sh <video.mp4> <nama> [--fps 2] [--splat] [--steps 5000]
# Hasil di twin/work/<nama>/out/. Muat twin.ply atau twin.splat lewat tombol
# "Muat .ply / .splat" di halaman /dasbor.
set -euo pipefail

video="${1:?pakai: $0 <video.mp4> <nama> [--fps N] [--splat] [--steps N]}"
name="${2:?pakai: $0 <video.mp4> <nama> [--fps N] [--splat] [--steps N]}"
shift 2
fps=2
splat=0
steps=5000
while [[ $# -gt 0 ]]; do
  case "$1" in
    --fps) fps="$2"; shift 2 ;;
    --splat) splat=1; shift ;;
    --steps) steps="$2"; shift 2 ;;
    *) echo "opsi tidak dikenal: $1" >&2; exit 2 ;;
  esac
done

root="$(cd "$(dirname "$0")/.." && pwd)"
work="$root/work/$name"
brush="$root/.tools/brush_app"
mkdir -p "$work/images" "$work/out"
# Utamakan binary resmi COLMAP (scripts/setup_local.sh). Build Homebrew 4.2.1 crash
# (SIGSEGV) di matcher CPU pada macOS arm64.
colmap_bin="$root/.tools/COLMAP.app/Contents/MacOS/colmap"
[[ -x "$colmap_bin" ]] || colmap_bin="$(command -v colmap || true)"
[[ -n "$colmap_bin" ]] || { echo "COLMAP belum ada, jalankan scripts/setup_local.sh" >&2; exit 1; }
colmap() { "$colmap_bin" "$@"; }

t0=$(date +%s)
step() { echo "[$(( $(date +%s) - t0 ))s] $*"; }

step "1/4 Ekstraksi frame (${fps} fps, lebar maks 1600 px)"
rm -f "$work/images/"*.jpg
ffmpeg -y -loglevel error -i "$video" -vf "fps=${fps},scale='min(1600,iw)':-2" -q:v 2 "$work/images/%04d.jpg"
echo "      $(ls "$work/images" | wc -l | tr -d ' ') frame"

step "2/4 Pose kamera + awan titik renggang (COLMAP, CPU)"
rm -rf "$work/colmap" && mkdir -p "$work/colmap/sparse"
db="$work/colmap/database.db"
log="$work/colmap.log"
: > "$log"
fail() { echo "COLMAP gagal di tahap $1, lihat $log" >&2; exit 1; }
# Tahap dijalankan terpisah (bukan automatic_reconstructor) agar loop detection
# berbasis vocabulary tree bisa dimatikan; cukup sequential matching untuk video.
colmap feature_extractor --database_path "$db" --image_path "$work/images" \
  --ImageReader.single_camera 1 --FeatureExtraction.use_gpu 0 \
  --FeatureExtraction.max_image_size 1600 --SiftExtraction.max_num_features 4096 >> "$log" 2>&1 \
  || fail "ekstraksi fitur"
echo "      fitur selesai"
colmap sequential_matcher --database_path "$db" --FeatureMatching.use_gpu 0 \
  --SequentialMatching.overlap 10 --SequentialMatching.loop_detection 0 >> "$log" 2>&1 \
  || fail "pencocokan"
echo "      pencocokan selesai"
colmap mapper --database_path "$db" --image_path "$work/images" \
  --output_path "$work/colmap/sparse" >> "$log" 2>&1 || fail "rekonstruksi"

model="$work/colmap/sparse/0"
[[ -d "$model" ]] || { echo "COLMAP tidak menghasilkan model (pose gagal)" >&2; exit 1; }
registered=$(colmap model_analyzer --path "$model" 2>&1 | sed -n 's/.*Registered images: *\([0-9]*\).*/\1/p' | head -1)
points=$(colmap model_analyzer --path "$model" 2>&1 | sed -n 's/.*Points: *\([0-9]*\).*/\1/p' | head -1)
echo "      ${registered:-?} frame teregistrasi, ${points:-?} titik"

step "3/4 Ekspor twin.ply + camera_path.json"
colmap model_converter --input_path "$model" --output_path "$work/out/twin.ply" --output_type PLY
mkdir -p "$work/colmap/txt"
colmap model_converter --input_path "$model" --output_path "$work/colmap/txt" --output_type TXT
(cd "$root" && uv run --quiet python scripts/colmap_to_twin.py "$work/colmap/txt" "$fps" "$work/out/camera_path.json")

if [[ "$splat" == 1 ]]; then
  [[ -x "$brush" ]] || { echo "Brush belum ada di $brush" >&2; exit 1; }
  step "4/4 Gaussian splat (Brush, ${steps} langkah)"
  # Brush membaca folder dataset COLMAP: images/ + sparse/0
  ds="$work/brush_ds" && rm -rf "$ds" && mkdir -p "$ds/sparse"
  ln -s "$work/images" "$ds/images"
  ln -s "$model" "$ds/sparse/0"
  "$brush" "$ds" --total-steps "$steps" --max-resolution 1024 \
    --export-every "$steps" --export-path "$work/out" --export-name "twin_splat.ply" > "$work/brush.log" 2>&1 \
    || { echo "Brush gagal, lihat $work/brush.log" >&2; exit 1; }
  (cd "$root" && uv run --quiet python scripts/ply_to_splat.py "$work/out/twin_splat.ply" "$work/out/twin.splat")
else
  step "4/4 Lewati splat (tambahkan --splat untuk tampilan realistis)"
fi

# Terbitkan ke dasbor: fe/public/samples/<nama>.{ply,splat,json} -> muncul di halaman /hasil
samples="$root/../fe/public/samples"
mkdir -p "$samples"
cp "$work/out/twin.ply" "$samples/$name.ply"
files="\"$name.ply\""
if [[ -f "$work/out/twin.splat" ]]; then
  cp "$work/out/twin.splat" "$samples/$name.splat"
  files="$files, \"$name.splat\""
fi
cat > "$samples/$name.json" <<JSON
{
  "name": "$name",
  "video": "$(basename "$video")",
  "frames": $(ls "$work/images" | wc -l | tr -d ' '),
  "registered": ${registered:-0},
  "points": ${points:-0},
  "seconds": $(( $(date +%s) - t0 )),
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "files": [$files]
}
JSON

step "Selesai -> $work/out/ (juga diterbitkan ke halaman /hasil)"
ls -lh "$work/out" | tail -n +2
