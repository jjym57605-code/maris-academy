
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

// ══════════════════════════════════════════════════════
// Supabase Client — MARIS ACADEMY
// Client واحد في المتصفح + حفظ Session تلقائيًا
// ══════════════════════════════════════════════════════

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes(
        "YOUR-PROJECT-REF"
      )
  );
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "maris-academy-auth",
        },
      }
    );
  }

  return client;
}

