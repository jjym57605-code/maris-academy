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

      if (error) throw error;

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
    void loadLeaderboard();
  }, []);

  function getFullName(row: LeaderboardRow) {
    const name = [row.first_name, row.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    return name || "طالب MARIS";
  }

  function formatXP(xp: number) {
    return Number(xp ?? 0).toLocaleString("ar-DZ");
  }

  const topThree = rows.slice(0, 3);
  const remainingRows = rows.slice(3);

  return (
    <main dir="rtl" className="relative isolate mx-auto w-full max-w-6xl space-y-6 pb-8">
      {/* Ambient ocean glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 right-0 -z-10 h-64 w-64 rounded-full bg-cyan-500/[0.08] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-72 left-0 -z-10 h-64 w-64 rounded-full bg-blue-600/[0.08] blur-3xl"
      />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-gradient-to-br from-[#0b263d] via-[#0a1729] to-[#10172d] p-5 shadow-2xl shadow-cyan-950/20 sm:p-8 lg:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-12 -top-16 h-56 w-56 rounded-full border border-cyan-300/[0.08]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-2 -top-6 h-36 w-36 rounded-full border border-cyan-300/[0.08]"
        />

        <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-1.5 text-xs font-black tracking-wider text-cyan-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
              MARIS ACADEMY ²⁰²⁷
            </div>

            <h1 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              قمة <span className="text-cyan-300">التميّز</span>
              <br />
              تبدأ من هنا.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              كل إنجاز يقرّبك للقمة. واصل التعلّم، اجمع نقاط XP،
              وخلّي بصمتك في مجتمع MARIS.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-200"
              >
                <span aria-hidden="true">↗</span>
                العودة للرئيسية
              </Link>

              <button
                type="button"
                onClick={() => void loadLeaderboard()}
                disabled={loading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className={loading ? "animate-spin" : ""}>↻</span>
                تحديث النتائج
              </button>
            </div>
          </div>

          <div className="relative mx-auto flex h-36 w-36 shrink-0 items-center justify-center sm:mx-0 sm:h-44 sm:w-44 lg:h-52 lg:w-52">
            <div className="absolute inset-0 rounded-full border border-cyan-200/10" />
            <div className="absolute inset-3 rounded-full border border-cyan-200/10" />
            <div className="absolute inset-6 rounded-full bg-cyan-300/[0.05] blur-xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] border border-cyan-200/20 bg-gradient-to-br from-cyan-300/20 to-blue-500/10 text-5xl shadow-2xl shadow-cyan-950/30 sm:h-28 sm:w-28 sm:text-6xl">
              🏆
            </div>
            <span className="absolute right-2 top-6 text-xl">✦</span>
            <span className="absolute bottom-5 left-2 text-sm text-cyan-200">✧</span>
          </div>
        </div>

        <div className="relative mt-8 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">
            <p className="text-xs font-bold text-slate-400">المتنافسون</p>
            <p className="mt-2 text-2xl font-black text-white sm:text-3xl">
              {loading ? "—" : formatXP(rows.length)}
            </p>
            <p className="mt-1 text-xs text-slate-500">طالب في الترتيب</p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">
            <p className="text-xs font-bold text-slate-400">المتصدر الحالي</p>
            <p className="mt-2 truncate text-lg font-black text-cyan-200 sm:text-xl">
              {loading ? "..." : rows.length ? getFullName(rows[0]) : "—"}
            </p>
            <p className="mt-1 text-xs text-slate-500">حسب نقاط XP</p>
          </div>

          <div className="col-span-2 rounded-2xl border border-white/[0.07] bg-black/10 p-4 sm:col-span-1">
            <p className="text-xs font-bold text-slate-400">روح المنافسة</p>
            <p className="mt-2 text-lg font-black text-white sm:text-xl">
              تعلّم · أنجز · ارتقِ
            </p>
            <p className="mt-1 text-xs text-slate-500">كل خطوة تصنع الفرق</p>
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <section
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-500/[0.08] p-5"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="min-w-0 flex-1">
              <h2 className="font-black text-red-200">تعذّر تحميل الترتيب</h2>
              <p className="mt-2 break-words text-sm leading-6 text-red-200/80">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void loadLeaderboard()}
                className="mt-3 rounded-lg border border-red-300/20 px-3 py-2 text-sm font-bold text-red-100 transition hover:bg-red-300/10"
              >
                حاول مجدداً
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Loading skeleton */}
      {loading && (
        <section
          aria-label="جاري تحميل الترتيب"
          className="space-y-4"
        >
          <div className="h-8 w-48 animate-pulse rounded-lg bg-white/[0.06]" />
          <div className="grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-3xl border border-white/[0.06] bg-slate-900/60"
              />
            ))}
          </div>
          <div className="space-y-3 rounded-3xl border border-white/[0.06] bg-slate-900/40 p-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loading && !error && rows.length === 0 && (
        <section className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-slate-900/60 px-5 py-14 text-center shadow-xl sm:py-20">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] border border-cyan-300/15 bg-cyan-300/[0.06] text-5xl">
            🏆
          </div>
          <h2 className="mt-6 text-2xl font-black text-white">
            القمة ما زالت تنتظر أبطالها
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
            ما كاين حتى ترتيب لحد الآن. واصل التعلّم والإنجازات،
            وراح يظهر الترتيب هنا كي تتوفر النتائج.
          </p>
          <Link
            href="/courses"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
          >
            اكتشف الدروس
          </Link>
        </section>
      )}

      {/* Podium */}
      {!loading && !error && rows.length > 0 && (
        <>
          <section className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black tracking-[0.18em] text-cyan-300">
                  HALL OF FAME
                </p>
                <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                  أبطال الصدارة
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  أصحاب أعلى رصيد من نقاط XP حالياً.
                </p>
              </div>
              <div className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-slate-400">
                <span className="text-cyan-300">{formatXP(rows.length)}</span>
                {" "}مشارك
              </div>
            </div>

            <div className="grid items-end gap-4 sm:grid-cols-3">
              {[
                { row: topThree[1], rank: 2, medal: "🥈", color: "border-slate-300/20", glow: "from-slate-300/10", height: "sm:mt-8" },
                { row: topThree[0], rank: 1, medal: "🥇", color: "border-amber-300/30", glow: "from-amber-300/15", height: "" },
                { row: topThree[2], rank: 3, medal: "🥉", color: "border-orange-300/20", glow: "from-orange-300/10", height: "sm:mt-12" },
              ].map((item) =>
                item.row ? (
                  <article
                    key={item.row.user_id}
                    className={`relative overflow-hidden rounded-[1.75rem] border ${item.color} bg-gradient-to-br ${item.glow} to-slate-950/70 p-5 text-center shadow-xl transition duration-300 hover:-translate-y-1 sm:p-6 ${item.height} ${
                      item.rank === 1 ? "sm:pb-8" : ""
                    }`}
                  >
                    {item.rank === 1 && (
                      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/80 to-transparent" />
                    )}
                    <div className="absolute left-4 top-4 text-xs font-black tracking-widest text-slate-500">
                      #{item.rank}
                    </div>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/50 text-3xl shadow-inner">
                      {item.medal}
                    </div>
                    <div className="mt-4 truncate text-lg font-black text-white">
                      {getFullName(item.row)}
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-500">
                      {item.rank === 1 ? "المركز الأول" : item.rank === 2 ? "المركز الثاني" : "المركز الثالث"}
                    </div>
                    <div className="my-5 h-px bg-white/[0.08]" />
                    <div className="text-3xl font-black tracking-tight text-cyan-200">
                      {formatXP(item.row.total_xp)}
                    </div>
                    <div className="mt-1 text-xs font-black tracking-widest text-slate-500">
                      XP POINTS
                    </div>
                    {item.rank === 1 && (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/[0.07] px-3 py-1.5 text-xs font-black text-amber-100">
                        <span>✦</span>
                        نجم MARIS
                      </div>
                    )}
                  </article>
                ) : (
                  <div
                    key={`empty-${item.rank}`}
                    className={`hidden rounded-[1.75rem] border border-dashed border-white/[0.07] bg-white/[0.01] sm:block ${item.height}`}
                  />
                )
              )}
            </div>
          </section>

          {/* Full ranking */}
          <section className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-slate-950/40 shadow-2xl shadow-black/10">
            <div className="flex flex-col gap-3 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="text-xs font-black tracking-[0.18em] text-cyan-300">
                  GLOBAL RANKING
                </p>
                <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
                  الترتيب الكامل
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  كل طالب ومركزه حسب مجموع النقاط.
                </p>
              </div>
              <div className="flex w-fit items-center gap-2 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.05] px-3 py-2 text-xs font-bold text-cyan-100">
                <span className="h-2 w-2 rounded-full bg-cyan-300" />
                ترتيب حسب XP
              </div>
            </div>

            <div className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[11px] font-black text-slate-500 sm:grid-cols-[4rem_minmax(0,1fr)_8rem] sm:px-6">
              <span>المركز</span>
              <span>الطالب</span>
              <span className="text-left">النقاط</span>
            </div>

            <div className="divide-y divide-white/[0.05]">
              {rows.map((row, index) => {
                const isTopThree = index < 3;

                return (
                  <div
                    key={row.user_id}
                    className={`group grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 transition-colors hover:bg-cyan-300/[0.035] sm:grid-cols-[4rem_minmax(0,1fr)_8rem] sm:px-6 ${
                      index === 0 ? "bg-amber-300/[0.025]" : ""
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-sm font-black text-slate-400 transition group-hover:border-cyan-300/20 group-hover:text-cyan-200 sm:h-11 sm:w-11">
                      {isTopThree ? ["🥇", "🥈", "🥉"][index] : `#${index + 1}`}
                    </div>

                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-base font-black sm:h-11 sm:w-11 ${
                          index === 0
                            ? "border-amber-200/20 bg-amber-200/[0.08] text-amber-100"
                            : index === 1
                            ? "border-slate-200/20 bg-slate-200/[0.06] text-slate-200"
                            : index === 2
                            ? "border-orange-200/20 bg-orange-200/[0.06] text-orange-100"
                            : "border-cyan-200/10 bg-cyan-200/[0.04] text-cyan-100"
                        }`}
                      >
                        {getFullName(row).slice(0, 1)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-slate-100 transition group-hover:text-cyan-100 sm:text-base">
                          {getFullName(row)}
                        </div>
                        <div className="mt-1 truncate text-[10px] font-bold text-slate-500 sm:text-xs">
                          {index === 0
                            ? "🏆 متصدر الترتيب"
                            : isTopThree
                            ? "من أبطال الصدارة"
                            : "طالب MARIS ACADEMY"}
                        </div>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="whitespace-nowrap text-base font-black tabular-nums text-cyan-200 sm:text-lg">
                        {formatXP(row.total_xp)}
                      </div>
                      <div className="mt-0.5 text-[10px] font-bold tracking-wider text-slate-500">
                        XP
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {remainingRows.length === 0 && (
              <div className="border-t border-white/[0.06] px-5 py-4 text-center text-xs text-slate-500">
                {rows.length === 1
                  ? "واصل التقدم، المنافسة تبدأ من هنا."
                  : "يعرض الجدول جميع الطلبة الموجودين في الترتيب."}
              </div>
            )}
          </section>
        </>
      )}

      {/* Footer */}
      <footer className="flex flex-col items-center justify-center gap-2 px-4 py-4 text-center">
        <div className="flex items-center gap-2 text-xs font-black tracking-wider text-slate-500">
          <span className="text-cyan-300">🐋</span>
          MARIS ACADEMY
          <span className="text-cyan-300">·</span>
          BAC 2027
        </div>
        <p className="text-xs leading-6 text-slate-600">
          الترتيب يتحدّث حسب البيانات المتوفرة في المنصة.
        </p>
      </footer>
    </main>
  );
}
