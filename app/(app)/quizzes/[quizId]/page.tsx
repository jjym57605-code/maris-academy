"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import {
  getQuiz,
  getQuizQuestions,
  submitQuiz,
} from "@/services/quizzes";
import type {
  Quiz,
  QuizQuestion,
  SubmitQuizResult,
} from "@/types/database";
import {
  EmptyState,
  ErrorState,
  GlassCard,
  ProgressBar,
  Spinner,
} from "@/components/ui";
import { cn } from "@/lib/utils";

// ══════════════════════════════════════════════════════
// صفحة الاختبار
// التصحيح يتم بالكامل في قاعدة البيانات.
// عند فتح Achievement جديد تظهر نافذة تهنئة.
// ══════════════════════════════════════════════════════

type Phase =
  | "loading"
  | "ready"
  | "taking"
  | "submitting"
  | "result"
  | "error";

export default function QuizPage() {
  const params = useParams<{ quizId: string }>();
  const quizId = params.quizId;

  const [phase, setPhase] = useState<Phase>("loading");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitQuizResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Popup الإنجاز
  const [showAchievementPopup, setShowAchievementPopup] =
    useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabase();

    if (!supabase) return;

    setPhase("loading");

    try {
      const [quizData, questionsData] = await Promise.all([
        getQuiz(supabase, quizId),
        getQuizQuestions(supabase, quizId),
      ]);

      setQuiz(quizData);
      setQuestions(questionsData);
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, [quizId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit() {
    const supabase = getSupabase();

    if (!supabase) return;

    setPhase("submitting");
    setSubmitError(null);

    try {
      const payload = questions
        .filter((q) => answers[q.id])
        .map((q) => ({
          question_id: q.id,
          selected_option: answers[q.id],
        }));

      const res = await submitQuiz(
        supabase,
        quizId,
        payload
      );

      setResult(res);
      setPhase("result");

      // إذا تم فتح Achievement جديد، نظهر الـPopup مباشرة.
      if (res.achievement_unlocked && res.achievement) {
        setShowAchievementPopup(true);
      }
    } catch (error) {
      console.error("QUIZ SUBMIT ERROR:", error);

      setSubmitError(
        "حدث خطأ أثناء إرسال الاختبار. حاول مرة أخرى."
      );

      setPhase("taking");
    }
  }

  if (phase === "loading") {
    return <Spinner />;
  }

  if (phase === "error") {
    return <ErrorState onRetry={load} />;
  }

  if (!quiz || questions.length === 0) {
    return (
      <EmptyState
        icon="📝"
        title="هذا الاختبار غير متوفر حالياً."
        action={
          <Link href="/quizzes" className="btn-secondary">
            العودة إلى الاختبارات
          </Link>
        }
      />
    );
  }

  // ══════════════════════════════════════════════════════
  // شاشة البداية
  // ══════════════════════════════════════════════════════

  if (phase === "ready") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <GlassCard className="w-full max-w-lg space-y-5 p-8 text-center">
          <span className="text-5xl" aria-hidden>
            📝
          </span>

          <h1 className="break-words text-2xl font-extrabold text-white">
            {quiz.title}
          </h1>

          {quiz.description && (
            <p className="leading-relaxed text-foam/60">
              {quiz.description}
            </p>
          )}

          <p className="text-sm text-foam/50">
            {questions.length}{" "}
            {questions.length === 1
              ? "سؤال"
              : questions.length === 2
                ? "سؤالان"
                : "أسئلة"}{" "}
            · 10 XP عن كل إجابة صحيحة
          </p>

          <button
            type="button"
            onClick={() => setPhase("taking")}
            className="btn-primary w-full"
          >
            ابدأ الاختبار
          </button>

          <Link
            href="/quizzes"
            className="block text-sm font-bold text-foam/50 transition-colors hover:text-foam"
          >
            العودة إلى الاختبارات
          </Link>
        </GlassCard>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // شاشة النتيجة
  // ══════════════════════════════════════════════════════

  if (phase === "result" && result) {
    const passed = result.score >= 50;

    return (
      <div className="relative flex min-h-[60vh] items-center justify-center">
        <GlassCard className="w-full max-w-lg space-y-6 p-8 text-center">
          <span className="text-5xl" aria-hidden>
            {passed ? "🎉" : "💪"}
          </span>

          <h1 className="text-2xl font-extrabold text-white">
            نتيجتك
          </h1>

          <p
            className={cn(
              "font-grotesk text-6xl font-bold",
              passed ? "text-teal-300" : "text-red-300"
            )}
          >
            {result.score}%
          </p>

          <div className="grid grid-cols-1 gap-3 text-right sm:grid-cols-3">
            <div className="rounded-2xl bg-teal-400/10 p-4">
              <p className="text-2xl font-extrabold text-teal-300">
                {result.correct}
              </p>

              <p className="text-sm text-foam/60">
                الإجابات الصحيحة
              </p>
            </div>

            <div className="rounded-2xl bg-red-400/10 p-4">
              <p className="text-2xl font-extrabold text-red-300">
                {result.wrong}
              </p>

              <p className="text-sm text-foam/60">
                الإجابات الخاطئة
              </p>
            </div>

            <div className="rounded-2xl bg-cyan-400/10 p-4">
              <p className="font-grotesk text-2xl font-extrabold text-cyan-300">
                +{result.xp_earned}
              </p>

              <p className="text-sm text-foam/60">
                نقاط الخبرة المكتسبة
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/quizzes"
              className="btn-secondary w-full"
            >
              العودة إلى الاختبارات
            </Link>

            <Link
              href="/dashboard"
              className="btn-primary w-full"
            >
              لوحة الطالب
            </Link>
          </div>
        </GlassCard>

        {/* ═══════════════════════════════════════════════
            Achievement Popup
        ═══════════════════════════════════════════════ */}

        {showAchievementPopup &&
          result.achievement_unlocked &&
          result.achievement && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 px-4 py-6 backdrop-blur-md"
              role="dialog"
              aria-modal="true"
              aria-labelledby="achievement-title"
            >
              <div className="relative w-full max-w-md animate-fade-up">
                {/* Glow */}
                <div className="absolute inset-0 rounded-[2rem] bg-cyan-400/10 blur-3xl" />

                <GlassCard className="relative overflow-hidden border-cyan-400/30 bg-navy-950/95 p-7 text-center shadow-glow">
                  {/* زخرفة */}
                  <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

                  <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-teal-400/10 blur-3xl" />

                  <div className="relative">
                    <div className="mb-4 text-5xl">
                      🎉
                    </div>

                    <p className="text-sm font-bold text-cyan-300">
                      إنجاز جديد!
                    </p>

                    <h2
                      id="achievement-title"
                      className="mt-2 text-2xl font-extrabold text-white"
                    >
                      مبروك! لقد حصلت على إنجاز
                    </h2>

                    {/* أيقونة الإنجاز */}
                    <div className="mx-auto mt-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-cyan-400/20 bg-cyan-400/10 text-5xl shadow-glow">
                      {result.achievement.icon || "🏆"}
                    </div>

                    {/* اسم الإنجاز */}
                    <h3 className="mt-5 break-words text-xl font-extrabold text-white">
                      {result.achievement.title}
                    </h3>

                    {/* الوصف */}
                    {result.achievement.description && (
                      <p className="mx-auto mt-3 max-w-sm break-words text-sm leading-7 text-foam/60">
                        {result.achievement.description}
                      </p>
                    )}

                    {/* XP */}
                    <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2">
                      <span className="text-lg">
                        ⭐
                      </span>

                      <span className="font-grotesk font-extrabold text-amber-300">
                        +{result.achievement.xp_reward} XP
                      </span>
                    </div>

                    {/* الأزرار */}
                    <div className="mt-7 flex flex-col gap-3">
                      <Link
                        href="/achievements"
                        onClick={() =>
                          setShowAchievementPopup(false)
                        }
                        className="btn-primary w-full"
                      >
                        🏆 عرض الإنجاز
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          setShowAchievementPopup(false)
                        }
                        className="btn-secondary w-full"
                      >
                        متابعة
                      </button>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // شاشة الأسئلة
  // ══════════════════════════════════════════════════════

  const question = questions[current];

  const answeredCount = Object.keys(answers).length;

  const progressPercent = Math.round(
    (answeredCount / questions.length) * 100
  );

  const isLast = current === questions.length - 1;

  const submitting = phase === "submitting";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-3">
        <h1 className="break-words text-xl font-extrabold text-white sm:text-2xl">
          {quiz.title}
        </h1>

        <div className="flex items-center justify-between gap-3 text-sm text-foam/60">
          <span>
            السؤال {current + 1} من {questions.length}
          </span>

          <span>
            أجبت عن {answeredCount} من {questions.length}
          </span>
        </div>

        <ProgressBar percent={progressPercent} />
      </header>

      {/* السؤال */}
      <GlassCard className="space-y-6 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-l from-ocean-500/30 to-cyan-400/20 font-grotesk text-lg font-bold text-cyan-300"
            aria-hidden
          >
            {current + 1}
          </span>

          <p className="min-w-0 flex-1 break-words pt-1.5 text-lg font-bold leading-relaxed text-white">
            {question.text}
          </p>
        </div>

        <div
          className="space-y-3"
          role="radiogroup"
          aria-label="خيارات الإجابة"
        >
          {question.options.map((option) => {
            const selected =
              answers[question.id] === option.key;

            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() =>
                  setAnswers((prev) => ({
                    ...prev,
                    [question.id]: option.key,
                  }))
                }
                className={cn(
                  "flex min-h-[44px] w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-right transition-all duration-200",
                  selected
                    ? "border-cyan-400/60 bg-cyan-400/10 shadow-glow"
                    : "border-white/10 bg-navy-900/50 hover:border-cyan-400/30 hover:bg-navy-900"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-extrabold",
                    selected
                      ? "bg-cyan-400/20 text-cyan-300"
                      : "bg-navy-700/60 text-foam/60"
                  )}
                  aria-hidden
                >
                  {option.key}
                </span>

                <span className="min-w-0 flex-1 break-words pt-1 leading-relaxed text-foam">
                  {option.text}
                </span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {submitError && (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300"
        >
          {submitError}
        </p>
      )}

      {/* أزرار التنقل */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() =>
            setCurrent((c) => Math.max(0, c - 1))
          }
          disabled={current === 0 || submitting}
          className="btn-secondary w-full"
        >
          ← السابق
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              answeredCount < questions.length ||
              submitting
            }
            className="btn-primary col-span-2 w-full sm:col-span-1"
          >
            {submitting
              ? "جارٍ الإرسال…"
              : "إنهاء الاختبار"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              setCurrent((c) =>
                Math.min(
                  questions.length - 1,
                  c + 1
                )
              )
            }
            disabled={submitting}
            className="btn-primary w-full"
          >
            التالي ←
          </button>
        )}

        {/* مؤشرات الأسئلة */}
        <div className="col-span-2 flex flex-wrap items-center justify-center gap-2 sm:col-span-1">
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`السؤال ${i + 1}`}
              className={cn(
                "min-h-[44px] h-9 w-9 rounded-xl text-sm font-bold transition-all sm:min-h-0",
                i === current
                  ? "bg-cyan-400/25 text-cyan-300 ring-1 ring-cyan-400/50"
                  : answers[q.id]
                    ? "bg-teal-400/15 text-teal-300"
                    : "bg-navy-700/50 text-foam/40 hover:text-foam"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {answeredCount < questions.length && isLast && (
        <p className="text-center text-sm text-foam/50">
          أجب عن جميع الأسئلة لتتمكن من إنهاء الاختبار.
        </p>
      )}
    </div>
  );
}
