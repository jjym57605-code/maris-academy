"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type ReviewStatus = "pending" | "approved" | "hidden";

type Review = {
  id: string;
  user_id: string;
  rating: number;
  review: string;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
};

export default function AdminReviewsPage() {
  const router = useRouter();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(
    null
  );

  async function loadReviews() {
    try {
      const supabase = getSupabase();

      if (!supabase) {
        router.replace("/login");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: adminData, error: adminError } =
        await supabase.rpc("is_current_user_admin");

      if (adminError || adminData !== true) {
        router.replace("/dashboard");
        return;
      }

      setIsAdmin(true);

      const { data, error } = await supabase
        .from("platform_reviews")
        .select(
          "id, user_id, rating, review, status, created_at, updated_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setReviews((data ?? []) as Review[]);
    } catch (error) {
      console.error("ADMIN REVIEWS ERROR:", error);
      setMessage("تعذر تحميل الآراء.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, []);

  async function updateReviewStatus(
    id: string,
    status: ReviewStatus
  ) {
    const supabase = getSupabase();

    if (!supabase) return;

    setProcessingId(id);
    setMessage("");

    try {
      const { error } = await supabase
        .from("platform_reviews")
        .update({ status })
        .eq("id", id);

      if (error) {
        throw error;
      }

      setReviews((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
              }
            : item
        )
      );

      if (status === "approved") {
        setMessage("تم نشر التقييم بنجاح. ⭐");
      } else if (status === "hidden") {
        setMessage("تم إخفاء التقييم.");
      } else {
        setMessage("تمت إعادة التقييم إلى قيد المراجعة.");
      }
    } catch (error) {
      console.error("UPDATE REVIEW ERROR:", error);
      setMessage("تعذر تحديث حالة التقييم.");
    } finally {
      setProcessingId(null);
    }
  }

  async function deleteReview(id: string) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا التقييم نهائيًا؟"
    );

    if (!confirmed) return;

    const supabase = getSupabase();

    if (!supabase) return;

    setProcessingId(id);
    setMessage("");

    try {
      const { error } = await supabase
        .from("platform_reviews")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      setReviews((current) =>
        current.filter((item) => item.id !== id)
      );

      setMessage("تم حذف التقييم نهائيًا.");
    } catch (error) {
      console.error("DELETE REVIEW ERROR:", error);
      setMessage("تعذر حذف التقييم.");
    } finally {
      setProcessingId(null);
    }
  }

  function getStatusLabel(status: ReviewStatus) {
    switch (status) {
      case "approved":
        return "منشور";

      case "hidden":
        return "مخفي";

      default:
        return "قيد المراجعة";
    }
  }

  function getStatusClass(status: ReviewStatus) {
    switch (status) {
      case "approved":
        return "border-emerald-400/15 bg-emerald-400/10 text-emerald-300";

      case "hidden":
        return "border-slate-400/10 bg-slate-400/5 text-slate-400";

      default:
        return "border-yellow-400/15 bg-yellow-400/10 text-yellow-300";
    }
  }

  const pendingCount = reviews.filter(
    (item) => item.status === "pending"
  ).length;

  const approvedCount = reviews.filter(
    (item) => item.status === "approved"
  ).length;

  const hiddenCount = reviews.filter(
    (item) => item.status === "hidden"
  ).length;

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10 text-3xl">
            ⭐
          </div>

          <p className="text-sm font-medium text-slate-400">
            جاري تحميل آراء الطلبة...
          </p>
        </div>
      </main>
    );
  }

  if (!isAdmin) return null;

  return (
    <main
      dir="rtl"
      className="min-h-full px-4 py-6 text-slate-100 md:px-8 md:py-8"
    >
      <div className="mx-auto max-w-7xl space-y-7">
        {/* HEADER */}
        <section className="relative overflow-hidden rounded-3xl border border-yellow-400/10 bg-gradient-to-br from-[#071b2d] via-[#08283d] to-[#063247] p-6 shadow-2xl shadow-cyan-950/20 md:p-8">
          <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-yellow-400/5 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-32 right-20 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative">
            <Link
              href="/admin"
              className="mb-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-cyan-400/20 hover:bg-cyan-400/5 hover:text-cyan-300"
            >
              ← العودة إلى لوحة الإدارة
            </Link>

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-400/15 bg-yellow-400/10 px-3 py-1.5 text-xs font-semibold text-yellow-300">
              <span>⭐</span>
              <span>إدارة آراء الطلبة</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              ⭐ مراجعة آراء الطلبة
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
              من هنا تراجع تقييمات الطلبة وتقرر أي الآراء تظهر
              للعامة على منصة MARIS.
            </p>
          </div>
        </section>

        {/* STATS */}
        <section className="grid gap-4 sm:grid-cols-3">
          <ReviewStat
            icon="🟡"
            label="قيد المراجعة"
            value={pendingCount}
          />

          <ReviewStat
            icon="✅"
            label="منشورة"
            value={approvedCount}
          />

          <ReviewStat
            icon="👁️"
            label="مخفية"
            value={hiddenCount}
          />
        </section>

        {/* MESSAGE */}
        {message && (
          <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-4 text-sm font-semibold text-cyan-200">
            {message}
          </div>
        )}

        {/* REVIEWS */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">
              💬 جميع التقييمات
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              راجع كل تقييم قبل نشره للطلاب والزوار.
            </p>
          </div>

          {reviews.length === 0 ? (
            <div className="rounded-3xl border border-cyan-400/10 bg-[#071b2d]/80 p-12 text-center">
              <div className="text-5xl">💙</div>

              <h3 className="mt-4 text-lg font-bold text-white">
                لا توجد تقييمات حاليًا
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                عندما يرسل الطلاب تقييماتهم ستظهر هنا.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((item) => {
                const isProcessing =
                  processingId === item.id;

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-3xl border border-cyan-400/10 bg-[#071b2d]/80 shadow-xl shadow-black/10"
                  >
                    {/* TOP */}
                    <div className="flex flex-col gap-4 border-b border-white/5 p-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div
                          className="text-xl tracking-widest text-yellow-300"
                          dir="ltr"
                          aria-label={`${item.rating} من 5`}
                        >
                          {renderStars(item.rating)}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] font-bold ${getStatusClass(
                              item.status
                            )}`}
                          >
                            {getStatusLabel(item.status)}
                          </span>

                          <span className="text-[11px] text-slate-600">
                            {new Date(
                              item.created_at
                            ).toLocaleDateString("ar-DZ", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="text-left">
                        <p className="text-[10px] text-slate-600">
                          معرف الطالب
                        </p>

                        <p
                          className="mt-1 max-w-[220px] truncate text-[11px] text-slate-500"
                          dir="ltr"
                          title={item.user_id}
                        >
                          {item.user_id}
                        </p>
                      </div>
                    </div>

                    {/* REVIEW */}
                    <div className="p-5">
                      <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-5">
                        <p className="whitespace-pre-wrap leading-8 text-slate-300">
                          “{item.review}”
                        </p>
                      </div>

                      {/* ACTIONS */}
                      <div className="mt-5 flex flex-wrap gap-2">
                        {item.status !== "approved" && (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() =>
                              updateReviewStatus(
                                item.id,
                                "approved"
                              )
                            }
                            className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isProcessing
                              ? "جارٍ..."
                              : "✅ نشر التقييم"}
                          </button>
                        )}

                        {item.status !== "hidden" && (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() =>
                              updateReviewStatus(
                                item.id,
                                "hidden"
                              )
                            }
                            className="rounded-xl border border-slate-400/10 bg-slate-400/5 px-4 py-2.5 text-xs font-bold text-slate-400 transition hover:bg-slate-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isProcessing
                              ? "جارٍ..."
                              : "👁️ إخفاء"}
                          </button>
                        )}

                        {item.status !== "pending" && (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() =>
                              updateReviewStatus(
                                item.id,
                                "pending"
                              )
                            }
                            className="rounded-xl border border-yellow-400/10 bg-yellow-400/5 px-4 py-2.5 text-xs font-bold text-yellow-300 transition hover:bg-yellow-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isProcessing
                              ? "جارٍ..."
                              : "🟡 إعادة للمراجعة"}
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() =>
                            deleteReview(item.id)
                          }
                          className="rounded-xl border border-red-400/10 bg-red-400/5 px-4 py-2.5 text-xs font-bold text-red-300 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          🗑️ حذف نهائي
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ReviewStat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-cyan-400/10 bg-[#071b2d]/80 p-5 shadow-lg shadow-black/10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function renderStars(rating: number) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}