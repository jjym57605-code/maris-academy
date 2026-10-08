
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
    "منصة تعليمية جزائرية مخصصة لمساعدة تلاميذ بكالوريا 2027 على التعلم وتنظيم الدراسة ومتابعة التقدم.",
  areaServed: {
    "@type": "Country",
    name: "Algeria",
  },
  educationalLevel: "Secondary education",
  educationalUse: "Study",
  inLanguage: "ar-DZ",
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
  return "★".repeat(rating) + "☆".repeat(5 - rating);
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
          .order("created_at", { ascending: false })
          .limit(6);

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
            🇩🇿 منصة جزائرية — بكالوريا 2027
          </p>

          <h1
            className="animate-fade-up text-4xl font-extrabold leading-[1.3] text-white sm:text-5xl lg:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            ذاكر بذكاء،
            <br />
            <span className="text-gradient">وتقدّم بثبات.</span>
          </h1>

          <p
            className="mx-auto mt-6 max-w-2xl animate-fade-up text-base leading-relaxed text-foam/70 sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            منصة تعليمية متكاملة لمساعدة تلاميذ بكالوريا 2027 على
            تنظيم دراستهم، متابعة تقدمهم، والتعلم بطريقة تفاعلية.
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

        {/* ═══ آراء الطلبة ═══ */}
        {!reviewsLoading && reviews.length > 0 && (
          <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:px-6">
            <div className="mb-8 text-center">
              <div className="text-3xl">⭐</div>

              <h2 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">
                ماذا يقول طلبتنا؟
              </h2>

              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-foam/50 sm:text-base">
                آراء حقيقية من طلاب MARIS ACADEMY بعد تجربتهم للمنصة.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((item, index) => (
                <article
                  key={item.id}
                  className="glass-card glass-card-hover animate-fade-up relative overflow-hidden p-6"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div
                    className="text-lg tracking-widest text-yellow-300"
                    dir="ltr"
                    aria-label={`${item.rating} من 5`}
                  >
                    {renderStars(item.rating)}
                  </div>

                  <p className="mt-5 min-h-[84px] leading-7 text-foam/70">
                    “{item.review}”
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
                    <span className="text-xs font-bold text-cyan-300/70">
                      طالب من MARIS 💙
                    </span>

                    <span className="text-[11px] text-foam/30">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 text-center">
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
            — صُنعت لتلاميذ البكالوريا في الجزائر
          </p>
        </footer>
      </main>
    </>
  );
}

