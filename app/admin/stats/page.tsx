"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  stream: string | null;
  is_admin: boolean | null;
};

type XPRow = {
  user_id: string;
  amount: number | null;
};

type ProgressRow = {
  user_id: string;
  lesson_id: string;
};

type Attempt = {
  user_id: string;
  quiz_id: string;
  score: number | null;
  completed_at: string | null;
};

type Quiz = {
  id: string;
  title: string;
};

type Reel = {
  id: string;
  title: string;
  is_published: boolean;
  views_count: number | null;
};

type Interaction = {
  reel_id: string;
};

type StatsData = {
  profiles: Profile[];
  xp: XPRow[];
  progress: ProgressRow[];
  totalLessons: number;
  attempts: Attempt[];
  quizzes: Quiz[];
  reels: Reel[];
  likes: Interaction[];
  comments: Interaction[];
};

const EMPTY_DATA: StatsData = {
  profiles: [],
  xp: [],
  progress: [],
  totalLessons: 0,
  attempts: [],
  quizzes: [],
  reels: [],
  likes: [],
  comments: [],
};

const numberFormat = (value: number) =>
  new Intl.NumberFormat("fr-FR").format(value);

function fullName(profile: Profile) {
  const name = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "طالب بدون اسم";
}

function shortName(profile: Profile) {
  return fullName(profile);
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/75 p-5 shadow-xl shadow-black/10">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
  accent = "cyan",
}: {
  title: string;
  value: number;
  description: string;
  icon: string;
  accent?: "cyan" | "violet" | "emerald" | "amber";
}) {
  const accents = {
    cyan: "border-cyan-400/20 from-cyan-500/15",
    violet: "border-violet-400/20 from-violet-500/15",
    emerald: "border-emerald-400/20 from-emerald-500/15",
    amber: "border-amber-400/20 from-amber-500/15",
  };

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br ${accents[accent]} to-slate-900 p-5`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-300">{title}</p>
        <span className="text-2xl" aria-hidden="true">
          {icon}
        </span>
      </div>

      <p className="mt-4 break-words text-3xl font-black tracking-tight text-white">
        {numberFormat(value)}
      </p>

      <p className="mt-2 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-400">
      {text}
    </p>
  );
}

export default function NewAdminStatsPage() {
  const [data, setData] = useState<StatsData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadStats = useCallback(async () => {
    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بـ Supabase. تحقق من إعدادات البيئة.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setRefreshing(true);
    setError("");
    setWarnings([]);

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!sessionData.session) {
        throw new Error("لازم تسجل الدخول بحساب الأدمن.");
      }

      const {
        data: adminResult,
        error: adminError,
      } = await supabase.rpc("is_current_user_admin");

      if (adminError) throw adminError;

      if (adminResult !== true) {
        throw new Error("ما عندكش صلاحية الدخول لإحصائيات الأدمن.");
      }

      const results = await Promise.all([
        supabase
          .from("profiles")
          .select("id, first_name, last_name, stream, is_admin"),

        supabase
          .from("xp_transactions")
          .select("user_id, amount"),

        supabase
          .from("lesson_progress")
          .select("user_id, lesson_id"),

        supabase
          .from("lessons")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("quiz_attempts")
          .select("user_id, quiz_id, score, completed_at")
          .not("completed_at", "is", null),

        supabase
          .from("quizzes")
          .select("id, title"),

        supabase
          .from("reels")
          .select("id, title, is_published, views_count"),

        supabase
          .from("reel_likes")
          .select("reel_id"),

        supabase
          .from("reel_comments")
          .select("reel_id"),
      ]);

      const labels = [
        "الطلاب والشعب",
        "نقاط XP",
        "الدروس المكتملة",
        "إجمالي الدروس",
        "محاولات الاختبارات",
        "قائمة الاختبارات",
        "الريلزات",
        "إعجابات الريلزات",
        "تعليقات الريلزات",
      ];

      const failed: string[] = [];

      results.forEach((result, index) => {
        if (result.error) {
          console.error(
            `ADMIN STATS - ${labels[index]}:`,
            result.error
          );
          failed.push(
            `${labels[index]}: ${result.error.message}`
          );
        }
      });

console.log(
  "PROFILES DEBUG:",
  JSON.stringify(results[0], null, 2)
);
      const [
        profilesRes,
        xpRes,
        progressRes,
        lessonsRes,
        attemptsRes,
        quizzesRes,
        reelsRes,
        likesRes,
        commentsRes,
      ] = results;

      setData({
        profiles: (profilesRes.data ?? []) as Profile[],
        xp: (xpRes.data ?? []) as XPRow[],
        progress: (progressRes.data ?? []) as ProgressRow[],
        totalLessons: lessonsRes.count ?? 0,
        attempts: (attemptsRes.data ?? []) as Attempt[],
        quizzes: (quizzesRes.data ?? []) as Quiz[],
        reels: (reelsRes.data ?? []) as Reel[],
        likes: (likesRes.data ?? []) as Interaction[],
        comments: (commentsRes.data ?? []) as Interaction[],
      });

      setWarnings(failed);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("NEW ADMIN STATS ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل الإحصائيات."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const stats = useMemo(() => {
    const students = data.profiles.filter(
      (profile) => profile.is_admin !== true
    );

    const admins = data.profiles.filter(
      (profile) => profile.is_admin === true
    );

    const totalXP = data.xp.reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0
    );

    const xpByStudent = new Map<string, number>();

    for (const row of data.xp) {
      xpByStudent.set(
        row.user_id,
        (xpByStudent.get(row.user_id) ?? 0) +
          (Number(row.amount) || 0)
      );
    }

    const topStudents = [...students]
      .map((student) => ({
        ...student,
        xp: xpByStudent.get(student.id) ?? 0,
      }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 5);

    const streamMap = new Map<string, number>();

    for (const student of students) {
      const stream = student.stream?.trim() || "غير محددة";

      streamMap.set(
        stream,
        (streamMap.get(stream) ?? 0) + 1
      );
    }

    const streams = [...streamMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const quizMap = new Map<
      string,
      { attempts: number; scoreTotal: number; scoreCount: number }
    >();

    for (const attempt of data.attempts) {
      if (!attempt.quiz_id) continue;

      const current = quizMap.get(attempt.quiz_id) ?? {
        attempts: 0,
        scoreTotal: 0,
        scoreCount: 0,
      };

      current.attempts += 1;

      if (attempt.score !== null && Number.isFinite(Number(attempt.score))) {
        current.scoreTotal += Number(attempt.score);
        current.scoreCount += 1;
      }

      quizMap.set(attempt.quiz_id, current);
    }

    const quizStats = data.quizzes
      .map((quiz) => {
        const result = quizMap.get(quiz.id);

        return {
          id: quiz.id,
          title: quiz.title,
          attempts: result?.attempts ?? 0,
          average:
            result && result.scoreCount > 0
              ? result.scoreTotal / result.scoreCount
              : null,
        };
      })
      .sort((a, b) => b.attempts - a.attempts);

    const likesByReel = new Map<string, number>();
    const commentsByReel = new Map<string, number>();

    for (const like of data.likes) {
      likesByReel.set(
        like.reel_id,
        (likesByReel.get(like.reel_id) ?? 0) + 1
      );
    }

    for (const comment of data.comments) {
      commentsByReel.set(
        comment.reel_id,
        (commentsByReel.get(comment.reel_id) ?? 0) + 1
      );
    }

    const reelStats = data.reels.map((reel) => ({
      ...reel,
      views: Number(reel.views_count) || 0,
      likes: likesByReel.get(reel.id) ?? 0,
      comments: commentsByReel.get(reel.id) ?? 0,
    }));

    const totalViews = reelStats.reduce(
      (sum, reel) => sum + reel.views,
      0
    );

    const mostViewed = [...reelStats].sort(
      (a, b) => b.views - a.views
    )[0];

    const mostLiked = [...reelStats].sort(
      (a, b) => b.likes - a.likes
    )[0];

    const mostCommented = [...reelStats].sort(
      (a, b) => b.comments - a.comments
    )[0];

    const activeStudents = new Set([
      ...data.xp.map((row) => row.user_id),
      ...data.progress.map((row) => row.user_id),
      ...data.attempts.map((row) => row.user_id),
    ]);

    return {
      students,
      admins,
      totalXP,
      topStudents,
      streams,
      quizStats,
      mostActiveQuiz: quizStats[0],
      totalViews,
      reelStats,
      totalLikes: data.likes.length,
      totalComments: data.comments.length,
      publishedReels: data.reels.filter(
        (reel) => reel.is_published
      ).length,
      mostViewed,
      mostLiked,
      mostCommented,
      activeStudents: activeStudents.size,
    };
  }, [data]);

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#07111f] p-5 text-white md:p-8"
      >
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-28 rounded-2xl bg-slate-800" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-32 rounded-2xl bg-slate-800"
              />
            ))}
          </div>
          <div className="h-72 rounded-2xl bg-slate-800" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#07111f] p-5 text-white md:p-8"
      >
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-400/20 bg-red-950/30 p-6">
          <h1 className="text-xl font-bold text-red-300">
            تعذر تحميل الإحصائيات
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {error}
          </p>
          <button
            onClick={() => void loadStats()}
            className="mt-5 rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-400"
          >
            إعادة المحاولة
          </button>
          <div className="mt-4">
            <Link
              href="/admin"
              className="text-sm text-cyan-300 hover:underline"
            >
              الرجوع إلى لوحة الإدارة
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const maxStreamCount = Math.max(
    1,
    ...stats.streams.map((stream) => stream.count)
  );

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-l from-cyan-950 via-slate-900 to-[#10172b] p-6 sm:p-8">
          <div className="pointer-events-none absolute -left-12 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-cyan-300">
                MARIS ACADEMY 2027
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                مركز الإحصائيات
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                نظرة شاملة على الطلاب والتعلّم والاختبارات ومحتوى المنصة.
              </p>
              <p className="mt-3 text-xs text-slate-400">
                {lastUpdated
                  ? `آخر تحديث: ${lastUpdated.toLocaleTimeString("ar-DZ")}`
                  : "في انتظار البيانات"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => void loadStats()}
                disabled={refreshing}
                className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/20 disabled:opacity-50"
              >
                {refreshing ? "جاري التحديث..." : "↻ تحديث البيانات"}
              </button>

              <Link
                href="/admin"
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                لوحة الإدارة
              </Link>
            </div>
          </div>
        </header>

        {warnings.length > 0 && (
          <section className="rounded-2xl border border-amber-400/30 bg-amber-950/20 p-5">
            <h2 className="font-bold text-amber-200">
              بعض البيانات لم يتم تحميلها
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              الإحصائيات التالية قد تكون غير مكتملة. تفاصيل المشكلة:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-amber-100">
              {warnings.map((warning, index) => (
                <li key={`${index}-${warning}`} className="break-words">
                  • {warning}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold">نظرة عامة</h2>
            <p className="mt-1 text-sm text-slate-400">
              أرقام المنصة من قاعدة البيانات
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="إجمالي الطلاب"
              value={stats.students.length}
              description="الحسابات غير الإدارية"
              icon="🎓"
              accent="cyan"
            />
            <MetricCard
              title="الإداريون"
              value={stats.admins.length}
              description="حسابات الإدارة"
              icon="🛡️"
              accent="violet"
            />
            <MetricCard
              title="مجموع XP"
              value={stats.totalXP}
              description="مجموع سجلات نقاط الخبرة"
              icon="⚡"
              accent="amber"
            />
            <MetricCard
              title="الطلاب النشطون"
              value={stats.activeStudents}
              description="طلاب لديهم نشاط مسجل"
              icon="📈"
              accent="emerald"
            />
            <MetricCard
              title="الدروس المكتملة"
              value={data.progress.length}
              description={`من أصل ${numberFormat(data.totalLessons)} درس`}
              icon="📚"
              accent="emerald"
            />
            <MetricCard
              title="الاختبارات"
              value={data.quizzes.length}
              description="إجمالي الاختبارات المسجلة"
              icon="📝"
              accent="violet"
            />
            <MetricCard
              title="المحاولات المكتملة"
              value={data.attempts.length}
              description="محاولات لها تاريخ إكمال"
              icon="✅"
              accent="cyan"
            />
            <MetricCard
              title="متوسط العلامات"
              value={
                data.attempts.length
                  ? Math.round(
                      data.attempts.reduce(
                        (sum, attempt) =>
                          sum + (Number(attempt.score) || 0),
                        0
                      ) / data.attempts.length
                    )
                  : 0
              }
              description="متوسط القيم المسجلة في score"
              icon="🎯"
              accent="amber"
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Panel
            title="توزيع الطلاب حسب الشعبة"
            subtitle="عدد الطلاب المسجلين في كل شعبة"
          >
            {stats.streams.length === 0 ? (
              <EmptyMessage text="ما كاين حتى بيانات للشعب، أو تعذر تحميلها." />
            ) : (
              <div className="space-y-5">
                {stats.streams.map((stream) => (
                  <div key={stream.name}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-200">
                        {stream.name}
                      </span>
                      <span className="font-bold text-cyan-200">
                        {numberFormat(stream.count)} طالب
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-cyan-400 to-blue-500 transition-all"
                        style={{
                          width: `${(stream.count / maxStreamCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="أفضل الطلاب حسب XP"
            subtitle="الترتيب حسب مجموع نقاط الخبرة المسجلة"
          >
            {stats.topStudents.length === 0 ? (
              <EmptyMessage text="لا توجد بيانات طلاب لعرض الترتيب." />
            ) : (
              <div className="space-y-3">
                {stats.topStudents.map((student, index) => (
                  <Link
                    key={student.id}
                    href={`/admin/students/${student.id}`}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-cyan-400/30 hover:bg-cyan-400/5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 font-black text-cyan-200">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-white">
                        {shortName(student)}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {student.stream || "الشعبة غير محددة"}
                      </p>
                    </div>
                    <div className="shrink-0 text-left">
                      <p className="font-black text-amber-300">
                        {numberFormat(student.xp)}
                      </p>
                      <p className="text-xs text-slate-500">XP</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <Panel
          title="نشاط الاختبارات"
          subtitle="الاختبار الأكثر نشاطًا حسب عدد المحاولات المكتملة"
        >
          {!stats.mostActiveQuiz ||
          stats.mostActiveQuiz.attempts === 0 ? (
            <EmptyMessage text="ما كاينش محاولات مكتملة للاختبارات في البيانات المحمّلة." />
          ) : (
            <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-l from-violet-500/10 to-slate-900 p-5">
              <p className="text-sm text-violet-200">
                🏆 الاختبار الأكثر نشاطًا
              </p>
              <h3 className="mt-3 text-xl font-black">
                {stats.mostActiveQuiz.title}
              </h3>
              <p className="mt-3 text-3xl font-black text-violet-200">
                {numberFormat(stats.mostActiveQuiz.attempts)}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                محاولة مكتملة
              </p>
            </div>
          )}

          <div className="mt-5 space-y-3">
            {stats.quizStats.slice(0, 5).map((quiz, index) => (
              <div
                key={quiz.id}
                className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-slate-300">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {quiz.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {quiz.average === null
                      ? "لا توجد علامة مسجلة"
                      : `متوسط العلامات المسجلة: ${quiz.average.toFixed(1)}`}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-cyan-200">
                  {numberFormat(quiz.attempts)} محاولة
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="إحصائيات الريلزات"
          subtitle="إحصائيات مستقلة مبنية على بيانات الريلزات الحالية"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="إجمالي الريلزات"
              value={data.reels.length}
              description="كل الريلزات"
              icon="🎬"
              accent="cyan"
            />
            <MetricCard
              title="الريلزات المنشورة"
              value={stats.publishedReels}
              description="الريلزات المفعّلة للنشر"
              icon="📡"
              accent="emerald"
            />
            <MetricCard
              title="المشاهدات"
              value={stats.totalViews}
              description="مجموع views_count"
              icon="👁️"
              accent="violet"
            />
            <MetricCard
              title="الإعجابات والتعليقات"
              value={stats.totalLikes + stats.totalComments}
              description={`${numberFormat(stats.totalLikes)} إعجاب · ${numberFormat(stats.totalComments)} تعليق`}
              icon="💬"
              accent="amber"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                title: "الأكثر مشاهدة",
                reel: stats.mostViewed,
                metric: "مشاهدة",
                value: stats.mostViewed?.views ?? 0,
                icon: "👁️",
              },
              {
                title: "الأكثر إعجابًا",
                reel: stats.mostLiked,
                metric: "إعجاب",
                value: stats.mostLiked?.likes ?? 0,
                icon: "❤️",
              },
              {
                title: "الأكثر تعليقًا",
                reel: stats.mostCommented,
                metric: "تعليق",
                value: stats.mostCommented?.comments ?? 0,
                icon: "💬",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
              >
                <p className="text-sm text-slate-400">
                  {item.icon} {item.title}
                </p>
                {item.reel ? (
                  <>
                    <p className="mt-3 line-clamp-2 font-bold text-white">
                      {item.reel.title}
                    </p>
                    <p className="mt-3 text-2xl font-black text-cyan-200">
                      {numberFormat(item.value)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.metric}
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    لا توجد ريلزات مسجلة.
                  </p>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <footer className="pb-4 text-center text-xs text-slate-500">
          MARIS ACADEMY ²⁰²⁷ · لوحة الإحصائيات
        </footer>
      </div>
    </main>
  );
}
