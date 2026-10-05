
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { ensureProfile } from "@/services/auth";
import {
  listCoursesWithProgress,
  type CourseWithMeta,
} from "@/services/courses";
import {
  EmptyState,
  ErrorState,
  GlassCard,
  PageHeader,
  ProgressBar,
  Spinner,
} from "@/components/ui";

// ══════════════════════════════════════════════════════
// الدورات — الشعبة ← المادة ← الدورة ← الدرس
// البيانات تأتي من Supabase مباشرة
// ══════════════════════════════════════════════════════



export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseWithMeta[] | null>(null);
  const [stream, setStream] = useState<string | null>(null);
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

      // نجيب الشعبة فقط من البروفايل
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("stream")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      const userStream = profile?.stream ?? null;

      setStream(userStream);

      const data = await listCoursesWithProgress(
        supabase,
        user.id,
        userStream
      );

      setCourses(data);
    } catch (err) {
      const supabaseError = err as {
        message?: string;
        code?: string;
        details?: string;
        hint?: string;
      };

      console.error("Courses error:", {
        message:
          supabaseError?.message ??
          (err instanceof Error
            ? err.message
            : String(err)),
        code: supabaseError?.code,
        details: supabaseError?.details,
        hint: supabaseError?.hint,
        raw: err,
      });

      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return <ErrorState onRetry={load} />;
  }

  if (!courses) {
    return <Spinner />;
  }

  // ══════════════════════════════════════════════════════
  // تجميع الدورات حسب المادة
  // ══════════════════════════════════════════════════════

  const bySubject = new Map<string, CourseWithMeta[]>();

  for (const course of courses) {
    const key = course.subject?.name ?? "مواد أخرى";

    bySubject.set(key, [
      ...(bySubject.get(key) ?? []),
      course,
    ]);
  }





  // ══════════════════════════════════════════════════════
  // تنسيق السعر
  // ══════════════════════════════════════════════════════

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-DZ", {
      maximumFractionDigits: 0,
    }).format(price);
  };

  // ══════════════════════════════════════════════════════
  // تسمية عدد الدروس
  // ══════════════════════════════════════════════════════

  const getLessonLabel = (count: number) => {
    if (count === 1) return "درس";
    if (count === 2) return "درسان";
    if (count >= 3 && count <= 10) return "دروس";
    return "درس";
  };

  return (
    <div dir="rtl">
      <PageHeader
        title="الدورات"
        subtitle={
          stream
            ? `شعبة ${stream} — اختر دورة وابدأ التعلم`
            : "اختر دورة وابدأ التعلم"
        }
      />

      {courses.length === 0 ? (
        <EmptyState
          icon="📚"
          title="لا توجد دورات متاحة حالياً."
          description="سيظهر هنا المحتوى التعليمي فور إضافته من إدارة المنصة."
        />
      ) : (
        <div className="space-y-10">
          {[...bySubject.entries()].map(
            ([subjectName, subjectCourses]) => (
              <section key={subjectName}>
                {/* عنوان المادة */}
                <div className="mb-5 flex items-center gap-3">
                  <span
                    className="h-6 w-1.5 rounded-full bg-gradient-to-b from-cyan-400 to-teal-300"
                    aria-hidden
                  />

                  <div>
                    <h2 className="text-xl font-extrabold text-white">
                      {subjectName}
                    </h2>

                    <p className="mt-0.5 text-xs text-foam/40">
                      {subjectCourses.length}{" "}
                      {subjectCourses.length === 1
                        ? "دورة"
                        : "دورات"}
                    </p>
                  </div>
                </div>

                {/* شبكة الدورات */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {subjectCourses.map((course) => (
                    <GlassCard
                      key={course.id}
                      className="group flex flex-col overflow-hidden p-0"
                      hover
                    >
                      {/* ═══════════════════════════════════
                          صورة الدورة
                      ═══════════════════════════════════ */}

                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-cyan-500/10 via-slate-900 to-teal-500/10">
                        {course.thumbnail_url ? (
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-400/10 via-slate-900 to-teal-300/10">
                            <div className="text-center">
                              <div className="text-5xl opacity-70">
                                📚
                              </div>

                              <p className="mt-2 text-xs font-semibold text-cyan-200/50">
                                MARIS ACADEMY
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Gradient */}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                        {/* نوع الدورة */}
                        <div className="absolute right-3 top-3">
                          {course.is_free ? (
                            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-300 backdrop-blur-md">
                              🆓 مجانية
                            </span>
                          ) : (
                            <span className="rounded-full border border-amber-300/20 bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-300 backdrop-blur-md">
                              💰 مدفوعة
                            </span>
                          )}
                        </div>

                        {/* عدد الدروس */}
                        <div className="absolute bottom-3 left-3">
                          <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                            📚 {course.lessonsCount}{" "}
                            {getLessonLabel(course.lessonsCount)}
                          </span>
                        </div>
                      </div>

                      {/* ═══════════════════════════════════
                          محتوى الدورة
                      ═══════════════════════════════════ */}

                      <div className="flex flex-1 flex-col gap-4 p-5">
                        {/* المادة + السعر */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-cyan-300">
                              {course.subject?.name ?? "مادة"}
                            </p>

                            <h3 className="mt-1 break-words text-lg font-extrabold leading-7 text-white">
                              {course.title}
                            </h3>
                          </div>

                          {/* السعر */}
                          {!course.is_free && (
                            <div className="shrink-0 text-left">
                              <p className="text-lg font-extrabold text-amber-300">
                                {formatPrice(course.price)}
                              </p>

                              <p className="text-[10px] text-foam/40">
                                دج
                              </p>
                            </div>
                          )}
                        </div>

                        {/* الوصف */}
                        {course.description ? (
                          <p className="line-clamp-2 min-h-[42px] text-sm leading-6 text-foam/60">
                            {course.description}
                          </p>
                        ) : (
                          <div className="min-h-[42px]" />
                        )}

                        {/* ═══════════════════════════════════
                            التقدم
                        ═══════════════════════════════════ */}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-foam/50">
                              تقدمك في الدورة
                            </span>

                            <span className="font-extrabold text-cyan-300">
                              {course.progressPercent}%
                            </span>
                          </div>

                          <ProgressBar
                            percent={course.progressPercent}
                          />

                          <div className="flex items-center justify-between text-[11px] text-foam/40">
                            <span>
                              {course.completedLessons} من{" "}
                              {course.lessonsCount} مكتمل
                            </span>

                            {course.progressPercent === 100 && (
                              <span className="font-bold text-emerald-400">
                                ✓ مكتملة
                              </span>
                            )}
                          </div>
                        </div>

                        {/* ═══════════════════════════════════
                            زر الدخول للدورة
                        ═══════════════════════════════════ */}

                        <Link
                          href={`/courses/${course.id}`}
                          className="btn-primary mt-auto flex w-full items-center justify-center gap-2"
                        >
                          {course.progressPercent === 0 && (
                            <>
                              <span>🚀</span>
                              <span>ابدأ الدورة</span>
                            </>
                          )}

                          {course.progressPercent > 0 &&
                            course.progressPercent < 100 && (
                              <>
                                <span>▶</span>
                                <span>متابعة التعلم</span>
                              </>
                            )}

                          {course.progressPercent === 100 && (
                            <>
                              <span>✓</span>
                              <span>مراجعة الدورة</span>
                            </>
                          )}
                        </Link>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </section>
            )
          )}
        </div>
      )}
    </div>
  );
}



