
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { BAC_STREAMS } from "@/types/database";

interface StreamPreviewContextValue {
  previewStream: string | null;
  setPreviewStream: (stream: string | null) => void;
}

const StreamPreviewContext =
  createContext<StreamPreviewContextValue | null>(null);

export function StreamPreviewProvider({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: ReactNode;
}) {
  const [previewStream, setPreviewStreamState] =
    useState<string | null>(null);

  function setPreviewStream(stream: string | null) {
    if (!isAdmin) return;

    if (
      stream !== null &&
      !BAC_STREAMS.includes(
        stream as (typeof BAC_STREAMS)[number]
      )
    ) {
      return;
    }

    setPreviewStreamState(stream);
  }

  useEffect(() => {
    if (!isAdmin) {
      setPreviewStreamState(null);
    }
  }, [isAdmin]);

  return (
    <StreamPreviewContext.Provider
      value={{ previewStream, setPreviewStream }}
    >
      {isAdmin && (
        <div
          dir="rtl"
          className="relative isolate overflow-hidden border-b border-cyan-400/20 bg-gradient-to-l from-[#061a2b] via-[#071426] to-[#081c30] px-4 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
        >
          {/* إضاءات ديكورية */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 left-1/4 h-36 w-36 rounded-full bg-blue-500/10 blur-3xl"
          />

          <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {/* عنوان المعاينة */}
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-xl shadow-[0_0_20px_rgba(34,211,238,0.08)]">
                👁️
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black text-white">
                    معاينة الشعب
                  </p>

                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-extrabold text-cyan-200">
                    ADMIN PREVIEW
                  </span>
                </div>

                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  شوف المنصة كيف تظهر لكل شعبة قبل ما يراها الطلبة
                </p>
              </div>
            </div>

            {/* اختيار الشعبة */}
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <label
                htmlFor="maris-stream-preview"
                className="shrink-0 text-xs font-bold text-cyan-100 sm:text-sm"
              >
                الشعبة:
              </label>

              <div className="relative min-w-0 flex-1 sm:max-w-xs">
                <select
                  id="maris-stream-preview"
                  value={previewStream ?? ""}
                  onChange={(event) =>
                    setPreviewStream(event.target.value || null)
                  }
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-[#0b2035] px-4 py-3 pl-10 text-sm font-bold text-white shadow-inner outline-none transition duration-200 hover:border-cyan-400/40 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/15"
                >
                  <option value="">
                    الشعبة الحقيقية للحساب
                  </option>

                  {BAC_STREAMS.map((stream) => (
                    <option key={stream} value={stream}>
                      {stream}
                    </option>
                  ))}
                </select>

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-cyan-300"
                >
                  ▼
                </span>
              </div>

              {previewStream && (
                <button
                  type="button"
                  onClick={() => setPreviewStream(null)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm font-extrabold text-rose-200 transition duration-200 hover:border-rose-300/40 hover:bg-rose-400/20 active:scale-[0.98]"
                >
                  <span aria-hidden="true">↩</span>
                  إنهاء المعاينة
                </button>
              )}
            </div>
          </div>

          {/* حالة المعاينة */}
          {previewStream && (
            <div className="relative mx-auto mt-3 flex w-full max-w-7xl items-start gap-2 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-3 sm:items-center">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-300/10 text-xs text-cyan-300 sm:mt-0"
              >
                ✓
              </span>

              <p className="text-xs leading-6 text-slate-300 sm:text-sm">
                راك تعاين المنصة لشعبة{" "}
                <span className="font-black text-cyan-200">
                  {previewStream}
                </span>
                . هذا التغيير للمعاينة فقط، وما يبدّلش الشعبة
                الحقيقية للحساب في قاعدة البيانات.
              </p>
            </div>
          )}
        </div>
      )}

      {children}
    </StreamPreviewContext.Provider>
  );
}

export function useStreamPreview() {
  const context = useContext(StreamPreviewContext);

  if (!context) {
    throw new Error(
      "useStreamPreview must be used inside StreamPreviewProvider"
    );
  }

  return context;
}
