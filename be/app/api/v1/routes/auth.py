"""Endpoint profil & verifikasi sesi Supabase Auth."""

from fastapi import APIRouter

from app.core.auth import CurrentUserDep
from app.schemas.auth import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserOut)
def get_me(user: CurrentUserDep) -> UserOut:
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        avatar_url=user.avatar_url,
        daily_run_quota=user.daily_run_quota,
        daily_projection_quota=user.daily_projection_quota,
    )
