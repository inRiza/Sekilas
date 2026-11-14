import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const DEFAULT_URL = 'https://qqfyitqxrcufjskwaldp.supabase.co';
const DEFAULT_KEY = 'sb_publishable_lcbTN_odHD3JCdPqbUFfLw_vkeTdfWq';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Dipanggil dari Server Component; dapat diabaikan jika sesi disegarkan di route handler.
          }
        },
      },
    },
  );
}
