"""Helper otorisasi & Signed URL untuk aset video dan frame pada Supabase Storage / lokal."""

from __future__ import annotations

import hashlib
import hmac
import logging
import re
import time
from urllib.parse import parse_qs, quote, unquote, urlparse

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

DEFAULT_VIDEO_BUCKET = "videos"

_OBJECT_PATH_RE = re.compile(
    r"/storage/v1/object/(?:public|sign|authenticated)/[^/]+/(.+)$"
)


def extract_bearer_token(authorization: str | None) -> str | None:
    """Ambil JWT dari header Authorization Bearer (mengabaikan token demo)."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization[7:].strip()
    if not token or token == "demo":
        return None
    return token


def _is_safe_storage_key(key: str) -> bool:
    parts = [p for p in key.split("/") if p]
    return bool(parts) and all(p not in (".", "..") for p in parts)


def extract_bucket_object_key(
    raw: str | None,
    *,
    analysis_id: str | None = None,
    default_subdir: str | None = None,
    bucket: str = DEFAULT_VIDEO_BUCKET,
) -> str | None:
    """Normalisasi key relatif atau URL Supabase/proxy menjadi object key bersih di bucket.

    Mengembalikan None untuk data URL (`data:image/...`), URL eksternal lain, atau key seed lama
    yang tidak memiliki berkas fisik.
    """
    if not raw:
        return None
    text = raw.strip()
    if not text or text.startswith("data:image/"):
        return None
    if text.startswith((f"{bucket}/selasar-kopi/", "videos/selasar-kopi/")):
        return None

    # Cek format URL proxy internal /api/v1/analyses/{id}/video/media?key=...
    if "/video/media" in text:
        parsed = urlparse(text)
        qs = parse_qs(parsed.query)
        raw_key = (qs.get("key") or [""])[0]
        if raw_key:
            text = unquote(raw_key)

    if text.startswith(("http://", "https://")):
        parsed = urlparse(text)
        match = _OBJECT_PATH_RE.search(parsed.path)
        if not match:
            return None
        clean = unquote(match.group(1)).lstrip("/")
    else:
        clean = text.lstrip("/").removeprefix(f"{bucket}/")
        if analysis_id and "/" not in clean:
            if default_subdir:
                clean = f"{analysis_id}/{default_subdir}/{clean}"
            else:
                clean = f"{analysis_id}/{clean}"

    return clean if _is_safe_storage_key(clean) else None


def _signing_secret() -> bytes:
    settings = get_settings()
    explicit = (settings.media_signing_secret or settings.effective_supabase_secret_key).strip()
    if explicit:
        return explicit.encode("utf-8")
    seed = f"sekilas-media:{settings.supabase_url}:{settings.supabase_publishable_key}:{settings.database_url}"
    return hashlib.sha256(seed.encode("utf-8")).digest()


def sign_media_query(
    analysis_id: str,
    storage_key: str,
    *,
    ttl_seconds: int | None = None,
) -> tuple[int, str]:
    """Hasilkan timestamp kedaluwarsa & tanda tangan HMAC-SHA256 terikat ke analysis_id + key."""
    ttl = max(60, ttl_seconds or get_settings().signed_url_ttl_seconds)
    expires = int(time.time()) + ttl
    payload = f"{analysis_id}:{storage_key}:{expires}".encode()
    sig = hmac.new(_signing_secret(), payload, hashlib.sha256).hexdigest()
    return expires, sig


def verify_media_signature(
    analysis_id: str,
    storage_key: str,
    expires: int,
    sig: str,
) -> bool:
    """Verifikasi tanda tangan HMAC & batas waktu Signed URL media."""
    if not storage_key or not sig or not _is_safe_storage_key(storage_key):
        return False
    if expires < int(time.time()):
        return False
    expected = hmac.new(
        _signing_secret(),
        f"{analysis_id}:{storage_key}:{expires}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, sig)


def _supabase_auth_headers(bearer_token: str | None = None) -> dict[str, str] | None:
    settings = get_settings()
    secret = settings.effective_supabase_secret_key
    token = secret or bearer_token
    if not settings.supabase_url or not token:
        return None
    apikey = secret or settings.supabase_publishable_key
    headers = {"Authorization": f"Bearer {token}"}
    if apikey:
        headers["apikey"] = apikey
    return headers


def _format_supabase_signed_path(base_url: str, raw_signed_path: str) -> str:
    base = base_url.rstrip("/")
    if raw_signed_path.startswith(("http://", "https://")):
        return raw_signed_path
    path = raw_signed_path if raw_signed_path.startswith("/") else f"/{raw_signed_path}"
    if not path.startswith("/storage/v1"):
        path = f"/storage/v1{path}"
    return f"{base}{path}"


def create_supabase_signed_url(
    storage_key: str,
    *,
    bearer_token: str | None = None,
    bucket: str = DEFAULT_VIDEO_BUCKET,
    expires_in: int | None = None,
) -> str | None:
    """Minta Signed Download URL resmi dari Supabase Storage bila kredensial tersedia."""
    settings = get_settings()
    if settings.llm_mode.strip().lower() == "mock":
        return None
    headers = _supabase_auth_headers(bearer_token)
    if headers is None:
        return None
    base = settings.supabase_url.rstrip("/")
    ttl = max(60, expires_in or settings.signed_url_ttl_seconds)
    encoded_key = quote(storage_key.lstrip("/"), safe="/")
    try:
        resp = httpx.post(
            f"{base}/storage/v1/object/sign/{bucket}/{encoded_key}",
            headers={**headers, "Content-Type": "application/json"},
            json={"expiresIn": ttl},
            timeout=5.0,
        )
        if resp.is_success:
            signed_path = resp.json().get("signedURL")
            if isinstance(signed_path, str) and signed_path:
                return _format_supabase_signed_path(base, signed_path)
    except (httpx.HTTPError, ValueError) as exc:
        logger.debug("Gagal meminta Supabase signed URL untuk %s: %s", storage_key, exc)
    return None


def create_supabase_signed_upload_url(
    storage_key: str,
    *,
    bearer_token: str | None = None,
    bucket: str = DEFAULT_VIDEO_BUCKET,
    upsert: bool = True,
) -> tuple[str, str | None] | None:
    """Minta Signed Upload URL resmi dari Supabase Storage bila kredensial tersedia."""
    settings = get_settings()
    if settings.llm_mode.strip().lower() == "mock":
        return None
    headers = _supabase_auth_headers(bearer_token)
    if headers is None:
        return None
    base = settings.supabase_url.rstrip("/")
    encoded_key = quote(storage_key.lstrip("/"), safe="/")
    req_headers = {**headers, "Content-Type": "application/json"}
    if upsert:
        req_headers["x-upsert"] = "true"
    try:
        resp = httpx.post(
            f"{base}/storage/v1/object/upload/sign/{bucket}/{encoded_key}",
            headers=req_headers,
            timeout=5.0,
        )
        if resp.is_success:
            body = resp.json()
            raw_url = body.get("url") or body.get("signedURL")
            token = body.get("token")
            if isinstance(raw_url, str) and raw_url:
                return _format_supabase_signed_path(base, raw_url), (
                    str(token) if token else None
                )
    except (httpx.HTTPError, ValueError) as exc:
        logger.debug("Gagal meminta Supabase signed upload URL untuk %s: %s", storage_key, exc)
    return None


def build_backend_media_url(
    analysis_id: str,
    storage_key: str,
    *,
    base_url: str | None = None,
    ttl_seconds: int | None = None,
) -> str:
    """Bangun Signed URL media yang diverifikasi backend (/video/media)."""
    expires, sig = sign_media_query(analysis_id, storage_key, ttl_seconds=ttl_seconds)
    prefix = f"{base_url.rstrip('/')}" if base_url else ""
    api_prefix = get_settings().api_prefix.rstrip("/")
    encoded_key = quote(storage_key, safe="")
    return (
        f"{prefix}{api_prefix}/analyses/{quote(analysis_id, safe='')}/video/media"
        f"?key={encoded_key}&expires={expires}&sig={sig}"
    )


def build_authorized_media_url(
    analysis_id: str,
    raw_key: str | None,
    *,
    bearer_token: str | None = None,
    base_url: str | None = None,
    expires_in: int | None = None,
    default_subdir: str | None = None,
) -> str | None:
    """Konversi key video/frame menjadi Signed URL berotorisasi (tanpa /object/public/)."""
    if not raw_key:
        return None
    if raw_key.startswith("data:image/"):
        return raw_key
    clean_key = extract_bucket_object_key(
        raw_key, analysis_id=analysis_id, default_subdir=default_subdir
    )
    if clean_key is None:
        if raw_key.startswith(("http://", "https://")) and "/storage/v1/object/public/" not in raw_key:
            return raw_key
        return None

    signed = create_supabase_signed_url(
        clean_key, bearer_token=bearer_token, expires_in=expires_in
    )
    if signed:
        return signed
    return build_backend_media_url(
        analysis_id, clean_key, base_url=base_url, ttl_seconds=expires_in
    )


def download_supabase_object(
    storage_key: str,
    *,
    bearer_token: str | None = None,
    bucket: str = DEFAULT_VIDEO_BUCKET,
) -> tuple[bytes, str] | None:
    """Unduh objek dari Supabase Storage secara server-side dengan otorisasi."""
    settings = get_settings()
    base = settings.supabase_url.rstrip("/")
    if not base:
        return None
    clean_key = storage_key.lstrip("/")
    encoded_key = quote(clean_key, safe="/")

    headers = _supabase_auth_headers(bearer_token)
    if headers is not None:
        endpoint = f"{base}/storage/v1/object/authenticated/{bucket}/{encoded_key}"
        try:
            resp = httpx.get(endpoint, headers=headers, timeout=30.0, follow_redirects=True)
            if resp.is_success:
                return resp.content, resp.headers.get("content-type", "application/octet-stream")
        except httpx.HTTPError as exc:
            logger.debug("Gagal mengunduh object terautentikasi %s: %s", clean_key, exc)

    # Coba lewat Signed URL jika ada
    signed = create_supabase_signed_url(clean_key, bearer_token=bearer_token, bucket=bucket)
    if signed:
        try:
            resp = httpx.get(signed, timeout=30.0, follow_redirects=True)
            if resp.is_success:
                return resp.content, resp.headers.get("content-type", "application/octet-stream")
        except httpx.HTTPError as exc:
            logger.debug("Gagal mengunduh lewat signed URL %s: %s", clean_key, exc)

    # Transisi saat Supabase Storage belum diberi SECRET_KEY di server
    if settings.supabase_publishable_key:
        endpoint = f"{base}/storage/v1/object/{bucket}/{encoded_key}"
        try:
            resp = httpx.get(
                endpoint,
                headers={"apikey": settings.supabase_publishable_key},
                timeout=30.0,
                follow_redirects=True,
            )
            if resp.is_success:
                return resp.content, resp.headers.get("content-type", "application/octet-stream")
        except httpx.HTTPError as exc:
            logger.debug("Gagal mengunduh fallback object %s: %s", clean_key, exc)

    return None
