
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { getSupabase } from "@/lib/supabase";
import { ensureProfile } from "@/services/auth";
import { getTotalXP } from "@/services/stats";
import { getLevelInfo } from "@/lib/level";
import { ErrorState, PageHeader, Spinner } from "@/components/ui";

// ══════════════════════════════════════════════════════
// MARIS ID — بطاقة الطالب الرقمية ثلاثية الأبعاد
// البيانات حقيقية من Supabase
// ══════════════════════════════════════════════════════

// نخلي TypeScript يستعمل نفس النوع الذي ترجعه ensureProfile
type MarisProfile = Awaited<
  ReturnType<typeof ensureProfile>
>;

export default function MarisIdPage() {
  const [profile, setProfile] =
    useState<MarisProfile | null>(null);

  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ══════════════════════════════════════════════════════
  // دوران البطاقة
  // ══════════════════════════════════════════════════════

  const [rotation, setRotation] = useState({
    x: 0,
    y: 0,
  });

  const dragging = useRef(false);

  const lastPointer = useRef({
    x: 0,
    y: 0,
  });

  // ══════════════════════════════════════════════════════
  // تحميل بيانات الطالب
  // ══════════════════════════════════════════════════════

  const load = useCallback(async () => {
    const supabase = getSupabase();

    if (!supabase) {
      return;
    }

    setError(false);
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(true);
        return;
      }

      const [profileData, xpTotal] =
        await Promise.all([
          ensureProfile(supabase, user),
          getTotalXP(supabase, user.id),
        ]);

      setProfile(profileData);
      setXp(xpTotal);
    } catch (err) {
      console.error(
        "MARIS ID LOAD ERROR:",
        err
      );

      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ══════════════════════════════════════════════════════
  // حالات التحميل والخطأ
  // ══════════════════════════════════════════════════════

  if (error) {
    return <ErrorState onRetry={load} />;
  }

  if (loading) {
    return <Spinner />;
  }

  // ══════════════════════════════════════════════════════
  // المستوى
  // ══════════════════════════════════════════════════════

  const level = getLevelInfo(xp);

  // ══════════════════════════════════════════════════════
  // الاسم الكامل
  // ══════════════════════════════════════════════════════

  const fullName = [
    profile?.first_name,
    profile?.last_name,
  ]
    .filter(
      (part): part is string =>
        typeof part === "string" &&
        part.trim().length > 0
    )
    .join(" ");

  // ══════════════════════════════════════════════════════
  // بدء السحب
  // ══════════════════════════════════════════════════════

  function handlePointerDown(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    dragging.current = true;

    lastPointer.current = {
      x: event.clientX,
      y: event.clientY,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  }

  // ══════════════════════════════════════════════════════
  // تحريك البطاقة
  // ══════════════════════════════════════════════════════

  function handlePointerMove(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    if (!dragging.current) {
      return;
    }

    const deltaX =
      event.clientX -
      lastPointer.current.x;

    const deltaY =
      event.clientY -
      lastPointer.current.y;

    lastPointer.current = {
      x: event.clientX,
      y: event.clientY,
    };

    setRotation((current) => ({
      x: current.x - deltaY * 0.45,
      y: current.y + deltaX * 0.45,
    }));
  }

  // ══════════════════════════════════════════════════════
  // نهاية السحب
  // ══════════════════════════════════════════════════════

  function handlePointerUp(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    dragging.current = false;

    try {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    } catch {
      // لا شيء
    }
  }

  // ══════════════════════════════════════════════════════
  // إعادة الوضعية الأصلية
  // ══════════════════════════════════════════════════════

  function resetCard() {
    setRotation({
      x: 0,
      y: 0,
    });
  }

  // ══════════════════════════════════════════════════════
  // الواجهة الأمامية
  // ══════════════════════════════════════════════════════

  function showFront() {
    setRotation({
      x: 0,
      y: 0,
    });
  }

  // ══════════════════════════════════════════════════════
  // الخلفية
  // ══════════════════════════════════════════════════════

  function showBack() {
    setRotation({
      x: 0,
      y: 180,
    });
  }

  return (
    <div>
      <PageHeader
        title="بطاقة الطالب"
        subtitle="هويتك الرقمية في MARIS ACADEMY"
      />

      <div className="mx-auto max-w-md">
        {/* ══════════════════════════════════════════════
            مساحة 3D
        ══════════════════════════════════════════════ */}

        <div
          className="relative mx-auto w-full"
          style={{
            perspective: "1200px",
          }}
        >
          {/* ════════════════════════════════════════════
              البطاقة
          ════════════════════════════════════════════ */}

          <div
            className="relative aspect-[1.58/1] w-full cursor-grab select-none active:cursor-grabbing"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
              transition: dragging.current
                ? "none"
                : "transform 180ms ease-out",
              touchAction: "none",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* ══════════════════════════════════════════
                FRONT
            ══════════════════════════════════════════ */}

            <div
              className="absolute inset-0 overflow-hidden rounded-[28px] border border-cyan-400/25 bg-gradient-to-bl from-navy-800 via-navy-850 to-navy-900 p-5 shadow-glow sm:p-7"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility:
                  "hidden",
              }}
            >
              {/* زخرفة */}
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

              <div className="relative flex h-full flex-col justify-between">
                {/* رأس البطاقة */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xl sm:text-2xl"
                      aria-hidden
                    >
                      🌊
                    </span>

                    <span className="font-grotesk text-[10px] font-bold tracking-widest text-white sm:text-xs">
                      MARIS ACADEMY
                    </span>
                  </div>

                  <span className="badge text-[9px] sm:text-xs">
                    بكالوريا 2027
                  </span>
                </div>

                {/* MARIS ID */}
                <div className="space-y-0.5">
                  <p className="text-[9px] font-bold tracking-wide text-cyan-300/80 sm:text-xs">
                    MARIS ID
                  </p>

                  <p
                    dir="ltr"
                    className="text-right font-grotesk text-xl font-bold tracking-[0.15em] text-white sm:text-3xl"
                  >
                    {profile?.maris_id ??
                      "MR-······"}
                  </p>
                </div>

                {/* اسم الطالب */}
                <p className="break-words text-base font-extrabold text-foam sm:text-xl">
                  {fullName || "طالب MARIS"}
                </p>

                {/* تفاصيل الطالب */}
                <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center sm:gap-3 sm:pt-4">
                  <div>
                    <p className="text-[9px] text-foam/50 sm:text-xs">
                      الشعبة
                    </p>

                    <p className="mt-1 break-words text-[10px] font-bold text-foam sm:text-sm">
                      {profile?.stream ??
                        "غير متوفر"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] text-foam/50 sm:text-xs">
                      المستوى
                    </p>

                    <p className="mt-1 text-[10px] font-bold text-cyan-300 sm:text-sm">
                      {level.level} — {level.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] text-foam/50 sm:text-xs">
                      XP
                    </p>

                    <p className="mt-1 font-grotesk text-[10px] font-bold text-cyan-300 sm:text-sm">
                      {xp} XP
                    </p>
                  </div>
                </div>
              </div>

              {/* مؤشر */}
              <div className="absolute bottom-3 right-4 rounded-full border border-white/10 bg-black/10 px-2 py-1 text-[8px] text-white/40 backdrop-blur-sm sm:text-[10px]">
                اسحب للدوران
              </div>
            </div>

            {/* ══════════════════════════════════════════
                BACK
            ══════════════════════════════════════════ */}

            <div
              className="absolute inset-0 overflow-hidden rounded-[28px] border border-cyan-400/25 bg-gradient-to-br from-navy-900 via-navy-850 to-navy-800 p-5 shadow-glow sm:p-7"
              style={{
                transform: "rotateY(180deg)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility:
                  "hidden",
              }}
            >
              {/* زخارف */}
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/15 blur-[60px]"
                aria-hidden
              />

              <div
                className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-ocean-500/20 blur-[70px]"
                aria-hidden
              />

              <div className="relative flex h-full flex-col justify-between">
                {/* رأس الخلفية */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-grotesk text-xs font-bold tracking-widest text-white">
                      MARIS ACADEMY
                    </p>

                    <p className="mt-1 text-[9px] text-cyan-300/60">
                      STUDENT DIGITAL ID
                    </p>
                  </div>

                  <span
                    className="text-3xl"
                    aria-hidden
                  >
                    🌊
                  </span>
                </div>

                {/* QR placeholder */}
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-cyan-400/20 bg-white/[0.04] sm:h-28 sm:w-28">
                    <div className="text-center">
                      <div className="text-2xl opacity-40">
                        ▦
                      </div>

                      <p className="mt-1 text-[8px] font-bold text-white/40">
                        QR
                      </p>
                    </div>
                  </div>
                </div>

                {/* معلومات الطالب */}
                <div className="space-y-2 border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[9px] text-foam/40">
                      الطالب
                    </span>

                    <span className="max-w-[65%] truncate text-xs font-bold text-foam">
                      {fullName || "طالب MARIS"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[9px] text-foam/40">
                      MARIS ID
                    </span>

                    <span
                      dir="ltr"
                      className="font-grotesk text-xs font-bold tracking-widest text-cyan-300"
                    >
                      {profile?.maris_id ??
                        "MR-······"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[9px] text-foam/40">
                      المستوى
                    </span>

                    <span className="text-xs font-bold text-foam">
                      Level {level.level}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            أزرار التحكم
        ══════════════════════════════════════════════ */}

        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={showFront}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-foam transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
          >
            الواجهة
          </button>

          <button
            type="button"
            onClick={resetCard}
            className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400/20"
          >
            ↻ إعادة
          </button>

          <button
            type="button"
            onClick={showBack}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-foam transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
          >
            الخلفية
          </button>
        </div>

        <p className="mt-4 text-center text-xs leading-6 text-foam/40">
          اسحب البطاقة بالماوس أو بإصبعك لتدويرها
          بحرية.
        </p>
      </div>
    </div>
  );
}






