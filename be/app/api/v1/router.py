from fastapi import APIRouter

from app.api.v1.routes import (
    analyses,
    assistant,
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
    analyses,
    context,
    videos,
    transcripts,
    twin,
    simulations,
    dashboard,
    assistant,
    measurement,
):
    api_router.include_router(module.router)
