"""F1: baca foto menu menjadi daftar menu + harga."""

from app.schemas.context import MenuItem


def read_menu(image: bytes) -> list[MenuItem]:
    """Gagal baca -> kembalikan list kosong, FE beralih ke input manual."""
    raise NotImplementedError("M1")
