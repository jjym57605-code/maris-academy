import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ══════════════════════════════════════════════════════
// عميل Supabase — يُنشأ مرة واحدة في المتصفح.
// يعيد null إذا لم تُضبط متغيرات البيئة بعد،
// لتعرض الواجهة رسالة إعداد واضحة بدل الانهيار.
// ══════════════════════════════════════════════════════

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("YOUR-PROJECT-REF")
  );
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
