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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    url &&
      anonKey &&
      !url.includes("YOUR-PROJECT-REF")
  );
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return null;
    }

    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "maris-academy-auth",
      },
    });
  }

  return client;
}
