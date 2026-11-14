"""PRD 4.4.1 Bisnis: daftar, buat, ubah (termasuk menyematkan analisis utama), hapus, riwayat."""

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import SessionDep
from app.core.ids import new_id
from app.models import Analysis, Business
from app.schemas.api_v14 import (
    AnalysisCreate,
    AnalysisOut,
    AnalysisSummary,
    BusinessCreate,
    BusinessOut,
    BusinessUpdate,
)
from app.services.presenters import analysis_out, analysis_summary, business_out

router = APIRouter(prefix="/businesses", tags=["businesses"])


def get_business(bid: str, session: Session) -> Business:
    business = session.get(Business, bid)
    if business is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            {"code": "business_not_found", "message": "Bisnis tidak ditemukan."},
        )
    return business


@router.get("", response_model=list[BusinessOut])
def list_businesses(session: SessionDep) -> list[BusinessOut]:
    businesses = session.scalars(select(Business).order_by(Business.created_at)).all()
    return [business_out(b) for b in businesses]


@router.post("", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
def create_business(body: BusinessCreate, session: SessionDep) -> BusinessOut:
    business = Business(
        id=new_id("biz"),
        name=body.name.strip(),
        branch_name=body.branch_name.strip() or "Pusat",
        category=body.category,
        address=body.address.strip(),
        default_context={
            "business_type": body.category,
            "business_name": body.name.strip(),
            "location_name": body.address.strip(),
        },
    )
    session.add(business)
    session.commit()
    session.refresh(business)
    return business_out(business)


@router.get("/{bid}", response_model=BusinessOut)
def read_business(bid: str, session: SessionDep) -> BusinessOut:
    return business_out(get_business(bid, session))


@router.patch("/{bid}", response_model=BusinessOut)
def update_business(bid: str, body: BusinessUpdate, session: SessionDep) -> BusinessOut:
    business = get_business(bid, session)
    data = body.model_dump(exclude_unset=True)
    pinned = data.get("primary_analysis_id")
    if pinned is not None and not any(a.id == pinned for a in business.analyses):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            {"code": "analysis_not_in_business", "message": "Analisis bukan milik bisnis ini."},
        )
    for key, value in data.items():
        setattr(business, key, value)
    session.commit()
    return business_out(business)


@router.delete("/{bid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_business(bid: str, session: SessionDep) -> Response:
    session.delete(get_business(bid, session))
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{bid}/analyses", response_model=list[AnalysisSummary])
def list_business_analyses(bid: str, session: SessionDep) -> list[AnalysisSummary]:
    return [analysis_summary(a) for a in get_business(bid, session).analyses]


@router.post("/{bid}/analyses", response_model=AnalysisOut, status_code=status.HTTP_201_CREATED)
def create_analysis(bid: str, body: AnalysisCreate, session: SessionDep) -> AnalysisOut:
    business = get_business(bid, session)
    count = len(business.analyses) + 1
    analysis = Analysis(
        id=new_id("ana"),
        business_id=business.id,
        name=(body.name or "").strip() or f"Analisis {count}",
        status="konteks",
        context=dict(business.default_context or {}),  # snapshot, bukan rujukan (keputusan 13)
    )
    session.add(analysis)
    session.commit()
    session.refresh(analysis)
    return analysis_out(analysis)
