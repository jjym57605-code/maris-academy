import type { SupabaseClient } from "@supabase/supabase-js";

// ══════════════════════════════════════════════════════
// خدمة تقدم الدروس — Supabase هو مصدر الحقيقة
// نقاط الخبرة تُضاف تلقائياً عبر مُحفّز قاعدة البيانات
// (الواجهة لا تعدّل نقاط الخبرة مباشرة أبداً)
// ══════════════════════════════════════════════════════

export interface CompleteLessonResult {
  alreadyCompleted: boolean;
}

/** تسجيل إتمام درس بمعرّف الطالب الموثّق */
export async function completeLesson(
  supabase: SupabaseClient,
  userId: string,
  lessonId: string
): Promise<CompleteLessonResult> {
  const { error } = await supabase
    .from("lesson_progress")
    .insert({ user_id: userId, lesson_id: lessonId });

  if (error) {
    // 23505 = الدرس مكتمل مسبقاً — ليس خطأً
    if (error.code === "23505") return { alreadyCompleted: true };
    throw error;
  }
  return { alreadyCompleted: false };
}

export async function isLessonCompleted(
  supabase: SupabaseClient,
  userId: string,
  lessonId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}
