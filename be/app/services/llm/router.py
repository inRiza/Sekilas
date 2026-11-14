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
            self._gemini_client = genai.Client(api_key=self.settings.gemini_api_key)
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
            logger.warning("GEMINI_API_KEY belum diatur; melewati panggilan multimodal Gemini.")
            return None

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
        response = client.models.generate_content(
            model=self.settings.gemini_model,
            contents=contents,
            config=config,
        )
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
        """Kirim prompt teks JSON ke Gemini; otomatis fallback ke OpenAI bila gagal."""
        if self.is_mock_mode:
            return None

        client = self._get_gemini_client()
        if client is not None:
            try:
                config = types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                    response_mime_type="application/json",
                )
                response = client.models.generate_content(
                    model=self.settings.gemini_model,
                    contents=user_prompt,
                    config=config,
                )
                parsed = _extract_json_payload(response.text or "{}")
                usage = getattr(response, "usage_metadata", None)
                return LLMCallResult(
                    data=parsed,
                    provider="gemini",
                    model=self.settings.gemini_model,
                    prompt_tokens=int(getattr(usage, "prompt_token_count", 0) or 0),
                    completion_tokens=int(getattr(usage, "candidates_token_count", 0) or 0),
                )
            except (httpx.HTTPError, ValueError, RuntimeError, KeyError, TypeError, OSError) as exc:  # pragma: no cover - bergantung jaringan/kuota eksternal
                logger.warning("Panggilan Gemini gagal (%s); mencoba fallback OpenAI.", exc)

        if allow_openai_fallback and self.settings.openai_api_key:
            return self._call_openai_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
            )

        return None

    def _call_openai_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_output_tokens: int,
    ) -> LLMCallResult | None:
        """Fallback panggilan teks/JSON ke OpenAI Chat Completions API."""
        headers = {
            "Authorization": f"Bearer {self.settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.settings.openai_model,
            "temperature": temperature,
            "max_tokens": max_output_tokens,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
        with httpx.Client(timeout=45.0) as http:
            resp = http.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            body = resp.json()

        content = body["choices"][0]["message"]["content"]
        parsed = _extract_json_payload(content)
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
