
"use client";

import Link from "next/link";
import { useStreamPreview } from "@/contexts/stream-preview";

const SUBJECTS = [
  {
    id: "history",
    title: "التاريخ",
    subtitle: "الشخصيات والمصطلحات والتواريخ التاريخية",
    icon: "📜",
    badge: "HISTORY",
    glow: "from-amber-400/15 to-orange-500/5",
    border: "hover:border-amber-400/30",
    iconBg: "border-amber-400/20 bg-amber-400/10",
    accent: "text-amber-300",
    sections: ["المصطلحات", "الشخصيات", "التواريخ"],
  },
  {
    id: "geography",
    title: "الجغرافيا",
    subtitle: "أهم المصطلحات الجغرافية بطريقة سهلة",
    icon: "🌍",
    badge: "GEOGRAPHY",
    glow: "from-cyan-400/15 to-blue-500/5",
    border: "hover:border-cyan-400/30",
    iconBg: "border-cyan-400/20 bg-cyan-400/10",
    accent: "text-cyan-300",
    sections: ["المصطلحات"],
  },
] as const;

export default function FlashcardsPage() {
  const { previewStream } = useStreamPreview();

  return (
    <div dir="rtl" className="w-full text-white">
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
        <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 h-44 w-44 rounded-full bg-ocean-500/10 blur-3xl" />

        <div className="relative">
          <span className="mb-4 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-300">
            🧠 MARIS FLASHCARDS
          </span>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            حفظني 🧠
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-foam/60 sm:text-base">
            راجع دروسك بذكاء! اختار المادة، اقلب البطاقة باش تشوف
            الإجابة، وانتقل من بطاقة للّي بعدها حتى تثبّت معلوماتك.
          </p>

          {previewStream && (
            <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] p-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">👁️</span>
                <div>
                  <p className="text-sm font-black text-amber-300">
                    وضع معاينة الشعبة
                  </p>
                  <p className="mt-1 text-sm text-foam/70">
                    راك تشوف بطاقات شعبة: {previewStream}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs leading-6 text-foam/50">
                هذه معاينة فقط، ما تبدّلش شعبة الطالب الحقيقية.
              </p>
            </div>
          )}

          <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <span className="text-xl">🔄</span>
            <span className="text-sm font-bold text-foam/70">
              شوف السؤال، فكّر، ومن بعد اقلب البطاقة
            </span>
          </div>
        </div>
      </section>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">اختار المادة</h2>
          <p className="mt-1 text-sm text-foam/45">
            ابدأ رحلة الحفظ تاعك
          </p>
        </div>

        <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-cyan-300">
          مادتان
        </span>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        {SUBJECTS.map((subject) => (
          <Link
            key={subject.id}
            href={`/flashcards/${subject.id}`}
            className={`group relative block overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${subject.glow} bg-white/[0.03] p-5 transition duration-300 hover:-translate-y-1 ${subject.border} focus:outline-none focus:ring-2 focus:ring-cyan-400/40 sm:p-6`}
          >
            <div className="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-white/5 blur-3xl transition group-hover:bg-white/10" />

            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl border text-4xl ${subject.iconBg}`}
                >
                  {subject.icon}
                </div>

                <span
                  className={`rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-[10px] font-black tracking-widest ${subject.accent}`}
                >
                  {subject.badge}
                </span>
              </div>

              <h3 className="mt-6 text-2xl font-black">
                {subject.title}
              </h3>

              <p className="mt-2 min-h-12 text-sm leading-7 text-foam/55">
                {subject.subtitle}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {subject.sections.map((section) => (
                  <span
                    key={section}
                    className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs font-bold text-foam/65"
                  >
                    {section}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-sm font-bold text-foam/50 transition group-hover:text-white">
                  ادخل وابدأ الحفظ
                </span>

                <span
                  className={`text-xl transition-transform duration-300 group-hover:-translate-x-1 ${subject.accent}`}
                >
                  ←
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
        <p className="text-center text-xs leading-6 text-foam/40">
          🌊 MARIS ACADEMY ²⁰²⁷ — خطوة صغيرة كل يوم تصنع فرقًا كبيرًا.
        </p>
      </section>
    </div>
  );
}
