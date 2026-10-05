"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { ensureProfile } from "@/services/auth";
import { getTotalXP } from "@/services/stats";
import { getLevelInfo } from "@/lib/level";
import { formatDateAr } from "@/lib/utils";
import type { Profile } from "@/types/database";
import {
  ErrorState,
  GlassCard,
  PageHeader,
  ProgressBar,
  Spinner,
} from "@/components/ui";

// ══════════════════════════════════════════════════════
// الملف الشخصي — بيانات المستخدم الموثّق الحقيقية فقط
// أي قيمة غير موجودة تظهر كـ "غير متوفر حالياً"
// ══════════════════════════════════════════════════════

const FALLBACK = "غير متوفر حالياً";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
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
      setEmail(user.email ?? null);
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

  if (error) return <ErrorState onRetry={load} />;
  if (loading) return <Spinner />;

  const level = getLevelInfo(xp);
  const orFallback = (value?: string | null) =>
    value && value.trim().length > 0 ? value : FALLBACK;

  const rows = [
    { label: "الاسم", value: orFallback(profile?.first_name) },
    { label: "اللقب", value: orFallback(profile?.last_name) },
    { label: "البريد الإلكتروني", value: orFallback(email), ltr: true },
    { label: "الشعبة", value: orFallback(profile?.stream) },
    { label: "MARIS ID", value: orFallback(profile?.maris_id), ltr: true },
    {
      label: "تاريخ الانضمام",
      value: profile?.created_at ? formatDateAr(profile.created_at) : FALLBACK,
    },
  ];

  return (
    <div>
      <PageHeader title="الملف الشخصي" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ═══ بطاقة المستوى ═══ */}
        <GlassCard className="flex flex-col items-center gap-4 p-6 text-center lg:col-span-1">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-l from-ocean-500/30 to-cyan-400/20 text-4xl">
            🏆
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white">
              المستوى {level.level}
            </p>
            <p className="mt-1 font-bold text-cyan-300">{level.name}</p>
          </div>
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-sm text-foam/60">
              <span>نقاط الخبرة</span>
              <span className="font-grotesk font-bold text-cyan-300">
                {xp} XP
              </span>
            </div>
            <ProgressBar percent={level.progress} />
            <p className="text-xs text-foam/40">
              {level.xpIntoLevel} / {level.xpForNext} XP نحو المستوى التالي
            </p>
          </div>
        </GlassCard>

        {/* ═══ البيانات الشخصية ═══ */}
        <GlassCard className="p-6 lg:col-span-2">
          <h2 className="mb-5 text-lg font-extrabold text-white">
            البيانات الشخصية
          </h2>
          <dl className="divide-y divide-white/5">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex flex-wrap items-center justify-between gap-2 py-3.5"
              >
                <dt className="text-sm text-foam/50">{row.label}</dt>
                <dd
                  dir={row.ltr ? "ltr" : "rtl"}
                  className="break-words font-bold text-foam"
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </GlassCard>
      </div>
    </div>
  );
}
