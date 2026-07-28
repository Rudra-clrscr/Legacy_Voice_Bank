import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Living Legacy] Missing Supabase environment variables.\n' +
    'Create a .env.local file in the frontend/ directory with:\n' +
    '  VITE_SUPABASE_URL=https://<your-project>.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=<your-anon-key>'
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key',
  {
    auth: {
      // Persist session in localStorage so it survives page refreshes
      persistSession: true,
      // Auto-refresh the JWT before it expires
      autoRefreshToken: true,
      // Detect auth callbacks from OAuth/email links
      detectSessionInUrl: true,
    },
  }
);
