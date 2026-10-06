"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { getSupabase } from "@/lib/supabase";
import { ensureProfile } from "@/services/auth";
import { getStudentStats, type StudentStats } from "@/services/stats";
import {
  getNextLesson,
  listCoursesWithProgress,
  type CourseWithMeta,
} from "@/services/courses";
import { getRecentAttempts, type AttemptWithQuiz } from "@/services/quizzes";
import { getLevelInfo } from "@/lib/level";
import { formatDateAr } from "@/lib/utils";

import type { Course, Lesson, Profile } from "@/types/database";

import {
  EmptyState,
  ErrorState,
  GlassCard,
  ProgressBar,
  Spinner,
} from "@/components/ui";

interface DashboardData {
  profile: Profile | null;
  stats: StudentStats;
  next: { lesson: Lesson; course: Course | null } | null;
  attempts: AttemptWithQuiz[];
  courses: CourseWithMeta[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabase();

    if (!supabase) {
      console.error("SUPABASE CLIENT NOT AVAILABLE");
      setError(true);
      return;
    }

    setError(false);

    try {
      // ================================
      // AUTH USER
      // ================================
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      console.log("AUTH USER ID:", user?.id);

      if (authError) {
        console.error("AUTH ERROR:", authError);
        throw authError;
      }

      if (!user) {
        console.error("NO AUTH USER FOUND");
        setError(true);
        return;
      }

      // ================================
      // LOAD DASHBOARD DATA
      // ================================
      const [profile, stats, next, attempts, courses] = await Promise.all([
        ensureProfile(supabase, user),
        getStudentStats(supabase, user.id),
        getNextLesson(supabase, user.id),
        getRecentAttempts(supabase, user.id),
        listCoursesWithProgress(supabase, user.id),
      ]);

      console.log("PROFILE:", profile);
      console.log("STATS:", stats);
      console.log("NEXT LESSON:", next);
      console.log("ATTEMPTS:", attempts);
      console.log("COURSES:", courses);

      setData({
        profile,
        stats,
        next,
        attempts,
        courses,
      });
    } catch (err) {
      console.error("DASHBOARD LOAD ERROR:", err);
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return <ErrorState onRetry={load} />;
  }

  if (!data) {
    return <Spinner />;
  }

  const { profile, stats, next, attempts, courses } = data;

  const level = getLevelInfo(stats.totalXP);

  const hasActivity =
    stats.completedLessons > 0 || attempts.length > 0;

  const firstName = profile?.first_name?.trim();

  const statCards = [
    {
      icon: "⭐",
      label: "نقاط الخبرة",
      value: `${stats.totalXP} XP`,
    },
    {
      icon: "🏆",
      label: "المستوى",
      value: `${level.level} — ${level.name}`,
    },
    {
      icon: "🔥",
      label: "سلسلة الدراسة",
      value:
        stats.streak > 0
          ? `${stats.streak} ${
              stats.streak === 1
                ? "يوم"
                : stats.streak === 2
                ? "يومان"
                : "أيام"
            }`
          : "0 أيام",
    },
    {
      icon: "📊",
      label: "نسبة التقدم",
      value:
        stats.progressPercent !== null
          ? `${stats.progressPercent}%`
          : "0%",
    },
  ];

  return (
    <div className="space-y-8">

      {/* ================================
          الترحيب
      ================================= */}

      <header className="animate-fade-up">
        <h1 className="page-title">
          لوحة الطالب
        </h1>

        <p className="mt-3 text-xl font-bold text-foam/90">
          مرحباً{firstName ? `، ${firstName}` : ""} 👋
        </p>

        <p className="mt-1 text-foam/60">
          استمر في التقدم، خطوة كل يوم تصنع الفرق.
        </p>
      </header>

      {/* ================================
          الإحصائيات
      ================================= */}

      <section
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        aria-label="إحصائيات الطالب"
      >
        {statCards.map((card, i) => (
          <GlassCard
            key={card.label}
            className="animate-fade-up p-5"
            hover
          >
            <div
              className="flex flex-col gap-2"
              style={{
                animationDelay: `${i * 60}ms`,
              }}
            >
              <span
                className="text-2xl"
                aria-hidden
              >
                {card.icon}
              </span>

              <p className="break-words text-lg font-extrabold leading-snug text-white sm:text-xl">
                {card.value}
              </p>

              <p className="text-sm text-foam/50">
                {card.label}
              </p>
            </div>
          </GlassCard>
        ))}
      </section>

      {/* ================================
          لا يوجد نشاط
      ================================= */}

      {!hasActivity && (
        <EmptyState
          icon="🌊"
          title="ابدأ أول درس لك لتبدأ رحلتك التعليمية."
          action={
            <Link
              href="/library"
              className="btn-primary"
            >
              استكشف الدروس
            </Link>
          }
        />
      )}

      {/* ================================
          تابع التعلم + التحديات
      ================================= */}

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        <GlassCard className="p-6" hover>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-white">
            <span aria-hidden>▶️</span>
            تابع التعلم
          </h2>

          {next ? (
            <div className="space-y-3">

              <p className="text-sm text-foam/50">
                {next.course?.title ?? "دورة تعليمية"}
              </p>

              <p className="text-xl font-bold text-foam">
                {next.lesson.title}
              </p>

              <Link
                href={`/courses/${next.lesson.course_id}/lessons/${next.lesson.id}`}
                className="btn-primary mt-2"
              >
                متابعة التعلم
              </Link>

            </div>
          ) : (
            <p className="py-6 text-center text-foam/50">
              لا توجد بيانات بعد.
            </p>
          )}
        </GlassCard>

        <GlassCard className="p-6" hover>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-white">
            <span aria-hidden>⚡</span>
            التحديات اليومية
          </h2>

          <p className="py-6 text-center text-foam/50">
            لا توجد بيانات بعد.
          </p>
        </GlassCard>

      </section>

      {/* ================================
          آخر الاختبارات
      ================================= */}

      <section>

        <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-white">
          <span aria-hidden>📝</span>
          آخر الاختبارات
        </h2>

        {attempts.length > 0 ? (
          <div className="space-y-3">

            {attempts.map((attempt) => (
              <GlassCard
                key={attempt.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
                hover
              >
                <div>

                  <p className="font-bold text-foam">
                    {attempt.quiz?.title ?? "اختبار"}
                  </p>

                  <p className="text-sm text-foam/50">
                    {formatDateAr(attempt.completed_at)} ·{" "}
                    {attempt.correct_answers} من{" "}
                    {attempt.total_questions} صحيحة
                  </p>

                </div>

                <span
                  className={
                    attempt.score >= 50
                      ? "badge !border-teal-400/30 !bg-teal-400/10 !text-teal-300"
                      : "badge !border-red-400/30 !bg-red-400/10 !text-red-300"
                  }
                >
                  {attempt.score}%
                </span>

              </GlassCard>
            ))}

          </div>
        ) : (
          <EmptyState
            icon="📝"
            title="لا توجد نتائج اختبارات بعد."
          />
        )}

      </section>

      {/* ================================
          تقدمك الدراسي
      ================================= */}

      <section>

        <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-white">
          <span aria-hidden>📈</span>
          تقدمك الدراسي
        </h2>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {courses.map((course) => (
              <GlassCard
                key={course.id}
                className="space-y-3 p-5"
                hover
              >

                <div className="flex items-start justify-between gap-3">

                  <div>

                    <p className="text-sm text-cyan-300">
                      {course.subject?.name ?? "مادة"}
                    </p>

                    <p className="font-bold text-foam">
                      {course.title}
                    </p>

                  </div>

                  <span className="badge shrink-0">
                    {course.progressPercent}%
                  </span>

                </div>

                <ProgressBar
                  percent={course.progressPercent}
                />

                <p className="text-xs text-foam/40">
                  {course.completedLessons} من{" "}
                  {course.lessonsCount} دروس مكتملة
                </p>

              </GlassCard>
            ))}

          </div>
        ) : (
          <EmptyState
            icon="📈"
            title="لا توجد بيانات بعد."
          />
        )}

      </section>

    </div>
  );
}
