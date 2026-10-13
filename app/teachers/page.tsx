"use client";

import Link from "next/link";

const BENEFITS = [
  {
    icon: "🎓",
    title: "فضاء خاص بالأستاذ",
    description:
      "حساب مستقل لإدارة محتواك التعليمي ومتابعة نشاطك داخل MARIS ACADEMY.",
  },
  {
    icon: "📚",
    title: "أنشئ محتواك التعليمي",
    description:
      "حضّر الدورات والدروس والاختبارات والريلزات في فضاء منظم.",
  },
  {
    icon: "🛡️",
    title: "مراجعة قبل النشر",
    description:
      "يمر المحتوى على مراجعة الإدارة قبل ظهوره للطلبة، للحفاظ على الجودة.",
  },
  {
    icon: "📊",
    title: "تابع أداء محتواك",
    description:
      "اطّلع على إحصائيات محتواك وتفاعل الطلبة معه بعد تفعيل أدوات المتابعة.",
  },
  {
    icon: "🤝",
    title: "ساهم في نجاح الطلبة",
    description:
      "كن جزءًا من تجربة تعليمية جزائرية تهدف إلى مساعدة طلبة بكالوريا 2027.",
  },
  {
    icon: "⭐",
    title: "ابنِ حضورك التعليمي",
    description:
      "أنشئ ملفًا مهنيًا داخل المنصة، مع إمكانية عرض تخصصك ومحتواك بعد الموافقة.",
  },
];

export default function TeachersPage() {
  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#061426] text-white"
    >
      <div
        className="pointer-events-none absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-cyan-400/10 blur-[120px]"
        aria-hidden
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            🌊
          </span>
          <span className="font-grotesk text-sm font-bold tracking-wider sm:text-base">
            MARIS ACADEMY{" "}
            <span className="text-cyan-400">²⁰²⁷</span>
          </span>
        </Link>

        <Link
          href="/"
          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/80 transition hover:border-cyan-400/40 hover:text-cyan-300"
        >
          الصفحة الرئيسية
        </Link>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-14 text-center sm:px-6 sm:pb-24 sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300">
          🎓 فضاء الأساتذة
        </span>

        <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
          علمك يصنع الفرق،
          <br />
          <span className="text-cyan-400">ومكانك معنا في MARIS.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/65 sm:text-lg">
          هل أنت أستاذ وتحب تساهم في تحضير طلبة بكالوريا 2027؟
          انضم إلى فضاء الأساتذة في MARIS ACADEMY، وساهم بخبرتك
          في بناء تجربة تعليمية منظمة وتفاعلية للطلبة الجزائريين.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/teachers/register"
            className="w-full rounded-xl bg-cyan-400 px-8 py-4 text-center font-bold text-[#061426] transition hover:bg-cyan-300 sm:w-auto"
          >
            انضم إلينا كأستاذ
            <span className="mr-2" aria-hidden>
              ←
            </span>
          </Link>

          <a
            href="#benefits"
            className="w-full rounded-xl border border-white/15 px-8 py-4 text-center font-semibold text-white/85 transition hover:border-cyan-400/40 hover:text-cyan-300 sm:w-auto"
          >
            اكتشف المزايا
          </a>
        </div>

        <p className="mt-5 text-xs leading-6 text-white/40">
          التسجيل لا يمنح صلاحية النشر مباشرة؛ طلب الانضمام يخضع لمراجعة الإدارة.
        </p>
      </section>

      <section
        id="benefits"
        className="relative z-10 mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28"
      >
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            كل ما تحتاجه لتشارك علمك
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/50 sm:text-base">
            أدوات تعليمية، تنظيم للمحتوى، ومراجعة تضمن جودة ما يصل للطلبة.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <article
              key={benefit.title}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-cyan-400/[0.04]"
            >
              <span className="text-3xl" aria-hidden>
                {benefit.icon}
              </span>

              <h3 className="mt-4 text-lg font-bold text-white">
                {benefit.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-white/55">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl border border-cyan-400/15 bg-gradient-to-bl from-cyan-400/[0.09] to-white/[0.02] p-7 text-center sm:p-12">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            هل أنت مستعد للانضمام؟
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
            ابدأ بطلب الانضمام، وقدّم معلوماتك المهنية، وانتظر مراجعة الإدارة.
            بعد الموافقة، يمكنك الدخول إلى فضاء الأستاذ حسب الصلاحيات المعتمدة.
          </p>

          <Link
            href="/teachers/register"
            className="mt-7 inline-flex rounded-xl bg-cyan-400 px-8 py-3.5 font-bold text-[#061426] transition hover:bg-cyan-300"
          >
            تقديم طلب الانضمام
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-4 py-7 text-center text-xs leading-6 text-white/40">
        🌊 MARIS ACADEMY ²⁰²⁷ — معًا من أجل تعليم أفضل
      </footer>
    </main>
  );
}
