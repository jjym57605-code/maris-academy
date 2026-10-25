
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type PremiumPlan = {
  id: string;
  plan_key: "monthly" | "yearly";
  name: string;
  price: number;
  currency: string;
  duration_days: number;
};

type PremiumFeature = {
  id: string;
  title: string;
  description: string;
  plan_key: "monthly" | "yearly";
};

export default function PremiumPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [features, setFeatures] = useState<PremiumFeature[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: userResult, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userResult.user) {
        window.location.href = "/login";
        return;
      }

      const [plansResult, featuresResult] = await Promise.all([
        supabase
          .from("premium_plans")
          .select("id, plan_key, name, price, currency, duration_days")
          .eq("is_active", true)
          .order("price", { ascending: true }),

        supabase
          .from("premium_features")
          .select("id, title, description, plan_key")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (plansResult.error) throw plansResult.error;
      if (featuresResult.error) throw featuresResult.error;

      const loadedPlans = (plansResult.data ?? []) as PremiumPlan[];

      setPlans(loadedPlans);
      setFeatures((featuresResult.data ?? []) as PremiumFeature[]);

      setSelectedPlan((current) =>
        loadedPlans.some((plan) => plan.id === current)
          ? current
          : loadedPlans[0]?.id ?? "",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تحميل بيانات Premium.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const monthlyPlan = useMemo(
    () => plans.find((plan) => plan.plan_key === "monthly"),
    [plans],
  );

  const yearlyPlan = useMemo(
    () => plans.find((plan) => plan.plan_key === "yearly"),
    [plans],
  );

  const monthlyEquivalent = monthlyPlan
    ? Number(monthlyPlan.price) * 12
    : null;

  const yearlySavings =
    yearlyPlan && monthlyEquivalent !== null && monthlyEquivalent > 0
      ? Math.round(
          ((monthlyEquivalent - Number(yearlyPlan.price)) /
            monthlyEquivalent) *
            100,
        )
      : null;

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!selectedPlan) {
      setError("ما كاين حتى خطة متاحة حاليًا.");
      return;
    }

    const plan = plans.find((item) => item.id === selectedPlan);

    if (!plan) {
      setError("الخطة المختارة غير موجودة. عاود اختار الخطة.");
      return;
    }

    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      return;
    }

    setSubmitting(true);

    try {
      const { data: userResult, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userResult.user) {
        window.location.href = "/login";
        return;
      }

      const { error: insertError } = await supabase
        .from("premium_subscriptions")
        .insert({
          user_id: userResult.user.id,
          plan_id: selectedPlan,
          status: "pending",
          payment_note: paymentNote.trim(),
        });

      if (insertError) {
        if (insertError.code === "42501") {
          throw new Error(
            "إرسال الطلب غير مفعّل بعد. يلزم إعداد صلاحية آمنة في قاعدة البيانات.",
          );
        }

        throw new Error(insertError.message);
      }

      const planType =
        plan.plan_key === "monthly" ? "شهري" : "سنوي";

      const message = [
        "السلام عليكم، حبيت نشترك في MARIS PREMIUM 💎",
        "",
        `الخطة المختارة: ${plan.name}`,
        `نوع الاشتراك: ${planType}`,
       `السعر: ${Number(plan.price).toLocaleString("en-US")} DZ`,
        `المدة: ${plan.duration_days} يومًا`,
        "",
        paymentNote.trim()
          ? `ملاحظة: ${paymentNote.trim()}`
          : "",
        "",
        "نحب نعرف تفاصيل الدفع وكيفاش يتم تفعيل الاشتراك. شكراً.",
      ]
        .filter(Boolean)
        .join("\n");

      const telegramUrl = `https://t.me/MarisPremiumDZ?text=${encodeURIComponent(
        message,
      )}`;

      setNotice(
        "تم تسجيل طلبك بنجاح. راح تفتحلك محادثة تيليغرام برسالة جاهزة؛ اضغط إرسال لإكمال التواصل.",
      );
      setPaymentNote("");

      window.location.assign(telegramUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذر إرسال الطلب.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function formatPrice(plan: PremiumPlan) {
    return Number(plan.price).toLocaleString("fr-DZ");
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#03101d] p-6 text-slate-100"
      >
        <div className="mx-auto max-w-5xl animate-pulse space-y-5 pt-10">
          <div className="mx-auto h-8 w-48 rounded-full bg-white/10" />
          <div className="mx-auto h-12 max-w-xl rounded-xl bg-white/10" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="h-[480px] rounded-[2rem] bg-white/5" />
            <div className="h-[480px] rounded-[2rem] bg-white/5" />
          </div>
          <p className="text-center text-sm text-slate-400">
            جارٍ تحميل خطط MARIS PREMIUM...
          </p>
        </div>
      </main>
    );
  }

  function PlanCard({
    plan,
    yearly,
  }: {
    plan: PremiumPlan;
    yearly: boolean;
  }) {
    const selected = selectedPlan === plan.id;

    const planFeatures = features.filter(
      (feature) => feature.plan_key === plan.plan_key,
    );

    return (
      <article
        className={`relative flex h-full min-w-0 flex-col overflow-hidden rounded-[2rem] border bg-[#061321]/90 transition duration-300 ${
          yearly
            ? "border-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.10)]"
            : "border-cyan-400/70 shadow-[0_0_35px_rgba(34,211,238,0.08)]"
        } ${selected ? "ring-2 ring-white/15" : ""}`}
      >
        <div
          className={`pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full blur-3xl ${
            yearly ? "bg-amber-300/10" : "bg-cyan-300/10"
          }`}
        />

        <div className="relative border-b border-white/[0.08] p-6 pb-5 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={`text-xs font-bold tracking-[0.18em] ${
                  yearly ? "text-amber-200" : "text-cyan-200"
                }`}
              >
                MARIS PREMIUM
              </p>
              <h2 className="mt-3 text-2xl font-black sm:text-3xl">
                Premium{" "}
                <span
                  className={yearly ? "text-amber-300" : "text-cyan-300"}
                >
                  {yearly ? "سنوي" : "شهري"}
                </span>
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {yearly
                  ? "استثمار في مستقبلك التعليمي"
                  : "ابدأ رحلتك نحو التميز"}
              </p>
            </div>

            <div
              className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl border text-3xl shadow-lg sm:h-[72px] sm:w-[72px] ${
                yearly
                  ? "rotate-6 border-amber-300/30 bg-amber-300/[0.08] text-amber-300 shadow-amber-300/5"
                  : "-rotate-6 border-cyan-300/30 bg-cyan-300/[0.08] text-cyan-300 shadow-cyan-300/5"
              }`}
              aria-hidden="true"
            >
              {yearly ? "♛" : "◇"}
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-end gap-x-3 gap-y-2">
            <p className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              {formatPrice(plan)}
            </p>
            <span
              className={`pb-1 text-sm font-bold ${
                yearly ? "text-amber-200" : "text-cyan-200"
              }`}
            >
              د.ج
            </span>

            {yearly && yearlySavings !== null && yearlySavings > 0 && (
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-200">
                وفر {yearlySavings}%
              </span>
            )}
          </div>

          {yearly &&
            monthlyEquivalent !== null &&
            yearlySavings !== null &&
            yearlySavings > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                مقارنة بسعر 12 اشتراكًا شهريًا
              </p>
            )}

          <div className="mt-5 flex items-center gap-2 text-sm text-slate-300">
            <span className={yearly ? "text-amber-300" : "text-cyan-300"}>
              ▦
            </span>
            مدة الاشتراك:{" "}
            <strong className={yearly ? "text-amber-200" : "text-cyan-200"}>
              {plan.duration_days} يومًا
            </strong>
          </div>
        </div>

        <div className="relative flex flex-1 flex-col p-6 pt-5 sm:p-7">
          <h3 className="mb-4 text-sm font-black text-slate-200">
            {yearly ? "مميزات الخطة السنوية" : "مميزات الخطة الشهرية"}
          </h3>

          {planFeatures.length === 0 ? (
            <p className="rounded-xl border border-white/[0.07] p-4 text-sm leading-6 text-slate-400">
              مازال ما زادتش الإدارة مميزات خاصة بهذه الخطة.
            </p>
          ) : (
            <ul className="space-y-3">
              {planFeatures.map((feature) => (
                <li key={feature.id} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-black ${
                      yearly
                        ? "bg-amber-300/15 text-amber-300"
                        : "bg-cyan-300/15 text-cyan-300"
                    }`}
                  >
                    ✓
                  </span>
                  <span className="text-sm leading-6 text-slate-300">
                    {feature.title}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => {
              setSelectedPlan(plan.id);
              setError("");
              setNotice("");
              document
                .getElementById("premium-request")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={`mt-7 flex w-full items-center justify-center gap-3 rounded-full px-5 py-4 text-sm font-black text-[#04111d] transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/40 ${
              yearly
                ? "bg-gradient-to-l from-amber-300 to-yellow-500"
                : "bg-gradient-to-l from-cyan-300 to-cyan-400"
            }`}
          >
            {selected
              ? "✓ الخطة المختارة"
              : `اختار الخطة ${yearly ? "السنوية" : "الشهرية"}`}
            <span aria-hidden="true">←</span>
          </button>

          {selected && (
            <p className="mt-3 text-center text-xs text-slate-500">
              هذي هي الخطة اللي راح تتبعت للإدارة في طلب الاشتراك.
            </p>
          )}
        </div>
      </article>
    );
  }

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#030d18] px-4 py-6 text-slate-100 sm:px-6 sm:py-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-36 -top-32 h-96 w-96 rounded-full border border-cyan-400/10 bg-cyan-400/[0.03]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -right-36 h-[28rem] w-[28rem] rounded-full border border-cyan-400/10 bg-cyan-400/[0.025]"
      />

      <div className="relative mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-cyan-200 transition hover:text-white"
          >
            <span aria-hidden="true">←</span>
            العودة للمنصة
          </Link>

          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-2 text-xs font-black tracking-wide text-cyan-200 sm:px-4 sm:text-sm">
            💎 MARIS PREMIUM
          </span>
        </header>

        <section className="mx-auto mb-9 mt-12 max-w-3xl text-center sm:mt-16">
          <div className="mb-5 flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-cyan-400 sm:w-16" />
            <p className="text-xs font-black tracking-[0.2em] text-cyan-300 sm:text-sm">
              MARIS PREMIUM
            </p>
            <span className="h-px w-10 bg-cyan-400 sm:w-16" />
          </div>

          <h1 className="text-3xl font-black leading-tight sm:text-5xl">
            اختار الخطة <span className="text-cyan-300">اللي تناسبك</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            استمتع بتجربة تعليمية متكاملة مع المميزات المتاحة في MARIS ACADEMY.
            اختار خطتك وابعث طلبك للمراجعة.
          </p>

          <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] p-2 text-xs text-slate-400">
            <span className="rounded-full bg-cyan-300/10 px-3 py-2 text-cyan-200">
              اشتراك شهري
            </span>
            <span className="px-2">أو</span>
            <span className="rounded-full bg-amber-300/10 px-3 py-2 text-amber-200">
              اشتراك سنوي
            </span>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-200"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-200"
          >
            {notice}
          </div>
        )}

        {plans.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-3xl border border-dashed border-white/10 bg-white/[0.025] p-8 text-center">
            <div className="text-4xl">◇</div>
            <h2 className="mt-4 text-xl font-black">
              الخطط غير متاحة حاليًا
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              ما كاين حتى خطة نشطة في قاعدة البيانات. راح تظهر البطاقات هنا كي
              تضيف الإدارة الخطط وتفعّلها.
            </p>
          </div>
        ) : (
          <section
            aria-label="خطط الاشتراك"
            className="grid items-stretch gap-6 md:grid-cols-2 md:gap-5"
          >
            {yearlyPlan && <PlanCard plan={yearlyPlan} yearly />}
            {monthlyPlan && <PlanCard plan={monthlyPlan} yearly={false} />}
            {!yearlyPlan &&
              !monthlyPlan &&
              plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  yearly={plan.plan_key === "yearly"}
                />
              ))}
          </section>
        )}

        <section
          id="premium-request"
          className="mx-auto mt-9 max-w-3xl scroll-mt-6 rounded-3xl border border-white/[0.09] bg-[#071625]/95 p-5 shadow-2xl shadow-black/20 sm:p-7"
        >
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.07] text-xl text-cyan-200">
              ⇧
            </div>
            <div>
              <h2 className="text-xl font-black">إرسال طلب الاشتراك</h2>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                الخطة المختارة:{" "}
                <strong className="text-cyan-200">
                  {plans.find((plan) => plan.id === selectedPlan)?.name ??
                    "ما اخترتش خطة"}
                </strong>
                . تفعيل Premium يكون بعد مراجعة الطلب وتأكيد الدفع من الإدارة.
              </p>
            </div>
          </div>

          <form onSubmit={submitRequest} className="mt-6">
            <label className="block space-y-2 text-sm">
              <span className="font-bold text-slate-300">
                ملاحظة الدفع{" "}
                <span className="font-normal text-slate-500">(اختياري)</span>
              </span>
              <textarea
                rows={3}
                maxLength={500}
                value={paymentNote}
                onChange={(event) => setPaymentNote(event.target.value)}
                placeholder="اكتب ملاحظة تساعد الإدارة على مراجعة طلبك..."
                className="w-full resize-y rounded-2xl border border-white/10 bg-[#030d18] px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50"
              />
            </label>

            <button
              type="submit"
              disabled={submitting || plans.length === 0 || !selectedPlan}
              className="mt-5 w-full rounded-full bg-gradient-to-l from-cyan-300 to-cyan-400 px-5 py-4 font-black text-[#04111d] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "جارٍ إرسال الطلب..." : "إرسال طلب الاشتراك ←"}
            </button>

            <p className="mt-4 text-center text-xs leading-6 text-slate-500">
              🔒 لا ترسل كلمة مرورك أو معلومات بطاقتك البنكية. إرسال الطلب لا
              يفعّل الاشتراك تلقائيًا.
            </p>
          </form>
        </section>

        <section className="mt-8 grid gap-3 border-y border-white/[0.07] py-6 sm:grid-cols-3">
          {[
            {
              icon: "♧",
              title: "بياناتك محمية",
              description: "إرسال طلب عبر حسابك المسجل",
            },
            {
              icon: "◷",
              title: "مراجعة الطلب",
              description: "الإدارة تراجع الطلب قبل التفعيل",
            },
            {
              icon: "✓",
              title: "مدة واضحة",
              description: "مدة الخطة محفوظة في قاعدة البيانات",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-center justify-center gap-3 p-3 text-center sm:text-right"
            >
              <span className="text-2xl text-cyan-300">{item.icon}</span>
              <div>
                <p className="text-sm font-bold text-slate-200">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </section>

        <footer className="py-7 text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-cyan-400/50" />
            <span className="text-xs font-black tracking-[0.2em] text-cyan-300">
              MARIS ACADEMY
            </span>
            <span className="h-px w-8 bg-cyan-400/50" />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            معك في كل خطوة نحو النجاح · ²⁰²⁷
          </p>
        </footer>
      </div>
    </main>
  );
}