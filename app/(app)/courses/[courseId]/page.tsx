"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

import {
  getCompletedLessonIds,
  getCourse,
  getCourseLessons,
  getCourseQuizzes,
} from "@/services/courses";

import type {
  Course,
  Lesson,
  Subject,
  Quiz,
} from "@/types/database";

import {
  EmptyState,
  ErrorState,
  GlassCard,
  PageHeader,
  ProgressBar,
  Spinner,
} from "@/components/ui";

import { cn } from "@/lib/utils";

// ══════════════════════════════════════════════════════
// صفحة الدورة
// الغلاف + معلومات الدورة + التقدم + الدروس + الاختبارات
// ══════════════════════════════════════════════════════

export default function CoursePage() {
  const params =
    useParams<{ courseId: string }>();

  const courseId = params.courseId;

  const [course, setCourse] = useState<
    (Course & {
      subject: Subject | null;
    }) | null
  >(null);

  const [lessons, setLessons] =
    useState<Lesson[] | null>(null);

  const [quizzes, setQuizzes] =
    useState<Quiz[]>([]);

  const [completed, setCompleted] =
    useState<Set<string>>(new Set());

  const [error, setError] =
    useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabase();

    if (!supabase) return;

    setError(false);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [
        courseData,
        lessonsData,
        completedIds,
        quizzesData,
      ] = await Promise.all([
        getCourse(
          supabase,
          courseId
        ),

        getCourseLessons(
          supabase,
          courseId
        ),

        getCompletedLessonIds(
          supabase,
          user.id
        ),

        getCourseQuizzes(
          supabase,
          courseId
        ),
      ]);

      setCourse(courseData);
      setLessons(lessonsData);
      setCompleted(completedIds);
      setQuizzes(quizzesData);
    } catch (err) {
      console.error(
        "Course page error:",
        err
      );

      setError(true);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <ErrorState
        onRetry={load}
      />
    );
  }

  if (!lessons) {
    return <Spinner />;
  }

  if (!course) {
    return (
      <EmptyState
        icon="🔎"
        title="هذه الدورة غير موجودة."
        action={
          <Link
            href="/courses"
            className="btn-secondary"
          >
            العودة إلى الدورات
          </Link>
        }
      />
    );
  }

  // ══════════════════════════════════════════════════════
  // حساب التقدم
  // ══════════════════════════════════════════════════════

  const completedCount =
    lessons.filter((lesson) =>
      completed.has(lesson.id)
    ).length;

  const percent =
    lessons.length > 0
      ? Math.round(
          (completedCount /
            lessons.length) *
            100
        )
      : 0;

  // أول درس غير مكتمل
  const nextLesson =
    lessons.find(
      (lesson) =>
        !completed.has(lesson.id)
    ) ??
    lessons[0] ??
    null;

  const formatPrice = (
    price: number
  ) => {
    return new Intl.NumberFormat(
      "fr-DZ",
      {
        maximumFractionDigits: 0,
      }
    ).format(price);
  };

  return (
    <div dir="rtl">
      {/* العودة */}
      <Link
        href="/courses"
        className="mb-5 inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-cyan-300 transition-colors hover:text-cyan-200"
      >
        <span>→</span>
        العودة إلى الدورات
      </Link>

      {/* ═══════════════════════════════════════════════════
          Hero الدورة
      ═══════════════════════════════════════════════════ */}

      <GlassCard className="mb-8 overflow-hidden p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">

          {/* الصورة */}
          <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-cyan-500/10 via-slate-900 to-teal-500/10 lg:aspect-auto lg:min-h-[310px]">

            {course.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[240px] w-full items-center justify-center bg-gradient-to-br from-cyan-400/10 via-slate-900 to-teal-300/10">
                <div className="text-center">
                  <div className="text-7xl opacity-70">
                    📚
                  </div>

                  <p className="mt-3 text-sm font-bold text-cyan-200/50">
                    MARIS ACADEMY
                  </p>
                </div>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

            {/* نوع الدورة */}
            <div className="absolute right-4 top-4">
              {course.is_free ? (
                <span className="rounded-full border border-emerald-300/20 bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-300 backdrop-blur-md">
                  🆓 دورة مجانية
                </span>
              ) : (
                <span className="rounded-full border border-amber-300/20 bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-300 backdrop-blur-md">
                  💰 دورة مدفوعة
                </span>
              )}
            </div>
          </div>

          {/* المعلومات */}
          <div className="flex flex-col justify-center p-6 sm:p-8">

            <p className="mb-2 text-sm font-bold text-cyan-300">
              {course.subject?.name ??
                "مادة"}
            </p>

            <h1 className="text-2xl font-extrabold leading-tight text-white sm:text-3xl">
              {course.title}
            </h1>

            {course.description && (
              <p className="mt-4 leading-7 text-foam/60">
                {course.description}
              </p>
            )}

            {/* معلومات سريعة */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-foam/40">
                  الدروس
                </p>

                <p className="mt-1 font-extrabold text-white">
                  {lessons.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-foam/40">
                  مكتمل
                </p>

                <p className="mt-1 font-extrabold text-emerald-300">
                  {completedCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-foam/40">
                  السعر
                </p>

                <p
                  className={cn(
                    "mt-1 font-extrabold",
                    course.is_free
                      ? "text-emerald-300"
                      : "text-amber-300"
                  )}
                >
                  {course.is_free
                    ? "مجانية"
                    : `${formatPrice(
                        course.price
                      )} دج`}
                </p>
              </div>

              {/* الاختبارات */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-foam/40">
                  الاختبارات
                </p>

                <p className="mt-1 font-extrabold text-cyan-300">
                  {quizzes.length}
                </p>
              </div>
            </div>

            {/* التقدم */}
            <div className="mt-6">

              <div className="mb-2 flex items-center justify-between text-sm">

                <span className="text-foam/50">
                  تقدمك في الدورة
                </span>

                <span className="font-extrabold text-cyan-300">
                  {percent}%
                </span>
              </div>

              <ProgressBar
                percent={percent}
              />
            </div>

            {/* زر المتابعة */}
            {nextLesson && (
              <Link
                href={`/courses/${courseId}/lessons/${nextLesson.id}`}
                className="btn-primary mt-6 flex w-full items-center justify-center gap-2"
              >
                {percent === 0 ? (
                  <>
                    <span>🚀</span>
                    <span>
                      ابدأ الدورة
                    </span>
                  </>
                ) : percent === 100 ? (
                  <>
                    <span>↻</span>
                    <span>
                      مراجعة الدورة
                    </span>
                  </>
                ) : (
                  <>
                    <span>▶</span>
                    <span>
                      متابعة التعلم
                    </span>
                  </>
                )}
              </Link>
            )}
          </div>
        </div>
      </GlassCard>

      {/* ═══════════════════════════════════════════════════
          الدروس
      ═══════════════════════════════════════════════════ */}

      <PageHeader
        title="محتوى الدورة"
        subtitle={`${lessons.length} ${
          lessons.length === 1
            ? "درس"
            : "دروس"
        } مرتبة حسب المسار التعليمي`}
      />

      {lessons.length === 0 ? (
        <EmptyState
          icon="📖"
          title="لا توجد دروس في هذه الدورة بعد."
          description="ستظهر الدروس هنا فور إضافتها."
        />
      ) : (
        <ol className="space-y-3">
          {lessons.map(
            (lesson, index) => {
              const isDone =
                completed.has(
                  lesson.id
                );

              return (
                <li
                  key={lesson.id}
                >
                  <Link
                    href={`/courses/${courseId}/lessons/${lesson.id}`}
                    className="block"
                  >
                    <GlassCard
                      className={cn(
                        "group flex items-center gap-4 p-4 transition-all sm:p-5",
                        isDone
                          ? "border-teal-400/20 bg-teal-400/[0.03]"
                          : "glass-card-hover"
                      )}
                    >

                      {/* رقم الدرس */}
                      <span
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold",
                          isDone
                            ? "bg-teal-400/15 text-teal-300"
                            : "bg-navy-700/60 text-foam/60"
                        )}
                        aria-hidden
                      >
                        {isDone
                          ? "✓"
                          : index + 1}
                      </span>

                      {/* المعلومات */}
                      <div className="min-w-0 flex-1">

                        <p className="break-words font-bold text-foam transition-colors group-hover:text-cyan-200">
                          {lesson.title}
                        </p>

                        <p className="mt-1 text-sm text-foam/40">
                          {isDone
                            ? "مكتمل ✓"
                            : index ===
                                lessons.findIndex(
                                  (
                                    item
                                  ) =>
                                    !completed.has(
                                      item.id
                                    )
                                )
                              ? "الدرس التالي"
                              : "غير مكتمل"}
                        </p>
                      </div>

                      {/* حالة الدرس */}
                      <div className="flex shrink-0 items-center gap-2">

                        {isDone && (
                          <span className="hidden rounded-full bg-teal-400/10 px-3 py-1 text-xs font-bold text-teal-300 sm:inline-block">
                            مكتمل
                          </span>
                        )}

                        <span
                          className="text-lg text-cyan-300 transition-transform group-hover:-translate-x-1"
                          aria-hidden
                        >
                          ←
                        </span>
                      </div>
                    </GlassCard>
                  </Link>
                </li>
              );
            }
          )}
        </ol>
      )}

      {/* ═══════════════════════════════════════════════════
          اختبارات الدورة
      ═══════════════════════════════════════════════════ */}

      {quizzes.length > 0 && (
        <section className="mt-12">

          <PageHeader
            title="اختبارات الدورة"
            subtitle={`${quizzes.length} ${
              quizzes.length === 1
                ? "اختبار"
                : "اختبارات"
            } لقياس مدى فهمك للدروس`}
          />

          <div className="space-y-3">

            {quizzes.map(
              (quiz) => (
                <Link
                  key={quiz.id}
                  href={`/quizzes/${quiz.id}`}
                  className="block"
                >
                  <GlassCard className="group flex items-center gap-4 p-4 transition-all hover:border-cyan-400/30 sm:p-5">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-xl">
                      📝
                    </div>

                    <div className="min-w-0 flex-1">

                      <h3 className="font-bold text-white transition-colors group-hover:text-cyan-200">
                        {quiz.title}
                      </h3>

                      {quiz.description && (
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-foam/40">
                          {
                            quiz.description
                          }
                        </p>
                      )}

                      <p className="mt-2 text-xs font-bold text-cyan-300/60">
                        اضغط لبدء الاختبار
                      </p>
                    </div>

                    <span className="shrink-0 text-lg text-cyan-300 transition-transform group-hover:-translate-x-1">
                      ←
                    </span>

                  </GlassCard>
                </Link>
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}

