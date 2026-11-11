#!/usr/bin/env bash
# Pipeline baseline REA (PRD 11.1). Jalankan di mesin GPU NVIDIA dengan extra "gpu" terpasang.
set -euo pipefail

video="${1:?usage: $0 <video.mp4> <project_name>}"
name="${2:?usage: $0 <video.mp4> <project_name>}"

ns-process-data video \
  --data "$video" \
  --output-dir "data/$name" \
  --num-frames-target 300

ns-train splatfacto \
  --data "data/$name" \
  --output-dir outputs \
  --experiment-name "$name" \
  --viewer.quit-on-train-completion True

config=$(ls -t outputs/"$name"/splatfacto/*/config.yml | head -n 1)

ns-export gaussian-splat --load-config "$config" --output-dir "exports/$name"
ns-export pointcloud     --load-config "$config" --output-dir "exports/$name"
