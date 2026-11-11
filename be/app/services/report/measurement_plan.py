"""F6.F: rencana pengukuran untuk tally manual."""

from app.schemas.dashboard import Dashboard
from app.schemas.measurement import MeasurementPlan


def build_plan(dashboard: Dashboard) -> MeasurementPlan:
    raise NotImplementedError("M12")
