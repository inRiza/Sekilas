from sqlalchemy.orm import configure_mappers

import app.models  # noqa: F401
from app.models.base import Base

EXPECTED_TABLES = {
    "users",
    "businesses",
    "analyses",
    "analysis_contexts",
    "menu_items",
    "videos",
    "transcript_segments",
    "transcript_checkpoints",
    "personas",
    "simulation_runs",
    "agent_decisions",
    "recommendations",
    "projections",
    "twin_assets",
    "measurement_plans",
    "jobs",
    "audit_logs",
}


def test_models_register_all_expected_tables() -> None:
    configure_mappers()
    registered = set(Base.metadata.tables.keys())
    assert EXPECTED_TABLES.issubset(registered)
