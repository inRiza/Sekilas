from collections.abc import Iterator
from pathlib import Path
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.models.base import Base

settings = get_settings()
db_url = settings.database_url
connect_args = {}

if "sqlite" in db_url:
    connect_args["check_same_thread"] = False

engine = create_engine(db_url, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

# Auto-create tables jika menggunakan SQLite lokal
if "sqlite" in db_url:
    Base.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


MIGRATIONS_DIR = Path(__file__).resolve().parents[3] / "supabase" / "migrations"


def init_db() -> None:
    """Siapkan skema Postgres lokal dari supabase/migrations (tanpa RLS/trigger auth Supabase).

    Di Supabase, skema dikelola `supabase db push`; di sana tabel sudah ada sehingga langkah
    migrasi dilewati. Kolom model yang belum ada di migrasi ditambahkan sebagai nullable.
    """
    import app.models  # noqa: F401  (daftarkan semua model ke metadata)

    if engine.dialect.name == "postgresql" and not inspect(engine).has_table("users"):
        initial = sorted(MIGRATIONS_DIR.glob("*_initial_sekilas_schema.sql"))
        if initial:
            ddl = initial[0].read_text().split("-- 9. Enable Row Level Security")[0]
            with engine.begin() as conn:
                conn.exec_driver_sql(ddl)
    Base.metadata.create_all(engine)

    insp = inspect(engine)
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            existing = {c["name"] for c in insp.get_columns(table.name)}
            for col in table.columns:
                if col.name not in existing:
                    col_type = col.type.compile(dialect=engine.dialect)
                    conn.exec_driver_sql(
                        f'ALTER TABLE "{table.name}" ADD COLUMN "{col.name}" {col_type}'
                    )
