
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Quiz,
  QuizAttempt,
  QuizQuestion,
  SubmitQuizResult,
} from "@/types/database";

// ══════════════════════════════════════════════════════
// خدمة الاختبارات
// الأسئلة تُقرأ من العرض questions_public (بدون الإجابات
// الصحيحة)، والتصحيح يتم داخل قاعدة البيانات عبر
// الدالة submit_quiz — لا تصحيح في الواجهة.
// ══════════════════════════════════════════════════════

export interface QuizWithMeta extends Quiz {
  questionsCount: number;
  bestScore: number | null;
  attemptsCount: number;
}

export async function listQuizzes(
  supabase: SupabaseClient,
  userId: string
): Promise<QuizWithMeta[]> {
  const [quizzesRes, questionsRes, attemptsRes] = await Promise.all([
    supabase.from("quizzes").select("*").order("created_at"),
    supabase.from("questions_public").select("quiz_id"),
    supabase
      .from("quiz_attempts")
      .select("quiz_id, score")
      .eq("user_id", userId)
      .not("completed_at", "is", null),
  ]);

  if (quizzesRes.error) throw quizzesRes.error;
  if (questionsRes.error) throw questionsRes.error;
  if (attemptsRes.error) throw attemptsRes.error;

  return (quizzesRes.data ?? []).map((quiz) => {
    const attempts = (attemptsRes.data ?? []).filter(
      (a) => a.quiz_id === quiz.id
    );

    return {
      ...(quiz as Quiz),

      questionsCount: (questionsRes.data ?? []).filter(
        (q) => q.quiz_id === quiz.id
      ).length,

      bestScore:
        attempts.length > 0
          ? Math.max(...attempts.map((a) => a.score ?? 0))
          : null,

      attemptsCount: attempts.length,
    };
  });
}

export async function getQuiz(
  supabase: SupabaseClient,
  quizId: string
): Promise<Quiz | null> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .maybeSingle();

  if (error) throw error;

  return data as Quiz | null;
}

/** أسئلة الاختبار بدون الإجابات الصحيحة */
export async function getQuizQuestions(
  supabase: SupabaseClient,
  quizId: string
): Promise<QuizQuestion[]> {
  const { data, error } = await supabase
    .from("questions_public")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order_index");

  if (error) throw error;

  return (data ?? []) as QuizQuestion[];
}

/**
 * إرسال إجابات الاختبار للتصحيح في قاعدة البيانات.
 *
 * التصحيح يتم بالكامل داخل Supabase عبر submit_quiz.
 *
 * النتيجة تتضمن:
 * - نتيجة الاختبار
 * - XP المكتسب
 * - هل تم فتح Achievement جديد
 * - بيانات الـAchievement الجديد إن وُجد
 */
export async function submitQuiz(
  supabase: SupabaseClient,
  quizId: string,
  answers: {
    question_id: string;
    selected_option: string;
  }[]
): Promise<SubmitQuizResult> {
  const { data, error } = await supabase.rpc("submit_quiz", {
    p_quiz_id: quizId,
    p_answers: answers,
  });

  if (error) {
    console.error("SUBMIT QUIZ ERROR:", error);
    throw error;
  }

  return data as SubmitQuizResult;
}

export interface AttemptWithQuiz extends QuizAttempt {
  quiz: Quiz | null;
}

/** آخر محاولات الطالب مع عناوين الاختبارات */
export async function getRecentAttempts(
  supabase: SupabaseClient,
  userId: string,
  limit = 5
): Promise<AttemptWithQuiz[]> {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*, quiz:quizzes(*)")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []) as AttemptWithQuiz[];
}


