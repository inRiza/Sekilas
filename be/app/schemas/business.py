from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.context import BusinessContext, BusinessType


class BusinessCreate(BaseModel):
    user_id: str | None = None
    owner_id: str | None = None
    name: str = Field(min_length=1, max_length=255)
    branch_name: str = Field(default="Pusat", max_length=255)
    category: BusinessType = "kedai"
    address: str = ""
    context: BusinessContext | None = None


class BusinessUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    branch_name: str | None = Field(default=None, max_length=255)
    category: BusinessType | None = None
    address: str | None = None
    primary_analysis_id: str | None = None
    context: BusinessContext | None = None


class BusinessOut(BaseModel):
    id: str
    user_id: str
    owner_id: str | None = None
    name: str
    branch_name: str
    category: BusinessType
    address: str
    primary_analysis_id: str | None = None
    context: BusinessContext
    analyses_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None
