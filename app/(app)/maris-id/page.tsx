
"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { ensureProfile } from "@/services/auth";
import { getTotalXP } from "@/services/stats";
import { getLevelInfo } from "@/lib/level";
import type { Profile } from "@/types/database";
import { ErrorState, PageHeader, Spinner } from "@/components/ui";

// ══════════════════════════════════════════════════════
// MARIS ID — بطاقة الطالب الرقمية ببيانات حقيقية
// (توليد QR سيُضاف لاحقاً — البنية جاهزة له)
// ══════════════════════════════════════════════════════

export default function MarisIdPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabase();

    if (!supabase) return;

    setError(false);
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [profileData, xpTotal] = await Promise.all([
        ensureProfile(supabase, user),
        getTotalXP(supabase, user.id),
      ]);

      setProfile(profileData);
      setXp(xpTotal);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return <ErrorState onRetry={load} />;
  }

  if (loading) {
    return <Spinner />;
  }

  const level = getLevelInfo(xp);

  const fullName = [
    profile?.first_name,
    profile?.last_name,
  ]
    .filter(
      (part) =>
        part &&
        part.trim().length > 0
    )
    .join(" ");

  return (
    <div>
      <PageHeader
        title="بطاقة الطالب"
        subtitle="هويتك الرقمية في MARIS ACADEMY"
      />

      <div className="mx-auto max-w-md">
        {/* ═══ البطاقة ═══ */}
        <div className="relative overflow-hidden rounded-4xl border border-cyan-400/25 bg-gradient-to-bl from-navy-800 via-navy-850 to-navy-900 p-6 shadow-glow sm:p-8">
          {/* زخارف محيطية */}
          <div
            className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/15 blur-[60px]"
            aria-hidden
          />

          <div
            className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-ocean-500/20 blur-[70px]"
            aria-hidden
          />

          <svg
            className="pointer-events-none absolute bottom-4 left-6 w-32 text-cyan-400/10"
            viewBox="0 0 120 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M0 12 Q 15 2 30 12 T 60 12 T 90 12 T 120 12"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>

          <div className="relative space-y-6">
            {/* رأس البطاقة */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="text-2xl"
                  aria-hidden
                >
                  🌊
                </span>

                <span className="font-grotesk text-xs font-bold tracking-widest text-white">
                  MARIS ACADEMY
                </span>
              </div>

              <span className="badge">
                بكالوريا 2027
              </span>
            </div>

            {/* المعرّف */}
            <div className="space-y-1">
              <p className="text-xs font-bold tracking-wide text-cyan-300/80">
                MARIS ID
              </p>

              <p
                dir="ltr"
                className="text-right font-grotesk text-3xl font-bold tracking-[0.2em] text-white sm:text-4xl"
              >
                {profile?.maris_id ?? "MR-······"}
              </p>
            </div>

            {/* اسم الطالب */}
            <p className="break-words text-xl font-extrabold text-foam">
              {fullName || "طالب MARIS"}
            </p>

            {/* التفاصيل */}
            <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-5 text-center">
              <div>
                <p className="text-xs text-foam/50">
                  الشعبة
                </p>

                <p className="mt-1 break-words text-sm font-bold text-foam">
                  {profile?.stream ??
                    "غير متوفر حالياً"}
                </p>
              </div>

              <div>
                <p className="text-xs text-foam/50">
                  المستوى
                </p>

                <p className="mt-1 text-sm font-bold text-cyan-300">
                  {level.level} — {level.name}
                </p>
              </div>

              <div>
                <p className="text-xs text-foam/50">
                  نقاط الخبرة
                </p>

                <p className="mt-1 font-grotesk text-sm font-bold text-cyan-300">
                  {xp} XP
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-foam/40">
          رمز الاستجابة السريعة (QR) سيُضاف في إصدار قادم.
        </p>
      </div>
    </div>
  );
}

