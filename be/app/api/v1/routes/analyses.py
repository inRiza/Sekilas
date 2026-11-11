"""Halaman 1 Beranda: membuat dan melihat analisis."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.schemas.analysis import Analysis

router = APIRouter(prefix="/analyses", tags=["analyses"])


@router.post("", response_model=Analysis, status_code=status.HTTP_201_CREATED)
def create_analysis() -> Analysis:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M1")


@router.get("", response_model=list[Analysis])
def list_analyses() -> list[Analysis]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M1")


@router.get("/{analysis_id}", response_model=Analysis)
def get_analysis(analysis_id: UUID) -> Analysis:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M1")
