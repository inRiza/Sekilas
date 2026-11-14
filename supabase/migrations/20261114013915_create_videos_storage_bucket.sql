-- Migration: create_videos_storage_bucket
-- Buat bucket Supabase Storage `videos` untuk menyimpan video terburam (MP4/WebM) dan frame bukti (F2, F3)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'videos',
    'videos',
    true,
    104857600,
    ARRAY[
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-m4v',
        'application/octet-stream',
        'image/jpeg',
        'image/png'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Authenticated and anon users can read videos bucket"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'videos');

CREATE POLICY "Authenticated and anon users can upload to videos bucket"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Authenticated and anon users can update videos bucket"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'videos');
