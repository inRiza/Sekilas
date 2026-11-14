from statistics import median
from typing import Literal

from pydantic import BaseModel, Field

BusinessType = Literal["warung", "kedai", "kafe", "resto_ruko"]
SurroundingsType = Literal["dekat_kampus", "perkantoran", "permukiman", "jalan_utama", "lainnya"]
PasserbyType = Literal["mahasiswa", "pekerja_kantor", "warga_sekitar", "keluarga", "pengendara"]
BusinessGoal = Literal["lebih_banyak_pembeli_baru", "naikkan_belanja_rata_rata", "ramaikan_jam_sepi"]
FixedConstraint = Literal["lokasi", "fasad", "menu", "harga"]
PriceLevel = Literal["hemat", "sedang", "premium"]
ParkingOption = Literal["motor", "mobil", "tidak_ada"]


class MenuItem(BaseModel):
    id: str | None = None
    name: str
    price: int = Field(ge=0, description="Harga porsi dalam rupiah")
    source: str = "manual"


class OpeningHours(BaseModel):
    open: str = "08:00"
    close: str = "22:00"


class RushHourRange(BaseModel):
    start: str = "12:00"
    end: str = "14:00"


def calculate_price_level(menu_items: list[MenuItem]) -> PriceLevel:
    """PRD v1.4 F1 Bagian 3: level harga dihitung kode dari median harga menu."""
    prices = [item.price for item in menu_items if item.price > 0]
    if not prices:
        return "hemat"
    med = median(prices)
    if med < 25_000:
        return "hemat"
    if med <= 60_000:
        return "sedang"
    return "premium"


class BusinessContext(BaseModel):
    """PRD v1.4 F1: Konteks Usaha 5 seksi."""

    # Bagian 1: Informasi Dasar
    business_type: BusinessType = "kedai"
    business_name: str
    location_name: str
    location_lat: float | None = None
    location_lng: float | None = None
    location_description: str = ""

    # Bagian 2: Pelanggan dan Tujuan
    surroundings_type: SurroundingsType = "jalan_utama"
    surroundings: list[SurroundingsType] = Field(default_factory=list)
    surroundings_other: str | None = None
    passersby: list[PasserbyType] = Field(default_factory=list)
    business_goal: BusinessGoal = "lebih_banyak_pembeli_baru"
    fixed_constraints: list[FixedConstraint] = Field(default_factory=list)

    # Bagian 3: Menu & Harga
    menu_items: list[MenuItem] = Field(default_factory=list)
    calculated_price_level: PriceLevel = "hemat"

    # Bagian 4: Jam Operasional
    opening_hours: OpeningHours = Field(default_factory=OpeningHours)
    rush_hours: list[RushHourRange] = Field(default_factory=lambda: [RushHourRange()])

    # Bagian 5: Penjualan & Fasilitas (Opsional)
    daily_sales_rp: int | None = None
    daily_visitors: int | None = None
    parking: list[ParkingOption] = Field(default_factory=list)
