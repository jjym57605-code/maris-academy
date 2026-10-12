
"use client";

import { useEffect, useRef, useState } from "react";
import MarisOcean3D from "@/components/MarisOcean3D";

type WaveWelcomeProps = {
  studentName?: string;
  mode: "intro" | "greeting";
  onComplete: () => void;
};

type Phase = "wave" | "greeting";

export default function WaveWelcome({
  studentName,
  mode,
  onComplete,
}: WaveWelcomeProps) {
  const [phase, setPhase] = useState<Phase>(
    mode === "intro" ? "wave" : "greeting"
  );
  const [progress, setProgress] = useState(0);

  const completeRef = useRef(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setPhase(mode === "intro" ? "wave" : "greeting");
    setProgress(0);

    const duration = mode === "intro" ? 4300 : 1800;
    const startTime = performance.now();
    let frameId = 0;

    const updateProgress = (now: number) => {
      const elapsed = now - startTime;
      const ratio = Math.min(elapsed / duration, 1);

      // تقدم سينمائي سريع في البداية وأهدأ قرب النهاية
      const easedProgress = 1 - Math.pow(1 - ratio, 2.2);

      setProgress(Math.round(easedProgress * 100));

      if (ratio < 1) {
        frameId = requestAnimationFrame(updateProgress);
      }
    };

    frameId = requestAnimationFrame(updateProgress);

    const greetingTimer = window.setTimeout(() => {
      setPhase("greeting");
    }, mode === "intro" ? 1900 : 0);

    const completeTimer = window.setTimeout(() => {
      completeRef.current();
    }, duration);

    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(greetingTimer);
      window.clearTimeout(completeTimer);
    };
  }, [mode]);

  const name = studentName?.trim();

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden bg-[#020817]"
      role="status"
      aria-live="polite"
      aria-label="MARIS ACADEMY loading"
    >
      <MarisOcean3D />

      {/* تظليل سينمائي */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_0%,rgba(2,8,23,0.2)_48%,rgba(2,8,23,0.88)_100%)]" />

      {/* ضوء محيطي */}
      <div className="pointer-events-none absolute -left-1/4 top-0 h-[55vh] w-[150%] animate-[ocean-glow_7s_ease-in-out_infinite_alternate] rounded-[50%] bg-cyan-400/[0.06] blur-[100px]" />

      {/* هوية MARIS */}
      <div className="pointer-events-none absolute left-0 right-0 top-[9%] z-10 flex justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-cyan-300/60" />

            <span className="text-xs font-semibold tracking-[0.45em] text-cyan-200 sm:text-sm">
              MARIS ACADEMY
            </span>

            <div className="h-px w-8 bg-cyan-300/60" />
          </div>

          <span className="text-[10px] tracking-[0.3em] text-white/45">
            BAC 2027
          </span>
        </div>
      </div>

      {/* محتوى الترحيب */}
      <div className="pointer-events-none absolute inset-x-4 top-[29%] z-10 flex flex-col items-center text-center">
        <div
          key={phase}
          className="animate-[welcome-in_900ms_cubic-bezier(0.16,1,0.3,1)_both]"
        >
          <div className="mx-auto mb-6 h-1 w-14 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_28px_rgba(34,211,238,0.8)]" />

          <p className="text-xs font-medium tracking-[0.25em] text-cyan-200 sm:text-sm">
            {phase === "wave"
              ? "YOUR JOURNEY STARTS HERE"
              : mode === "intro"
                ? "أهلاً بك في عالمنا"
                : "مرحباً بعودتك"}
          </p>

          <h1 className="mt-5 text-3xl font-black text-white drop-shadow-[0_0_30px_rgba(34,211,238,0.35)] sm:text-5xl md:text-6xl">
            {phase === "wave"
              ? "عالمك يبدأ هنا"
              : name || "بطل MARIS"}
          </h1>

          <p className="mt-4 text-sm text-cyan-50/75 sm:text-base">
            {phase === "wave"
              ? "نحضّرولك تجربة MARIS"
              : mode === "intro"
                ? "رحلتك نحو النجاح تبدأ الآن"
                : "واصل رحلتك نحو البكالوريا"}
          </p>
        </div>
      </div>

      {/* شريط تحميل سينمائي */}
      <div className="pointer-events-none absolute bottom-[12%] left-1/2 z-10 w-[min(320px,75vw)] -translate-x-1/2">
        <div className="mb-3 flex items-center justify-between text-[10px] tracking-[0.2em] text-cyan-100/65">
          <span>PREPARING YOUR JOURNEY</span>
          <span className="tabular-nums">{progress}%</span>
        </div>

        <div className="relative h-[3px] overflow-hidden rounded-full bg-white/10 shadow-[0_0_18px_rgba(34,211,238,0.08)]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-600 via-cyan-300 to-white shadow-[0_0_15px_rgba(34,211,238,0.8)] transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />

          <div className="absolute inset-y-0 left-0 w-1/4 animate-[loading-shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] tracking-[0.25em] text-white/40">
          <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-300" />
          <span>MARIS ACADEMY · BAC 2027</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes welcome-in {
          from {
            opacity: 0;
            transform: translateY(22px);
            filter: blur(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @keyframes loading-shimmer {
          from {
            transform: translateX(-130%);
          }
          to {
            transform: translateX(430%);
          }
        }

        @keyframes ocean-glow {
          from {
            transform: translate3d(-3%, -2%, 0) scale(0.95);
            opacity: 0.45;
          }
          to {
            transform: translate3d(3%, 4%, 0) scale(1.1);
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-pulse {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
