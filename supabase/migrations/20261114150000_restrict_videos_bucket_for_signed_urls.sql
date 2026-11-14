-- Migration: restrict_videos_bucket_for_signed_urls
-- Aktifkan akses privat + Signed URL pada bucket `videos` agar rekaman terburam dan frame
-- bukti tidak lagi terbuka publik lewat `/storage/v1/object/public/videos/...`.
-- Pisahkan aset Visual Twin 3D ke bucket `twins` (atau unggahan folder `twins/`) bila perlu
-- diakses langsung tanpa Signed URL per berkas pendamping (.json / .path.json).
-- Catatan rollout: terapkan migrasi ini bersama setelan `SUPABASE_SECRET_KEY` pada backend.

-- 1. Kunci bucket `videos` menjadi privat
UPDATE storage.buckets
SET public = false
WHERE id = 'videos';

-- 2. Bucket khusus aset 3D Visual Twin (opsional, untuk berkas non-PII .splat/.ply/.json)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'twins',
    'twins',
    true,
    104857600,
    ARRAY[
        'application/octet-stream',
        'application/json'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Hapus kebijakan publik/anonim lama pada bucket `videos`
DROP POLICY IF EXISTS "Authenticated and anon users can read videos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated and anon users can upload to videos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated and anon users can update videos bucket" ON storage.objects;

-- 4. Kebijakan RLS berbasis kepemilikan analisis untuk pengguna `authenticated`
-- Format object key: `<analysis_id>/<filename>` atau `<analysis_id>/frames/<filename>`
CREATE POLICY "Analysis owners can read own private videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'videos'
    AND EXISTS (
        SELECT 1
        FROM public.analyses a
        JOIN public.businesses b ON b.id = a.business_id
        WHERE a.id = (storage.foldername(name))[1]
          AND b.user_id = (select auth.uid())::text
    )
);

CREATE POLICY "Analysis owners can upload own private videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'videos'
    AND EXISTS (
        SELECT 1
        FROM public.analyses a
        JOIN public.businesses b ON b.id = a.business_id
        WHERE a.id = (storage.foldername(name))[1]
          AND b.user_id = (select auth.uid())::text
    )
);

CREATE POLICY "Analysis owners can update own private videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'videos'
    AND EXISTS (
        SELECT 1
        FROM public.analyses a
        JOIN public.businesses b ON b.id = a.business_id
        WHERE a.id = (storage.foldername(name))[1]
          AND b.user_id = (select auth.uid())::text
    )
)
WITH CHECK (
    bucket_id = 'videos'
    AND EXISTS (
        SELECT 1
        FROM public.analyses a
        JOIN public.businesses b ON b.id = a.business_id
        WHERE a.id = (storage.foldername(name))[1]
          AND b.user_id = (select auth.uid())::text
    )
);

CREATE POLICY "Analysis owners can delete own private videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'videos'
    AND EXISTS (
        SELECT 1
        FROM public.analyses a
        JOIN public.businesses b ON b.id = a.business_id
        WHERE a.id = (storage.foldername(name))[1]
          AND b.user_id = (select auth.uid())::text
    )
);
