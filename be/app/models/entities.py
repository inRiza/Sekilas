from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class UserAccount(Base, TimestampMixin):
    """Akun pemilik UMKM (PRD 4.1)."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    daily_run_quota: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    daily_projection_quota: Mapped[int] = mapped_column(Integer, default=10, nullable=False)

    businesses: Mapped[list["Business"]] = relationship(
        "Business", back_populates="user", cascade="all, delete-orphan"
    )


class Business(Base, TimestampMixin):
    """Profil tetap tempat usaha/cabang dan konteks bawaan untuk prefill analisis baru (PRD 4.1)."""

    __tablename__ = "businesses"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    branch_name: Mapped[str] = mapped_column(String(255), default="Pusat", nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)  # warung | kedai | kafe | resto_ruko
    address: Mapped[str] = mapped_column(Text, default="", nullable=False)
    primary_analysis_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("analyses.id", ondelete="SET NULL", use_alter=True, name="fk_businesses_primary_analysis_id"),
        nullable=True,
    )
    default_context: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    user: Mapped["UserAccount"] = relationship("UserAccount", back_populates="businesses")
    analyses: Mapped[list["Analysis"]] = relationship(
        "Analysis",
        back_populates="business",
        foreign_keys="Analysis.business_id",
        cascade="all, delete-orphan",
    )
    primary_analysis: Mapped["Analysis | None"] = relationship(
        "Analysis", foreign_keys=[primary_analysis_id], post_update=True
    )


class Analysis(Base, TimestampMixin):
    """Satu siklus analisis: konteks snapshot + video + transkrip + simulasi + 3D + hasil (PRD 4.1, 4.4)."""

    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    business_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), default="draft", nullable=False, index=True
    )  # draft | konteks | video | memproses | verifikasi | simulasi | siap | gagal
    stale: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    stale_reasons: Mapped[list[str]] = mapped_column(
        JSONB, default=list, nullable=False
    )  # transcript_changed | context_changed | persona_changed
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    total_agents: Mapped[int] = mapped_column(Integer, default=500, nullable=False)
    seed: Mapped[int] = mapped_column(Integer, default=42, nullable=False)
    transcript_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    persona_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    transcript_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    quality_label: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )  # Kualitas baik | Kualitas cukup | Kualitas rendah
    thumbnail_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    business: Mapped["Business"] = relationship(
        "Business", back_populates="analyses", foreign_keys=[business_id]
    )
    context: Mapped["AnalysisContext | None"] = relationship(
        "AnalysisContext", back_populates="analysis", uselist=False, cascade="all, delete-orphan"
    )
    menu_items: Mapped[list["MenuItem"]] = relationship(
        "MenuItem", back_populates="analysis", cascade="all, delete-orphan", order_by="MenuItem.sort_order"
    )
    video: Mapped["VideoAsset | None"] = relationship(
        "VideoAsset", back_populates="analysis", uselist=False, cascade="all, delete-orphan"
    )
    transcript_segments: Mapped[list["TranscriptSegment"]] = relationship(
        "TranscriptSegment",
        back_populates="analysis",
        cascade="all, delete-orphan",
        order_by="TranscriptSegment.timestamp_start",
    )
    transcript_checkpoints: Mapped[list["TranscriptCheckpoint"]] = relationship(
        "TranscriptCheckpoint",
        back_populates="analysis",
        cascade="all, delete-orphan",
        order_by="TranscriptCheckpoint.timestamp_s",
    )
    personas: Mapped[list["Persona"]] = relationship(
        "Persona", back_populates="analysis", cascade="all, delete-orphan", order_by="Persona.agent_id"
    )
    runs: Mapped[list["SimulationRun"]] = relationship(
        "SimulationRun", back_populates="analysis", cascade="all, delete-orphan"
    )
    recommendations: Mapped[list["RecommendationItem"]] = relationship(
        "RecommendationItem",
        back_populates="analysis",
        cascade="all, delete-orphan",
        order_by="RecommendationItem.rank",
    )
    projections: Mapped[list["Projection"]] = relationship(
        "Projection", back_populates="analysis", cascade="all, delete-orphan"
    )
    twin_asset: Mapped["TwinAsset | None"] = relationship(
        "TwinAsset", back_populates="analysis", uselist=False, cascade="all, delete-orphan"
    )
    measurement_plan: Mapped["MeasurementPlanRecord | None"] = relationship(
        "MeasurementPlanRecord", back_populates="analysis", uselist=False, cascade="all, delete-orphan"
    )
    jobs: Mapped[list["JobRecord"]] = relationship(
        "JobRecord", back_populates="analysis", cascade="all, delete-orphan"
    )


class AnalysisContext(Base, TimestampMixin):
    """Snapshot Konteks Usaha (F1) per analisis agar riwayat tetap bisa diaudit (PRD 4.1, F1)."""

    __tablename__ = "analysis_contexts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    analysis_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("analyses.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    # 1. Informasi dasar
    business_type: Mapped[str] = mapped_column(String(64), nullable=False)  # warung | kedai | kafe | resto_ruko
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    location_name: Mapped[str] = mapped_column(Text, nullable=False)
    location_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_description: Mapped[str] = mapped_column(Text, nullable=False)

    # 2. Pelanggan & tujuan
    surroundings: Mapped[list[str]] = mapped_column(
        JSONB, default=list, nullable=False
    )  # dekat_kampus, perkantoran, permukiman, jalan_utama, lainnya
    surroundings_other: Mapped[str | None] = mapped_column(String(255), nullable=True)
    passersby: Mapped[list[str]] = mapped_column(
        JSONB, default=list, nullable=False
    )  # mahasiswa, pekerja_kantor, warga_sekitar, keluarga, pengendara
    business_goal: Mapped[str] = mapped_column(
        String(64), default="lebih_banyak_pembeli_baru", nullable=False
    )
    fixed_constraints: Mapped[list[str]] = mapped_column(
        JSONB, default=list, nullable=False
    )  # lokasi, fasad, menu, harga

    # 3. Menu & level harga (dihitung kode dari median harga menu)
    calculated_price_level: Mapped[str] = mapped_column(
        String(32), default="hemat", nullable=False
    )  # hemat | sedang | premium

    # 4. Jam operasional
    open_hour: Mapped[str] = mapped_column(String(8), default="08:00", nullable=False)
    close_hour: Mapped[str] = mapped_column(String(8), default="22:00", nullable=False)
    rush_hours: Mapped[list[dict[str, str]]] = mapped_column(
        JSONB, default=list, nullable=False
    )  # [{"start": "12:00", "end": "14:00"}]

    # 5. Penjualan & fasilitas (opsional)
    daily_sales_rp: Mapped[int | None] = mapped_column(Integer, nullable=True)
    daily_visitors: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parking: Mapped[list[str]] = mapped_column(
        JSONB, default=list, nullable=False
    )  # motor, mobil, tidak_ada

    # Audit fitur kategorikal & versi model persona diskret
    categorical_features: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    w_matrix_version: Mapped[str] = mapped_column(String(64), default="v1.4-handcrafted", nullable=False)
    segment_table_version: Mapped[str] = mapped_column(String(64), default="v1.4-handcrafted", nullable=False)
    segment_overrides: Mapped[dict[str, float] | None] = mapped_column(JSONB, nullable=True)

    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="context")


class MenuItem(Base, TimestampMixin):
    """Daftar menu & harga porsi per analisis (F1 Bagian 3)."""

    __tablename__ = "menu_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    analysis_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(String(32), default="manual", nullable=False)  # manual | excel | foto
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="menu_items")


class VideoAsset(Base, TimestampMixin):
    """Metadata video terburam, cek kualitas, dan stempel waktu kasir (F2, 4.3)."""

    __tablename__ = "videos"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    analysis_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("analyses.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    storage_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    duration_s: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    cashier_at_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    accepted: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    quality_checks: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    blurred_faces_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    blurred_plates_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="video")


class TranscriptSegment(Base, TimestampMixin):
    """Segmen transkrip kejadian dari VLM + status verifikasi pemilik (F3, F4)."""

    __tablename__ = "transcript_segments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    analysis_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    timestamp_start: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp_end: Mapped[float] = mapped_column(Float, nullable=False)
    frame_keys: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    vantage: Mapped[str] = mapped_column(String(32), nullable=False)  # jalan | pintu | dalam
    zone_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    narrative: Mapped[str] = mapped_column(Text, nullable=False)
    not_visible: Mapped[str] = mapped_column(Text, default="", nullable=False)
    confidence: Mapped[str] = mapped_column(String(32), default="stabil", nullable=False)  # stabil | tidak_pasti
    is_confirmed_by_owner: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    edited_by_owner: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    camera_pose: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True
    )  # {"position": [x,y,z], "look_vector": [x,y,z]}

    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="transcript_segments")


class TranscriptCheckpoint(Base, TimestampMixin):
    """Checkpoint jalur yang dipilih VLM saat transkripsi (PRD 4.3, F3)."""

    __tablename__ = "transcript_checkpoints"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    analysis_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # terlihat_dari_jalan | pintu_atau_tangga | penanda_atau_papan | menu_dan_harga | titik_pesan
    timestamp_s: Mapped[float] = mapped_column(Float, nullable=False)
    segment_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("transcript_segments.id", ondelete="SET NULL"), nullable=True
    )

    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="transcript_checkpoints")


class Persona(Base, TimestampMixin):
    """Spesifikasi persona hasil model diskret (500 per analisis, 20 untuk demo; PRD F5)."""

    __tablename__ = "personas"
    __table_args__ = (UniqueConstraint("analysis_id", "agent_id", name="uq_personas_analysis_agent"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    analysis_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    agent_id: Mapped[int] = mapped_column(Integer, nullable=False)
    persona_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    segment: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    discrete_traits: Mapped[dict[str, str]] = mapped_column(JSONB, nullable=False)
    concrete_facts: Mapped[dict[str, int]] = mapped_column(JSONB, nullable=False)
    context_around: Mapped[str] = mapped_column(Text, nullable=False)
    daily_mood: Mapped[str] = mapped_column(String(255), nullable=False)
    seed: Mapped[int] = mapped_column(Integer, nullable=False)
    table_version: Mapped[str] = mapped_column(String(64), nullable=False)

    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="personas")


class SimulationRun(Base, TimestampMixin):
    """Satu eksekusi simulasi agen (baseline atau ablasi; PRD 4.1, 4.4.3, F5)."""

    __tablename__ = "simulation_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    analysis_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    run_type: Mapped[str] = mapped_column(String(32), default="baseline", nullable=False)  # baseline | ablation
    status: Mapped[str] = mapped_column(
        String(32), default="antre", nullable=False
    )  # antre | berjalan | selesai | gagal
    n_agents: Mapped[int] = mapped_column(Integer, default=500, nullable=False)
    succeeded_agents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    seed: Mapped[int] = mapped_column(Integer, default=42, nullable=False)
    transcript_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    persona_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    catalog_version: Mapped[str] = mapped_column(String(64), default="v1.4", nullable=False)
    model_version: Mapped[str] = mapped_column(String(64), default="gpt-6-luna", nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(64), default="v1.4", nullable=False)
    cost_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    dashboard_cache: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="runs")
    decisions: Mapped[list["AgentDecisionRecord"]] = relationship(
        "AgentDecisionRecord",
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="AgentDecisionRecord.agent_id",
    )


class AgentDecisionRecord(Base, TimestampMixin):
    """Keputusan pesan 1 (monolog + tahap berhenti) dan atribusi pesan 2 (H1-H10 + kutipan) per agen per run (PRD F5)."""

    __tablename__ = "agent_decisions"
    __table_args__ = (
        UniqueConstraint("run_id", "agent_id", name="uq_agent_decisions_run_agent"),
        Index("ix_agent_decisions_analysis_filter", "analysis_id", "final_decision", "primary_hypothesis_id"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    run_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    analysis_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    agent_id: Mapped[int] = mapped_column(Integer, nullable=False)
    batch_id: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Pesan 1: Keputusan tanpa katalog
    monologue: Mapped[str] = mapped_column(Text, nullable=False)
    final_decision: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # lewat | berhenti_lalu_pergi | masuk_tanpa_memesan | memesan
    stopped_at_segment_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    deciding_factor: Mapped[str] = mapped_column(Text, nullable=False)
    factor_segment_ids: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    hesitation_score: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # 1..5

    # Pesan 2: Atribusi ke katalog hipotesis (H1..H10, H0) dengan kutipan terverifikasi
    attributions: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )  # [{"hypothesis_id": "H8", "strength": 3, "evidence": "..."}]
    primary_hypothesis_id: Mapped[str | None] = mapped_column(String(16), nullable=True)
    other_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    run: Mapped["SimulationRun"] = relationship("SimulationRun", back_populates="decisions")


class RecommendationItem(Base, TimestampMixin):
    """Rekomendasi perbaikan Pareto yang disesuaikan spesifik untuk toko (PRD F6-D)."""

    __tablename__ = "recommendations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    analysis_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    run_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("simulation_runs.id", ondelete="SET NULL"), nullable=True
    )
    hypothesis_id: Mapped[str] = mapped_column(String(16), nullable=False)  # H1..H10
    action_id: Mapped[str] = mapped_column(String(32), nullable=False)  # misal A8.1
    priority_tag: Mapped[str] = mapped_column(String(16), default="Prioritas", nullable=False)  # Prioritas | Nanti
    rank: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    impact: Mapped[str] = mapped_column(String(16), default="Tinggi", nullable=False)  # Tinggi | Sedang | Rendah
    effort: Mapped[str] = mapped_column(String(16), default="Rendah", nullable=False)  # Rendah | Sedang | Tinggi
    share: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    lift: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    estimated_lift_range: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    cost_min_rp: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost_max_rp: Mapped[int | None] = mapped_column(Integer, nullable=True)
    location_zone: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    segment_ids: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    quote_agent_ids: Mapped[list[int]] = mapped_column(JSONB, default=list, nullable=False)

    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="recommendations")


class Projection(Base, TimestampMixin):
    """Proyeksi what-if dua tingkat: perkiraan_cepat atau terverifikasi_simulasi (PRD 4.4.4)."""

    __tablename__ = "projections"
    __table_args__ = (Index("ix_projections_cache_key", "cache_key"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    analysis_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    baseline_run_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("simulation_runs.id", ondelete="SET NULL"), nullable=True
    )
    ablation_run_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("simulation_runs.id", ondelete="SET NULL"), nullable=True
    )
    label: Mapped[str] = mapped_column(
        String(32), default="perkiraan_cepat", nullable=False
    )  # perkiraan_cepat | terverifikasi_simulasi
    status: Mapped[str] = mapped_column(
        String(32), default="selesai", nullable=False
    )  # antre | berjalan | selesai | gagal
    cache_key: Mapped[str] = mapped_column(String(128), nullable=False)
    recommendation_ids: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    spec_overrides: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    spec_hash: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    transcript_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    persona_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    catalog_version: Mapped[str] = mapped_column(String(64), default="v1.4", nullable=False)
    funnel: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    effects: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    cost: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    model_conclusion: Mapped[str | None] = mapped_column(Text, nullable=True)

    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="projections")


class TwinAsset(Base, TimestampMixin):
    """Aset 3D Visual Twin: PLY, splat, jalur kamera, zona, dan metrik kualitas (PRD F7)."""

    __tablename__ = "twin_assets"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    analysis_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("analyses.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    mode: Mapped[str] = mapped_column(
        String(32), default="pointcloud", nullable=False
    )  # splat | pointcloud | path_2d | frame_strip
    ply_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    splat_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    camera_path: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    up_vector: Mapped[list[float] | None] = mapped_column(JSONB, nullable=True)
    zones: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    registered_frames: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_frames: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    quality_label: Mapped[str] = mapped_column(
        String(64), default="Kualitas baik", nullable=False
    )  # Kualitas baik | Kualitas cukup | Kualitas rendah
    points_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    path_duration_seconds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    diagnosis_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="twin_asset")


class MeasurementPlanRecord(Base, TimestampMixin):
    """Rencana pengukuran lapangan / lembar tally manual (PRD F6-G)."""

    __tablename__ = "measurement_plans"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    analysis_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("analyses.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    observation_title: Mapped[str] = mapped_column(String(255), nullable=False)
    observation_spot: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_times: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    suggested_duration_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    metrics: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    practical_tips: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    stand_here_image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="measurement_plan")


class JobRecord(Base, TimestampMixin):
    """Orkestrasi job asinkron (transkrip, twin, run, proyeksi) dengan Idempotency-Key (PRD 4.2)."""

    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    analysis_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # transcript | twin | simulation | projection
    status: Mapped[str] = mapped_column(
        String(32), default="antre", nullable=False
    )  # antre | berjalan | selesai | gagal
    stage: Mapped[str | None] = mapped_column(String(128), nullable=True)
    progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True, index=True)
    result_ref_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="jobs")


class AuditLog(Base):
    """Jejak audit perubahan pemilik (konteks, segmen transkrip) dan panggilan model LLM/VLM (PRD 4.1, 7)."""

    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    analysis_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=True, index=True
    )
    actor: Mapped[str] = mapped_column(String(64), nullable=False)  # owner | system | vlm | llm
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    before_state: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    after_state: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
