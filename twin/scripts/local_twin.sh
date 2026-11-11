#!/usr/bin/env bash
# Visual Twin mode lokal (Mac Apple Silicon / tanpa GPU NVIDIA).
#
#   video -> frame (ffmpeg) -> pose + awan titik renggang (COLMAP, CPU)
#         -> twin.ply + camera_path.json
#   opsional --splat: Gaussian splat dengan Brush (Metal) -> twin.splat
#
# Pakai:
#   ./scripts/local_twin.sh <video.mp4> <nama> [--fps 2] [--splat] [--steps 5000] [--reuse]
#   --reuse : pakai frame + hasil COLMAP yang sudah ada (lewati langkah 1-2)
# Hasil di twin/work/<nama>/out/. Muat twin.ply atau twin.splat lewat tombol
# "Muat .ply / .splat" di halaman /dasbor.
set -euo pipefail

video="${1:?pakai: $0 <video.mp4> <nama> [--fps N] [--splat] [--steps N]}"
name="${2:?pakai: $0 <video.mp4> <nama> [--fps N] [--splat] [--steps N]}"
shift 2
fps=2
splat=0
steps=5000
reuse=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --fps) fps="$2"; shift 2 ;;
    --splat) splat=1; shift ;;
    --steps) steps="$2"; shift 2 ;;
    --reuse) reuse=1; shift ;;
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

db="$work/colmap/database.db"
log="$work/colmap.log"
fail() { echo "COLMAP gagal di tahap $1, lihat $log" >&2; exit 1; }

if [[ "$reuse" == 1 && -d "$work/colmap/sparse" ]]; then
  step "1-2/4 Pakai ulang frame + hasil COLMAP yang sudah ada"
else
step "1/4 Ekstraksi frame (${fps} fps, lebar maks 1600 px)"
rm -f "$work/images/"*.jpg
ffmpeg -y -loglevel error -i "$video" -vf "fps=${fps},scale='min(1600,iw)':-2" -q:v 2 "$work/images/%04d.jpg"
echo "      $(ls "$work/images" | wc -l | tr -d ' ') frame"

step "2/4 Pose kamera + awan titik renggang (COLMAP, CPU)"
rm -rf "$work/colmap" && mkdir -p "$work/colmap/sparse"
: > "$log"
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
echo $(( $(date +%s) - t0 )) > "$work/colmap/elapsed_s"
fi
prev_s=0
[[ "$reuse" == 1 && -f "$work/colmap/elapsed_s" ]] && prev_s=$(cat "$work/colmap/elapsed_s")

# Mapper bisa memecah video menjadi beberapa model (sparse/0, 1, ...) bila jejak
# kamera terputus. Pakai model dengan frame teregistrasi terbanyak.
model="" registered=0 points=0 models=0
for m in "$work/colmap/sparse"/*/; do
  [[ -d "$m" ]] || continue
  models=$((models + 1))
  stats=$(colmap model_analyzer --path "$m" 2>&1)
  reg=$(sed -n 's/.*Registered images: *\([0-9]*\).*/\1/p' <<< "$stats" | head -1)
  pts=$(sed -n 's/.*Points: *\([0-9]*\).*/\1/p' <<< "$stats" | head -1)
  if (( ${reg:-0} > registered )); then model="${m%/}" registered=${reg:-0} points=${pts:-0}; fi
done
[[ -n "$model" ]] || { echo "COLMAP tidak menghasilkan model (pose gagal)" >&2; exit 1; }
total=$(ls "$work/images" | wc -l | tr -d ' ')
echo "      $models model; dipakai $(basename "$model"): $registered/$total frame teregistrasi, $points titik"
if (( registered * 2 < total )); then
  echo "      PERINGATAN: kurang dari separuh frame teregistrasi. Video kemungkinan terlalu"
  echo "      gelap/buram/banyak orang bergerak, atau kamera hanya berputar di tempat."
fi

step "3/4 Ekspor twin.ply + camera_path.json"
colmap model_converter --input_path "$model" --output_path "$work/out/twin.ply" --output_type PLY
mkdir -p "$work/colmap/txt"
colmap model_converter --input_path "$model" --output_path "$work/colmap/txt" --output_type TXT
(cd "$root" && uv run --quiet python scripts/colmap_to_twin.py "$work/colmap/txt" "$fps" "$work/out/camera_path.json" "$work/out/up.json")

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
  "seconds": $(( $(date +%s) - t0 + prev_s )),
  "up": $(cat "$work/out/up.json"),
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "files": [$files]
}
JSON

step "Selesai -> $work/out/ (juga diterbitkan ke halaman /hasil)"
ls -lh "$work/out" | tail -n +2
