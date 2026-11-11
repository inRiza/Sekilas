"""Visual Twin (F7). Dibangun oleh worker GPU di folder twin/."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.schemas.twin import TwinStatus

router = APIRouter(prefix="/analyses/{analysis_id}/twin", tags=["twin"])


@router.get("", response_model=TwinStatus)
def get_twin(analysis_id: UUID) -> TwinStatus:
    """Mengembalikan mode (splat/pointcloud/path_2d/frame_strip) + aset. FE tidak pernah melihat galat teknis."""
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M8b")


@router.post("/zones/{zone_id}/rename", response_model=TwinStatus)
def rename_zone(analysis_id: UUID, zone_id: str, name: str) -> TwinStatus:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M8b")
