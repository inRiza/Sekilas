"""Halaman 6 Menjalankan Simulasi dan halaman 8 Jelajah Agen (F5)."""

from fastapi import APIRouter, HTTPException, Query, status

from app.core.auth import CurrentUserDep
from app.core.db import SessionDep
from app.schemas.common import JobState, JobStatus
from app.schemas.simulation import AgentDecisionOut, SimulationRequest
from app.services.crud import (
    list_agent_decisions_for_analysis,
    load_analysis_with_relations,
    run_simulation_for_analysis,
)
from app.services.llm.router import LLMUnavailableError

router = APIRouter(prefix="/analyses/{analysis_id}/simulation", tags=["simulation"])


@router.post("", response_model=JobState, status_code=status.HTTP_202_ACCEPTED)
def start_simulation(
    analysis_id: str,
    body: SimulationRequest,
    session: SessionDep,
    _user: CurrentUserDep,
) -> JobState:
    """Mulai simulasi agen; membangkitkan persona & keputusan kontekstual lalu menandai analisis ready."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")
    try:
        run_simulation_for_analysis(
            session,
            analysis,
            n_agents=body.n_agents,
            seed=body.seed,
        )
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return JobState(
        job_id=f"job_sim_{analysis.id}",
        status=JobStatus.done,
        progress=1.0,
        stage=f"Simulasi {analysis.total_agents} agen selesai",
    )


@router.get("", response_model=JobState)
def simulation_status(
    analysis_id: str,
    session: SessionDep,
    _user: CurrentUserDep,
) -> JobState:
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")
    return JobState(
        job_id=f"job_sim_{analysis.id}",
        status=JobStatus.done,
        progress=1.0,
        stage=f"Simulasi {analysis.total_agents} agen selesai",
    )


@router.get("/agents", response_model=list[AgentDecisionOut])
def list_agents(
    analysis_id: str,
    session: SessionDep,
    _user: CurrentUserDep,
    final_decision: str | None = None,
    segment: str | None = None,
    limit: int = Query(50, le=500),
    offset: int = 0,
) -> list[AgentDecisionOut]:
    """Ambil daftar keputusan dan monolog agen beserta persona diskretnya (Halaman 8 Jelajah Agen)."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")
    items = list_agent_decisions_for_analysis(
        session,
        analysis.id,
        final_decision=final_decision,
        segment=segment,
    )
    return items[offset : offset + limit]


@router.get("/agents/{agent_id}", response_model=AgentDecisionOut)
def get_agent(
    analysis_id: str,
    agent_id: int,
    session: SessionDep,
    _user: CurrentUserDep,
) -> AgentDecisionOut:
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")
    items = list_agent_decisions_for_analysis(session, analysis.id)
    for item in items:
        if item.agent_id == agent_id:
            return item
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agen tidak ditemukan")
