
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getSupabase } from "@/lib/supabase";

import {
  getSession,
  getProfile,
  type Profile,
} from "@/services/auth";

import {
  getNextLesson,
  listCoursesWithProgress,
  type CourseWithMeta,
} from "@/services/courses";

import {
  getActiveAnnouncements,
  type Announcement,
} from "@/services/announcements";

import type { Course, Lesson } from "@/types/database";

type NextLessonData = {
  lesson: Lesson;
  course: Course | null;
};

const QUICK_LINKS = [
  {
    href: "/reels",
    icon: "🎬",
    title: "الريلزات",
    description: "فيديوهات تعليمية قصيرة",
  },
  {
    href: "/courses",
    icon: "📚",
    title: "الدورات",
    description: "جميع الدروس والدورات",
  },
  {
    href: "/quizzes",
    icon: "📝",
    title: "الاختبارات",
    description: "اختبر معلوماتك",
  },
  {
    href: "/progress",
    icon: "📊",
    title: "تقدمي",
    description: "تابع مستواك وتقدمك",
  },
  {
    href: "/leaderboard",
    icon: "🏆",
    title: "الترتيب",
    description: "شاهد ترتيب الطلبة",
  },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [nextLesson, setNextLesson] =
    useState<NextLessonData | null>(null);
  const [courses, setCourses] = useState<CourseWithMeta[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const supabase = getSupabase();

        if (!supabase) {
          throw new Error("تعذر الاتصال بقاعدة البيانات.");
        }

        const session = await getSession(supabase);

        if (!session?.user) {
          throw new Error("يجب تسجيل الدخول أولًا.");
        }

        const userId = session.user.id;
        const profileData = await getProfile(supabase, userId);

        const [
          announcementsData,
          nextLessonData,
          coursesData,
        ] = await Promise.all([
          getActiveAnnouncements(),
          getNextLesson(supabase, userId),
          listCoursesWithProgress(
            supabase,
            userId,
            profileData?.stream ?? null
          ),
        ]);

        if (!mounted) return;

        setProfile(profileData);
        setAnnouncements(announcementsData ?? []);
        setNextLesson(nextLessonData);
        setCourses(coursesData ?? []);
      } catch (err) {
        console.error("Dashboard loading error:", err);

        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "حدث خطأ أثناء تحميل لوحة التحكم."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <main dir="rtl" className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-40 rounded-3xl border border-cyan-400/10 bg-slate-900/60" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-32 rounded-3xl bg-slate-900/60" />
            <div className="h-32 rounded-3xl bg-slate-900/60" />
            <div className="h-32 rounded-3xl bg-slate-900/60" />
          </div>

          <div className="h-56 rounded-3xl bg-slate-900/60" />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="h-64 rounded-3xl bg-slate-900/60" />
            <div className="h-64 rounded-3xl bg-slate-900/60" />
            <div className="h-64 rounded-3xl bg-slate-900/60" />
          </div>
        </div>
      </main>
    );
  }

  const totalLessons = courses.reduce(
    (sum, course) => sum + Number(course.lessonsCount ?? 0),
    0
  );

  const completedLessons = courses.reduce(
    (sum, course) => sum + Number(course.completedLessons ?? 0),
    0
  );

  const progressPercentage =
    totalLessons > 0
      ? Math.min(
          100,
          Math.round((completedLessons / totalLessons) * 100)
        )
      : 0;

  const firstName = profile?.first_name?.trim() || "طالب";

  return (
    <main dir="rtl" className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* HERO */}
        <section
          data-tour="dashboard-hero"
          className="relative overflow-hidden rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-2xl shadow-cyan-950/20 sm:p-8"
        >
          <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-200 backdrop-blur">
                🌊 MARIS ACADEMY ²⁰²⁷
              </div>

              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
                مرحبًا {firstName} 👋
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                مرحبًا بك في لوحة التحكم الخاصة بك. تابع دروسك وتقدمك وآخر أخبار الأكاديمية استعدادًا لـ BAC 2027.
              </p>
            </div>

            <div className="relative flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.02] hover:bg-cyan-300"
              >
                📚 الدروس
              </Link>

              <Link
                href="/progress"
                className="rounded-2xl border border-cyan-300/20 bg-white/5 px-5 py-3 text-sm font-bold text-cyan-100 backdrop-blur transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
              >
                📊 تقدمي
              </Link>
            </div>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <section className="rounded-2xl border border-red-400/20 bg-red-950/30 p-4 text-sm text-red-300">
            ⚠️ {error}
          </section>
        )}

        {/* QUICK STATS */}
        <section
          data-tour="dashboard-progress"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="group rounded-3xl border border-cyan-400/10 bg-slate-900/60 p-5 shadow-xl shadow-black/10 backdrop-blur transition hover:-translate-y-1 hover:border-cyan-400/25">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  الدروس المكتملة
                </p>
                <p className="mt-2 text-3xl font-black text-white">
                  {completedLessons}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  من أصل {totalLessons} درس
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/10 bg-cyan-400/10 text-2xl">
                📚
              </div>
            </div>
          </div>

          <div className="group rounded-3xl border border-emerald-400/10 bg-slate-900/60 p-5 shadow-xl shadow-black/10 backdrop-blur transition hover:-translate-y-1 hover:border-emerald-400/25">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  نسبة التقدم
                </p>
                <p className="mt-2 text-3xl font-black text-white">
                  {progressPercentage}%
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  استمر، أنت قادر 💪
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/10 bg-emerald-400/10 text-2xl">
                📈
              </div>
            </div>
          </div>

          <div className="group rounded-3xl border border-amber-400/10 bg-slate-900/60 p-5 shadow-xl shadow-black/10 backdrop-blur transition hover:-translate-y-1 hover:border-amber-400/25 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  الإعلانات الحالية
                </p>
                <p className="mt-2 text-3xl font-black text-white">
                  {announcements.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  آخر أخبار الأكاديمية
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/10 bg-amber-400/10 text-2xl">
                📢
              </div>
            </div>
          </div>
        </section>

        {/* ANNOUNCEMENTS */}
        <section data-tour="dashboard-announcements">
          <div className="mb-4">
            <h2 className="text-xl font-black text-slate-900">
              📢 آخر الإعلانات
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              أهم الأخبار والتحديثات من MARIS ACADEMY
            </p>
          </div>

          {announcements.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-cyan-400/15 bg-slate-900/60 p-8 text-center">
              <div className="text-4xl">📭</div>
              <p className="mt-3 font-bold text-slate-200">
                لا توجد إعلانات حاليًا
              </p>
              <p className="mt-1 text-sm text-slate-500">
                سنضع هنا آخر أخبار الأكاديمية.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {announcements.map((announcement) => (
                <article
                  key={announcement.id}
                  className="overflow-hidden rounded-3xl border border-cyan-400/10 bg-slate-900/60 shadow-xl shadow-black/10 backdrop-blur transition hover:-translate-y-1 hover:border-cyan-400/25"
                >
                  {announcement.image_url && (
                    <div className="overflow-hidden bg-slate-950">
                      <img
                        src={announcement.image_url}
                        alt={String(announcement.title)}
                        className="h-auto max-h-[600px] w-full object-cover transition duration-500 hover:scale-[1.01]"
                      />
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-400/10 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                        {announcement.type === "course"
                          ? "📚 دورة"
                          : announcement.type === "teacher"
                            ? "👨‍🏫 أستاذ"
                            : announcement.type === "update"
                              ? "✨ تحديث"
                              : "📢 عام"}
                      </span>

                      <span className="text-xs text-slate-500">
                        {new Date(
                          announcement.created_at
                        ).toLocaleDateString("ar-DZ")}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-black leading-8 text-slate-900">
                      {String(announcement.title)}
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                      {String(announcement.content)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* NEXT LESSON */}
        <section data-tour="dashboard-next-lesson">
          <div className="mb-4">
            <h2 className="text-xl font-black text-slate-900">
              🎯 تابع من حيث توقفت
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              الدرس التالي المقترح لك
            </p>
          </div>

          {nextLesson ? (
            <div className="overflow-hidden rounded-3xl border border-cyan-400/10 bg-slate-900/60 shadow-xl shadow-black/10 backdrop-blur">
              <div className="p-6 sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="inline-flex rounded-full border border-cyan-400/10 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                      الدرس التالي
                    </span>

                    <h3 className="mt-3 text-xl font-black text-white">
                      {String(nextLesson.lesson.title)}
                    </h3>

                    {nextLesson.course && (
                      <p className="mt-2 text-sm text-slate-400">
                        📚 {String(nextLesson.course.title)}
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/lessons/${String(nextLesson.lesson.id)}`}
                    className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:scale-[1.02] hover:bg-cyan-300"
                  >
                    متابعة الدرس →
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-cyan-400/15 bg-slate-900/60 p-8 text-center">
              <div className="text-4xl">🎉</div>
              <h3 className="mt-3 font-black text-slate-200">
                لا يوجد درس مقترح حاليًا
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                يمكنك اختيار دورة والبدء في التعلم.
              </p>
              <Link
                href="/courses"
                className="mt-5 inline-flex rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300"
              >
                تصفح الدورات
              </Link>
            </div>
          )}
        </section>

        {/* COURSES */}
        <section data-tour="dashboard-courses">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                📚 دوراتك
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                تابع تقدمك في الدورات التعليمية
              </p>
            </div>

            <Link
              href="/courses"
              className="text-sm font-bold text-cyan-700 transition hover:text-cyan-800"
            >
              عرض الكل →
            </Link>
          </div>

          {courses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-cyan-400/15 bg-slate-900/60 p-8 text-center">
              <div className="text-4xl">📚</div>
              <p className="mt-3 font-bold text-slate-200">
                لم تبدأ أي دورة بعد
              </p>
              <Link
                href="/courses"
                className="mt-5 inline-flex rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300"
              >
                استكشف الدورات
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => {
                const completed = Number(course.completedLessons ?? 0);
                const total = Number(course.lessonsCount ?? 0);

                const courseProgress = Math.min(
                  100,
                  Math.max(0, Number(course.progressPercent ?? 0))
                );

                return (
                  <Link
                    key={String(course.id)}
                    href={`/courses/${String(course.id)}`}
                    className="group overflow-hidden rounded-3xl border border-cyan-400/10 bg-slate-900/60 shadow-xl shadow-black/10 backdrop-blur transition hover:-translate-y-1 hover:border-cyan-400/25"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/10 bg-cyan-400/10 text-2xl">
                          📘
                        </div>

                        <span className="rounded-full border border-cyan-400/10 bg-slate-950/60 px-3 py-1 text-xs font-bold text-cyan-300">
                          {courseProgress}%
                        </span>
                      </div>

                      <h3 className="mt-5 line-clamp-2 text-lg font-black leading-8 text-slate-900 transition group-hover:text-cyan-700">
                        {String(course.title)}
                      </h3>

                      {course.description && (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                          {String(course.description)}
                        </p>
                      )}

                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="text-slate-500">التقدم</span>
                          <span className="font-bold text-slate-700">
                            {completed}/{total}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
                            style={{ width: `${courseProgress}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between text-sm font-bold">
                        <span className="text-slate-500">
                          فتح الدورة
                        </span>
                        <span className="text-cyan-700 transition group-hover:translate-x-1">
                          →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* QUICK ACTIONS */}
        <section data-tour="dashboard-quick-links">
          <div className="mb-4">
            <h2 className="text-xl font-black text-slate-900">
              ⚡ الوصول السريع
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              أهم أقسام MARIS ACADEMY في مكان واحد
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-3xl border border-cyan-400/10 bg-slate-900/60 p-5 shadow-xl shadow-black/10 backdrop-blur transition hover:-translate-y-1 hover:border-cyan-400/25"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-3xl">
                  {item.icon}
                </div>

                <h3 className="mt-4 font-black text-white transition group-hover:text-cyan-300">
                  {item.title}
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  {item.description}
                </p>
              </Link>
            ))}

            {profile?.is_admin && (
              <Link
                href="/admin"
                className="group rounded-3xl border border-purple-400/20 bg-purple-950/20 p-5 shadow-xl shadow-black/10 backdrop-blur transition hover:-translate-y-1 hover:border-purple-400/40"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-400/10 text-3xl">
                  👑
                </div>

                <h3 className="mt-4 font-black text-white transition group-hover:text-purple-300">
                  لوحة الإدارة
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  إدارة الأكاديمية ومحتواها
                </p>
              </Link>
            )}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="pb-8 pt-4 text-center">
          <p className="text-xs text-slate-500">
            🌊 MARIS ACADEMY ²⁰²⁷ — نبني مستقبل BAC 2027 معًا
          </p>
        </footer>
      </div>
    </main>
  );
}







