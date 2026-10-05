"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import {
  listCoursesWithProgress,
  type CourseWithMeta,
} from "@/services/courses";
import { getRecentAttempts } from "@/services/quizzes";
import {
  getStudentStats,
  getXPTransactions,
  type StudentStats,
} from "@/services/stats";
import {
  getUserAchievements,
  type UserAchievementWithDetails,
} from "@/services/achievements";
import { getLevelInfo } from "@/lib/level";

type ProgressData = {
  courses: CourseWithMeta[];
  attempts: Awaited<ReturnType<typeof getRecentAttempts>>;
  xpTransactions: Awaited<ReturnType<typeof getXPTransactions>>;
  stats: StudentStats;
  achievements: UserAchievementWithDetails[];
};

function formatDateAr(date: string | null | undefined) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function xpReasonLabel(reason: string) {
  switch (reason) {
    case "lesson_complete":
      return "إكمال درس";
    case "quiz_complete":
      return "إكمال اختبار";
    default:
      return "نشاط";
  }
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const supabase = getSupabase();

        if (!supabase) {
          setError("إعدادات Supabase غير مكتملة.");
          return;
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          setError("يجب تسجيل الدخول أولاً.");
          return;
        }

        const [
          courses,
          attempts,
          xpTransactions,
          stats,
          achievements,
        ] = await Promise.all([
          listCoursesWithProgress(supabase, user.id),
          getRecentAttempts(supabase, user.id, 10),
          getXPTransactions(supabase, user.id, 20),
          getStudentStats(supabase, user.id),
          getUserAchievements(supabase, user.id),
        ]);

        setData({
          courses,
          attempts,
          xpTransactions,
          stats,
          achievements,
        });
      } catch (err) {
        console.error(err);
        setError("حدث خطأ أثناء تحميل التقدم.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-ocean px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <div className="text-4xl">🌊</div>
            <p className="mt-3 text-sm text-white/60">
              جاري تحميل تقدمك...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-ocean px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-red-400/20 bg-red-400/10 p-6 text-center">
            <div className="text-3xl">⚠️</div>
            <p className="mt-3 text-sm text-red-200">
              {error || "تعذر تحميل البيانات."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const {
    courses,
    attempts,
    xpTransactions,
    stats,
    achievements,
  } = data;

  const levelInfo = getLevelInfo(stats.totalXP);

  const hasProgress =
    stats.completedLessons > 0 ||
    attempts.length > 0 ||
    stats.totalXP > 0 ||
    stats.streak > 0 ||
    achievements.length > 0;

  return (
    <main className="min-h-screen bg-ocean px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <section>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/70">
                MARIS ACADEMY ²⁰²⁷
              </p>

              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                📊 تقدمي
              </h1>

              <p className="mt-2 text-sm text-white/55">
                تابع مستواك، دروسك، اختباراتك وإنجازاتك.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex w-fit items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              ← لوحة التحكم
            </Link>
          </div>
        </section>

        {/* Summary */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs text-white/45">المستوى</p>

            <p className="mt-2 text-3xl font-black text-white">
              {levelInfo.level}
            </p>

            <p className="mt-1 text-xs text-cyan-300">
              {stats.totalXP} XP
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs text-white/45">الدروس المكتملة</p>

            <p className="mt-2 text-3xl font-black text-white">
              {stats.completedLessons}
            </p>

            <p className="mt-1 text-xs text-white/40">
              من {stats.totalLessons}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs text-white/45">نسبة التقدم</p>

            <p className="mt-2 text-3xl font-black text-white">
              {stats.progressPercent ?? 0}%
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs text-white/45">الاختبارات</p>

            <p className="mt-2 text-3xl font-black text-white">
              {attempts.length}
            </p>

            <p className="mt-1 text-xs text-white/40">
              آخر المحاولات
            </p>
          </div>

          <div className="rounded-3xl border border-orange-300/10 bg-orange-300/5 p-5">
            <p className="text-xs text-white/45">الاستمرارية</p>

            <p className="mt-2 text-3xl font-black text-white">
              🔥 {stats.streak}
            </p>

            <p className="mt-1 text-xs text-orange-200/60">
              أيام متتالية
            </p>
          </div>
        </section>

        {!hasProgress ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <div className="text-5xl">🌱</div>

            <h2 className="mt-4 text-xl font-black text-white">
              رحلتك مازالت في البداية
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">
              ابدأ بأول درس أو اختبار، وراح يبدأ تقدمك وXP بالظهور هنا.
            </p>

            <Link
              href="/courses"
              className="mt-5 inline-flex rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300"
            >
              ابدأ الدراسة
            </Link>
          </section>
        ) : (
          <>
            {/* Level progress */}
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-white/45">
                    تقدم المستوى الحالي
                  </p>

                  <h2 className="mt-1 text-xl font-black text-white">
                    المستوى {levelInfo.level}
                  </h2>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-sm font-bold text-cyan-300">
                    {levelInfo.xpIntoLevel} / {levelInfo.xpForNext} XP
                  </p>
                </div>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all"
                  style={{
                    width: `${levelInfo.progress}%`,
                  }}
                />
              </div>
            </section>

            {/* Courses */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">
                    📚 تقدم المواد
                  </h2>

                  <p className="mt-1 text-sm text-white/45">
                    نسبة إنجازك في كل مادة.
                  </p>
                </div>

                <Link
                  href="/courses"
                  className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
                >
                  عرض الكل
                </Link>
              </div>

              {courses.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/45">
                  لا توجد دورات منشورة حالياً.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {courses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/courses/${course.id}`}
                      className="group rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.07]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-cyan-300">
                            {course.subject?.name ?? "مادة"}
                          </p>

                          <h3 className="mt-1 truncate text-lg font-black text-white">
                            {course.title}
                          </h3>
                        </div>

                        <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/70">
                          {course.progressPercent}%
                        </span>
                      </div>

                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-cyan-400 transition-all"
                          style={{
                            width: `${course.progressPercent}%`,
                          }}
                        />
                      </div>

                      <p className="mt-3 text-xs text-white/40">
                        {course.completedLessons} من {course.lessonsCount}{" "}
                        دروس مكتملة
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Achievements */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">
                    🏆 الإنجازات المحققة
                  </h2>

                  <p className="mt-1 text-sm text-white/45">
                    الإنجازات التي فتحتها خلال رحلتك.
                  </p>
                </div>

                <Link
                  href="/achievements"
                  className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
                >
                  عرض الكل
                </Link>
              </div>

              {achievements.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/45">
                  مازال ما فتحت حتى إنجاز. كمل دراستك وابدأ تجمعهم 🏆
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {achievements.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-white/10 bg-white/5 p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-300/10 text-2xl">
                          {item.achievement.icon}
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-white">
                            {item.achievement.title}
                          </p>

                          {item.achievement.description && (
                            <p className="mt-1 text-xs leading-5 text-white/45">
                              {item.achievement.description}
                            </p>
                          )}

                          <p className="mt-2 text-xs font-bold text-yellow-300">
                            +{item.achievement.xp_reward} XP
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Quiz attempts */}
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-black text-white">
                  📝 نتائج الاختبارات
                </h2>

                <p className="mt-1 text-sm text-white/45">
                  آخر محاولاتك في الاختبارات.
                </p>
              </div>

              {attempts.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/45">
                  مازال ما درتش حتى اختبار.
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                  <div className="divide-y divide-white/10">
                    {attempts.map((attempt) => (
                      <div
                        key={attempt.id}
                        className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-bold text-white">
                            {attempt.quiz?.title ?? "اختبار"}
                          </p>

                          <p className="mt-1 text-xs text-white/40">
                            {formatDateAr(attempt.completed_at)}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-left">
                            <p className="text-lg font-black text-white">
                              {attempt.score}%
                            </p>

                            <p className="text-xs text-white/40">
                              {attempt.correct_answers}/
                              {attempt.total_questions}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* XP history */}
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-black text-white">
                  ⚡ سجل XP
                </h2>

                <p className="mt-1 text-sm text-white/45">
                  آخر العمليات التي منحتك XP.
                </p>
              </div>

              {xpTransactions.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/45">
                  لا توجد عمليات XP حتى الآن.
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                  <div className="divide-y divide-white/10">
                    {xpTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between gap-4 p-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">
                            {xpReasonLabel(transaction.reason)}
                          </p>

                          <p className="mt-1 text-xs text-white/40">
                            {formatDateAr(transaction.created_at)}
                          </p>
                        </div>

                        <span className="shrink-0 text-sm font-black text-cyan-300">
                          +{transaction.amount} XP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}



