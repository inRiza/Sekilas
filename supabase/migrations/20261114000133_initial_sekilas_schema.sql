-- ============================================================================
-- Sekilas Initial Database Schema (PRD v1.4)
-- Hierarchy: UserAccount -> Business -> Analysis -> (Context, Menu, Video,
--            Transcript, Personas, SimulationRuns, Decisions, Recommendations,
--            Projections, TwinAssets, MeasurementPlans, Jobs, AuditLogs)
-- ============================================================================

-- 1. Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 2. Core tables
CREATE TABLE public.users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    avatar_url VARCHAR(512),
    daily_run_quota INTEGER NOT NULL DEFAULT 10,
    daily_projection_quota INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_users_email ON public.users (email);

CREATE TABLE public.businesses (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    branch_name VARCHAR(255) NOT NULL DEFAULT 'Pusat',
    category VARCHAR(64) NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    primary_analysis_id VARCHAR(64),
    default_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_businesses_user_id ON public.businesses (user_id);
CREATE INDEX ix_businesses_primary_analysis_id ON public.businesses (primary_analysis_id);

CREATE TABLE public.analyses (
    id VARCHAR(64) PRIMARY KEY,
    business_id VARCHAR(64) NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    stale BOOLEAN NOT NULL DEFAULT false,
    stale_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    total_agents INTEGER NOT NULL DEFAULT 500,
    seed INTEGER NOT NULL DEFAULT 42,
    transcript_version INTEGER NOT NULL DEFAULT 1,
    persona_version INTEGER NOT NULL DEFAULT 1,
    transcript_confirmed BOOLEAN NOT NULL DEFAULT false,
    quality_label VARCHAR(64),
    thumbnail_url VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_analyses_business_id ON public.analyses (business_id);
CREATE INDEX ix_analyses_status ON public.analyses (status);

ALTER TABLE public.businesses
    ADD CONSTRAINT fk_businesses_primary_analysis_id
    FOREIGN KEY (primary_analysis_id)
    REFERENCES public.analyses(id)
    ON DELETE SET NULL;

-- 3. F1 — Konteks Usaha & Menu
CREATE TABLE public.analysis_contexts (
    id VARCHAR(64) PRIMARY KEY,
    analysis_id VARCHAR(64) NOT NULL UNIQUE REFERENCES public.analyses(id) ON DELETE CASCADE,
    business_type VARCHAR(64) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    location_name TEXT NOT NULL,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    location_description TEXT NOT NULL,
    surroundings JSONB NOT NULL DEFAULT '[]'::jsonb,
    surroundings_other VARCHAR(255),
    passersby JSONB NOT NULL DEFAULT '[]'::jsonb,
    business_goal VARCHAR(64) NOT NULL DEFAULT 'lebih_banyak_pembeli_baru',
    fixed_constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
    calculated_price_level VARCHAR(32) NOT NULL DEFAULT 'hemat',
    open_hour VARCHAR(8) NOT NULL DEFAULT '08:00',
    close_hour VARCHAR(8) NOT NULL DEFAULT '22:00',
    rush_hours JSONB NOT NULL DEFAULT '[]'::jsonb,
    daily_sales_rp INTEGER,
    daily_visitors INTEGER,
    parking JSONB NOT NULL DEFAULT '[]'::jsonb,
    categorical_features JSONB NOT NULL DEFAULT '{}'::jsonb,
    w_matrix_version VARCHAR(64) NOT NULL DEFAULT 'v1.4-handcrafted',
    segment_table_version VARCHAR(64) NOT NULL DEFAULT 'v1.4-handcrafted',
    segment_overrides JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.menu_items (
    id VARCHAR(64) PRIMARY KEY,
    analysis_id VARCHAR(64) NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL,
    source VARCHAR(32) NOT NULL DEFAULT 'manual',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_menu_items_analysis_id ON public.menu_items (analysis_id);

-- 4. F2, F3, F4 — Video & Transkrip Kejadian
CREATE TABLE public.videos (
    id VARCHAR(64) PRIMARY KEY,
    analysis_id VARCHAR(64) NOT NULL UNIQUE REFERENCES public.analyses(id) ON DELETE CASCADE,
    storage_key VARCHAR(512),
    original_filename VARCHAR(255),
    duration_s DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    cashier_at_s DOUBLE PRECISION,
    width INTEGER,
    height INTEGER,
    accepted BOOLEAN NOT NULL DEFAULT true,
    quality_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
    blurred_faces_count INTEGER NOT NULL DEFAULT 0,
    blurred_plates_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.transcript_segments (
    id VARCHAR(64) PRIMARY KEY,
    analysis_id VARCHAR(64) NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
    timestamp_start DOUBLE PRECISION NOT NULL,
    timestamp_end DOUBLE PRECISION NOT NULL,
    frame_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
    vantage VARCHAR(32) NOT NULL,
    zone_id VARCHAR(64),
    narrative TEXT NOT NULL,
    not_visible TEXT NOT NULL DEFAULT '',
    confidence VARCHAR(32) NOT NULL DEFAULT 'stabil',
    is_confirmed_by_owner BOOLEAN NOT NULL DEFAULT false,
    edited_by_owner BOOLEAN NOT NULL DEFAULT false,
    camera_pose JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_transcript_segments_analysis_id ON public.transcript_segments (analysis_id);

CREATE TABLE public.transcript_checkpoints (
    id VARCHAR(64) PRIMARY KEY,
    analysis_id VARCHAR(64) NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
    kind VARCHAR(64) NOT NULL,
    timestamp_s DOUBLE PRECISION NOT NULL,
    segment_id VARCHAR(64) REFERENCES public.transcript_segments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_transcript_checkpoints_analysis_id ON public.transcript_checkpoints (analysis_id);
CREATE INDEX ix_transcript_checkpoints_segment_id ON public.transcript_checkpoints (segment_id);

-- 5. F5 — Persona & Simulasi Agen
CREATE TABLE public.personas (
    id VARCHAR(64) PRIMARY KEY,
    analysis_id VARCHAR(64) NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
    agent_id INTEGER NOT NULL,
    persona_version INTEGER NOT NULL DEFAULT 1,
    segment VARCHAR(64) NOT NULL,
    discrete_traits JSONB NOT NULL,
    concrete_facts JSONB NOT NULL,
    context_around TEXT NOT NULL,
    daily_mood VARCHAR(255) NOT NULL,
    seed INTEGER NOT NULL,
    table_version VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_personas_analysis_agent UNIQUE (analysis_id, agent_id)
);

CREATE INDEX ix_personas_analysis_id ON public.personas (analysis_id);
CREATE INDEX ix_personas_segment ON public.personas (segment);

CREATE TABLE public.simulation_runs (
    id VARCHAR(64) PRIMARY KEY,
    analysis_id VARCHAR(64) NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
    run_type VARCHAR(32) NOT NULL DEFAULT 'baseline',
    status VARCHAR(32) NOT NULL DEFAULT 'antre',
    n_agents INTEGER NOT NULL DEFAULT 500,
    succeeded_agents INTEGER NOT NULL DEFAULT 0,
    seed INTEGER NOT NULL DEFAULT 42,
    transcript_version INTEGER NOT NULL DEFAULT 1,
    persona_version INTEGER NOT NULL DEFAULT 1,
    catalog_version VARCHAR(64) NOT NULL DEFAULT 'v1.4',
    model_version VARCHAR(64) NOT NULL DEFAULT 'gpt-6-luna',
    prompt_version VARCHAR(64) NOT NULL DEFAULT 'v1.4',
    cost_usd DOUBLE PRECISION,
    dashboard_cache JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_simulation_runs_analysis_id ON public.simulation_runs (analysis_id);

CREATE TABLE public.agent_decisions (
    id VARCHAR(64) PRIMARY KEY,
    run_id VARCHAR(64) NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
    analysis_id VARCHAR(64) NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
    agent_id INTEGER NOT NULL,
    batch_id INTEGER NOT NULL DEFAULT 0,
    monologue TEXT NOT NULL,
    final_decision VARCHAR(32) NOT NULL,
    stopped_at_segment_id VARCHAR(64),
    deciding_factor TEXT NOT NULL,
    factor_segment_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    hesitation_score INTEGER NOT NULL DEFAULT 1,
    attributions JSONB NOT NULL DEFAULT '[]'::jsonb,
    primary_hypothesis_id VARCHAR(16),
    other_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_agent_decisions_run_agent UNIQUE (run_id, agent_id)
);

CREATE INDEX ix_agent_decisions_run_id ON public.agent_decisions (run_id);
CREATE INDEX ix_agent_decisions_analysis_id ON public.agent_decisions (analysis_id);
CREATE INDEX ix_agent_decisions_analysis_filter ON public.agent_decisions (analysis_id, final_decision, primary_hypothesis_id);

-- 6. F6 & F7 — Rekomendasi, Proyeksi, Visual Twin 3D, Rencana Pengukuran
CREATE TABLE public.recommendations (
    id VARCHAR(64) PRIMARY KEY,
    analysis_id VARCHAR(64) NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
    run_id VARCHAR(64) REFERENCES public.simulation_runs(id) ON DELETE SET NULL,
    hypothesis_id VARCHAR(16) NOT NULL,
    action_id VARCHAR(32) NOT NULL,
    priority_tag VARCHAR(16) NOT NULL DEFAULT 'Prioritas',
    rank INTEGER NOT NULL DEFAULT 1,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    impact VARCHAR(16) NOT NULL DEFAULT 'Tinggi',
    effort VARCHAR(16) NOT NULL DEFAULT 'Rendah',
    share DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    lift DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    estimated_lift_range VARCHAR(64) NOT NULL DEFAULT '',
    cost_min_rp INTEGER,
    cost_max_rp INTEGER,
    location_zone VARCHAR(255) NOT NULL DEFAULT '',
    segment_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    quote_agent_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_recommendations_analysis_id ON public.recommendations (analysis_id);
CREATE INDEX ix_recommendations_run_id ON public.recommendations (run_id);

CREATE TABLE public.projections (
    id VARCHAR(64) PRIMARY KEY,
    analysis_id VARCHAR(64) NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
    baseline_run_id VARCHAR(64) REFERENCES public.simulation_runs(id) ON DELETE SET NULL,
    ablation_run_id VARCHAR(64) REFERENCES public.simulation_runs(id) ON DELETE SET NULL,
    label VARCHAR(32) NOT NULL DEFAULT 'perkiraan_cepat',
    status VARCHAR(32) NOT NULL DEFAULT 'selesai',
    cache_key VARCHAR(128) NOT NULL,
    recommendation_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    spec_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
    spec_hash VARCHAR(64) NOT NULL DEFAULT '',
    transcript_version INTEGER NOT NULL DEFAULT 1,
    persona_version INTEGER NOT NULL DEFAULT 1,
    catalog_version VARCHAR(64) NOT NULL DEFAULT 'v1.4',
    funnel JSONB NOT NULL DEFAULT '{}'::jsonb,
    effects JSONB NOT NULL DEFAULT '{}'::jsonb,
    cost JSONB NOT NULL DEFAULT '{}'::jsonb,
    model_conclusion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_projections_analysis_id ON public.projections (analysis_id);
CREATE INDEX ix_projections_baseline_run_id ON public.projections (baseline_run_id);
CREATE INDEX ix_projections_ablation_run_id ON public.projections (ablation_run_id);
CREATE INDEX ix_projections_cache_key ON public.projections (cache_key);

CREATE TABLE public.twin_assets (
    id VARCHAR(64) PRIMARY KEY,
    analysis_id VARCHAR(64) NOT NULL UNIQUE REFERENCES public.analyses(id) ON DELETE CASCADE,
    mode VARCHAR(32) NOT NULL DEFAULT 'pointcloud',
    ply_url VARCHAR(512),
    splat_url VARCHAR(512),
    camera_path JSONB NOT NULL DEFAULT '[]'::jsonb,
    up_vector JSONB,
    zones JSONB NOT NULL DEFAULT '[]'::jsonb,
    registered_frames INTEGER NOT NULL DEFAULT 0,
    total_frames INTEGER NOT NULL DEFAULT 0,
    quality_label VARCHAR(64) NOT NULL DEFAULT 'Kualitas baik',
    points_count INTEGER NOT NULL DEFAULT 0,
    path_duration_seconds DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    diagnosis_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.measurement_plans (
    id VARCHAR(64) PRIMARY KEY,
    analysis_id VARCHAR(64) NOT NULL UNIQUE REFERENCES public.analyses(id) ON DELETE CASCADE,
    observation_title VARCHAR(255) NOT NULL,
    observation_spot TEXT NOT NULL,
    recommended_times JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_duration_minutes INTEGER NOT NULL DEFAULT 30,
    metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
    practical_tips JSONB NOT NULL DEFAULT '[]'::jsonb,
    stand_here_image_url VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Infrastruktur: Job & Audit Log
CREATE TABLE public.jobs (
    id VARCHAR(64) PRIMARY KEY,
    analysis_id VARCHAR(64) NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
    kind VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'antre',
    stage VARCHAR(128),
    progress DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    message TEXT,
    idempotency_key VARCHAR(128) UNIQUE,
    result_ref_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_jobs_analysis_id ON public.jobs (analysis_id);
CREATE INDEX ix_jobs_idempotency_key ON public.jobs (idempotency_key);

CREATE TABLE public.audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    analysis_id VARCHAR(64) REFERENCES public.analyses(id) ON DELETE CASCADE,
    actor VARCHAR(64) NOT NULL,
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64),
    before_state JSONB,
    after_state JSONB,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_audit_logs_analysis_id ON public.audit_logs (analysis_id);

-- 8. Attach updated_at triggers
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_analyses_updated_at BEFORE UPDATE ON public.analyses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_analysis_contexts_updated_at BEFORE UPDATE ON public.analysis_contexts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_transcript_segments_updated_at BEFORE UPDATE ON public.transcript_segments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_transcript_checkpoints_updated_at BEFORE UPDATE ON public.transcript_checkpoints FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_personas_updated_at BEFORE UPDATE ON public.personas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_simulation_runs_updated_at BEFORE UPDATE ON public.simulation_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_agent_decisions_updated_at BEFORE UPDATE ON public.agent_decisions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_recommendations_updated_at BEFORE UPDATE ON public.recommendations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_projections_updated_at BEFORE UPDATE ON public.projections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_twin_assets_updated_at BEFORE UPDATE ON public.twin_assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_measurement_plans_updated_at BEFORE UPDATE ON public.measurement_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. Enable Row Level Security (RLS) on all public tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twin_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies (for authenticated users via Data API; backend service/postgres role bypasses RLS)
CREATE POLICY users_self_policy ON public.users
    FOR ALL TO authenticated
    USING (id = (select auth.uid())::text)
    WITH CHECK (id = (select auth.uid())::text);

CREATE POLICY businesses_owner_policy ON public.businesses
    FOR ALL TO authenticated
    USING (user_id = (select auth.uid())::text)
    WITH CHECK (user_id = (select auth.uid())::text);

CREATE POLICY analyses_owner_policy ON public.analyses
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = analyses.business_id
              AND b.user_id = (select auth.uid())::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = analyses.business_id
              AND b.user_id = (select auth.uid())::text
        )
    );

CREATE POLICY analysis_contexts_owner_policy ON public.analysis_contexts
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = analysis_contexts.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = analysis_contexts.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    );

CREATE POLICY menu_items_owner_policy ON public.menu_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = menu_items.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = menu_items.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    );

CREATE POLICY videos_owner_policy ON public.videos
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = videos.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = videos.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    );

CREATE POLICY transcript_segments_owner_policy ON public.transcript_segments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = transcript_segments.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = transcript_segments.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    );

CREATE POLICY transcript_checkpoints_owner_policy ON public.transcript_checkpoints
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = transcript_checkpoints.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = transcript_checkpoints.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    );

CREATE POLICY personas_owner_policy ON public.personas
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = personas.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = personas.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    );

CREATE POLICY simulation_runs_owner_policy ON public.simulation_runs
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = simulation_runs.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = simulation_runs.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    );

CREATE POLICY agent_decisions_owner_policy ON public.agent_decisions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = agent_decisions.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = agent_decisions.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    );

CREATE POLICY recommendations_owner_policy ON public.recommendations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = recommendations.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = recommendations.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    );

CREATE POLICY projections_owner_policy ON public.projections
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = projections.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = projections.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    );

CREATE POLICY twin_assets_owner_policy ON public.twin_assets
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = twin_assets.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = twin_assets.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    );

CREATE POLICY measurement_plans_owner_policy ON public.measurement_plans
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = measurement_plans.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = measurement_plans.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    );

CREATE POLICY jobs_owner_policy ON public.jobs
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = jobs.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = jobs.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    );

CREATE POLICY audit_logs_owner_policy ON public.audit_logs
    FOR ALL TO authenticated
    USING (
        analysis_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = audit_logs.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    )
    WITH CHECK (
        analysis_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.analyses a
            JOIN public.businesses b ON b.id = a.business_id
            WHERE a.id = audit_logs.analysis_id
              AND b.user_id = (select auth.uid())::text
        )
    );
