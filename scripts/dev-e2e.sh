#!/usr/bin/env bash
# Stack lokal e2e: Postgres + FastAPI (be) + Next.js (fe), plus cek alat Visual Twin lokal.
# Pakai: ./scripts/dev-e2e.sh
# Opsi:  BE_PORT=8000 FE_PORT=3000 SKIP_TWIN_SETUP=1 ./scripts/dev-e2e.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BE_PORT="${BE_PORT:-8000}"
FE_PORT="${FE_PORT:-3000}"
BE_PID=""
FE_PID=""

log() { printf '==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

free_port() {
  local port="$1"
  local pids
  pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    log "port $port dipakai (PID: $pids) — menghentikan"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 0.4
    pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      # shellcheck disable=SC2086
      kill -9 $pids 2>/dev/null || true
    fi
  fi
}

cleanup() {
  log "menghentikan be/fe"
  [[ -n "$FE_PID" ]] && kill "$FE_PID" 2>/dev/null || true
  [[ -n "$BE_PID" ]] && kill "$BE_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

need() { command -v "$1" >/dev/null || die "butuh perintah: $1"; }

need docker
need uv
need bun
need lsof

free_port "$BE_PORT"
free_port "$FE_PORT"

log "Postgres (docker compose)"
(cd "$ROOT" && docker compose up -d db)

log "cek alat Visual Twin lokal"
need ffmpeg
COLMAP="$ROOT/twin/.tools/COLMAP.app/Contents/MacOS/colmap"
BRUSH="$ROOT/twin/.tools/brush_app"
if [[ ! -x "$COLMAP" || ! -x "$BRUSH" ]]; then
  if [[ "${SKIP_TWIN_SETUP:-0}" == "1" ]]; then
    log "peringatan: COLMAP/Brush belum ada (SKIP_TWIN_SETUP=1) — job twin lokal akan gagal"
  else
    log "menjalankan twin/scripts/setup_local.sh"
    "$ROOT/twin/scripts/setup_local.sh"
  fi
else
  log "COLMAP + Brush siap ($("$BRUSH" --version 2>/dev/null || echo brush))"
fi
[[ -x "$ROOT/twin/scripts/local_twin.sh" ]] || die "twin/scripts/local_twin.sh tidak ditemukan"

[[ -f "$ROOT/be/.env" ]] || die "be/.env belum ada — salin dari be/.env.example"
[[ -d "$ROOT/fe/node_modules" ]] || {
  log "bun install (fe)"
  (cd "$ROOT/fe" && bun install)
}

log "backend :$BE_PORT"
(
  cd "$ROOT/be"
  exec uv run uvicorn app.main:app --host 127.0.0.1 --port "$BE_PORT" --reload
) &
BE_PID=$!

log "frontend :$FE_PORT"
(
  cd "$ROOT/fe"
  exec bun dev --port "$FE_PORT"
) &
FE_PID=$!

# tunggu API hidup sebelum selesai memberi URL
for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:$BE_PORT/health" >/dev/null 2>&1; then
    break
  fi
  kill -0 "$BE_PID" 2>/dev/null || die "backend mati saat start — cek log di atas"
  sleep 0.25
done

cat <<EOF

Siap (Ctrl+C untuk stop):
  API   http://127.0.0.1:$BE_PORT/docs
  FE    http://127.0.0.1:$FE_PORT/businesses
  Twin  local_twin.sh + COLMAP/Brush (job lewat API)

EOF

wait
