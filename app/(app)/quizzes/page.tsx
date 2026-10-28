
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type QuizType = "qcm" | "exam" | "bac" | "pdf" | "written";
type QuizFilter = "all" | QuizType;

type QuizWithType = QuizWithMeta & {
  quiz_type?: QuizType | null;
};

const QUIZ_TYPES: {
  id: QuizType;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "qcm",
    title: "اختبارات QCM",
    shortTitle: "QCM",
    description: "اختبر معلوماتك بأسئلة الاختيار من متعدد",
    icon: "🎯",
  },
  {
    id: "exam",
    title: "الفروض والاختبارات",
    shortTitle: "الفروض",
    description: "راجع دروسك وحضّر للفروض والاختبارات",
    icon: "📝",
  },
  {
    id: "bac",
    title: "مواضيع البكالوريا",
    shortTitle: "البكالوريا",
    description: "تدرّب على مواضيع البكالوريا",
    icon: "🎓",
  },
  {
    id: "pdf",
    title: "اختبارات PDF",
    shortTitle: "PDF",
    description: "اختبارات ومواضيع بصيغة PDF",
    icon: "📄",
  },
  {
    id: "written",
    title: "الإجابات الكتابية",
    shortTitle: "كتابي",
    description: "اختبارات تعتمد على الإجابة الكتابية",
    icon: "✍️",
  },
];

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizWithMeta[] | null>(null);
  const [selectedType, setSelectedType] = useState<QuizFilter>("all");
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError(true);
      return;
    }

    setError(false);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setQuizzes([]);
        return;
      }

      const data = await listQuizzes(supabase, user.id);
      setQuizzes(data);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const quizCounts = useMemo(() => {
    const items = (quizzes ?? []) as QuizWithType[];

    return {
      all: items.length,
      qcm: items.filter((quiz) => !quiz.quiz_type || quiz.quiz_type === "qcm").length,
      exam: items.filter((quiz) => quiz.quiz_type === "exam").length,
      bac: items.filter((quiz) => quiz.quiz_type === "bac").length,
      pdf: items.filter((quiz) => quiz.quiz_type === "pdf").length,
      written: items.filter((quiz) => quiz.quiz_type === "written").length,
    };
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    const items = (quizzes ?? []) as QuizWithType[];

    if (selectedType === "all") return items;

    return items.filter((quiz) => {
      const type = quiz.quiz_type || "qcm";
      return type === selectedType;
    });
  }, [quizzes, selectedType]);

  if (error) return <ErrorState onRetry={load} />;
  if (!quizzes) return <Spinner />;

  const selectedCategory =
    selectedType === "all"
      ? null
      : QUIZ_TYPES.find((type) => type.id === selectedType);

  return (
    <div className="space-y-7" dir="rtl">
      <PageHeader
        title="الاختبارات"
        subtitle="اختبر فهمك، طوّر مستواك واكسب نقاط خبرة مع كل اختبار تكمله."
      />

      {/* بطاقة تعريفية */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-400/15 bg-gradient-to-l from-cyan-400/10 via-slate-900/70 to-blue-500/10 p-5 sm:p-7">
        <div className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-200">
              <span>🐋</span>
              MARIS ACADEMY
            </span>

            <h2 className="text-xl font-black text-white sm:text-2xl">
              تعلّم، اختبر، وتقدّم!
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-7 text-slate-300/70">
              اختار نوع الاختبار اللي يناسبك وابدأ المراجعة حسب احتياجاتك.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
            <span className="text-3xl">📚</span>
            <div>
              <p className="text-2xl font-black text-cyan-300">
                {quizzes.length}
              </p>
              <p className="text-xs text-slate-300/60">اختبار متاح</p>
            </div>
          </div>
        </div>
      </div>

      {/* التصنيفات */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-white">
              تصنيفات الاختبارات
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              اختار تصنيف باش تشوف الاختبارات الخاصة بيه.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <button
            type="button"
            onClick={() => setSelectedType("all")}
            aria-pressed={selectedType === "all"}
            className={`group flex min-h-32 flex-col items-start justify-between rounded-2xl border p-4 text-right transition duration-200 ${
              selectedType === "all"
                ? "border-cyan-300/50 bg-cyan-400/10 shadow-lg shadow-cyan-950/20"
                : "border-white/10 bg-slate-900/40 hover:border-cyan-300/25 hover:bg-slate-800/60"
            }`}
          >
            <span className="text-2xl">📚</span>
            <span className="text-sm font-extrabold text-white">الكل</span>
            <span className="text-xs text-slate-400">
              {quizCounts.all} اختبار
            </span>
          </button>

          {QUIZ_TYPES.map((type) => {
            const active = selectedType === type.id;
            const count = quizCounts[type.id];

            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type.id)}
                aria-pressed={active}
                className={`group flex min-h-32 flex-col items-start justify-between rounded-2xl border p-4 text-right transition duration-200 ${
                  active
                    ? "border-cyan-300/50 bg-cyan-400/10 shadow-lg shadow-cyan-950/20"
                    : "border-white/10 bg-slate-900/40 hover:border-cyan-300/25 hover:bg-slate-800/60"
                }`}
              >
                <span
                  className={`text-2xl transition-transform duration-200 ${
                    active ? "scale-110" : "group-hover:scale-110"
                  }`}
                >
                  {type.icon}
                </span>

                <span className="text-sm font-extrabold text-white">
                  {type.shortTitle}
                </span>

                <span
                  className={`text-xs ${
                    active ? "text-cyan-200" : "text-slate-400"
                  }`}
                >
                  {count} {count === 1 ? "اختبار" : "اختبارات"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* قائمة الاختبارات حسب التصنيف */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-white">
              {selectedCategory?.title ?? "جميع الاختبارات"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {selectedCategory?.description ??
                "تصفّح جميع الاختبارات المتاحة في المنصة."}
            </p>
          </div>

          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
            {filteredQuizzes.length} نتيجة
          </span>
        </div>

        {filteredQuizzes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 px-5 py-10 text-center">
            <div className="text-4xl">
              {selectedCategory?.icon ?? "📝"}
            </div>

            <h3 className="mt-4 text-base font-extrabold text-white">
              {quizzes.length === 0
                ? "ما كاين حتى اختبار متاح حاليًا"
                : "ما كاين حتى اختبار في هذا التصنيف"}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-400">
              {quizzes.length === 0
                ? "الاختبارات راح تظهر هنا كي تتم إضافتها من إدارة المنصة."
                : "جرّب تصنيف آخر، أو ارجع لجميع الاختبارات باش تشوف المحتوى المتاح."}
            </p>

            {selectedType !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedType("all")}
                className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-5 py-2.5 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/15"
              >
                عرض جميع الاختبارات
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredQuizzes.map((quiz) => {
              const typedQuiz = quiz as QuizWithType;
              const type =
                QUIZ_TYPES.find(
                  (item) => item.id === (typedQuiz.quiz_type || "qcm"),
                ) ?? QUIZ_TYPES[0];

              return (
                <GlassCard
                  key={quiz.id}
                  className="flex h-full flex-col gap-4 p-5 sm:p-6"
                  hover
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-400/10 text-xl">
                        {type.icon}
                      </div>

                      <div className="min-w-0">
                        <span className="mb-1 inline-block rounded-full border border-cyan-300/15 bg-cyan-300/5 px-2 py-1 text-[10px] font-bold text-cyan-200">
                          {type.title}
                        </span>

                        <h3 className="break-words text-base font-extrabold leading-7 text-white">
                          {quiz.title}
                        </h3>
                      </div>
                    </div>

                    <span className="badge shrink-0">
                      {quiz.questionsCount}{" "}
                      {quiz.questionsCount === 1
                        ? "سؤال"
                        : quiz.questionsCount === 2
                          ? "سؤالان"
                          : "أسئلة"}
                    </span>
                  </div>

                  {quiz.description ? (
                    <p className="line-clamp-2 min-h-10 text-sm leading-6 text-slate-300/65">
                      {quiz.description}
                    </p>
                  ) : (
                    <p className="min-h-10 text-sm text-slate-400/50">
                      اختبار للمراجعة وتقييم المستوى.
                    </p>
                  )}

                  <div className="mt-auto rounded-xl border border-white/5 bg-slate-950/20 p-3">
                    {quiz.bestScore !== null ? (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-slate-400">
                            أفضل نتيجة
                          </p>
                          <p className="mt-1 text-xl font-black text-cyan-300">
                            {quiz.bestScore}%
                          </p>
                        </div>

                        <div className="text-left">
                          <p className="text-xs text-slate-400">المحاولات</p>
                          <p className="mt-1 font-extrabold text-white">
                            {quiz.attemptsCount}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">
                        ✨ ما زال ما جرّبتش هذا الاختبار.
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/quizzes/${quiz.id}`}
                    className="btn-primary mt-1 flex w-full items-center justify-center gap-2"
                  >
                    {quiz.attemptsCount > 0
                      ? "إعادة الاختبار"
                      : "ابدأ الاختبار"}
                    <span aria-hidden="true">←</span>
                  </Link>
                </GlassCard>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
