"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type Review = {
  id: string;
  rating: number;
  review: string;
  created_at: string;
};

const SOCIAL_LINKS = [
  {
    name: "Telegram",
    icon: "✈️",
    description: "تابع الإعلانات والمحتوى الجديد",
    href: "https://t.me/bac2027maris",
  },
  {
    name: "YouTube",
    icon: "▶️",
    description: "الدروس والشروحات التعليمية",
    href: "https://www.youtube.com/@academymaris",
  },
  {
    name: "Instagram",
    icon: "📸",
    description: "أخبار MARIS ومحتوى الأكاديمية",
    href: "https://www.instagram.com/_maris_academy__/",
  },
];

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

export default function AboutPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    const supabase = getSupabase();

    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: approvedReviews } = await supabase
        .from("platform_reviews")
        .select("id, rating, review, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      setReviews(approvedReviews ?? []);

      if (user) {
        const { data: ownReview } = await supabase
          .from("platform_reviews")
          .select("id, rating, review, created_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (ownReview) {
          setMyReview(ownReview);
          setRating(ownReview.rating);
          setReviewText(ownReview.review);
        }
      }
    } catch {
      setMessage("حدث خطأ أثناء تحميل التقييمات.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitReview() {
    const supabase = getSupabase();

    if (!supabase) return;

    setMessage("");

    if (rating < 1 || rating > 5) {
      setMessage("اختر تقييمًا من 1 إلى 5 نجوم.");
      return;
    }

    if (reviewText.trim().length < 3) {
      setMessage("اكتب رأيك بشكل مختصر قبل الإرسال.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("يجب تسجيل الدخول لإرسال تقييم.");
        return;
      }

      if (myReview) {
        const { error } = await supabase
          .from("platform_reviews")
          .update({
            rating,
            review: reviewText.trim(),
            status: "pending",
          })
          .eq("id", myReview.id)
          .eq("user_id", user.id);

        if (error) throw error;

        setMessage("تم تحديث تقييمك وإرساله للمراجعة. 💙");
      } else {
        const { error } = await supabase
          .from("platform_reviews")
          .insert({
            user_id: user.id,
            rating,
            review: reviewText.trim(),
            status: "pending",
          });

        if (error) throw error;

        setMessage("تم إرسال تقييمك بنجاح. سيظهر بعد المراجعة. 💙");
      }

      await loadReviews();
    } catch {
      setMessage("تعذر إرسال التقييم. حاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Back to platform */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-bold text-foam/70 transition-all duration-300 hover:border-cyan-400/20 hover:bg-cyan-400/5 hover:text-cyan-300"
        >
          <span>→</span>
          العودة إلى المنصة
        </Link>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/10 bg-gradient-to-br from-ocean-500/15 via-navy-900/80 to-cyan-400/5 p-6 shadow-glow sm:p-8">
        <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-ocean-500/10 blur-3xl" />

        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300">
            🌊 MARIS ACADEMY ²⁰²⁷
          </div>

          <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            أكثر من مجرد منصة تعليمية
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-8 text-foam/70 sm:text-lg">
            مساحة رقمية تساعدك على التعلم، التنظيم، والمتابعة خلال رحلتك نحو
            بكالوريا 2027.
          </p>
        </div>
      </section>

      {/* About */}
      <section className="glass-card p-6 sm:p-8">
        <div className="mb-6">
          <span className="text-3xl">🌊</span>

          <h2 className="mt-3 text-2xl font-extrabold text-white">
            من نحن؟
          </h2>
        </div>

        <div className="space-y-6 leading-8 text-foam/70">
          <p>
            <strong className="text-white">MARIS ACADEMY ²⁰²⁷</strong> هي منصة
            تعليمية رقمية موجهة لطلبة بكالوريا 2027، صُممت لتجمع بين التعلم،
            التنظيم، والمتابعة في تجربة واحدة.
          </p>

          <p>
            هدفنا هو توفير مساحة تعليمية تساعد الطالب على الوصول إلى الدروس
            والاختبارات، متابعة تقدمه، اكتشاف نقاط قوته ونقاط التحسين، وتنظيم
            رحلته الدراسية بطريقة أبسط وأكثر تفاعلية.
          </p>
        </div>
      </section>

      {/* Vision */}
      <section className="grid gap-5 sm:grid-cols-2">
        <div className="glass-card p-6">
          <div className="mb-4 text-3xl">🎯</div>

          <h2 className="mb-3 text-xl font-extrabold text-white">
            رؤيتنا
          </h2>

          <p className="leading-8 text-foam/65">
            نؤمن أن النجاح الدراسي لا يعتمد على الدراسة لساعات طويلة فقط، بل
            على طريقة الدراسة، الاستمرارية، والتنظيم.
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="mb-4 text-3xl">💙</div>

          <h2 className="mb-3 text-xl font-extrabold text-white">
            هدفنا
          </h2>

          <p className="leading-8 text-foam/65">
            أن تكون MARIS أكثر من مجرد منصة للدروس؛ نريدها أن تكون رفيقًا
            للطالب خلال رحلته نحو بكالوريا 2027.
          </p>
        </div>
      </section>

      {/* What we offer */}
      <section className="glass-card p-6 sm:p-8">
        <div className="mb-6">
          <span className="text-3xl">📚</span>

          <h2 className="mt-3 text-2xl font-extrabold text-white">
            ماذا نقدم؟
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            "دروس ومواد تعليمية منظمة",
            "اختبارات تفاعلية لتقييم المستوى",
            "متابعة للتقدم والإنجازات",
            "نظام MARIS ID لكل طالب",
            "تحديات وتحفيز للاستمرار",
            "محتوى تعليمي متجدد",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm font-bold text-foam/75"
            >
              <span className="me-2 text-cyan-300">✓</span>
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Review form */}
      <section className="glass-card overflow-hidden">
        <div className="border-b border-white/5 bg-gradient-to-l from-cyan-400/10 to-transparent p-6 sm:p-8">
          <div className="mb-2 text-3xl">⭐</div>

          <h2 className="text-2xl font-extrabold text-white">
            قيّم تجربتك مع MARIS
          </h2>

          <p className="mt-2 text-sm text-foam/60">
            رأيك يساعدنا على تطوير المنصة وتحسين تجربتك.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap gap-2" dir="ltr">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                aria-label={`${value} نجوم`}
                className={`text-4xl transition-transform duration-200 hover:scale-110 ${
                  value <= rating
                    ? "text-yellow-300"
                    : "text-white/15"
                }`}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            placeholder="اكتب رأيك في MARIS ACADEMY..."
            maxLength={1000}
            rows={5}
            className="input-field mt-5 min-h-[140px] resize-y"
          />

          {message && (
            <div className="mt-4 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-4 text-sm font-bold text-cyan-200">
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmitReview}
            disabled={submitting}
            className="btn-primary mt-5 w-full sm:w-auto"
          >
            {submitting
              ? "جارٍ الإرسال..."
              : myReview
                ? "تحديث تقييمي"
                : "إرسال التقييم"}
          </button>

          {myReview && (
            <p className="mt-3 text-xs text-foam/40">
              يمكنك تعديل تقييمك في أي وقت.
            </p>
          )}
        </div>
      </section>

      {/* Student reviews */}
      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <div className="text-3xl">💬</div>

            <h2 className="mt-2 text-2xl font-extrabold text-white">
              آراء طلبتنا
            </h2>

            <p className="mt-1 text-sm text-foam/50">
              تجارب وآراء من مجتمع MARIS.
            </p>
          </div>

          {reviews.length > 0 && (
            <div className="badge">{reviews.length} تقييم</div>
          )}
        </div>

        {loading ? (
          <div className="glass-card p-8 text-center text-foam/50">
            جارٍ تحميل الآراء...
          </div>
        ) : reviews.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="text-4xl">💙</div>

            <h3 className="mt-3 font-extrabold text-white">
              كن أول من يشارك رأيه
            </h3>

            <p className="mt-2 text-sm text-foam/50">
              تقييمك قد يكون أول تجربة تظهر هنا.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {reviews.map((item) => (
              <article
                key={item.id}
                className="glass-card p-5 transition-all duration-300 hover:border-cyan-400/20 hover:bg-white/[0.06]"
              >
                <div
                  className="text-lg tracking-widest text-yellow-300"
                  dir="ltr"
                  aria-label={`${item.rating} من 5`}
                >
                  {renderStars(item.rating)}
                </div>

                <p className="mt-4 leading-7 text-foam/70">
                  “{item.review}”
                </p>

                <div className="mt-5 border-t border-white/5 pt-4 text-xs text-foam/35">
                  {formatDate(item.created_at)}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Social links */}
      <section className="glass-card p-6 sm:p-8">
        <div className="mb-6">
          <div className="text-3xl">📱</div>

          <h2 className="mt-3 text-2xl font-extrabold text-white">
            تابع MARIS
          </h2>

          <p className="mt-2 text-sm text-foam/55">
            خليك قريب من الأكاديمية وآخر الأخبار والمحتوى الجديد.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:border-cyan-400/25 hover:bg-white/[0.06] hover:shadow-glow"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl">{social.icon}</span>

                <span className="text-foam/30 transition-transform duration-300 group-hover:-translate-x-1 group-hover:text-cyan-300">
                  ←
                </span>
              </div>

              <h3 className="mt-5 font-extrabold text-white">
                {social.name}
              </h3>

              <p className="mt-2 text-sm leading-6 text-foam/50">
                {social.description}
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* Developer contact */}
      <section className="overflow-hidden rounded-[2rem] border border-ocean-400/10 bg-gradient-to-br from-ocean-500/10 via-navy-900/80 to-cyan-400/5 p-6 sm:p-8">
        <div className="text-3xl">👨‍💻</div>

        <h2 className="mt-3 text-2xl font-extrabold text-white">
          تواصل مع المطوّر
        </h2>

        <p className="mt-3 max-w-2xl leading-8 text-foam/60">
          عندك اقتراح، مشكلة تقنية، أو فكرة تحب تشوفها في MARIS؟ تواصل معنا
          وساهم في تطوير المنصة.
        </p>

        <div className="mt-6">
          <a
            href="https://t.me/mou_ad_vn_o"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary w-full sm:w-auto"
          >
            💬 تواصل عبر Telegram
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="pb-4 pt-4 text-center">
        <p className="text-sm font-bold text-foam/35">
          🌊 MARIS ACADEMY ²⁰²⁷
        </p>

        <p className="mt-1 text-xs text-foam/25">
          تعلم. تقدّم. اصنع مستقبلك.
        </p>
      </footer>
    </div>
  );
}