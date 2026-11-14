"""Router LLM terpadu: Gemini utama (multimodal & teks) dengan fallback OpenAI untuk teks/JSON.

Catatan Kebijakan & Privasi:
- Gemini Free Tier hanya digunakan untuk pengembangan & demo dengan video/keyframe yang sudah
  diburamkan di browser sisi klien.
- Mode ``llm_mode="mock"`` menonaktifkan panggilan API eksternal (0 token) untuk pengujian otomatis.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Any

import httpx
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


def _extract_json_payload(raw_text: str) -> dict[str, Any] | list[Any]:
    """Ekstrak objek/array JSON dari respons teks LLM (termasuk blok ```json ... ```)."""
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


class LLMUnavailableError(RuntimeError):
    """Galat ketika model LLM yang diwajibkan (mis. Gemini VLM) tidak tersedia / 503."""

    def __init__(self, message: str, *, status_code: int = 503) -> None:
        super().__init__(message)
        self.status_code = status_code


@dataclass
class KeyframeInput:
    """Satu keyframe terburam beserta stempel waktunya (detik) untuk prompt multimodal."""

    timestamp_s: float
    image_bytes: bytes
    mime_type: str = "image/jpeg"


@dataclass
class LLMCallResult:
    """Hasil panggilan LLM beserta metadata provider dan pemakaian token."""

    data: dict[str, Any] | list[Any]
    provider: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0


class LLMRouter:
    """Mengelola panggilan Gemini (multimodal & teks) dan fallback OpenAI (teks/JSON)."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._gemini_client: genai.Client | None = None

    @property
    def is_mock_mode(self) -> bool:
        return self.settings.llm_mode.strip().lower() == "mock"

    def _get_gemini_client(self) -> genai.Client | None:
        if not self.settings.gemini_api_key:
            return None
        if self._gemini_client is None:
            self._gemini_client = genai.Client(
                api_key=self.settings.gemini_api_key,
                http_options=types.HttpOptions(timeout=35_000),
            )
        return self._gemini_client

    def generate_multimodal_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        keyframes: list[KeyframeInput],
        temperature: float = 0.2,
        max_output_tokens: int = 4096,
    ) -> LLMCallResult | None:
        """Kirim prompt + keyframe terburam (dengan stempel waktu) ke Gemini Vision.

        Strictly menggunakan Gemini untuk multimodal; mengembalikan ``None`` bila mode mock
        atau API key tidak tersedia.
        """
        if self.is_mock_mode:
            return None

        client = self._get_gemini_client()
        if client is None:
            raise LLMUnavailableError(
                "GEMINI_API_KEY belum diatur. Layanan transkrip multimodal Gemini tidak tersedia.",
                status_code=503,
            )

        contents: list[Any] = [user_prompt]
        for idx, kf in enumerate(keyframes, start=1):
            mins = int(kf.timestamp_s // 60)
            secs = int(kf.timestamp_s % 60)
            contents.append(f"\n[Frame #{idx} — Stempel waktu: {mins:02d}:{secs:02d} ({kf.timestamp_s:.1f}s)]")
            contents.append(types.Part.from_bytes(data=kf.image_bytes, mime_type=kf.mime_type))

        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            response_mime_type="application/json",
        )
        try:
            response = client.models.generate_content(
                model=self.settings.gemini_model,
                contents=contents,
                config=config,
            )
        except genai_errors.APIError as exc:
            code = int(getattr(exc, "code", 503) or 503)
            if code == 503:
                raise LLMUnavailableError(
                    f"Model Gemini ({self.settings.gemini_model}) sedang mengalami lonjakan permintaan (503 UNAVAILABLE). Silakan coba beberapa saat lagi.",
                    status_code=503,
                ) from exc
            raise LLMUnavailableError(
                f"Layanan Gemini mengembalikan galat ({code}): {getattr(exc, 'message', str(exc))}",
                status_code=code if 400 <= code < 600 else 502,
            ) from exc
        raw_text = response.text or "{}"
        parsed = _extract_json_payload(raw_text)
        usage = getattr(response, "usage_metadata", None)
        return LLMCallResult(
            data=parsed,
            provider="gemini",
            model=self.settings.gemini_model,
            prompt_tokens=int(getattr(usage, "prompt_token_count", 0) or 0),
            completion_tokens=int(getattr(usage, "candidates_token_count", 0) or 0),
        )

    def generate_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_output_tokens: int = 3072,
        allow_openai_fallback: bool = True,
    ) -> LLMCallResult | None:
        """Kirim prompt teks JSON untuk simulasi agent swarm & rekomendasi ke OpenAI (gpt-6-luna)."""
        if self.is_mock_mode:
            return None

        if not self.settings.openai_api_key:
            raise LLMUnavailableError(
                "OPENAI_API_KEY belum diatur untuk menjalankan simulasi agent swarm.",
                status_code=503,
            )

        return self._call_openai_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )

    def _call_openai_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_output_tokens: int,
    ) -> LLMCallResult | None:
        """Panggilan teks/JSON ke OpenAI Chat Completions API (tidak fallback ke model lain)."""
        headers = {
            "Authorization": f"Bearer {self.settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.settings.openai_model,
            "temperature": temperature,
            "max_completion_tokens": max_output_tokens,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }

        def _post_once(req_payload: dict[str, Any]) -> dict[str, Any]:
            with httpx.Client(timeout=60.0) as http:
                resp = http.post("https://api.openai.com/v1/chat/completions", headers=headers, json=req_payload)
                if not resp.is_success:
                    err_msg = resp.text[:300]
                    try:
                        err_json = resp.json()
                        if isinstance(err_json, dict) and isinstance(err_json.get("error"), dict):
                            err_msg = str(err_json["error"].get("message") or err_msg)
                    except (ValueError, TypeError):
                        pass
                    code = int(resp.status_code)
                    # Jika model OpenAI ini tidak mendukung parameter temperature kustom, coba ulang tanpa temperature pada model yang SAMA.
                    if code == 400 and "temperature" in err_msg.lower() and "temperature" in req_payload:
                        stripped = {k: v for k, v in req_payload.items() if k != "temperature"}
                        return _post_once(stripped)
                    raise LLMUnavailableError(
                        f"Model OpenAI ({self.settings.openai_model}) mengembalikan galat ({code}): {err_msg}",
                        status_code=code if code in (429, 503) else 502,
                    )
                return resp.json()

        try:
            body = _post_once(payload)
        except LLMUnavailableError:
            raise
        except (httpx.HTTPError, ValueError, KeyError, TypeError, OSError) as exc:  # pragma: no cover
            raise LLMUnavailableError(
                f"Gagal memanggil model OpenAI ({self.settings.openai_model}): {exc}",
                status_code=503,
            ) from exc

        choice = (body.get("choices") or [{}])[0]
        content = (choice.get("message") or {}).get("content") or ""
        if not content.strip():
            finish_reason = choice.get("finish_reason", "unknown")
            raise LLMUnavailableError(
                f"Model OpenAI ({self.settings.openai_model}) mengembalikan respons kosong (finish_reason={finish_reason}).",
                status_code=502,
            )
        try:
            parsed = _extract_json_payload(content)
        except (ValueError, TypeError) as exc:
            raise LLMUnavailableError(
                f"Respons JSON dari model OpenAI ({self.settings.openai_model}) tidak valid atau terpotong: {exc}",
                status_code=502,
            ) from exc
        usage = body.get("usage") or {}
        return LLMCallResult(
            data=parsed,
            provider="openai",
            model=self.settings.openai_model,
            prompt_tokens=int(usage.get("prompt_tokens", 0) or 0),
            completion_tokens=int(usage.get("completion_tokens", 0) or 0),
        )


def get_llm_router() -> LLMRouter:
    return LLMRouter(get_settings())
