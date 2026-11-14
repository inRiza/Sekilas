from pydantic import BaseModel


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    avatar_url: str | None = None
    daily_run_quota: int = 10
    daily_projection_quota: int = 10
