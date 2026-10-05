import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateStreak } from "@/lib/level";
import type { XPTransaction } from "@/types/database";

// ══════════════════════════════════════════════════════
// خدمة الإحصائيات — بيانات حقيقية من Supabase فقط
// ══════════════════════════════════════════════════════

/** مجموع نقاط الخبرة الحقيقي من سجل المعاملات */
export async function getTotalXP(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("xp_transactions")
    .select("amount")
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []).reduce((sum, t) => sum + (t.amount ?? 0), 0);
}

/** سجل معاملات نقاط الخبرة (الأحدث أولاً) */
export async function getXPTransactions(
  supabase: SupabaseClient,
  userId: string,
  limit = 20
): Promise<XPTransaction[]> {
  const { data, error } = await supabase
    .from("xp_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as XPTransaction[];
}

export interface StudentStats {
  totalXP: number;
  streak: number;
  completedLessons: number;
  totalLessons: number;
  /** نسبة التقدم الكلية (0–100)، أو null إذا لا توجد دروس أصلاً */
  progressPercent: number | null;
}

/** إحصائيات لوحة الطالب — كلها من جداول حقيقية */
export async function getStudentStats(
  supabase: SupabaseClient,
  userId: string
): Promise<StudentStats> {
  const [xp, progressRes, lessonsRes, attemptsRes] = await Promise.all([
    getTotalXP(supabase, userId),
    supabase
      .from("lesson_progress")
      .select("lesson_id, completed_at")
      .eq("user_id", userId),
    supabase.from("lessons").select("id", { count: "exact", head: true }),
    supabase
      .from("quiz_attempts")
      .select("completed_at")
      .eq("user_id", userId)
      .not("completed_at", "is", null),
  ]);

  if (progressRes.error) throw progressRes.error;
  if (lessonsRes.error) throw lessonsRes.error;
  if (attemptsRes.error) throw attemptsRes.error;

  const completedLessons = progressRes.data?.length ?? 0;
  const totalLessons = lessonsRes.count ?? 0;

  const activityDates = [
    ...(progressRes.data ?? []).map((p) => p.completed_at),
    ...(attemptsRes.data ?? []).map((a) => a.completed_at as string),
  ].filter(Boolean);

  return {
    totalXP: xp,
    streak: calculateStreak(activityDates),
    completedLessons,
    totalLessons,
    progressPercent:
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : null,
  };
}
