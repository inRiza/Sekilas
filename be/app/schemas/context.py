from pydantic import BaseModel, Field


class MenuItem(BaseModel):
    name: str
    price: int = Field(ge=0, description="Harga dalam rupiah")


class BusinessContext(BaseModel):
    """PRD F1."""

    business_type: str
    address: str
    lat: float | None = None
    lng: float | None = None
    location_note: str = Field(description='Misal "lantai 2 ruko"')
    menu: list[MenuItem]
    open_hours: str
    peak_hours: str
    neighbors: str | None = None
