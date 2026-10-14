
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

const SITE_URL = "https://maris-academy-three.vercel.app";

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "MARIS ACADEMY ²⁰²⁷",
  alternateName: "Maris Academy 2027",
  url: SITE_URL,
  description:
    "منصة تعليمية جزائرية لطلبة بكالوريا 2027، تجمع بين الدروس والاختبارات والبطاقات التعليمية وتتبع التقدم الدراسي.",
  areaServed: {
    "@type": "Country",
    name: "Algeria",
  },
  educationalLevel: "Secondary education",
  educationalUse: "Study",
  inLanguage: "ar-DZ",
  audience: {
    "@type": "EducationalAudience",
    educationalRole: "student",
  },
  sameAs: [
    "https://t.me/bac2027maris",
    "https://www.youtube.com/@academymaris",
    "https://www.instagram.com/_maris_academy__/",
  ],
};

const FEATURES = [
  {
    number: "01",
    icon: "📚",
    title: "مكتبة الدروس",
    description:
      "نظّم مراجعتك حسب الشعبة والمادة، وارجع إلى الدروس التي تحتاجها في أي وقت.",
    color: "from-cyan-400/20 to-blue-500/5",
  },
  {
    number: "02",
    icon: "🎬",
    title: "ريلزات تعليمية",
    description:
      "راجع المفاهيم واكتشف محتوى تعليميًا قصيرًا يساعدك على تثبيت المعلومات.",
    color: "from-violet-400/20 to-blue-500/5",
  },
  {
    number: "03",
    icon: "🧠",
    title: "حفظني",
    description:
      "بطاقات تعليمية تفاعلية تساعدك على مراجعة المصطلحات والشخصيات والتواريخ.",
    color: "from-emerald-400/20 to-cyan-500/5",
  },
  {
    number: "04",
    icon: "✍️",
    title: "اختبارات تفاعلية",
    description:
      "اختبر فهمك وتدرّب على الأسئلة لتعرف مستواك وتحدد ما يحتاج إلى مراجعة.",
    color: "from-amber-400/20 to-orange-500/5",
  },
  {
    number: "05",
    icon: "📈",
    title: "تتبع التقدم",
    description:
      "تابع تقدمك الدراسي وإنجازاتك، وراقب تطور رحلتك نحو البكالوريا.",
    color: "from-blue-400/20 to-indigo-500/5",
  },
  {
    number: "06",
    icon: "🏆",
    title: "نظام التحفيز",
    description:
      "اجمع نقاط الخبرة، وافتح الإنجازات، وتقدم في المستويات مع استمرارك في التعلم.",
    color: "from-pink-400/20 to-purple-500/5",
  },
] as const;

const STEPS = [
  {
    icon: "👤",
    number: "01",
    title: "أنشئ حسابك",
    description: "سجّل في المنصة وحدد شعبتك الدراسية.",
  },
  {
    icon: "🎯",
    number: "02",
    title: "ابدأ المراجعة",
    description: "استكشف الدروس والاختبارات والبطاقات التعليمية.",
  },
  {
    icon: "🚀",
    number: "03",
    title: "تابع تقدمك",
    description: "أنجز مهامك الدراسية وراقب تطور مستواك.",
  },
] as const;

type Review = {
  id: string;
  rating: number;
  review: string;
  created_at: string;
};

function renderStars(rating: number) {
  const safeRating = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(safeRating) + "☆".repeat(5 - safeRating);
}

function formatDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "";

  return new Intl.DateTimeFormat("ar-DZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsedDate);
}

function ReviewCard({ item }: { item: Review }) {
  return (
    <article
      dir="rtl"
      className="relative flex min-h-[225px] w-[285px] shrink-0 flex-col overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0b1d31] p-5 shadow-xl shadow-black/10 sm:w-[330px] sm:p-6"
    >
      <div
        className="text-lg tracking-widest text-amber-300"
        dir="ltr"
        aria-label={`${item.rating} من 5`}
      >
        {renderStars(item.rating)}
      </div>

      <p className="mt-5 flex-1 whitespace-normal break-words text-sm leading-8 text-slate-300">
        «{item.review}»
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
        <span className="text-xs font-bold text-cyan-300">
          طالب من MARIS 💙
        </span>

        <span className="shrink-0 text-[11px] text-slate-500">
          {formatDate(item.created_at)}
        </span>
      </div>
    </article>
  );
}

