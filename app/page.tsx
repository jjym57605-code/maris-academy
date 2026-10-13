
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

// ══════════════════════════════════════════════════════
// الصفحة الرئيسية — MARIS ACADEMY ²⁰²⁷
// ══════════════════════════════════════════════════════

const SITE_URL = "https://maris-academy-three.vercel.app";

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "MARIS ACADEMY ²⁰²⁷",
  alternateName: "Maris Academy 2027",
  url: SITE_URL,
  description:
    "MARIS ACADEMY ²⁰²⁷ منصة تعليمية جزائرية لطلبة بكالوريا 2027، تساعد على تنظيم الدراسة، التعلم، إجراء الاختبارات، ومتابعة التقدم الدراسي.",
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
    icon: "📚",
    title: "الدروس",
    description:
      "دروس منظمة حسب الشعبة والمادة، تتقدم فيها خطوة بخطوة.",
  },
  {
    icon: "📝",
    title: "الاختبارات",
    description:
      "اختبارات تفاعلية تقيس فهمك الحقيقي بعد كل محور.",
  },
  {
    icon: "📊",
    title: "تتبع التقدم",
    description:
      "تابع تقدمك الدراسي بدقة، واعرف أين وصلت في كل مادة.",
  },
  {
    icon: "⚡",
    title: "التحديات",
    description:
      "تحديات تُبقيك في إيقاع دراسي ثابت حتى يوم البكالوريا.",
  },
  {
    icon: "⭐",
    title: "نقاط الخبرة",
    description:
      "اكسب نقاط خبرة حقيقية مع كل درس تكمله وكل اختبار تجتازه.",
  },
  {
    icon: "🏆",
    title: "الإنجازات",
    description:
      "ارتقِ في المستويات واجعل رحلتك نحو البكالوريا متعة.",
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
  return new Intl.DateTimeFormat("ar-DZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export default function LandingPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    async function loadReviews() {
      const supabase = getSupabase();

      if (!supabase) {
        setReviewsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("platform_reviews")
          .select("id, rating, review, created_at")
          .eq("status", "approved")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading reviews:", error);
          setReviews([]);
          return;
        }

        setReviews(data ?? []);
      } catch (error) {
        console.error("Error loading reviews:", error);
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    }

    loadReviews();
  }, []);

  // كل تقييم ينتمي إلى سطر واحد فقط
  const firstReviewRow = reviews.filter((_, index) => index % 2 === 0);
  const secondReviewRow = reviews.filter((_, index) => index % 2 !== 0);

  function renderReviewRow(
    items: Review[],
    direction: "left" | "right",
    rowLabel: string
  ) {
    if (items.length === 0) return null;

    return (
      <div
        className="maris-reviews-marquee"
        dir="ltr"
        role="region"
        aria-label={rowLabel}
      >
        <div
          className={`maris-reviews-track ${
            direction === "left"
              ? "maris-reviews-track-left"
              : "maris-reviews-track-right"
          }`}
        >
          <div className="maris-reviews-group">
            {items.map((item) => (
              <article
                key={item.id}
                dir="rtl"
                className="glass-card glass-card-hover relative flex min-h-[230px] w-[280px] shrink-0 flex-col overflow-hidden p-5 sm:w-[320px] sm:p-6"
              >
                <div
                  className="text-lg tracking-widest text-yellow-300"
                  dir="ltr"
                  aria-label={`${item.rating} من 5`}
                >
                  {renderStars(item.rating)}
                </div>

                <p className="mt-5 flex-1 whitespace-normal break-words leading-7 text-foam/70">
                  “{item.review}”
                </p>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
                  <span className="text-xs font-bold text-cyan-300/70">
                    طالب من MARIS 💙
                  </span>

                  <span className="shrink-0 text-[11px] text-foam/30">
                    {formatDate(item.created_at)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(STRUCTURED_DATA),
        }}
      />

      <main className="relative overflow-hidden">
        {/* ═══ الترويسة ═══ */}
        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>
              🌊
            </span>

            <span className="font-grotesk text-sm font-bold tracking-widest text-white sm:text-base">
              MARIS ACADEMY{" "}
              <span className="text-cyan-400">²⁰²⁷</span>
            </span>
          </div>

          <Link
            href="/login"
            className="btn-secondary !px-5 !py-2.5 text-sm"
          >
            تسجيل الدخول
          </Link>
        </header>

        {/* ═══ البطل ═══ */}
        <section className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-14 text-center sm:px-6 sm:pt-20">
          <div
            className="pointer-events-none absolute inset-x-0 -top-10 mx-auto h-72 w-72 animate-float rounded-full bg-cyan-400/15 blur-[100px] sm:h-96 sm:w-96"
            aria-hidden
          />

          <p className="badge mx-auto mb-6 animate-fade-up">
            🇩🇿 منصة تعليمية جزائرية — بكالوريا 2027
          </p>

          <h1
            className="animate-fade-up text-4xl font-extrabold leading-[1.3] text-white sm:text-5xl lg:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            منصة بكالوريا 2027
            <br />
            <span className="text-gradient">
              ذاكر بذكاء، وتقدّم بثبات.
            </span>
          </h1>

          <p
            className="mx-auto mt-6 max-w-2xl animate-fade-up text-base leading-relaxed text-foam/70 sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            MARIS ACADEMY ²⁰²⁷ هي منصة تعليمية جزائرية مخصصة لطلبة
            بكالوريا 2027، تساعدك على تنظيم الدراسة، التعلم بطريقة
            تفاعلية، إجراء الاختبارات، ومتابعة تقدمك الدراسي.
          </p>

          <div
            className="mt-10 flex animate-fade-up flex-col items-center justify-center gap-4 sm:flex-row"
            style={{ animationDelay: "240ms" }}
          >
            <Link
              href="/register"
              className="btn-primary w-full text-lg sm:w-auto"
            >
              ابدأ التعلم
            </Link>

            <Link
              href="/login"
              className="btn-secondary w-full text-lg sm:w-auto"
            >
              تسجيل الدخول
            </Link>
          </div>

          {/* موجة زخرفية */}
          <svg
            className="pointer-events-none mx-auto mt-16 w-full max-w-3xl text-cyan-400/20"
            viewBox="0 0 600 60"
            fill="none"
            aria-hidden
          >
            <path
              d="M0 30 Q 75 0 150 30 T 300 30 T 450 30 T 600 30"
              stroke="currentColor"
              strokeWidth="2"
            />

            <path
              d="M0 45 Q 75 15 150 45 T 300 45 T 450 45 T 600 45"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.6"
            />
          </svg>
        </section>

        {/* ═══ المميزات ═══ */}
        <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <article
                key={feature.title}
                className="glass-card glass-card-hover animate-fade-up p-6"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span className="text-3xl" aria-hidden>
                  {feature.icon}
                </span>

                <h2 className="mt-4 text-xl font-extrabold text-white">
                  {feature.title}
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-foam/60">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ═══ معلومات إضافية لمحركات البحث والزوار ═══ */}
        <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="glass-card p-6 sm:p-8">
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              MARIS ACADEMY لبكالوريا 2027 في الجزائر
            </h2>

            <div className="mt-5 space-y-4 text-sm leading-8 text-foam/60 sm:text-base">
              <p>
                إذا كنت تستعد لـ{" "}
                <strong className="text-white">
                  بكالوريا 2027 في الجزائر
                </strong>
                ، فإن MARIS ACADEMY توفر لك بيئة تعليمية تساعدك على تنظيم
                رحلتك الدراسية ومتابعة مستواك بشكل مستمر.
              </p>

              <p>
                المنصة تجمع بين{" "}
                <strong className="text-white">
                  الدروس والاختبارات وتتبع التقدم والتحديات والإنجازات
                </strong>
                ، حتى تتمكن من بناء عادة دراسية أكثر انتظامًا والاستعداد
                للبكالوريا خطوة بخطوة.
              </p>

              <p>
                MARIS ACADEMY ²⁰²⁷ موجهة لتلاميذ{" "}
                <strong className="text-white">
                  بكالوريا الجزائر 2027
                </strong>
                ، مع تجربة رقمية مصممة لتكون بسيطة، منظمة، وتفاعلية.
              </p>
            </div>
          </div>
        </section>

        {/* ═══ آراء الطلبة المتحركة ═══ */}
        {!reviewsLoading && reviews.length > 0 && (
          <section className="relative z-10 pb-24">
            <div className="mx-auto mb-8 max-w-6xl px-4 text-center sm:px-6">
              <div className="text-3xl" aria-hidden>
                ⭐
              </div>

              <h2 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">
                ماذا يقول طلبتنا؟
              </h2>

              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-foam/50 sm:text-base">
                آراء حقيقية من طلاب MARIS ACADEMY بعد تجربتهم للمنصة.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              {renderReviewRow(
                firstReviewRow,
                "left",
                "آراء الطلبة — الصف الأول"
              )}

              {renderReviewRow(
                secondReviewRow,
                "right",
                "آراء الطلبة — الصف الثاني"
              )}
            </div>

            <div className="mt-8 px-4 text-center">
              <Link
                href="/about"
                className="btn-secondary inline-flex"
              >
                💬 شاهد جميع الآراء
              </Link>
            </div>
          </section>
        )}

        {/* ═══ الدعوة الأخيرة ═══ */}
        <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="glass-card relative overflow-hidden p-8 text-center sm:p-12">
            <div
              className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-[100px]"
              aria-hidden
            />

            <h2 className="relative text-2xl font-extrabold text-white sm:text-3xl">
              ابدأ رحلتك مع{" "}
              <span className="font-grotesk tracking-wider text-gradient">
                MARIS ACADEMY
              </span>
            </h2>

            <p className="relative mx-auto mt-4 max-w-xl text-foam/60">
              حساب واحد يفتح لك الدروس، الاختبارات، تتبع التقدم،
              وبطاقة الطالب الخاصة بك.
            </p>

            <Link
              href="/register"
              className="btn-primary relative mt-8 text-lg"
            >
              أنشئ حسابك مجاناً
            </Link>
          </div>
        </section>

        {/* ═══ التذييل ═══ */}
        <footer className="relative z-10 border-t border-white/5 py-8 text-center text-sm text-foam/40">
          <p>
            🌊{" "}
            <span className="font-grotesk tracking-widest">
              MARIS ACADEMY ²⁰²⁷
            </span>{" "}
            — منصة تعليمية لتلاميذ بكالوريا 2027 في الجزائر
          </p>
        </footer>
      </main>

      {/* ═══ حركة آراء الطلبة ═══ */}
      <style jsx global>{`
        .maris-reviews-marquee {
          width: 100%;
          overflow: hidden;
        }

        .maris-reviews-track {
          display: flex;
          width: max-content;
          will-change: transform;
          animation-duration: 25s;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .maris-reviews-group {
          display: flex;
          flex-shrink: 0;
          gap: 1.25rem;
          padding-inline: 1rem;
        }

        .maris-reviews-track-left {
          animation-name: maris-reviews-move-left;
        }

        .maris-reviews-track-right {
          animation-name: maris-reviews-move-right;
        }

        .maris-reviews-marquee:hover .maris-reviews-track,
        .maris-reviews-marquee:focus-within .maris-reviews-track {
          animation-play-state: paused;
        }

        @keyframes maris-reviews-move-left {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-100%);
          }
        }

        @keyframes maris-reviews-move-right {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .maris-reviews-track-left,
          .maris-reviews-track-right {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}
