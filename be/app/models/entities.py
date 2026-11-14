"""Tabel inti PRD 4.1: bisnis -> analisis -> (job, aset Visual Twin).

Akun belum dimodelkan: demo memakai satu akun implisit. Tabel lain (transkrip, run,
keputusan agen, proyeksi) ditambahkan per milestone.
"""

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Business(TimestampMixin, Base):
    __tablename__ = "businesses"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    branch_name: Mapped[str] = mapped_column(String(120), default="Pusat")
    category: Mapped[str] = mapped_column(String(32))
    address: Mapped[str] = mapped_column(String(300), default="")
    # Nilai awal konteks untuk analisis baru (disalin, bukan dirujuk; PRD keputusan 13).
    default_context: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    # Analisis yang dibuka dari daftar bisnis (bawaan: analisis siap terbaru).
    primary_analysis_id: Mapped[str | None] = mapped_column(String(32), nullable=True)

    analyses: Mapped[list["Analysis"]] = relationship(
        back_populates="business",
        cascade="all, delete-orphan",
        order_by="Analysis.created_at.desc()",
    )


class Analysis(TimestampMixin, Base):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    business_id: Mapped[str] = mapped_column(
        ForeignKey("businesses.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    # draft -> konteks -> video -> memproses -> verifikasi -> simulasi -> siap (PRD 4.4.6)
    status: Mapped[str] = mapped_column(String(16), default="konteks")
    stale: Mapped[bool] = mapped_column(Boolean, default=False)
    stale_reason: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)

    context: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)  # snapshot F1
    transcript_version: Mapped[int] = mapped_column(Integer, default=0)
    persona_version: Mapped[int] = mapped_column(Integer, default=0)

    video_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_filename: Mapped[str | None] = mapped_column(String(300), nullable=True)
    video_duration_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    video_width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    video_height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cashier_at_s: Mapped[float | None] = mapped_column(Float, nullable=True)

    business: Mapped[Business] = relationship(back_populates="analyses")
    jobs: Mapped[list["Job"]] = relationship(
        back_populates="analysis", cascade="all, delete-orphan", order_by="Job.created_at"
    )
    twin: Mapped["TwinAsset | None"] = relationship(
        back_populates="analysis", cascade="all, delete-orphan", uselist=False
    )


class Job(TimestampMixin, Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    analysis_id: Mapped[str] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(16))  # twin | transcript | run
    # antre | berjalan | selesai | gagal (PRD 4.2)
    status: Mapped[str] = mapped_column(String(12), default="antre")
    stage: Mapped[int] = mapped_column(Integer, default=0)
    stage_label: Mapped[str] = mapped_column(String(80), default="Menunggu antrean")
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    log_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    analysis: Mapped[Analysis] = relationship(back_populates="jobs")


class TwinAsset(TimestampMixin, Base):
    __tablename__ = "twin_assets"

    analysis_id: Mapped[str] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"), primary_key=True
    )
    name: Mapped[str] = mapped_column(String(64))  # nama berkas di fe/public/samples
    ply_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    splat_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    path_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    frames: Mapped[int] = mapped_column(Integer, default=0)
    registered: Mapped[int] = mapped_column(Integer, default=0)
    points: Mapped[int] = mapped_column(Integer, default=0)
    build_seconds: Mapped[int] = mapped_column(Integer, default=0)
    diagnosis: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    analysis: Mapped[Analysis] = relationship(back_populates="twin")
