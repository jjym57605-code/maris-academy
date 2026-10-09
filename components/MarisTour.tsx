"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type MarisTourProps = {
  userId: string;
  isAdmin: boolean;
};

type TourStep = {
  target: string;
  title: string;
  description: string;
};

type TourPosition = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const TOUR_LAUNCH_CUTOFF = "2026-10-09T22:00:00+01:00";

const TOUR_STEPS: TourStep[] = [
  {
    target: "dashboard-hero",
    title: "مرحبًا بك في MARIS 🌊",
    description:
      "هذي هي لوحة التحكم الرئيسية تاعك. من هنا تبدأ رحلتك للتحضير لبكالوريا 2027.",
  },
  {
    target: "dashboard-progress",
    title: "تابع تقدمك 📊",
    description:
      "هنا تقدر تشوف الدروس اللي كملتهم ونسبة تقدمك في الدورات.",
  },
  {
    target: "dashboard-announcements",
    title: "آخر أخبار الأكاديمية 📢",
    description:
      "تابع الإعلانات والتحديثات باش ما يفوتك حتى جديد.",
  },
  {
    target: "dashboard-next-lesson",
    title: "كمّل من وين حبست 🎯",
    description:
      "من هنا تقدر ترجع للدرس التالي المقترح وتواصل التعلم.",
  },
  {
    target: "dashboard-courses",
    title: "دوراتك التعليمية 📚",
    description:
      "اكتشف الدورات المتاحة وتابع تقدمك في كل دورة.",
  },
  {
    target: "dashboard-quick-links",
    title: "الوصول السريع ⚡",
    description:
      "تلقى هنا اختصارات لأهم أقسام المنصة، مثل الريلزات والاختبارات والترتيب.",
  },
  {
    target: "app-menu-button",
    title: "القائمة الرئيسية ☰",
    description:
      "من هنا تفتح القائمة الجانبية وتتنقل بين أقسام MARIS ACADEMY.",
  },
];

