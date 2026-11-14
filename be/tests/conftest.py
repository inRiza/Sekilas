"""Isolasi tes dari layanan nyata: be/.env bisa berisi DATABASE_URL Supabase dan API key LLM.

Variabel lingkungan mengalahkan nilai di .env (pydantic-settings), jadi diset sebelum `app`
diimpor.
"""

import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["TWIN_LOCAL_RUNNER"] = "false"
os.environ["LLM_MODE"] = "mock"  # 0 token
os.environ["JOBS_IN_BACKGROUND"] = "false"  # job transkrip inline agar tes deterministik
for key in ("OPENAI_API_KEY", "GEMINI_API_KEY", "ANTHROPIC_API_KEY"):
    os.environ[key] = ""
