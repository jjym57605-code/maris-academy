
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getSupabase } from "@/lib/supabase";
import { useStreamPreview } from "@/contexts/stream-preview";

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
    accent: "from-pink-500/15 to-rose-500/5",
    iconBorder: "border-pink-400/20",
  },
  {
    href: "/courses",
    icon: "📚",
    title: "الدورات",
    description: "جميع الدروس والدورات",
    accent: "from-cyan-500/15 to-blue-500/5",
    iconBorder: "border-cyan-400/20",
  },
  {
    href: "/quizzes",
    icon: "📝",
    title: "الاختبارات",
    description: "اختبر معلوماتك",
    accent: "from-violet-500/15 to-purple-500/5",
    iconBorder: "border-violet-400/20",
  },
  {
    href: "/arena",
    icon: "⚔️",
    title: "ساحة التحديات",
    description: "تحدَّ زملاءك وأثبت مستواك",
    accent: "from-indigo-500/20 to-cyan-500/10",
    iconBorder: "border-cyan-300/25",
  },
  {
    href: "/progress",
    icon: "📊",
    title: "تقدمي",
    description: "تابع مستواك وتقدمك",
    accent: "from-emerald-500/15 to-teal-500/5",
    iconBorder: "border-emerald-400/20",
  },
  {
    href: "/study-sessions",
    icon: "⏱️",
    title: "جلسات الدراسة",
    description: "نظّم وقت مراجعتك وتابع جلساتك",
    accent: "from-sky-500/15 to-cyan-500/5",
    iconBorder: "border-sky-400/20",
  },
  {
    href: "/leaderboard",
    icon: "🏆",
    title: "الترتيب",
    description: "شاهد ترتيب الطلبة",
    accent: "from-amber-500/15 to-orange-500/5",
    iconBorder: "border-amber-400/20",
  },
    {
    href: "/bac-tools",
    icon: "🎓",
    title: "أدوات البكالوريا",
    description: "احسب معدلك وتابع العدّ التنازلي للباك",
    accent: "from-cyan-500/15 to-indigo-500/10",
    iconBorder: "border-cyan-300/20",
  },
    {
    href: "/premium",
    icon: "💎",
    title: "MARIS PREMIUM",
    description: "اكتشف الاشتراكات الشهرية والسنوية ومميزاتها",
    accent: "from-amber-400/15 to-cyan-500/10",
    iconBorder: "border-amber-300/25",
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="mt-1 h-10 w-1 shrink-0 rounded-full bg-gradient-to-b from-cyan-300 to-blue-600" />
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/80 sm:text-xs">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-6 text-slate-400 sm:text-sm">
          {description}
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  href,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/50 px-5 py-10 text-center sm:px-8">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-400/15 bg-cyan-400/5 text-3xl">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-black text-white sm:text-lg">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-400 sm:text-sm">
        {description}
      </p>
      {href && action && (
        <Link
          href={href}
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300"
        >
          {action}
          <span aria-hidden="true">←</span>
        </Link>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { previewStream } = useStreamPreview();

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

        const effectiveStream =
          previewStream ?? profileData?.stream ?? null;

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
            effectiveStream
          ),
        ]);

        if (!mounted) return;

        const visibleNextLesson = previewStream
          ? nextLessonData &&
            coursesData.some(
              (course) =>
                course.id === nextLessonData.course?.id
            )
            ? nextLessonData
            : null
          : nextLessonData;

        setProfile(profileData);
        setAnnouncements(announcementsData ?? []);
        setNextLesson(visibleNextLesson);
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

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, [previewStream]);

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen overflow-x-clip px-3 py-5 sm:px-6 sm:py-8 lg:px-8"
      >
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-56 rounded-[2rem] border border-cyan-400/10 bg-slate-900/70 sm:h-64" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <div className="h-32 rounded-3xl bg-slate-900/70" />
            <div className="h-32 rounded-3xl bg-slate-900/70" />
            <div className="col-span-2 h-32 rounded-3xl bg-slate-900/70 lg:col-span-1" />
          </div>
          <div className="h-52 rounded-3xl bg-slate-900/70" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="h-56 rounded-3xl bg-slate-900/70" />
            <div className="h-56 rounded-3xl bg-slate-900/70" />
            <div className="h-56 rounded-3xl bg-slate-900/70" />
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
    <main
      dir="rtl"
      className="relative min-h-screen overflow-x-clip px-3 py-5 text-white sm:px-6 sm:py-8 lg:px-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(8,145,178,0.10),transparent_65%)]"
      />

      <div className="mx-auto max-w-7xl space-y-9 sm:space-y-12">
        {/* HERO */}
        <section
          data-tour="dashboard-hero"
          className="relative isolate overflow-hidden rounded-[1.75rem] border border-cyan-300/15 bg-[#071321] shadow-2xl shadow-black/20 sm:rounded-[2rem]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(6,182,212,0.17),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(37,99,235,0.13),transparent_55%)]"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 top-10 -z-10 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl sm:h-64 sm:w-64"
          />

          <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10 lg:p-10">
            <div className="min-w-0">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-2 text-[10px] font-black tracking-wide text-cyan-200 sm:px-4 sm:text-xs">
                <span className="text-base">🌊</span>
                <span>MARIS ACADEMY</span>
                <span className="text-cyan-400/60">²⁰²⁷</span>
              </div>

              <p className="mt-6 text-xs font-bold text-cyan-300 sm:text-sm">
                رحلتك نحو النجاح تبدأ من هنا
              </p>

              <h1 className="mt-2 break-words text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                مرحبًا،{" "}
                <span className="bg-gradient-to-l from-cyan-200 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  {firstName}
                </span>{" "}
                👋
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
                كل خطوة تتعلمها تقربك لهدفك. نظّم مراجعتك، تابع تقدمك،
                وواصل رحلتك نحو بكالوريا 2027 مع MARIS ACADEMY.
              </p>

              {previewStream && (
                <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-100">
                  <span>👁️</span>
                  <span className="break-words">
                    معاينة شعبة {previewStream}
                  </span>
                </div>
              )}

              <div className="mt-7 flex flex-col gap-3 min-[420px]:flex-row">
                <Link
                  href="/courses"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/15 transition hover:bg-cyan-300 active:scale-[0.98]"
                >
                  <span>📚</span>
                  ابدأ التعلّم
                  <span aria-hidden="true">←</span>
                </Link>

                <Link
                  href="/progress"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.07] active:scale-[0.98]"
                >
                  <span>📊</span>
                  اكتشف تقدمك
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:w-56 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-400">
                    إنجازك الحالي
                  </span>
                  <span className="text-lg">✨</span>
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-3xl font-black tabular-nums text-white sm:text-4xl">
                    {progressPercentage}%
                  </span>
                  <span className="mb-1 text-[10px] text-slate-500 sm:text-xs">
                    من الدروس
                  </span>
                </div>
                <div
                  className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800"
                  role="progressbar"
                  aria-label="نسبة إكمال الدروس"
                  aria-valuenow={progressPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-cyan-300 to-blue-500 transition-all duration-700"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-400">
                    الدروس المكتملة
                  </span>
                  <span className="text-lg">🎯</span>
                </div>
                <p className="mt-3 text-3xl font-black tabular-nums text-white sm:text-4xl">
                  {completedLessons}
                  <span className="mr-1 text-sm font-medium text-slate-500">
                    / {totalLessons}
                  </span>
                </p>
                <p className="mt-2 text-[10px] leading-5 text-slate-500 sm:text-xs">
                  كل درس تكمله هو خطوة أخرى للأمام
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-white/[0.06] bg-black/10 px-5 py-3 text-[10px] text-slate-400 sm:px-8 sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            تعلّم بذكاء، تقدّم بثبات، واصنع نجاحك.
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <section
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-950/30 p-4 text-sm leading-7 text-red-200"
          >
            <span className="text-lg">⚠️</span>
            <p>{error}</p>
          </section>
        )}

        {/* STATS */}
        <section
          data-tour="dashboard-progress"
          className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4"
        >
          <div className="group relative overflow-hidden rounded-2xl border border-cyan-400/10 bg-slate-900/60 p-4 transition hover:border-cyan-400/25 sm:rounded-3xl sm:p-6">
            <div className="absolute -left-6 -top-6 h-20 w-20 rounded-full bg-cyan-400/[0.07] blur-2xl transition group-hover:bg-cyan-400/15" />
            <div className="relative flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-bold leading-5 text-slate-400 sm:text-sm">
                  الدروس المكتملة
                </p>
                <p className="mt-3 text-3xl font-black tabular-nums text-white sm:text-4xl">
                  {completedLessons}
                </p>
                <p className="mt-2 text-[10px] text-slate-500 sm:text-xs">
                  من أصل {totalLessons} درس
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/10 text-xl sm:h-12 sm:w-12 sm:rounded-2xl sm:text-2xl">
                📚
              </div>
            </div>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-700"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-emerald-400/10 bg-slate-900/60 p-4 transition hover:border-emerald-400/25 sm:rounded-3xl sm:p-6">
            <div className="absolute -left-6 -top-6 h-20 w-20 rounded-full bg-emerald-400/[0.07] blur-2xl transition group-hover:bg-emerald-400/15" />
            <div className="relative flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-bold leading-5 text-slate-400 sm:text-sm">
                  نسبة التقدم
                </p>
                <p className="mt-3 text-3xl font-black tabular-nums text-white sm:text-4xl">
                  {progressPercentage}%
                </p>
                <p className="mt-2 text-[10px] text-slate-500 sm:text-xs">
                  واصل، أنت قادر 💪
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/10 text-xl sm:h-12 sm:w-12 sm:rounded-2xl sm:text-2xl">
                📈
              </div>
            </div>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-teal-300 transition-all duration-700"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <div className="group relative col-span-2 overflow-hidden rounded-2xl border border-amber-400/10 bg-slate-900/60 p-4 transition hover:border-amber-400/25 sm:rounded-3xl sm:p-6 lg:col-span-1">
            <div className="absolute -left-6 -top-6 h-20 w-20 rounded-full bg-amber-400/[0.07] blur-2xl transition group-hover:bg-amber-400/15" />
            <div className="relative flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-bold leading-5 text-slate-400 sm:text-sm">
                  الإعلانات الحالية
                </p>
                <p className="mt-3 text-3xl font-black tabular-nums text-white sm:text-4xl">
                  {announcements.length}
                </p>
                <p className="mt-2 text-[10px] text-slate-500 sm:text-xs">
                  آخر أخبار الأكاديمية
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/15 bg-amber-400/10 text-xl sm:h-12 sm:w-12 sm:rounded-2xl sm:text-2xl">
                📢
              </div>
            </div>
          </div>
        </section>

        {/* ANNOUNCEMENTS */}
        <section data-tour="dashboard-announcements">
          <SectionHeading
            eyebrow="ACADEMY NEWS"
            title="آخر الإعلانات"
            description="ابقَ على اطلاع بآخر أخبار وتحديثات الأكاديمية."
          />

          {announcements.length === 0 ? (
            <EmptyState
              icon="📭"
              title="لا توجد إعلانات حاليًا"
              description="ستظهر هنا آخر الأخبار والتحديثات من MARIS ACADEMY."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
              {announcements.map((announcement) => (
                <article
                  key={announcement.id}
                  className="group min-w-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-slate-900/60 transition hover:border-cyan-400/20 sm:rounded-3xl"
                >
                  {announcement.image_url && (
                    <div className="overflow-hidden bg-slate-950">
                      <img
                        src={announcement.image_url}
                        alt={String(announcement.title)}
                        loading="lazy"
                        className="max-h-[420px] w-full object-cover transition duration-500 group-hover:scale-[1.01]"
                      />
                    </div>
                  )}

                  <div className="p-4 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-full border border-cyan-400/15 bg-cyan-400/[0.07] px-3 py-1.5 text-[10px] font-black text-cyan-200 sm:text-xs">
                        {announcement.type === "course"
                          ? "📚 دورة"
                          : announcement.type === "teacher"
                            ? "👨‍🏫 أستاذ"
                            : announcement.type === "update"
                              ? "✨ تحديث"
                              : "📢 عام"}
                      </span>

                      <time
                        dateTime={announcement.created_at}
                        className="text-[10px] text-slate-500 sm:text-xs"
                      >
                        {new Date(
                          announcement.created_at
                        ).toLocaleDateString("ar-DZ")}
                      </time>
                    </div>

                    <h3 className="mt-4 break-words text-lg font-black leading-8 text-white sm:text-xl">
                      {String(announcement.title)}
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-7 text-slate-300 sm:text-sm">
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
          <SectionHeading
            eyebrow="KEEP LEARNING"
            title="تابع من حيث توقفت"
            description="ارجع إلى الدرس المقترح وواصل رحلتك التعليمية."
          />

          {nextLesson ? (
            <div className="relative overflow-hidden rounded-2xl border border-cyan-400/15 bg-gradient-to-l from-cyan-950/40 via-slate-900/80 to-slate-900/60 sm:rounded-3xl">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl"
              />

              <div className="relative flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
                <div className="min-w-0">
                  <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black text-cyan-200 sm:text-xs">
                    🎯 الدرس التالي
                  </span>

                  <h3 className="mt-4 break-words text-xl font-black leading-8 text-white sm:text-2xl">
                    {String(nextLesson.lesson.title)}
                  </h3>

                  {nextLesson.course && (
                    <p className="mt-2 break-words text-xs leading-6 text-slate-400 sm:text-sm">
                      📚 {String(nextLesson.course.title)}
                    </p>
                  )}

                  <p className="mt-3 text-xs leading-6 text-slate-400">
                    خصّص وقتًا للمراجعة، فكل درس يقربك من هدفك.
                  </p>
                </div>

                <Link
                  href={`/lessons/${String(nextLesson.lesson.id)}`}
                  className="inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:bg-cyan-300 active:scale-[0.98] sm:rounded-2xl"
                >
                  متابعة الدرس
                  <span aria-hidden="true">←</span>
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState
              icon="🎉"
              title="لا يوجد درس مقترح حاليًا"
              description="تقدر تختار دورة من الدورات المتاحة وتبدأ التعلم من الآن."
              href="/courses"
              action="تصفح الدورات"
            />
          )}
        </section>

        {/* COURSES */}
        <section data-tour="dashboard-courses">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <SectionHeading
                eyebrow="YOUR LEARNING"
                title="دوراتك التعليمية"
                description="تابع تقدمك وافتح الدورة التي تريد مواصلة دراستها."
              />
            </div>

            <Link
              href="/courses"
              className="mb-5 inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-xs font-black text-cyan-300 transition hover:bg-cyan-300/10 hover:text-cyan-200 sm:text-sm"
            >
              عرض الكل
              <span aria-hidden="true">←</span>
            </Link>
          </div>

          {courses.length === 0 ? (
            <EmptyState
              icon="📚"
              title="لم تبدأ أي دورة بعد"
              description="اكتشف الدورات المتاحة واختر ما يناسب مسارك الدراسي."
              href="/courses"
              action="استكشف الدورات"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => {
                const completed = Number(
                  course.completedLessons ?? 0
                );
                const total = Number(course.lessonsCount ?? 0);

                const courseProgress = Math.min(
                  100,
                  Math.max(0, Number(course.progressPercent ?? 0))
                );

                return (
                  <Link
                    key={String(course.id)}
                    href={`/courses/${String(course.id)}`}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-slate-900/60 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/25 hover:shadow-xl hover:shadow-cyan-950/10 sm:rounded-3xl"
                  >
                    <div className="h-1 w-full bg-gradient-to-l from-cyan-400 via-blue-500 to-transparent opacity-60 transition group-hover:opacity-100" />

                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.07] text-2xl transition group-hover:bg-cyan-400/15">
                          📘
                        </div>

                        <span className="rounded-full border border-cyan-400/15 bg-cyan-400/[0.07] px-3 py-1.5 text-xs font-black tabular-nums text-cyan-200">
                          {courseProgress}%
                        </span>
                      </div>

                      <h3 className="mt-5 line-clamp-2 break-words text-lg font-black leading-8 text-white transition group-hover:text-cyan-200 sm:text-xl">
                        {String(course.title)}
                      </h3>

                      {course.description ? (
                        <p className="mt-2 line-clamp-2 break-words text-xs leading-6 text-slate-400 sm:text-sm">
                          {String(course.description)}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs leading-6 text-slate-500">
                          دورة تعليمية ضمن مسارك الدراسي.
                        </p>
                      )}

                      <div className="mt-auto pt-6">
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                          <span className="text-slate-400">
                            تقدمك في الدورة
                          </span>
                          <span className="font-bold tabular-nums text-slate-200">
                            {completed} / {total}
                          </span>
                        </div>

                        <div
                          className="h-2 overflow-hidden rounded-full bg-slate-800"
                          role="progressbar"
                          aria-label={`التقدم في دورة ${String(course.title)}`}
                          aria-valuenow={courseProgress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-l from-cyan-300 to-emerald-400 transition-all duration-700"
                            style={{ width: `${courseProgress}%` }}
                          />
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs font-bold sm:text-sm">
                          <span className="text-slate-400 transition group-hover:text-slate-200">
                            فتح الدورة
                          </span>
                          <span
                            aria-hidden="true"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-cyan-300 transition group-hover:border-cyan-400/20 group-hover:bg-cyan-400/10"
                          >
                            ←
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* QUICK LINKS */}
        <section data-tour="dashboard-quick-links">
          <SectionHeading
            eyebrow="EXPLORE MARIS"
            title="الوصول السريع"
            description="كل الأدوات التعليمية التي تحتاجها، في مكان واحد."
          />

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br ${item.accent} bg-slate-900/60 p-4 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/25 hover:shadow-xl hover:shadow-black/10 sm:rounded-3xl sm:p-5`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${item.iconBorder} bg-slate-950/30 text-2xl transition group-hover:scale-105 sm:h-12 sm:w-12 sm:text-3xl`}
                  >
                    {item.icon}
                  </div>

                  <span
                    aria-hidden="true"
                    className="mt-1 text-sm text-slate-500 transition group-hover:-translate-x-1 group-hover:text-cyan-300"
                  >
                    ←
                  </span>
                </div>

                <h3 className="mt-4 break-words text-sm font-black leading-6 text-white transition group-hover:text-cyan-200 sm:text-lg">
                  {item.title}
                </h3>

                <p className="mt-1 break-words text-[10px] leading-5 text-slate-400 sm:text-xs sm:leading-6">
                  {item.description}
                </p>
              </Link>
            ))}

            {profile?.is_admin && (
              <>
                <Link
                  href="/admin"
                  className="group flex min-w-0 flex-col rounded-2xl border border-purple-400/15 bg-gradient-to-br from-purple-500/10 to-slate-900/60 p-4 transition hover:-translate-y-1 hover:border-purple-400/35 sm:rounded-3xl sm:p-5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-400/10 text-2xl sm:h-12 sm:w-12 sm:text-3xl">
                    👑
                  </div>
                  <h3 className="mt-4 break-words text-sm font-black leading-6 text-white transition group-hover:text-purple-200 sm:text-lg">
                    لوحة الإدارة
                  </h3>
                  <p className="mt-1 text-[10px] leading-5 text-slate-400 sm:text-xs sm:leading-6">
                    إدارة الأكاديمية ومحتواها
                  </p>
                </Link>

                <Link
                  href="/admin/teachers"
                  className="group flex min-w-0 flex-col rounded-2xl border border-amber-400/15 bg-gradient-to-br from-amber-500/10 to-slate-900/60 p-4 transition hover:-translate-y-1 hover:border-amber-400/35 sm:rounded-3xl sm:p-5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-2xl sm:h-12 sm:w-12 sm:text-3xl">
                    🎓
                  </div>
                  <h3 className="mt-4 break-words text-sm font-black leading-6 text-white transition group-hover:text-amber-200 sm:text-lg">
                    طلبات الأساتذة
                  </h3>
                  <p className="mt-1 text-[10px] leading-5 text-slate-400 sm:text-xs sm:leading-6">
                    عرض ومراجعة طلبات الانضمام
                  </p>
                </Link>
              </>
            )}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/[0.06] pb-5 pt-6 text-center sm:pt-8">
          <div className="inline-flex items-center gap-2 text-xs font-black text-slate-400 sm:text-sm">
            <span>🌊</span>
            <span>MARIS ACADEMY</span>
            <span className="text-cyan-500">²⁰²⁷</span>
          </div>
          <p className="mt-2 text-[10px] leading-6 text-slate-500 sm:text-xs">
            نبني مستقبل BAC 2027 معًا، خطوة بخطوة.
          </p>
        </footer>
      </div>
    </main>
  );
}
