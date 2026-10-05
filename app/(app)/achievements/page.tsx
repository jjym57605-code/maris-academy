"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { getSession } from "@/services/auth";
import {
  EmptyState,
  ErrorState,
  GlassCard,
  Spinner,
} from "@/components/ui";

type Achievement = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  icon: string | null;
  xp_reward: number;
  created_at: string;
};

type UserAchievement = {
  achievement_id: string;
  unlocked_at: string;
};

type AchievementView = Achievement & {
  unlocked: boolean;
  unlocked_at: string | null;
};

function formatUnlockDate(value: string) {
  return new Intl.DateTimeFormat("ar-DZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<AchievementView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

      const [{ data: achievementData, error: achievementsError }, { data: userAchievementData, error: userAchievementsError }] =
        await Promise.all([
          supabase
            .from("achievements")
            .select(
              "id, code, title, description, icon, xp_reward, created_at"
            )
            .order("created_at", { ascending: true }),

          supabase
            .from("user_achievements")
            .select("achievement_id, unlocked_at")
            .eq("user_id", session.user.id),
        ]);

      if (achievementsError) {
        console.error("ACHIEVEMENTS LOAD ERROR:", achievementsError);
        throw achievementsError;
      }

      if (userAchievementsError) {
        console.error(
          "USER ACHIEVEMENTS LOAD ERROR:",
          userAchievementsError
        );
        throw userAchievementsError;
      }

      const unlockedMap = new Map(
        (userAchievementData ?? []).map((item: UserAchievement) => [
          item.achievement_id,
          item.unlocked_at,
        ])
      );

      const merged: AchievementView[] = (achievementData ?? []).map(
        (achievement: Achievement) => {
          const unlockedAt = unlockedMap.get(achievement.id);

          return {
            ...achievement,
            unlocked: Boolean(unlockedAt),
            unlocked_at: unlockedAt ?? null,
          };
        }
      );

      setAchievements(merged);
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

  if (loading) {
    return <Spinner label="جارٍ تحميل الإنجازات…" />;
  }

  if (error) {
    return <ErrorState onRetry={load} />;
  }

  const unlockedCount = achievements.filter(
    (achievement) => achievement.unlocked
  ).length;

  const totalCount = achievements.length;

  if (totalCount === 0) {
    return (
      <EmptyState
        icon="🏆"
        title="لا توجد إنجازات متاحة حالياً."
      />
    );
  }

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
            🔒
          </span>

          <p className="mt-3 text-2xl font-extrabold text-white">
            {totalCount - unlockedCount}
          </p>

          <p className="mt-1 text-sm text-foam/50">
            إنجازات متبقية
          </p>
        </GlassCard>

        <GlassCard className="col-span-2 p-5 sm:col-span-1" hover>
          <span className="text-2xl" aria-hidden>
            ⭐
          </span>

          <p className="mt-3 text-2xl font-extrabold text-white">
            {achievements
              .filter((achievement) => achievement.unlocked)
              .reduce(
                (total, achievement) => total + achievement.xp_reward,
                0
              )}{" "}
            XP
          </p>

          <p className="mt-1 text-sm text-foam/50">
            XP من الإنجازات
          </p>
        </GlassCard>
      </section>

      {/* ================================
          قائمة الإنجازات
      ================================= */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
            <span aria-hidden>🎖️</span>
            جميع الإنجازات
          </h2>

          <span className="badge">
            {unlockedCount} / {totalCount}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {achievements.map((achievement) => (
            <GlassCard
              key={achievement.id}
              className={`relative overflow-hidden p-5 ${
                achievement.unlocked
                  ? "border-cyan-400/20"
                  : "opacity-70"
              }`}
              hover
            >
              <div className="flex items-start gap-4">
                {/* الأيقونة */}
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl ${
                    achievement.unlocked
                      ? "bg-cyan-400/10 shadow-glow"
                      : "bg-navy-700/60 grayscale"
                  }`}
                >
                  {achievement.unlocked
                    ? achievement.icon || "🏆"
                    : "🔒"}
                </div>

                {/* المعلومات */}
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

                  {achievement.unlocked ? (
                    <p className="mt-3 text-xs font-bold text-teal-300">
                      ✅ تم الحصول عليه
                      {achievement.unlocked_at
                        ? ` · ${formatUnlockDate(
                            achievement.unlocked_at
                          )}`
                        : ""}
                    </p>
                  ) : (
                    <p className="mt-3 text-xs font-bold text-foam/40">
                      🔒 لم يتم فتحه بعد
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  );
}