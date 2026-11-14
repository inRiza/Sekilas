-- ============================================================================
-- Supabase Auth <-> public.users & public.businesses synchronization trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_name TEXT;
    v_business_name TEXT;
    v_biz_id VARCHAR(64);
BEGIN
    v_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        SPLIT_PART(COALESCE(NEW.email, 'Pengguna Sekilas'), '@', 1)
    );

    INSERT INTO public.users (id, name, email, avatar_url)
    VALUES (
        NEW.id::text,
        v_name,
        COALESCE(NEW.email, NEW.id::text || '@sekilas.id'),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        updated_at = now();

    v_business_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'business_name'), '');
    IF v_business_name IS NOT NULL THEN
        v_biz_id := 'biz_' || SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 12);
        INSERT INTO public.businesses (
            id,
            user_id,
            name,
            branch_name,
            category,
            address,
            default_context
        )
        VALUES (
            v_biz_id,
            NEW.id::text,
            v_business_name,
            'Pusat',
            'kedai',
            'Alamat tempat usaha',
            jsonb_build_object(
                'business_type', 'kedai',
                'business_name', v_business_name,
                'location_name', 'Alamat tempat usaha',
                'location_description', 'Akses masuk dari jalan raya',
                'surroundings_type', 'jalan_utama',
                'surroundings', jsonb_build_array('jalan_utama'),
                'passersby', jsonb_build_array('mahasiswa', 'pekerja_kantor'),
                'business_goal', 'lebih_banyak_pembeli_baru',
                'fixed_constraints', jsonb_build_array(),
                'menu_items', jsonb_build_array(),
                'calculated_price_level', 'hemat',
                'opening_hours', jsonb_build_object('open', '08:00', 'close', '22:00'),
                'rush_hours', jsonb_build_array(jsonb_build_object('start', '12:00', 'end', '14:00'))
            )
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- Prevent PostgREST RPC exposure of SECURITY DEFINER trigger functions
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Ensure authenticated role has table-level privileges (row access is enforced by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
