from pydantic import BaseModel


class MeasurementPlan(BaseModel):
    """PRD F6.F."""

    what_to_count: list[str]
    duration: str
    minimum_data: str
    steps: list[str]
    stand_here_image_url: str | None = None
