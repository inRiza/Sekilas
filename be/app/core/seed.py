"""Data awal untuk demo: satu bisnis demo dengan analisis siap baca (PRD 4.4.5).

Visual Twin demo memakai hasil pipeline lokal yang sudah ada di fe/public/samples.
"""

import logging

from sqlalchemy import select

from app.core.db import SessionLocal
from app.models import Analysis, Business
from app.services.twin.local_runner import SAMPLES_DIR, _publish_asset

log = logging.getLogger(__name__)

DEMO_BUSINESS_ID = "biz_demo"
DEMO_ANALYSIS_ID = "ana_demo"
# Urutan preferensi hasil 3D contoh (yang pertama tersedia dipakai).
DEMO_TWINS = ["goffee-depan-kasir", "addison-house", "south-building"]


def seed_demo() -> None:
    with SessionLocal() as s:
        if s.scalars(select(Business).limit(1)).first() is not None:
            return
        business = Business(
            id=DEMO_BUSINESS_ID,
            name="Selasar Kopi & Roti",
            branch_name="Dipatiukur",
            category="kedai",
            address="Jl. Dipati Ukur No. 42, Bandung",
            default_context={"business_type": "kedai", "business_name": "Selasar Kopi & Roti"},
        )
        analysis = Analysis(
            id=DEMO_ANALYSIS_ID,
            business_id=business.id,
            name="Analisis contoh (demo)",
            status="siap",
            is_demo=True,
            context=dict(business.default_context),
        )
        s.add_all([business, analysis])
        s.flush()
        twin = next((n for n in DEMO_TWINS if (SAMPLES_DIR / f"{n}.json").exists()), None)
        if twin:
            _publish_asset(s, analysis, twin)
        else:
            log.warning(
                "Tidak ada hasil 3D contoh di %s; analisis demo tanpa Visual Twin.", SAMPLES_DIR
            )
        business.primary_analysis_id = analysis.id
        s.commit()
