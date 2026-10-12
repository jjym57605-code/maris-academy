"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

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

export default function ReviewPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const loadReviews = useCallback(async () => {
    const supabase = getSupabase();

    if (!supabase) {
      setMessage("تعذر الاتصال بالخدمة حاليًا.");
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: approvedReviews, error: reviewsError } =
        await supabase
          .from("platform_reviews")
          .select("id, rating, review, created_at")
          .eq("status", "approved")
          .order("created_at", { ascending: false });

      if (reviewsError) throw reviewsError;

      setReviews(approvedReviews ?? []);

      if (user) {
        const { data: ownReview, error: ownReviewError } =
          await supabase
            .from("platform_reviews")
            .select("id, rating, review, created_at")
            .eq("user_id", user.id)
            .maybeSingle();

        if (ownReviewError) throw ownReviewError;

        if (ownReview) {
          setMyReview(ownReview);
          setRating(ownReview.rating);
          setReviewText(ownReview.review);
        } else {
          setMyReview(null);
        }
      }
    } catch (error) {
      console.error("LOAD REVIEWS ERROR:", error);
      setMessage("حدث خطأ أثناء تحميل التقييمات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  async function handleSubmitReview() {
    const supabase = getSupabase();

    if (!supabase) {
      setMessage("تعذر الاتصال بالخدمة حاليًا.");
      return;
    }

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
    } catch (error) {
      console.error("SUBMIT REVIEW ERROR:", error);
      setMessage("تعذر إرسال التقييم. حاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div dir="rtl" className="space-y-8 pb-8">
      <div>
       <Link
  href="/dashboard"
  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-bold text-foam/70 transition-all duration-300 hover:border-cyan-400/20 hover:bg-cyan-400/5 hover:text-cyan-300"
>
  → العودة إلى الرئيسية
</Link>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/10 bg-gradient-to-br from-ocean-500/15 via-navy-900/80 to-cyan-400/5 p-6 shadow-glow sm:p-8">
        <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300">
            ⭐ صوتك يطوّر MARIS
          </div>

          <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            أضف تقييمك
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-8 text-foam/70">
            شاركنا تجربتك مع MARIS ACADEMY. رأيك يساعدنا على تطوير المنصة
            وتحسين تجربتك وتجربة باقي الطلبة.
          </p>
        </div>
      </section>

      <section className="glass-card overflow-hidden">
        <div className="border-b border-white/5 bg-gradient-to-l from-cyan-400/10 to-transparent p-6 sm:p-8">
          <div className="mb-2 text-3xl">💙</div>
          <h2 className="text-2xl font-extrabold text-white">
            كيف كانت تجربتك؟
          </h2>
          <p className="mt-2 text-sm text-foam/60">
            اختر عدد النجوم واكتب رأيك بكل صراحة.
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
                aria-pressed={rating === value}
                className={`text-4xl transition-transform duration-200 hover:scale-110 ${
                  value <= rating ? "text-yellow-300" : "text-white/15"
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

          <p className="mt-2 text-xs text-foam/40">
            {reviewText.length}/1000 حرف
          </p>

          {message && (
            <div
              role="status"
              className="mt-4 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-4 text-sm font-bold text-cyan-200"
            >
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmitReview}
            disabled={submitting}
            className="btn-primary mt-5 w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "جارٍ الإرسال..."
              : myReview
                ? "تحديث تقييمي"
                : "إرسال التقييم"}
          </button>

          {myReview && (
            <p className="mt-3 text-xs text-foam/40">
              يمكنك تعديل تقييمك، وسيعود للمراجعة قبل نشر التحديث.
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <div className="text-3xl">💬</div>
            <h2 className="mt-2 text-2xl font-extrabold text-white">
              آراء طلبتنا
            </h2>
            <p className="mt-1 text-sm text-foam/50">
              التقييمات التي وافقت الإدارة على نشرها.
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
              لا توجد آراء منشورة حاليًا
            </h3>
            <p className="mt-2 text-sm text-foam/50">
              يمكنك أن تكون أول من يشارك رأيه.
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

                <p className="mt-4 whitespace-pre-wrap leading-7 text-foam/70">
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
    </div>
  );
}