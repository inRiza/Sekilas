"""Halaman 6 Menjalankan Simulasi dan halaman 8 Jelajah Agen (F5)."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.common import JobState
from app.schemas.simulation import AgentResult, Decision, Scenario, SimulationRequest

router = APIRouter(prefix="/analyses/{analysis_id}/simulation", tags=["simulation"])


@router.post("", response_model=JobState, status_code=status.HTTP_202_ACCEPTED)
def start_simulation(analysis_id: UUID, body: SimulationRequest) -> JobState:
    """Ditolak (409) jika masih ada entri tidak pasti yang belum dikonfirmasi."""
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M6")


@router.get("", response_model=JobState)
def simulation_status(analysis_id: UUID) -> JobState:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M6")


@router.get("/agents", response_model=list[AgentResult])
def list_agents(
    analysis_id: UUID,
    decision: Decision | None = None,
    scenario: Scenario | None = None,
    factor: str | None = None,
    limit: int = Query(50, le=500),
    offset: int = 0,
) -> list[AgentResult]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M7")


@router.get("/agents/{agent_id}", response_model=AgentResult)
def get_agent(analysis_id: UUID, agent_id: int) -> AgentResult:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M7")
