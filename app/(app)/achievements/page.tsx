
"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { getSession } from "@/services/auth";
import {
  getUserAchievements,
  markAchievementAsSeen,
  type UserAchievementWithDetails,
} from "@/services/achievements";
import {
  EmptyState,
  ErrorState,
  GlassCard,
  Spinner,
} from "@/components/ui";

function formatUnlockDate(value: string) {
  return new Intl.DateTimeFormat("ar-DZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function AchievementsPage() {
  const [userAchievements, setUserAchievements] = useState<
    UserAchievementWithDetails[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();

    if (!supabase) {
      setError(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(false);

      const session = await getSession(supabase);

      if (!session?.user) {
        setError(true);
        return;
      }

      const data = await getUserAchievements(
        supabase,
        session.user.id
      );

      setUserAchievements(data);
    } catch (err) {
      console.error("ACHIEVEMENTS PAGE ERROR:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleOpenAchievement(
    userAchievement: UserAchievementWithDetails
  ) {
    if (openingId) return;

    if (userAchievement.seen_at) {
      return;
    }

    const supabase = getSupabase();

    if (!supabase) {
      return;
    }

    try {
      setOpeningId(userAchievement.id);

      const session = await getSession(supabase);

      if (!session?.user) {
        return;
      }

      await markAchievementAsSeen(
        supabase,
        userAchievement.id,
        session.user.id
      );

      setUserAchievements((current) =>
        current.map((item) =>
          item.id === userAchievement.id
            ? {
                ...item,
                seen_at: new Date().toISOString(),
              }
            : item
        )
      );
    } catch (err) {
      console.error(
        "MARK ACHIEVEMENT AS SEEN ERROR:",
        err
      );
    } finally {
      setOpeningId(null);
    }
  }

  if (loading) {
    return <Spinner label="جارٍ تحميل الإنجازات…" />;
  }

  if (error) {
    return <ErrorState onRetry={load} />;
  }

  const unlockedCount = userAchievements.length;

  const unseenAchievements = userAchievements.filter(
    (achievement) => !achievement.seen_at
  );

  const seenAchievements = userAchievements.filter(
    (achievement) => Boolean(achievement.seen_at)
  );

  const totalXP = userAchievements.reduce(
    (total, achievement) =>
      total + achievement.achievement.xp_reward,
    0
  );

  return (
    <div className="space-y-8">
      {/* ================================
          العنوان
      ================================= */}

      <header className="animate-fade-up">
        <h1 className="page-title">
          🏆 إنجازاتي
        </h1>

        <p className="mt-3 text-foam/60">
          اجمع الإنجازات وواصل رحلتك نحو القمة.
        </p>
      </header>

      {/* ================================
          إشعار الإنجازات الجديدة
      ================================= */}

      {unseenAchievements.length > 0 && (
        <section className="animate-fade-up">
          <GlassCard className="relative overflow-hidden border-cyan-400/30 bg-cyan-400/5 p-6 shadow-glow">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-3xl">
                  🏆
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-extrabold text-white">
                      لديك إنجاز جديد!
                    </h2>

                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                      جديد
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-foam/60">
                    لقد حصلت على إنجاز جديد. اضغط على الزر
                    لعرضه ومعرفة تفاصيله.
                  </p>
                </div>
              </div>

              {/* الإنجازات الجديدة */}

              <div className="mt-5 space-y-3">
                {unseenAchievements.map(
                  (userAchievement) => {
                    const achievement =
                      userAchievement.achievement;

                    const isOpening =
                      openingId === userAchievement.id;

                    return (
                      <div
                        key={userAchievement.id}
                        className="rounded-2xl border border-cyan-400/20 bg-navy-900/60 p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-2xl">
                              {achievement.icon || "🏆"}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-extrabold text-white">
                                {achievement.title}
                              </p>

                              <p className="mt-1 text-xs font-bold text-cyan-300">
                                +{achievement.xp_reward} XP
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleOpenAchievement(
                                userAchievement
                              )
                            }
                            disabled={isOpening}
                            className="shrink-0 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-extrabold text-navy-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isOpening
                              ? "جاري الفتح..."
                              : "🏆 عرض الإنجاز"}
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </GlassCard>
        </section>
      )}

      {/* ================================
          الملخص
      ================================= */}

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <GlassCard className="p-5" hover>
          <span className="text-2xl" aria-hidden>
            🏆
          </span>

          <p className="mt-3 text-2xl font-extrabold text-white">
            {unlockedCount}
          </p>

          <p className="mt-1 text-sm text-foam/50">
            إنجازات مكتسبة
          </p>
        </GlassCard>

        <GlassCard className="p-5" hover>
          <span className="text-2xl" aria-hidden>
            👀
          </span>

          <p className="mt-3 text-2xl font-extrabold text-white">
            {seenAchievements.length}
          </p>

          <p className="mt-1 text-sm text-foam/50">
            إنجازات تمت مشاهدتها
          </p>
        </GlassCard>

        <GlassCard
          className="col-span-2 p-5 sm:col-span-1"
          hover
        >
          <span className="text-2xl" aria-hidden>
            ⭐
          </span>

          <p className="mt-3 text-2xl font-extrabold text-white">
            {totalXP} XP
          </p>

          <p className="mt-1 text-sm text-foam/50">
            XP من الإنجازات
          </p>
        </GlassCard>
      </section>

      {/* ================================
          لا توجد إنجازات
      ================================= */}

      {userAchievements.length === 0 && (
        <EmptyState
          icon="🏆"
          title="لم تحصل على أي إنجاز بعد."
        />
      )}

      {/* ================================
          الإنجازات المكتسبة
      ================================= */}

      {userAchievements.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
              <span aria-hidden>🎖️</span>
              إنجازاتي المكتسبة
            </h2>

            <span className="badge">
              {unlockedCount}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {userAchievements.map(
              (userAchievement) => {
                const achievement =
                  userAchievement.achievement;

                const isNew = !userAchievement.seen_at;

                return (
                  <GlassCard
                    key={userAchievement.id}
                    className={`relative overflow-hidden p-5 ${
                      isNew
                        ? "border-cyan-400/30 shadow-glow"
                        : "border-cyan-400/20"
                    }`}
                    hover
                  >
                    {isNew && (
                      <div className="absolute left-4 top-4 rounded-full bg-cyan-400/10 px-2.5 py-1 text-[10px] font-extrabold text-cyan-300">
                        جديد
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-3xl shadow-glow">
                        {achievement.icon || "🏆"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="break-words text-lg font-extrabold text-white">
                            {achievement.title}
                          </h3>

                          <span className="badge shrink-0">
                            +{achievement.xp_reward} XP
                          </span>
                        </div>

                        {achievement.description && (
                          <p className="mt-2 break-words text-sm leading-relaxed text-foam/60">
                            {achievement.description}
                          </p>
                        )}

                        <p className="mt-3 text-xs font-bold text-teal-300">
                          ✅ تم الحصول عليه ·{" "}
                          {formatUnlockDate(
                            userAchievement.unlocked_at
                          )}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                );
              }
            )}
          </div>
        </section>
      )}
    </div>
  );
}

