"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type LeaderboardRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  total_xp: number;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLeaderboard() {
    setLoading(true);
    setError("");

    try {
      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("إعدادات Supabase غير مكتملة.");
      }

      const { data, error } = await supabase.rpc("get_leaderboard");

      if (error) {
        throw error;
      }

      setRows((data ?? []) as LeaderboardRow[]);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل الترتيب."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeaderboard();
  }, []);

  function getFullName(row: LeaderboardRow) {
    const name = [row.first_name, row.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    return name || "طالب MARIS";
  }

  function getRankIcon(index: number) {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";

    return `#${index + 1}`;
  }

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="text-5xl">🏆</div>

          <p className="mt-3 text-sm text-slate-400">
            جاري تحميل الترتيب...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      {/* Header */}
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 text-sm font-bold text-cyan-400">
              MARIS ACADEMY
            </div>

            <h1 className="text-3xl font-black">
              🏆 الترتيب
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              تنافس مع طلبة MARIS واجمع أكبر عدد من نقاط XP.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            ← الرئيسية
          </Link>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Empty */}
      {!error && rows.length === 0 && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center shadow-xl">
          <div className="text-5xl">🏆</div>

          <h2 className="mt-4 text-xl font-black">
            لا يوجد ترتيب حالياً
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            عندما يبدأ الطلبة في جمع XP سيظهر الترتيب هنا.
          </p>
        </section>
      )}

      {/* Leaderboard */}
      {rows.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-xl">
          <div className="border-b border-white/10 p-5">
            <h2 className="text-xl font-black">
              🏅 ترتيب الطلبة
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              الترتيب حسب مجموع XP المكتسبة.
            </p>
          </div>

          <div className="divide-y divide-white/5">
            {rows.map((row, index) => (
              <div
                key={row.user_id}
                className={`flex items-center gap-4 p-4 transition ${
                  index < 3
                    ? "bg-white/[0.025]"
                    : "hover:bg-white/[0.02]"
                }`}
              >
                {/* Rank */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-lg font-black">
                  {getRankIcon(index)}
                </div>

                {/* Avatar */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 text-lg">
                  👤
                </div>

                {/* Student */}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-black text-white">
                    {getFullName(row)}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    طالب MARIS ACADEMY
                  </div>
                </div>

                {/* XP */}
                <div className="shrink-0 text-left">
                  <div className="text-lg font-black text-cyan-300">
                    {Number(row.total_xp ?? 0).toLocaleString("ar-DZ")}
                  </div>

                  <div className="text-xs font-bold text-slate-500">
                    XP
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Refresh */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={loadLeaderboard}
          disabled={loading}
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          🔄 تحديث الترتيب
        </button>
      </div>
    </main>
  );
}