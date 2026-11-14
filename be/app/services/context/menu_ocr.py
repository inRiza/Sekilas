"""F1: baca foto menu atau file CSV/Excel menjadi daftar menu + harga."""

import base64
import csv
import io
import json
import re
from uuid import uuid4

import httpx

from app.core.config import get_settings
from app.schemas.context import MenuItem


def _clean_price(raw_val: str | float) -> int:
    if isinstance(raw_val, (int, float)):
        val = int(raw_val)
        return val * 1000 if 0 < val < 500 else val
    s = str(raw_val).strip().lower()
    if not s:
        return 0
    # Handle "18rb", "18k", "18.5k"
    m_k = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k)\b", s)
    if m_k:
        num = float(m_k.group(1).replace(",", "."))
        return round(num * 1000)
    digits = re.sub(r"\D", "", s)
    if not digits:
        return 0
    val = int(digits)
    if 0 < val < 500:
        return val * 1000
    return val


def parse_menu_csv_or_text(raw_bytes: bytes) -> list[MenuItem]:
    """Parse file CSV / TSV / teks berformat 'Nama Menu, Harga'."""
    try:
        text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw_bytes.decode("latin-1", errors="ignore")

    items: list[MenuItem] = []
    reader = csv.reader(io.StringIO(text))
    for idx, row in enumerate(reader):
        cols = [c.strip() for c in row if c and c.strip()]
        if not cols:
            continue
        # Jika hanya 1 kolom namun ada pemisah ';' atau '\t' atau '-'
        if len(cols) == 1:
            if ";" in cols[0]:
                cols = [c.strip() for c in cols[0].split(";") if c.strip()]
            elif "\t" in cols[0]:
                cols = [c.strip() for c in cols[0].split("\t") if c.strip()]
            else:
                m = re.match(r"^(.+?)\s*[-–:]\s*(?:rp\.?\s*)?(\d[\d.,\s]*(?:rb|k)?)$", cols[0], re.IGNORECASE)
                if m:
                    cols = [m.group(1).strip(), m.group(2).strip()]

        if len(cols) < 2:
            continue
        name, price_raw = cols[0], cols[1]
        if idx == 0 and any(h in name.lower() for h in ("nama", "menu", "item", "produk")):
            continue
        price = _clean_price(price_raw)
        if name and price > 0:
            items.append(
                MenuItem(
                    id=f"mi_{uuid4().hex[:8]}",
                    name=name,
                    price=price,
                    source="ocr",
                )
            )
    return items


def read_menu(
    file_bytes: bytes,
    filename: str = "",
    content_type: str = "image/jpeg",
) -> list[MenuItem]:
    """Baca daftar menu dari file CSV/teks atau foto menu menggunakan Gemini Vision API."""
    if not file_bytes:
        return []

    lower_name = (filename or "").lower()
    if lower_name.endswith((".csv", ".tsv", ".txt")) or "csv" in content_type or "text" in content_type:
        parsed = parse_menu_csv_or_text(file_bytes)
        if parsed:
            return parsed

    settings = get_settings()
    if settings.gemini_api_key:
        mime = content_type if content_type.startswith("image/") else "image/jpeg"
        b64_img = base64.b64encode(file_bytes).decode("ascii")
        model = settings.gemini_model or "gemini-2.5-flash"
        # Gunakan model standar bila nama model kustom tidak tersedia di endpoint publik
        for candidate_model in [model, "gemini-2.5-flash", "gemini-2.0-flash"]:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{candidate_model}:generateContent"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": (
                                    "Ekstrak daftar menu makanan/minuman beserta harga Rupiah dari gambar ini. "
                                    "Kembalikan HANYA JSON array murni dengan format: "
                                    '[{"name": "Nama Menu", "price": 18000}].'
                                )
                            },
                            {"inline_data": {"mime_type": mime, "data": b64_img}},
                        ]
                    }
                ],
                "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"},
            }
            try:
                res = httpx.post(url, params={"key": settings.gemini_api_key}, json=payload, timeout=12.0)
                if res.status_code == 200:
                    data = res.json()
                    text_out = (
                        data.get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [{}])[0]
                        .get("text", "")
                    )
                    match = re.search(r"\[.*\]", text_out, re.DOTALL)
                    raw_list = json.loads(match.group(0) if match else text_out)
                    if isinstance(raw_list, list):
                        extracted: list[MenuItem] = []
                        for item in raw_list:
                            if isinstance(item, dict) and item.get("name"):
                                p = _clean_price(item.get("price", 0))
                                if p > 0:
                                    extracted.append(
                                        MenuItem(
                                            id=f"mi_{uuid4().hex[:8]}",
                                            name=str(item["name"]).strip(),
                                            price=p,
                                            source="ocr",
                                        )
                                    )
                        if extracted:
                            return extracted
            except (httpx.HTTPError, ValueError, KeyError, IndexError):
                pass

    # Coba parse sebagai teks/CSV bila bukan gambar murni
    parsed_fallback = parse_menu_csv_or_text(file_bytes)
    if parsed_fallback:
        return parsed_fallback

    return []
