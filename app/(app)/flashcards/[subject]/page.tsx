
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

const SUBJECTS = {
  history: {
    title: "التاريخ",
    icon: "📜",
    badge: "HISTORY",
    description: "راجع أهم المعلومات التاريخية ببطاقات سهلة وتفاعلية.",
    accent: "text-amber-300",
    glow: "bg-amber-400/10",
    sections: [
      {
        id: "term",
        title: "المصطلحات",
        description: "تعريفات ومفاهيم تاريخية مهمة",
        icon: "📚",
      },
      {
        id: "personality",
        title: "الشخصيات",
        description: "تعرّف على الشخصيات التاريخية ودورها",
        icon: "👤",
      },
      {
        id: "date",
        title: "التواريخ",
        description: "أهم التواريخ والأحداث التاريخية",
        icon: "📅",
      },
    ],
  },
  geography: {
    title: "الجغرافيا",
    icon: "🌍",
    badge: "GEOGRAPHY",
    description: "احفظ المصطلحات الجغرافية بطريقة منظمة.",
    accent: "text-cyan-300",
    glow: "bg-cyan-400/10",
    sections: [
      {
        id: "term",
        title: "المصطلحات",
        description: "تعريفات ومفاهيم جغرافية مهمة",
        icon: "📚",
      },
    ],
  },
} as const;

export default function FlashcardSubjectPage() {
  const params = useParams<{ subject: string }>();
  const subjectKey = params.subject;

  if (subjectKey !== "history" && subjectKey !== "geography") {
    return (
      <div dir="rtl" className="rounded-3xl border border-white/10 p-8 text-center text-white">
        <div className="text-4xl">🔎</div>
        <h1 className="mt-4 text-xl font-black">المادة غير موجودة</h1>
        <Link
          href="/flashcards"
          className="mt-5 inline-flex rounded-xl bg-cyan-400/10 px-4 py-3 font-bold text-cyan-300"
        >
          العودة إلى حفظني
        </Link>
      </div>
    );
  }

  const subject = SUBJECTS[subjectKey];

  return (
    <div dir="rtl" className="w-full text-white">
      <Link
        href="/flashcards"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
      >
        <span>→</span>
        العودة إلى حفظني
      </Link>

      <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
        <div className={`pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full ${subject.glow} blur-3xl`} />

        <div className="relative">
          <span className={`inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black ${subject.accent}`}>
            {subject.icon} {subject.badge}
          </span>

          <h1 className="mt-4 text-3xl font-black">
            {subject.title}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-foam/60">
            {subject.description}
          </p>
        </div>
      </section>

      <div className="mb-4">
        <h2 className="text-xl font-black">اختار القسم</h2>
        <p className="mt-1 text-sm text-foam/45">
          اختار واش حاب تحفظ اليوم
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subject.sections.map((section) => (
          <Link
            key={section.id}
            href={`/flashcards/${subjectKey}/${section.id}`}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/25 hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          >
            <div className="pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full bg-cyan-400/5 blur-2xl transition group-hover:bg-cyan-400/10" />

            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-3xl">
                {section.icon}
              </div>

              <h3 className="mt-5 text-xl font-black">
                {section.title}
              </h3>

              <p className="mt-2 min-h-12 text-sm leading-6 text-foam/50">
                {section.description}
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
                <span className="text-xs font-bold text-foam/40">
                  افتح البطاقات
                </span>
                <span className="text-lg text-cyan-300 transition-transform group-hover:-translate-x-1">
                  ←
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}