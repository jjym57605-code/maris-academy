"use client";

import { useEffect, useMemo, useState } from "react";
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

type LessonProgress = {
  user_id: string;
  lesson_id: string;
};

type QuizAttempt = {
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
  views_count: number;
};

type ReelInteraction = {
  reel_id: string;
};

export default function AdminStatsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [xpRows, setXpRows] = useState<XPRow[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>(
    []
  );
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  const [reels, setReels] = useState<Reel[]>([]);
  const [reelLikes, setReelLikes] = useState<ReelInteraction[]>([]);
  const [reelComments, setReelComments] = useState<ReelInteraction[]>([]);

  const [totalLessons, setTotalLessons] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("تعذر الاتصال بـ Supabase.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("يجب تسجيل الدخول أولاً.");
      }

      const {
        data: adminCheck,
        error: adminError,
      } = await supabase.rpc("is_current_user_admin");

      if (adminError) {
        throw adminError;
      }

      if (!adminCheck) {
        throw new Error(
          "ليس لديك صلاحية الوصول إلى الإحصائيات."
        );
      }

      const [
        profilesRes,
        xpRes,
        progressRes,
        lessonsRes,
        attemptsRes,
        quizzesRes,
        reelsRes,
        reelLikesRes,
        reelCommentsRes,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, first_name, last_name, stream, is_admin"
          ),

        supabase
          .from("xp_transactions")
          .select("user_id, amount"),

        supabase
          .from("lesson_progress")
          .select("user_id, lesson_id"),

        supabase
          .from("lessons")
          .select("id", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("quiz_attempts")
          .select(
            "user_id, quiz_id, score, completed_at"
          )
          .not("completed_at", "is", null),

        supabase
          .from("quizzes")
          .select("id, title"),

        supabase
          .from("reels")
          .select(
            "id, title, is_published, views_count"
          ),

        supabase
          .from("reel_likes")
          .select("reel_id"),

        supabase
          .from("reel_comments")
          .select("reel_id"),
      ]);

      if (profilesRes.error) {
        throw profilesRes.error;
      }

      if (xpRes.error) {
        throw xpRes.error;
      }

      if (progressRes.error) {
        throw progressRes.error;
      }

      if (lessonsRes.error) {
        throw lessonsRes.error;
      }

      if (attemptsRes.error) {
        throw attemptsRes.error;
      }

      if (quizzesRes.error) {
        throw quizzesRes.error;
      }

      if (reelsRes.error) {
        throw reelsRes.error;
      }

      if (reelLikesRes.error) {
        throw reelLikesRes.error;
      }

      if (reelCommentsRes.error) {
        throw reelCommentsRes.error;
      }

      setProfiles(profilesRes.data ?? []);

      setXpRows(
        (xpRes.data ?? []) as XPRow[]
      );

      setLessonProgress(
        (progressRes.data ?? []) as LessonProgress[]
      );

      setQuizAttempts(
        (attemptsRes.data ?? []) as QuizAttempt[]
      );

      setQuizzes(
        (quizzesRes.data ?? []) as Quiz[]
      );

      setTotalLessons(
        lessonsRes.count ?? 0
      );

      setReels(
        (reelsRes.data ?? []) as Reel[]
      );

      setReelLikes(
        (reelLikesRes.data ?? []) as ReelInteraction[]
      );

      setReelComments(
        (reelCommentsRes.data ?? []) as ReelInteraction[]
      );
    } catch (err) {
      console.error(
        "ADMIN STATS ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل الإحصائيات."
      );
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const totalStudents = profiles.filter(
      (profile) => !profile.is_admin
    ).length;

    const totalAdmins = profiles.filter(
      (profile) => profile.is_admin
    ).length;

    const totalXP = xpRows.reduce(
      (sum, row) => sum + (row.amount ?? 0),
      0
    );

    const completedLessons =
      lessonProgress.length;

    const completedQuizzes =
      quizAttempts.length;

    const averageQuizScore =
      completedQuizzes > 0
        ? Math.round(
            quizAttempts.reduce(
              (sum, attempt) =>
                sum + (attempt.score ?? 0),
              0
            ) / completedQuizzes
          )
        : 0;

    const uniqueActiveStudents =
      new Set([
        ...xpRows.map(
          (row) => row.user_id
        ),
        ...lessonProgress.map(
          (row) => row.user_id
        ),
        ...quizAttempts.map(
          (row) => row.user_id
        ),
      ]).size;

    const totalReels = reels.length;

    const publishedReels =
      reels.filter(
        (reel) => reel.is_published
      ).length;

    const totalViews = reels.reduce(
      (sum, reel) =>
        sum + (reel.views_count ?? 0),
      0
    );

    const totalLikes =
      reelLikes.length;

    const totalComments =
      reelComments.length;

    return {
      totalStudents,
      totalAdmins,
      totalXP,
      completedLessons,
      completedQuizzes,
      averageQuizScore,
      uniqueActiveStudents,
      totalReels,
      publishedReels,
      totalViews,
      totalLikes,
      totalComments,
    };
  }, [
    profiles,
    xpRows,
    lessonProgress,
    quizAttempts,
    reels,
    reelLikes,
    reelComments,
  ]);

  const topStudents = useMemo(() => {
    const xpMap: Record<string, number> = {};

    xpRows.forEach((row) => {
      xpMap[row.user_id] =
        (xpMap[row.user_id] ?? 0) +
        (row.amount ?? 0);
    });

    return profiles
      .filter(
        (profile) => !profile.is_admin
      )
      .map((profile) => ({
        ...profile,
        xp: xpMap[profile.id] ?? 0,
      }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 5);
  }, [profiles, xpRows]);

  const streamStats = useMemo(() => {
    const map: Record<string, number> = {};

    profiles
      .filter(
        (profile) => !profile.is_admin
      )
      .forEach((profile) => {
        const stream =
          profile.stream?.trim() ||
          "غير محددة";

        map[stream] =
          (map[stream] ?? 0) + 1;
      });

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [profiles]);

  const quizStats = useMemo(() => {
    const map: Record<
      string,
      {
        attempts: number;
        totalScore: number;
      }
    > = {};

    quizAttempts.forEach((attempt) => {
      if (!map[attempt.quiz_id]) {
        map[attempt.quiz_id] = {
          attempts: 0,
          totalScore: 0,
        };
      }

      map[attempt.quiz_id].attempts += 1;

      map[attempt.quiz_id].totalScore +=
        attempt.score ?? 0;
    });

    return Object.entries(map)
      .map(([quizId, data]) => {
        const quiz = quizzes.find(
          (item) => item.id === quizId
        );

        return {
          id: quizId,
          title:
            quiz?.title ??
            "اختبار غير معروف",
          attempts: data.attempts,
          average:
            data.attempts > 0
              ? Math.round(
                  data.totalScore /
                    data.attempts
                )
              : 0,
        };
      })
      .sort(
        (a, b) =>
          b.attempts - a.attempts
      )
      .slice(0, 5);
  }, [quizAttempts, quizzes]);

  const reelStats = useMemo(() => {
    const likesMap: Record<string, number> = {};
    const commentsMap: Record<string, number> = {};

    reelLikes.forEach((like) => {
      likesMap[like.reel_id] =
        (likesMap[like.reel_id] ?? 0) + 1;
    });

    reelComments.forEach((comment) => {
      commentsMap[comment.reel_id] =
        (commentsMap[comment.reel_id] ?? 0) + 1;
    });

    const reelsWithStats = reels.map(
      (reel) => ({
        ...reel,
        likes:
          likesMap[reel.id] ?? 0,
        comments:
          commentsMap[reel.id] ?? 0,
      })
    );

    const mostViewed =
      [...reelsWithStats].sort(
        (a, b) =>
          (b.views_count ?? 0) -
          (a.views_count ?? 0)
      )[0] ?? null;

    const mostLiked =
      [...reelsWithStats].sort(
        (a, b) =>
          b.likes - a.likes
      )[0] ?? null;

    const mostCommented =
      [...reelsWithStats].sort(
        (a, b) =>
          b.comments - a.comments
      )[0] ?? null;

    return {
      mostViewed,
      mostLiked,
      mostCommented,
    };
  }, [
    reels,
    reelLikes,
    reelComments,
  ]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="h-10 w-56 animate-pulse rounded-lg bg-white/10" />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(
              (item) => (
                <div
                  key={item}
                  className="h-32 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]"
                />
              )
            )}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {[1, 2].map(
              (item) => (
                <div
                  key={item}
                  className="h-80 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]"
                />
              )
            )}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/admin"
            className="text-sm text-slate-400 transition hover:text-white"
          >
            ← العودة إلى لوحة الإدارة
          </Link>

          <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-500/10 p-6">
            <div className="text-3xl">
              ⚠️
            </div>

            <h1 className="mt-3 text-xl font-semibold text-red-300">
              تعذر تحميل الإحصائيات
            </h1>

            <p className="mt-2 text-sm text-red-200/80">
              {error}
            </p>

            <button
              onClick={loadStats}
              className="mt-5 rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/30"
            >
              المحاولة مرة أخرى
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            ← العودة إلى لوحة الإدارة
          </Link>

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-300">
                📊 ANALYTICS
              </div>

              <h1 className="text-3xl font-bold md:text-4xl">
                إحصائيات الأكاديمية
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                نظرة عامة على نشاط طلاب MARIS ACADEMY.
              </p>
            </div>

            <button
              onClick={loadStats}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              ↻ تحديث البيانات
            </button>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon="👥"
            label="الطلاب"
            value={stats.totalStudents}
            description={`${stats.totalAdmins} مشرف`}
          />

          <StatCard
            icon="⚡"
            label="إجمالي XP"
            value={stats.totalXP}
            description={`${stats.uniqueActiveStudents} طالب نشط`}
          />

          <StatCard
            icon="📚"
            label="الدروس المكتملة"
            value={stats.completedLessons}
            description={`${totalLessons} درس متاح`}
          />

          <StatCard
            icon="📝"
            label="الاختبارات"
            value={stats.completedQuizzes}
            description={`متوسط النتائج ${stats.averageQuizScore}%`}
          />
        </div>

        {/* Reels Stats */}
        <section className="mt-6">
          <div className="mb-4">
            <p className="text-xs text-cyan-300">
              REELS ANALYTICS
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              🎬 إحصائيات الريلزات
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon="🎬"
              label="إجمالي الريلز"
              value={stats.totalReels}
              description={`${stats.publishedReels} منشور`}
            />

            <StatCard
              icon="👁️"
              label="المشاهدات"
              value={stats.totalViews}
              description="إجمالي المشاهدات"
            />

            <StatCard
              icon="❤️"
              label="الإعجابات"
              value={stats.totalLikes}
              description="إجمالي الإعجابات"
            />

            <StatCard
              icon="💬"
              label="التعليقات"
              value={stats.totalComments}
              description="إجمالي التعليقات"
            />
          </div>
        </section>

        {/* Reel Highlights */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <ReelHighlight
            icon="👁️"
            label="الأكثر مشاهدة"
            reel={reelStats.mostViewed}
            value={
              reelStats.mostViewed
                ? `${reelStats.mostViewed.views_count} مشاهدة`
                : "لا توجد بيانات"
            }
          />

          <ReelHighlight
            icon="❤️"
            label="الأكثر إعجابًا"
            reel={reelStats.mostLiked}
            value={
              reelStats.mostLiked
                ? `${reelStats.mostLiked.likes} إعجاب`
                : "لا توجد بيانات"
            }
          />

          <ReelHighlight
            icon="💬"
            label="الأكثر تعليقًا"
            reel={reelStats.mostCommented}
            value={
              reelStats.mostCommented
                ? `${reelStats.mostCommented.comments} تعليق`
                : "لا توجد بيانات"
            }
          />
        </div>

        {/* Learning Overview */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-6">
              <p className="text-xs text-cyan-300">
                STUDENTS
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                توزيع الطلاب حسب الشعبة
              </h2>
            </div>

            {streamStats.length === 0 ? (
              <EmptyState text="لا توجد بيانات عن الشعب." />
            ) : (
              <div className="space-y-4">
                {streamStats.map(
                  ([stream, count]) => {
                    const percentage =
                      stats.totalStudents > 0
                        ? Math.round(
                            (count /
                              stats.totalStudents) *
                              100
                          )
                        : 0;

                    return (
                      <div key={stream}>
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <span className="truncate text-sm text-slate-300">
                            {stream}
                          </span>

                          <span className="shrink-0 text-sm font-semibold text-cyan-300">
                            {count}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-cyan-400 transition-all"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>

                        <div className="mt-1 text-right text-[11px] text-slate-600">
                          {percentage}%
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-6">
              <p className="text-xs text-amber-300">
                TOP STUDENTS
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                أفضل الطلاب حسب XP
              </h2>
            </div>

            {topStudents.length === 0 ? (
              <EmptyState text="لا توجد بيانات XP بعد." />
            ) : (
              <div className="space-y-3">
                {topStudents.map(
                  (student, index) => (
                    <Link
                      key={student.id}
                      href={`/admin/students/${student.id}`}
                      className="flex items-center gap-4 rounded-xl bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 font-bold text-slate-300">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-white">
                          {getFullName(student)}
                        </div>

                        <div className="mt-1 text-xs text-slate-600">
                          {student.stream ??
                            "الشعبة غير محددة"}
                        </div>
                      </div>

                      <div className="shrink-0 font-bold text-amber-300">
                        ⚡ {student.xp}
                      </div>
                    </Link>
                  )
                )}
              </div>
            )}
          </section>
        </div>

        {/* Quiz Stats */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-6">
            <p className="text-xs text-purple-300">
              QUIZZES
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              أكثر الاختبارات نشاطًا
            </h2>
          </div>

          {quizStats.length === 0 ? (
            <EmptyState text="لم يتم إجراء أي اختبار بعد." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/5">
              <div className="hidden grid-cols-[2fr_1fr_1fr] border-b border-white/5 bg-white/[0.03] px-5 py-3 text-xs text-slate-500 sm:grid">
                <div>الاختبار</div>
                <div>المحاولات</div>
                <div>المتوسط</div>
              </div>

              <div className="divide-y divide-white/5">
                {quizStats.map(
                  (quiz) => (
                    <div
                      key={quiz.id}
                      className="grid gap-2 px-5 py-4 sm:grid-cols-[2fr_1fr_1fr] sm:items-center"
                    >
                      <div className="font-medium text-white">
                        {quiz.title}
                      </div>

                      <div className="text-sm text-slate-400">
                        {quiz.attempts} محاولة
                      </div>

                      <div className="font-semibold text-cyan-300">
                        {quiz.average}%
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </section>

        {/* Quick Summary */}
        <section className="mt-6 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.03] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-cyan-300">
                MARIS ACADEMY
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                ملخص النشاط
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                هذه الإحصائيات مبنية مباشرة على البيانات
                الحقيقية الموجودة في Supabase.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MiniStat
                label="الطلاب"
                value={stats.totalStudents}
              />

              <MiniStat
                label="XP"
                value={stats.totalXP}
              />

              <MiniStat
                label="الريلز"
                value={stats.totalReels}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function getFullName(profile: Profile) {
  const name =
    `${profile.first_name ?? ""} ${
      profile.last_name ?? ""
    }`.trim();

  return name || "طالب بدون اسم";
}

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: string;
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <span className="text-2xl">
          {icon}
        </span>

        <span className="text-xs text-slate-600">
          MARIS
        </span>
      </div>

      <div className="mt-4">
        <div className="text-2xl font-bold text-white">
          {value}
        </div>

        <div className="mt-1 text-sm font-medium text-slate-300">
          {label}
        </div>

        <div className="mt-1 text-xs text-slate-600">
          {description}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-center">
      <div className="text-lg font-bold text-white">
        {value}
      </div>

      <div className="mt-1 text-[11px] text-slate-600">
        {label}
      </div>
    </div>
  );
}

function ReelHighlight({
  icon,
  label,
  reel,
  value,
}: {
  icon: string;
  label: string;
  reel:
    | (Reel & {
        likes: number;
        comments: number;
      })
    | null;
  value: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-xl">
          {icon}
        </div>

        <div>
          <p className="text-xs text-slate-500">
            REELS
          </p>

          <h2 className="font-semibold">
            {label}
          </h2>
        </div>
      </div>

      {reel ? (
        <div className="mt-6">
          <h3 className="line-clamp-2 font-medium text-white">
            {reel.title}
          </h3>

          <p className="mt-2 text-lg font-bold text-cyan-300">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-600">
            {reel.is_published
              ? "🟢 منشور"
              : "⚫ مخفي"}
          </p>
        </div>
      ) : (
        <div className="mt-6 text-sm text-slate-600">
          لا توجد بيانات بعد.
        </div>
      )}
    </section>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-5 py-10 text-center">
      <div className="text-3xl">
        📭
      </div>

      <p className="mt-3 text-sm text-slate-500">
        {text}
      </p>
    </div>
  );
}