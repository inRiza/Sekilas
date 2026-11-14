"""Autentikasi pengguna berbasis Supabase Auth (dengan fallback lokal/demo)."""

from typing import Annotated, Any

import httpx
from fastapi import Depends, Header, HTTPException, status

from app.core.config import get_settings
from app.core.db import SessionDep
from app.models.entities import UserAccount
from app.services.crud import DEFAULT_USER_ID, ensure_user


def verify_supabase_token(access_token: str) -> dict[str, Any]:
    """Memverifikasi access_token langsung ke endpoint resmi Supabase Auth (/auth/v1/user)."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_publishable_key:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Konfigurasi Supabase belum diatur di backend.",
        )

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
    headers = {
        "apikey": settings.supabase_publishable_key,
        "Authorization": f"Bearer {access_token}",
    }
    try:
        res = httpx.get(url, headers=headers, timeout=5.0)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "Gagal menghubungi layanan Supabase Auth.",
        ) from exc

    if res.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Sesi autentikasi tidak valid atau sudah berakhir.",
        )
    return res.json()


def get_current_user(
    session: SessionDep,
    authorization: Annotated[str | None, Header()] = None,
    x_user_id: Annotated[str | None, Header()] = None,
) -> UserAccount:
    """Mengambil UserAccount dari Bearer token Supabase Auth (atau X-User-Id / usr_01 saat dev)."""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        if token and token != "demo":
            auth_user = verify_supabase_token(token)
            user_id = str(auth_user.get("id") or "")
            if not user_id:
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token pengguna tidak valid.")
            email = str(auth_user.get("email") or f"{user_id}@sekilas.id")
            meta = auth_user.get("user_metadata") or {}
            name = (
                str(meta.get("full_name") or meta.get("name") or "").strip()
                or email.split("@", 1)[0]
                or "Pengguna Sekilas"
            )
            avatar_url = meta.get("avatar_url")

            user = session.get(UserAccount, user_id)
            if user is None:
                user = UserAccount(
                    id=user_id,
                    name=name,
                    email=email,
                    avatar_url=avatar_url,
                )
                session.add(user)
                session.commit()
                session.refresh(user)
            return user

    fallback_id = (x_user_id or DEFAULT_USER_ID).strip() or DEFAULT_USER_ID
    user = ensure_user(session, fallback_id)
    session.commit()
    return user


CurrentUserDep = Annotated[UserAccount, Depends(get_current_user)]
