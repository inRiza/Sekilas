import { createBrowserClient } from '@supabase/ssr';

const DEFAULT_URL = 'https://qqfyitqxrcufjskwaldp.supabase.co';
const DEFAULT_KEY = 'sb_publishable_lcbTN_odHD3JCdPqbUFfLw_vkeTdfWq';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_KEY,
  );
}
