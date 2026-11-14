"""Data awal untuk Postgres lokal: isi supabase/seed.sql (analisis demo `selasar-kopi`).

Visual Twin demo diarahkan ke hasil pipeline lokal yang sudah ada di fe/public/samples.
Di Supabase, seed dijalankan lewat `supabase db reset`, jadi langkah ini dilewati bila
data demo sudah ada.
"""

import logging

from app.core.db import SessionLocal
from app.models import Analysis
from app.services.twin.local_runner import REPO_ROOT, SAMPLES_DIR, publish_asset

log = logging.getLogger(__name__)

DEMO_ANALYSIS_ID = "selasar-kopi"
SEED_SQL = REPO_ROOT / "supabase" / "seed.sql"
# Urutan preferensi hasil 3D contoh (yang pertama tersedia dipakai).
DEMO_TWINS = ["goffee-depan-kasir", "addison-house", "south-building"]


def seed_demo() -> None:
    with SessionLocal() as s:
        if s.get(Analysis, DEMO_ANALYSIS_ID) is None:
            if not SEED_SQL.exists():
                log.warning("supabase/seed.sql tidak ditemukan; data demo dilewati.")
                return
            raw = s.connection().connection.driver_connection
            with raw.cursor() as cur:
                cur.execute(SEED_SQL.read_text())
            s.commit()

        demo = s.get(Analysis, DEMO_ANALYSIS_ID)
        if demo is None or (
            demo.twin_asset and (demo.twin_asset.splat_url or demo.twin_asset.ply_url)
        ):
            return
        twin = next((n for n in DEMO_TWINS if (SAMPLES_DIR / f"{n}.json").exists()), None)
        if twin is None:
            log.warning("Tidak ada hasil 3D contoh di %s; demo tanpa Visual Twin.", SAMPLES_DIR)
            return
        publish_asset(s, demo.id, twin)
        s.commit()
