"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { listQuizzes, type QuizWithMeta } from "@/services/quizzes";
import {
  EmptyState,
  ErrorState,
  GlassCard,
  PageHeader,
  Spinner,
} from "@/components/ui";

// ══════════════════════════════════════════════════════
// الاختبارات — من Supabase مباشرة
// ══════════════════════════════════════════════════════

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizWithMeta[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setError(false);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setQuizzes(await listQuizzes(supabase, user.id));
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState onRetry={load} />;
  if (!quizzes) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="الاختبارات"
        subtitle="اختبر فهمك واكسب نقاط خبرة مع كل اختبار تكمله"
      />

      {quizzes.length === 0 ? (
        <EmptyState
          icon="📝"
          title="لا توجد اختبارات متاحة حالياً."
          description="ستظهر الاختبارات هنا فور إضافتها من إدارة المنصة."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {quizzes.map((quiz) => (
            <GlassCard key={quiz.id} className="flex flex-col gap-4 p-6" hover>
              <div className="flex items-start justify-between gap-3">
                <h2 className="break-words text-lg font-extrabold text-white">
                  {quiz.title}
                </h2>
                <span className="badge shrink-0">
                  {quiz.questionsCount}{" "}
                  {quiz.questionsCount === 1
                    ? "سؤال"
                    : quiz.questionsCount === 2
                      ? "سؤالان"
                      : "أسئلة"}
                </span>
              </div>

              {quiz.description && (
                <p className="line-clamp-2 text-sm leading-relaxed text-foam/60">
                  {quiz.description}
                </p>
              )}

              <div className="flex items-center justify-between gap-3 text-sm">
                {quiz.bestScore !== null ? (
                  <p className="text-foam/60">
                    أفضل نتيجة:{" "}
                    <span className="font-extrabold text-cyan-300">
                      {quiz.bestScore}%
                    </span>{" "}
                    · {quiz.attemptsCount}{" "}
                    {quiz.attemptsCount === 1 ? "محاولة" : "محاولات"}
                  </p>
                ) : (
                  <p className="text-foam/40">لم تجرِ هذا الاختبار بعد</p>
                )}
              </div>

              <Link
                href={`/quizzes/${quiz.id}`}
                className="btn-primary mt-auto w-full"
              >
                {quiz.attemptsCount > 0 ? "إعادة الاختبار" : "ابدأ الاختبار"}
              </Link>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