function ReviewRow({
  items,
  direction,
  label,
}: {
  items: Review[];
  direction: "left" | "right";
  label: string;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className="maris-marquee w-full overflow-hidden"
      dir="ltr"
      role="region"
      aria-label={label}
    >
      <div
        className={`maris-marquee-track ${
          direction === "left"
            ? "maris-marquee-left"
            : "maris-marquee-right"
        }`}
      >
        {[0, 1, 2].map((copy) => (
          <div
            key={copy}
            className="maris-marquee-group"
            aria-hidden={copy !== 0}
          >
            {items.map((item) => (
              <ReviewCard key={`${copy}-${item.id}`} item={item} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadReviews() {
      const supabase = getSupabase();

      if (!supabase) {
        if (active) setReviewsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("platform_reviews")
          .select("id, rating, review, created_at")
          .eq("status", "approved")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (active) setReviews(data ?? []);
      } catch (error) {
        console.error("Error loading reviews:", error);
        if (active) setReviews([]);
      } finally {
        if (active) setReviewsLoading(false);
      }
    }

    void loadReviews();

    return () => {
      active = false;
    };
  }, []);

  const firstReviewRow = reviews.filter((_, index) => index % 2 === 0);
  const secondReviewRow = reviews.filter((_, index) => index % 2 !== 0);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(STRUCTURED_DATA),
        }}
      />

      <main
        dir="rtl"
        className="relative isolate overflow-hidden bg-[#061321] text-white"
      >
        {/* الخلفية البحرية */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -top-48 right-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.12] blur-[130px]" />
          <div className="absolute left-[-15%] top-[700px] h-[420px] w-[420px] rounded-full bg-blue-600/[0.10] blur-[130px]" />
          <div className="absolute right-[30%] top-[1700px] h-[400px] w-[400px] rounded-full bg-cyan-500/[0.06] blur-[130px]" />

          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>

        {/* الترويسة */}
        <header className="relative z-20 border-b border-white/[0.07] bg-[#061321]/80 backdrop-blur-xl">
          <nav
            aria-label="التنقل الرئيسي"
            className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8"
          >
            <Link
              href="/"
              aria-label="MARIS ACADEMY الصفحة الرئيسية"
              className="flex shrink-0 items-center gap-2.5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/20 to-blue-500/10 text-2xl shadow-lg shadow-cyan-500/5">
                🌊
              </span>

              <span className="leading-tight">
                <span className="block font-grotesk text-sm font-extrabold tracking-wide sm:text-base">
                  MARIS ACADEMY
                </span>
                <span className="mt-1 block text-[10px] font-bold tracking-[0.28em] text-cyan-300 sm:text-xs">
                  CLASS OF 2027
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/teachers"
                className="hidden rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-2.5 text-sm font-bold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 sm:inline-flex"
              >
                🎓 فضاء الأساتذة
              </Link>

              <Link
                href="/login"
                className="rounded-xl border border-white/10 px-3 py-2.5 text-xs font-bold text-slate-200 transition hover:border-cyan-300/30 hover:text-cyan-200 sm:px-5 sm:text-sm"
              >
                تسجيل الدخول
              </Link>

              <Link
                href="/register"
                className="rounded-xl bg-cyan-300 px-3 py-2.5 text-xs font-extrabold text-[#061321] shadow-lg shadow-cyan-500/10 transition hover:bg-cyan-200 sm:px-5 sm:text-sm"
              >
                انضم إلينا
              </Link>
            </div>
          </nav>
        </header>

        {/* الواجهة الرئيسية */}
        <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:px-8 lg:pb-32 lg:pt-28">
          <div className="relative text-center lg:text-right">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-4 py-2 text-xs font-bold text-cyan-200 sm:text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
              </span>
              منصتك التعليمية لبكالوريا 2027
              <span>🇩🇿</span>
            </div>

            <h1 className="text-4xl font-black leading-[1.45] tracking-tight sm:text-5xl sm:leading-[1.4] lg:text-6xl xl:text-7xl">
              مستقبلك يبدأ
              <br />
              من <span className="maris-gradient-text">خطوة اليوم.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg sm:leading-9 lg:mx-0">
              بكالوريا 2027 رحلة تحتاج إلى تنظيم ومثابرة. مع MARIS ACADEMY،
              اجمع أدوات المراجعة في مكان واحد، تعلّم بطريقتك، وتابع تقدمك
              خطوة بخطوة نحو هدفك.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                href="/register"
                className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-7 py-4 text-base font-black text-[#061321] shadow-xl shadow-cyan-500/15 transition hover:-translate-y-1 hover:bg-cyan-200"
              >
                ابدأ رحلتك مجانًا
                <span className="text-lg transition-transform group-hover:-translate-x-1">
                  ←
                </span>
              </Link>

              <Link
                href="/about"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-7 py-4 text-base font-bold text-white transition hover:border-cyan-300/30 hover:bg-white/[0.07]"
              >
                اكتشف MARIS
                <span className="text-cyan-300">↙</span>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs text-slate-400 sm:text-sm lg:justify-start">
              <span className="inline-flex items-center gap-2">
                <span className="text-cyan-300">✓</span>
                تجربة تعليمية تفاعلية
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="text-cyan-300">✓</span>
                متابعة تقدمك
              </span>
            </div>
          </div>

          {/* معاينة بصرية للمنصة */}
          <div className="relative mx-auto w-full max-w-[530px]">
            <div className="absolute inset-5 rounded-[40px] bg-cyan-400/10 blur-3xl" />

            <div className="maris-float relative rounded-[30px] border border-white/[0.12] bg-gradient-to-br from-[#122b43] via-[#0b1c2e] to-[#081522] p-3 shadow-2xl shadow-black/40 sm:rounded-[36px] sm:p-5">
              <div className="overflow-hidden rounded-[24px] border border-white/[0.07] bg-[#071523]">
                <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4 sm:px-6">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300/10 text-lg">
                      🌊
                    </span>
                    <div>
                      <p className="text-xs font-extrabold text-white sm:text-sm">
                        MARIS ACADEMY
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        مساحة التعلم الخاصة بك
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-bold text-cyan-200">
                    BAC 2027
                  </span>
                </div>

                <div className="p-4 sm:p-6">
                  <div className="relative overflow-hidden rounded-2xl border border-cyan-300/10 bg-gradient-to-br from-[#12374a] to-[#10253b] p-5 sm:p-6">
                    <div className="absolute -left-8 -top-12 h-36 w-36 rounded-full bg-cyan-300/10 blur-2xl" />

                    <div className="relative flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-cyan-100/70">
                          رحلتك نحو النجاح
                        </p>
                        <h2 className="mt-3 text-xl font-black text-white sm:text-2xl">
                          مستعد للتحدي؟
                        </h2>
                        <p className="mt-2 text-xs leading-6 text-slate-300">
                          كل خطوة صغيرة تصنع فرقًا.
                        </p>
                      </div>

                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-4xl">
                        🐋
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xl">📚</span>
                        <span className="text-[10px] text-slate-500">
                          تعلّم
                        </span>
                      </div>
                      <p className="mt-4 text-sm font-extrabold text-white">
                        الدروس
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        مراجعة منظمة
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xl">🧠</span>
                        <span className="text-[10px] text-slate-500">
                          راجع
                        </span>
                      </div>
                      <p className="mt-4 text-sm font-extrabold text-white">
                        حفظني
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        بطاقات تفاعلية
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xl">✍️</span>
                        <span className="text-[10px] text-slate-500">
                          تدرّب
                        </span>
                      </div>
                      <p className="mt-4 text-sm font-extrabold text-white">
                        الاختبارات
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        قيّم فهمك
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xl">🏆</span>
                        <span className="text-[10px] text-slate-500">
                          تقدّم
                        </span>
                      </div>
                      <p className="mt-4 text-sm font-extrabold text-white">
                        الإنجازات
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        حفّز نفسك
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.045] p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-xl">
                      ⚡
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white">
                        كل إنجاز يقربك من هدفك
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        تعلّم، اختبر نفسك، وواصل التقدم
                      </p>
                    </div>
                    <span className="text-xl text-cyan-300">↗</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-2 top-[18%] hidden items-center gap-3 rounded-2xl border border-white/10 bg-[#10243a]/95 p-3 shadow-xl backdrop-blur-xl sm:flex sm:-right-8">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300/10 text-xl">
                ⭐
              </span>
              <div>
                <p className="text-xs font-extrabold text-white">
                  واصل التقدم
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  خطوة بخطوة
                </p>
              </div>
            </div>

            <div className="absolute -bottom-5 left-2 hidden items-center gap-3 rounded-2xl border border-white/10 bg-[#10243a]/95 p-3 shadow-xl backdrop-blur-xl sm:flex sm:-left-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10 text-xl">
                🎯
              </span>
              <div>
                <p className="text-xs font-extrabold text-white">
                  هدفك واضح
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  بكالوريا 2027
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* شريط الهوية */}
        <section className="relative z-10 border-y border-white/[0.07] bg-white/[0.02]">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-4 py-7 sm:px-6 md:grid-cols-4 lg:px-8">
            {[
              { icon: "📚", title: "تعلّم", subtitle: "في مكان واحد" },
              { icon: "🧠", title: "راجع", subtitle: "بطريقة تفاعلية" },
              { icon: "📈", title: "تابع", subtitle: "تقدمك الدراسي" },
              { icon: "🏆", title: "أنجز", subtitle: "واستمر في التحسن" },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-center gap-3 sm:justify-start md:justify-center"
              >
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-extrabold text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* المميزات */}
        <section
          id="features"
          className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
        >
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-2 text-xs font-bold text-cyan-200">
              اكتشف إمكانيات MARIS
            </span>

            <h2 className="mt-5 text-3xl font-black leading-relaxed sm:text-4xl lg:text-5xl">
              كل ما تحتاجه،
              <br className="sm:hidden" /> في{" "}
              <span className="maris-gradient-text">مكان واحد.</span>
            </h2>

            <p className="mt-4 text-sm leading-8 text-slate-400 sm:text-base">
              أدوات تعليمية متكاملة تساعدك على تنظيم المراجعة وجعل رحلتك
              الدراسية أكثر وضوحًا وتفاعلًا.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {FEATURES.map((feature) => (
              <article
                key={feature.number}
                className="maris-feature-card group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a1a2b]/90 p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/25 sm:p-7"
              >
                <div
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${feature.color} opacity-70 transition group-hover:opacity-100`}
                />

                <div className="relative flex items-center justify-between">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#10253a] text-3xl shadow-lg">
                    {feature.icon}
                  </span>
                  <span className="font-grotesk text-sm font-bold tracking-widest text-slate-600">
                    {feature.number}
                  </span>
                </div>

                <h3 className="relative mt-7 text-xl font-extrabold text-white">
                  {feature.title}
                </h3>

                <p className="relative mt-3 text-sm leading-8 text-slate-400">
                  {feature.description}
                </p>

                <div
                  aria-hidden="true"
                  className="relative mt-6 h-px w-full bg-gradient-to-l from-cyan-300/25 via-white/[0.05] to-transparent"
                />
              </article>
            ))}
          </div>
        </section>

        {/* كيف تبدأ */}
        <section className="relative z-10 border-y border-white/[0.06] bg-[#091a2a]/65">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="text-sm font-bold text-cyan-300">
                البداية أسهل مما تتصور
              </span>
              <h2 className="mt-4 text-3xl font-black sm:text-4xl">
                ثلاث خطوات نحو هدفك
              </h2>
              <p className="mt-4 text-sm leading-8 text-slate-400">
                ابدأ ببساطة، نظّم مراجعتك، واجعل كل يوم فرصة جديدة للتقدم.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <article
                  key={step.number}
                  className="relative rounded-3xl border border-white/[0.07] bg-[#0b1d30] p-7 text-center transition hover:border-cyan-300/20"
                >
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.07] text-3xl">
                    {step.icon}
                  </span>

                  <p className="mt-5 text-xs font-bold tracking-widest text-cyan-300">
                    الخطوة {step.number}
                  </p>

                  <h3 className="mt-3 text-xl font-extrabold text-white">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    {step.description}
                  </p>

                  {index !== STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 text-2xl text-cyan-300/40 md:block"
                    >
                      ←
                    </span>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* آراء الطلبة الحقيقية */}
        {!reviewsLoading && reviews.length > 0 && (
          <section className="relative z-10 overflow-hidden py-20 sm:py-28">
            <div className="mx-auto mb-10 max-w-3xl px-4 text-center sm:px-6">
              <span className="text-3xl">💬</span>

              <h2 className="mt-4 text-3xl font-black sm:text-4xl">
                ماذا يقول طلبتنا؟
              </h2>

              <p className="mt-4 text-sm leading-8 text-slate-400 sm:text-base">
                آراء الطلبة التي تمت الموافقة على نشرها في المنصة.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              <ReviewRow
                items={firstReviewRow}
                direction="left"
                label="آراء الطلبة، الصف الأول"
              />

              {secondReviewRow.length > 0 && (
                <ReviewRow
                  items={secondReviewRow}
                  direction="right"
                  label="آراء الطلبة، الصف الثاني"
                />
              )}
            </div>

            <div className="mt-9 text-center">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-300/30 hover:text-cyan-200"
              >
                شاهد جميع الآراء
                <span className="text-cyan-300">←</span>
              </Link>
            </div>
          </section>
        )}

        {/* قسم SEO */}
        <section className="relative z-10 mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0c2034] to-[#091827] p-6 sm:p-9 lg:p-10">
            <div className="max-w-4xl">
              <span className="text-xs font-bold text-cyan-300">
                MARIS ACADEMY ²⁰²⁷
              </span>

              <h2 className="mt-4 text-2xl font-black leading-relaxed sm:text-3xl">
                منصة تعليمية جزائرية لبكالوريا 2027
              </h2>

              <div className="mt-5 space-y-4 text-sm leading-8 text-slate-400 sm:text-base">
                <p>
                  MARIS ACADEMY هي منصة تعليمية موجهة لتلاميذ بكالوريا
                  2027 في الجزائر، تجمع أدوات المراجعة والتعلم في تجربة
                  رقمية واحدة تساعد الطالب على تنظيم رحلته الدراسية.
                </p>

                <p>
                  توفر المنصة مكتبة للدروس، ومحتوى تعليميًا قصيرًا،
                  واختبارات تفاعلية، وبطاقات للمراجعة، بالإضافة إلى أدوات
                  لمتابعة التقدم الدراسي والإنجازات.
                </p>

                <p>
                  هدف MARIS ACADEMY هو مساعدة الطالب على بناء روتين
                  دراسي أكثر تنظيمًا، والاستفادة من أدوات تعليمية تفاعلية
                  خلال التحضير لامتحان البكالوريا.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* الدعوة النهائية */}
        <section className="relative z-10 mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
          <div className="relative overflow-hidden rounded-[32px] border border-cyan-300/20 bg-gradient-to-br from-[#10354a] via-[#0b263b] to-[#0a1929] px-6 py-14 text-center sm:px-12 sm:py-20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-[90px]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-32 -right-20 h-72 w-72 rounded-full bg-blue-500/10 blur-[90px]"
            />

            <div className="relative">
              <span className="text-4xl">🐋</span>

              <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-black leading-relaxed sm:text-4xl lg:text-5xl">
                رحلتك نحو البكالوريا
                <br />
                <span className="maris-gradient-text">تبدأ من هنا.</span>
              </h2>

              <p className="mx-auto mt-5 max-w-xl text-sm leading-8 text-slate-300 sm:text-base">
                اجعل المراجعة أكثر تنظيمًا، واستفد من أدوات المنصة،
                وواصل التقدم نحو هدفك خطوة بخطوة.
              </p>

              <Link
                href="/register"
                className="mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-8 py-4 text-base font-black text-[#061321] shadow-xl shadow-cyan-500/10 transition hover:-translate-y-1 hover:bg-cyan-200"
              >
                أنشئ حسابك مجانًا
                <span>←</span>
              </Link>

              <p className="mt-5 text-xs text-slate-400">
                عندك حساب من قبل؟{" "}
                <Link
                  href="/login"
                  className="font-bold text-cyan-300 underline-offset-4 hover:underline"
                >
                  سجّل الدخول
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* التذييل */}
        <footer className="relative z-10 border-t border-white/[0.07] bg-[#050f1a]/80">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-7 px-4 py-10 text-center sm:px-6 md:flex-row md:items-start md:text-right lg:px-8">
            {/* هوية المنصة */}
            <Link href="/" className="flex items-center gap-3">
              <span className="text-2xl">🌊</span>
              <span>
                <span className="block font-grotesk text-sm font-extrabold tracking-wide text-white">
                  MARIS ACADEMY ²⁰²⁷
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  رحلتك التعليمية تبدأ هنا
                </span>
              </span>
            </Link>

            {/* روابط الموقع */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs text-slate-400">
              <Link
                href="/about"
                className="transition hover:text-cyan-300"
              >
                عن المنصة
              </Link>
              <Link
                href="/login"
                className="transition hover:text-cyan-300"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                className="transition hover:text-cyan-300"
              >
                إنشاء حساب
              </Link>
              <Link
                href="/teachers"
                className="transition hover:text-cyan-300"
              >
                فضاء الأساتذة
              </Link>
            </div>

            {/* حسابات التواصل الرسمية للمنصة */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs font-bold text-slate-300">
                تابع MARIS ACADEMY
              </p>

              <div
                dir="ltr"
                className="flex items-center justify-center gap-3"
                aria-label="حسابات التواصل الرسمية للمنصة"
              >
                {/* Telegram MARIS */}
                <a
                  href="https://t.me/bac2027maris"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Telegram MARIS ACADEMY"
                  title="Telegram MARIS ACADEMY"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-cyan-300"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-[18px] w-[18px]"
                    aria-hidden="true"
                  >
                    <path d="M21.9 4.2 18.6 20c-.25 1.12-.9 1.4-1.82.87l-5.04-3.72-2.43 2.34c-.27.27-.5.5-1.02.5l.36-5.13 9.34-8.44c.4-.36-.09-.56-.62-.2L5.83 13.37.9 11.83c-1.07-.34-1.1-1.07.22-1.6L20.4 2.7c.9-.33 1.68.22 1.5 1.5Z" />
                  </svg>
                </a>

                {/* YouTube */}
                <a
                  href="https://www.youtube.com/@academymaris"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube MARIS ACADEMY"
                  title="YouTube MARIS ACADEMY"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-400"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-[19px] w-[19px]"
                    aria-hidden="true"
                  >
                    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.12C19.55 3.57 12 3.57 12 3.57s-7.55 0-9.4.51A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.12c1.85.51 9.4.51 9.4.51s7.55 0 9.4-.51a3 3 0 0 0 2.1-2.12A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8ZM9.55 15.65v-7.3L15.82 12l-6.27 3.65Z" />
                  </svg>
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/_maris_academy__/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram MARIS ACADEMY"
                  title="Instagram MARIS ACADEMY"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition hover:border-pink-400/40 hover:bg-pink-400/10 hover:text-pink-400"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-[19px] w-[19px]"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle
                      cx="17.5"
                      cy="6.7"
                      r="1"
                      fill="currentColor"
                      stroke="none"
                    />
                  </svg>
                </a>
              </div>
            </div>

            {/* تواصل مستقل مع مطوّر المنصة */}
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.035] px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.08] text-base">
                  💻
                </span>

                <div className="text-right">
                  <p className="text-xs font-extrabold text-white">
                    مطوّر المنصة
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    تواصل مباشر مع مطوّر MARIS
                  </p>
                </div>
              </div>

              <a
                href="https://t.me/mou_ad_vn_o"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="التواصل مع مطوّر MARIS ACADEMY عبر Telegram"
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-2.5 text-xs font-bold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M21.9 4.2 18.6 20c-.25 1.12-.9 1.4-1.82.87l-5.04-3.72-2.43 2.34c-.27.27-.5.5-1.02.5l.36-5.13 9.34-8.44c.4-.36-.09-.56-.62-.2L5.83 13.37.9 11.83c-1.07-.34-1.1-1.07.22-1.6L20.4 2.7c.9-.33 1.68.22 1.5 1.5Z" />
                </svg>
                تواصل مع المطوّر
              </a>
            </div>

            <p className="text-[11px] text-slate-500">
              © {new Date().getFullYear()} MARIS ACADEMY
            </p>
          </div>
        </footer>
      </main>

      <style jsx global>{`
        .maris-gradient-text {
          background: linear-gradient(
            110deg,
            #a5f3fc 0%,
            #22d3ee 40%,
            #60a5fa 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }

        .maris-float {
          animation: maris-float 7s ease-in-out infinite;
        }

        .maris-feature-card {
          transform: translateZ(0);
        }

        .maris-marquee {
          direction: ltr;
        }

        .maris-marquee-track {
          display: flex;
          width: max-content;
          gap: 0;
          will-change: transform;
          animation-duration: 55s;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .maris-marquee-group {
          display: flex;
          flex: 0 0 auto;
          gap: 1rem;
          padding-inline: 0.5rem;
        }

        .maris-marquee-left {
          animation-name: maris-marquee-left;
        }

        .maris-marquee-right {
          animation-name: maris-marquee-right;
        }

        .maris-marquee:hover .maris-marquee-track,
        .maris-marquee:focus-within .maris-marquee-track {
          animation-play-state: paused;
        }

        @keyframes maris-marquee-left {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-33.333333%);
          }
        }

        @keyframes maris-marquee-right {
          from {
            transform: translateX(-33.333333%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes maris-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .maris-float,
          .maris-marquee-left,
          .maris-marquee-right {
            animation: none !important;
          }

          .maris-feature-card {
            transition: none !important;
          }
        }
      `}</style>
    </>
  );
}
