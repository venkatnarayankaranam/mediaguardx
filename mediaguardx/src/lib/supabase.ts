import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Demo mode when Supabase is not configured
export const isDemoMode =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('your-project') ||
  supabaseAnonKey === 'your-anon-key-here';

if (isDemoMode) {
  console.info(
    '%c[MediaGuardX] Running in DEMO mode — Supabase not configured. Auth uses local storage.',
    'color: #6366f1; font-weight: bold',
  );
}

export const supabase = isDemoMode
  ? (null as unknown as ReturnType<typeof createClient>)
  : createClient(supabaseUrl, supabaseAnonKey);