export default function MarisTour({
  userId,
  isAdmin,
}: MarisTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isNewStudent, setIsNewStudent] = useState(false);
  const [position, setPosition] = useState<TourPosition | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalSteps = TOUR_STEPS.length;
  const step = TOUR_STEPS[currentStep];

  // تحديد الطالب قديم أو جديد وتحميل تقدّم الجولة
  useEffect(() => {
    if (!userId || isAdmin) {
      setReady(true);
      setActive(false);
      return;
    }

    let cancelled = false;

    async function loadTour() {
      const supabase = getSupabase();

      if (!supabase) {
        if (!cancelled) setReady(true);
        return;
      }

      try {
        const [{ data: profile, error: profileError }, { data: tour, error: tourError }] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("created_at")
              .eq("id", userId)
              .maybeSingle(),
            supabase
              .from("user_tours")
              .select("current_step, completed")
              .eq("user_id", userId)
              .maybeSingle(),
          ]);

        if (profileError) throw profileError;
        if (tourError) throw tourError;
        if (cancelled) return;

        const cutoffTime = new Date(TOUR_LAUNCH_CUTOFF).getTime();
        const createdAtTime = profile?.created_at
          ? new Date(profile.created_at).getTime()
          : 0;

        const newStudent =
          createdAtTime > 0 && createdAtTime >= cutoffTime;

        setIsNewStudent(newStudent);

        if (!tour) {
          const { error: insertError } = await supabase
            .from("user_tours")
            .insert({
              user_id: userId,
              current_step: 0,
              completed: false,
            });

          if (insertError) throw insertError;
          if (cancelled) return;

          setCurrentStep(0);
          setCompleted(false);

          // الجديد تبدأ عنده الجولة تلقائيًا، والقديم يضغط على الزر
          setActive(newStudent);
        } else {
          const savedStep = Math.min(
            Math.max(0, Number(tour.current_step) || 0),
            totalSteps - 1
          );

          const tourCompleted = tour.completed === true;

          setCurrentStep(savedStep);
          setCompleted(tourCompleted);

          // الجديد يكمل الجولة غير المكتملة تلقائيًا
          // القديم يشوف الزر ويختار وقت البداية
          setActive(newStudent && !tourCompleted);
        }
      } catch (error) {
        console.error("MARIS TOUR loading error:", error);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void loadTour();

    return () => {
      cancelled = true;
    };
  }, [userId, isAdmin, totalSteps]);

  // حفظ تقدّم الجولة
  const saveProgress = useCallback(
    async (nextStep: number, isCompleted = false) => {
      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("تعذر الاتصال بقاعدة البيانات.");
      }

      const { error } = await supabase
        .from("user_tours")
        .update({
          current_step: nextStep,
          completed: isCompleted,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;
    },
    [userId]
  );

  // تحديد العنصر المستهدف وتحديث موقع الإطار
  useEffect(() => {
    if (!active || !ready || isAdmin || !step) {
      setPosition(null);
      return;
    }

    let frame = 0;
    let hasAttemptedAutoScroll = false;

    function updatePosition(allowAutoScroll = false) {
      const element = document.querySelector<HTMLElement>(
        `[data-tour="${step.target}"]`
      );

      if (!element) {
        setPosition(null);
        setTargetMissing(true);
        return;
      }

      setTargetMissing(false);

      const rect = element.getBoundingClientRect();

      if (allowAutoScroll && !hasAttemptedAutoScroll) {
        hasAttemptedAutoScroll = true;

        const isAbove = rect.top < 100;
        const isBelow = rect.bottom > window.innerHeight - 140;

        if (isAbove || isBelow) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }

      const updatedRect = element.getBoundingClientRect();

      setPosition({
        top: updatedRect.top,
        left: updatedRect.left,
        width: updatedRect.width,
        height: updatedRect.height,
      });
    }

    function scheduleUpdate() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => updatePosition(false));
    }

    updatePosition(true);

    const retry = window.setTimeout(() => {
      if (!hasAttemptedAutoScroll) {
        updatePosition(true);
      } else {
        scheduleUpdate();
      }
    }, 350);

    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(retry);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
    };
  }, [active, ready, isAdmin, step]);

  const goToStep = useCallback(
    async (nextStep: number) => {
      if (saving) return;

      setSaving(true);

      try {
        await saveProgress(nextStep);
        setCurrentStep(nextStep);
      } catch (error) {
        console.error("MARIS TOUR save error:", error);
      } finally {
        setSaving(false);
      }
    },
    [saving, saveProgress]
  );

  const finishTour = useCallback(async () => {
    if (saving) return;

    setSaving(true);

    try {
      await saveProgress(totalSteps, true);
      setCompleted(true);
      setActive(false);
    } catch (error) {
      console.error("MARIS TOUR completion error:", error);
    } finally {
      setSaving(false);
    }
  }, [saving, saveProgress, totalSteps]);

  const pauseTour = useCallback(async () => {
    if (saving) return;

    setSaving(true);

    try {
      await saveProgress(currentStep);
      setActive(false);
    } catch (error) {
      console.error("MARIS TOUR pause error:", error);
    } finally {
      setSaving(false);
    }
  }, [saving, saveProgress, currentStep]);

  const restartTour = useCallback(async () => {
    if (saving) return;

    setSaving(true);

    try {
      await saveProgress(0, false);
      setCurrentStep(0);
      setCompleted(false);
      setActive(true);
    } catch (error) {
      console.error("MARIS TOUR restart error:", error);
    } finally {
      setSaving(false);
    }
  }, [saving, saveProgress]);

  if (!ready || !userId || isAdmin) {
    return null;
  }

  const tooltipStyle = position
    ? {
        top:
          position.top + position.height + 14 + 240 > window.innerHeight
            ? Math.max(12, position.top - 250)
            : position.top + position.height + 14,
        left: Math.max(
          12,
          Math.min(
            position.left + position.width / 2 - 160,
            window.innerWidth - 332
          )
        ),
      }
    : {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };

  return (
    <>
      {!active && !completed && (
        <button
          type="button"
          onClick={() => void restartTour()}
          disabled={saving}
          className="fixed bottom-5 left-5 z-[90] rounded-2xl border border-cyan-300/30 bg-slate-950/95 px-4 py-3 text-sm font-black text-cyan-200 shadow-lg shadow-cyan-950/40 transition hover:border-cyan-300/60 hover:bg-slate-900 disabled:opacity-50"
        >
          {isNewStudent ? "🌊 أكمل MARIS TOUR" : "🌊 اكتشف MARIS"}
        </button>
      )}

      {completed && !active && (
        <button
          type="button"
          onClick={() => void restartTour()}
          disabled={saving}
          className="fixed bottom-5 left-5 z-[90] rounded-2xl border border-cyan-300/20 bg-slate-950/90 px-4 py-3 text-sm font-bold text-cyan-200 shadow-lg shadow-cyan-950/30 transition hover:bg-slate-900 disabled:opacity-50"
        >
          🌊 إعادة الجولة
        </button>
      )}

      {active && step && (
        <div dir="rtl">
          <div
            className="fixed inset-0 z-[100] bg-slate-950/75"
            aria-hidden="true"
          />

          {position && !targetMissing && (
            <div
              className="pointer-events-none fixed z-[101] rounded-2xl border-2 border-cyan-300 shadow-[0_0_0_9999px_rgba(2,6,23,0.01),0_0_30px_rgba(34,211,238,0.55)]"
              style={{
                top: position.top - 5,
                left: position.left - 5,
                width: position.width + 10,
                height: position.height + 10,
              }}
              aria-hidden="true"
            />
          )}

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="maris-tour-title"
            className="fixed z-[102] w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-3xl border border-cyan-300/50 bg-slate-950 p-5 text-white shadow-[0_0_15px_rgba(34,211,238,0.30),0_0_35px_rgba(34,211,238,0.18),0_0_65px_rgba(34,211,238,0.08),inset_0_0_20px_rgba(34,211,238,0.06)] before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:border before:border-cyan-200/15 before:content-['']"
            style={tooltipStyle}
          >
            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="text-xs font-black tracking-wider text-cyan-300">
                  MARIS TOUR 🌊
                </span>

                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-200">
                  {currentStep + 1} / {totalSteps}
                </span>
              </div>

              <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                  style={{
                    width: `${((currentStep + 1) / totalSteps) * 100}%`,
                  }}
                />
              </div>

              <h2
                id="maris-tour-title"
                className="text-lg font-black text-white"
              >
                {step.title}
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-300">
                {targetMissing
                  ? "هذي الخطوة مرتبطة بعنصر في الواجهة. راح نربطوها بالعنصر الحقيقي في الخطوة الجاية."
                  : step.description}
              </p>

              <div className="mt-6 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => void pauseTour()}
                  disabled={saving}
                  className="rounded-xl px-3 py-2 text-xs font-bold text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  إيقاف مؤقت
                </button>

                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <button
                      type="button"
                      onClick={() => void goToStep(currentStep - 1)}
                      disabled={saving}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/5 disabled:opacity-50"
                    >
                      السابق
                    </button>
                  )}

                  {currentStep < totalSteps - 1 ? (
                    <button
                      type="button"
                      onClick={() => void goToStep(currentStep + 1)}
                      disabled={saving}
                      className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
                    >
                      التالي ←
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void finishTour()}
                      disabled={saving}
                      className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
                    >
                      إكمال الجولة ✓
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

