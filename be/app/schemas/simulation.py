from enum import StrEnum

from pydantic import BaseModel, Field


class Decision(StrEnum):
    pass_by = "pass_by"
    enter = "enter"
    order = "order"
    return_visit = "return_visit"


class Scenario(StrEnum):
    normal = "normal"
    peak = "peak"
    rain = "rain"
    neighbor_full = "neighbor_full"
    evening = "evening"
    weekend = "weekend"


class AgentTraits(BaseModel):
    price_sensitivity: float
    patience: float
    lunch_habit: float
    group_size: int


class FactorContribution(BaseModel):
    entry_id: str
    contribution: float


class AgentResult(BaseModel):
    """PRD F5: keputusan dihitung, narasi dihasilkan."""

    agent_id: int
    scenario: Scenario
    traits: AgentTraits
    decision: Decision
    stop_entry_id: str | None = Field(None, description="Sumber peta panas gesekan")
    contributions: list[FactorContribution]
    narrative: str | None = None
    reason: str | None = None


class SimulationRequest(BaseModel):
    n_agents: int = Field(500, ge=200, le=500)
    seed: int = 42
    scenarios: list[Scenario] = list(Scenario)


# ---------------- PRD v1.4 Persona & Agent Decision Schemas ----------------
class PersonaSpecOut(BaseModel):
    agent_id: int
    segment: str
    discrete_traits: dict[str, str]
    concrete_facts: dict[str, int]
    context_around: str
    daily_mood: str
    seed: int
    table_version: str


class AgentDecisionOut(BaseModel):
    agent_id: int
    persona: PersonaSpecOut
    monologue: str
    final_decision: str  # lewat | berhenti_lalu_pergi | masuk_tanpa_memesan | memesan
    stopped_at_segment_id: str | None = None
    deciding_factor: str
    factor_segment_ids: list[str] = Field(default_factory=list)
    hesitation_score: int = 1
