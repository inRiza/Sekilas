from fastapi import APIRouter

from app.api.v1.routes import (
    analyses,
    auth,
    businesses,
    context,
    dashboard,
    measurement,
    simulations,
    transcripts,
    twin,
    videos,
)

api_router = APIRouter()
for module in (
    auth,
    businesses,
    analyses,
    context,
    videos,
    transcripts,
    twin,
    simulations,
    dashboard,
    measurement,
):
    api_router.include_router(module.router)
