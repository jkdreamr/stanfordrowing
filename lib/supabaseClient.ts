import { createClient } from '@supabase/supabase-js';

// Read env (set these in Vercel / .env.local once Supabase is connected).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Flag for the app to know whether a real backend is configured.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  // Don't crash the build/app when Supabase isn't wired up yet — data calls
  // will simply fail and the UI falls back to its signed-out / empty states.
  console.warn(
    'Supabase env vars are not set. Running without a backend — set ' +
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable data.'
  );
}

// Use harmless placeholders when unset so createClient() doesn't throw at import.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      // Implicit flow (token returned in the URL) instead of PKCE: PKCE stores a
      // code_verifier in localStorage that an installed/standalone PWA loses when
      // iOS opens the Google redirect in a separate Safari context, so sign-in
      // silently failed on the home-screen app. Implicit needs no verifier and
      // detectSessionInUrl auto-applies the session from the redirect URL.
      flowType: 'implicit',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
