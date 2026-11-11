"""F5: modifikasi lingkungan per skenario (6 skenario demo)."""

from app.schemas.simulation import Scenario

# Pengali utilitas per skenario. TODO(M6): isi dari kalibrasi.
SCENARIO_MODIFIERS: dict[Scenario, dict[str, float]] = {s: {} for s in Scenario}
