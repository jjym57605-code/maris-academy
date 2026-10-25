
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type PlanKey = "monthly" | "yearly";

type PremiumPlan = {
  id: string;
  plan_key: PlanKey;
  name: string;
  price: number;
  currency: string;
  duration_days: number;
  is_active: boolean;
  updated_at: string;
};

type PremiumFeature = {
  id: string;
  title: string;
  description: string;
  plan_key: PlanKey;
  is_active: boolean;
  sort_order: number;
};

type PremiumSubscription = {
  id: string;
  user_id: string;
  plan_id: string;
  status: "pending" | "active" | "expired" | "cancelled";
  starts_at: string | null;
  expires_at: string | null;
  payment_note: string;
  created_at: string;
};

type Tab = "overview" | "plans" | "features" | "subscriptions";

const EMPTY_PLAN = {
  plan_key: "monthly" as PlanKey,
  name: "Premium شهري",
  price: "0",
  duration_days: "30",
};

const EMPTY_FEATURE = {
  title: "",
  description: "",
  plan_key: "monthly" as PlanKey,
};

export default function AdminPremiumPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<Tab>("overview");

  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [features, setFeatures] = useState<PremiumFeature[]>([]);
  const [subscriptions, setSubscriptions] = useState<
    PremiumSubscription[]
  >([]);

  const [planForm, setPlanForm] = useState(EMPTY_PLAN);
  const [featureForm, setFeatureForm] = useState(EMPTY_FEATURE);
  const [saving, setSaving] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingFeatureId, setDeletingFeatureId] = useState<string | null>(
    null,
  );

  const loadData = useCallback(async () => {
    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بـ Supabase. تحقق من إعدادات المشروع.");
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

      const { data: adminResult, error: adminError } =
        await supabase.rpc("is_current_user_admin");

      if (adminError) {
        throw new Error("تعذر التحقق من صلاحيات الإدارة.");
      }

      if (adminResult !== true) {
        window.location.href = "/dashboard";
        return;
      }

      setAuthorized(true);

      const [plansResult, featuresResult, subscriptionsResult] =
        await Promise.all([
          supabase
            .from("premium_plans")
            .select("*")
            .order("price", { ascending: true }),

          supabase
            .from("premium_features")
            .select("*")
            .order("sort_order", { ascending: true }),

          supabase
            .from("premium_subscriptions")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100),
        ]);

      if (plansResult.error) throw plansResult.error;
      if (featuresResult.error) throw featuresResult.error;
      if (subscriptionsResult.error) throw subscriptionsResult.error;

      setPlans((plansResult.data ?? []) as PremiumPlan[]);
      setFeatures((featuresResult.data ?? []) as PremiumFeature[]);
      setSubscriptions(
        (subscriptionsResult.data ?? []) as PremiumSubscription[],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل بيانات Premium.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function addPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const price = Number(planForm.price);
    const duration = Number(planForm.duration_days);

    if (
      !planForm.name.trim() ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(duration) ||
      duration <= 0
    ) {
      setError("تحقق من اسم الخطة والسعر والمدة.");
      return;
    }

    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      return;
    }

    setSaving(true);

    try {
      const { error: insertError } = await supabase
        .from("premium_plans")
        .insert({
          plan_key: planForm.plan_key,
          name: planForm.name.trim(),
          price,
          currency: "DZD",
          duration_days: duration,
          is_active: true,
        });

      if (insertError) {
        throw new Error(
          insertError.code === "42501"
            ? "قاعدة البيانات تمنع الإضافة حاليًا. تحقق من صلاحيات الكتابة."
            : insertError.message,
        );
      }

      setPlanForm(EMPTY_PLAN);
      setNotice("تمت إضافة الخطة بنجاح.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذرت إضافة الخطة.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function addFeature(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!featureForm.title.trim()) {
      setError("اكتب عنوان الميزة.");
      return;
    }

    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      return;
    }

    setSaving(true);

    try {
      const featuresForPlan = features.filter(
        (feature) => feature.plan_key === featureForm.plan_key,
      );

      const { error: insertError } = await supabase
        .from("premium_features")
        .insert({
          title: featureForm.title.trim(),
          description: featureForm.description.trim(),
          plan_key: featureForm.plan_key,
          is_active: true,
          sort_order: featuresForPlan.length,
        });

      if (insertError) {
        throw new Error(
          insertError.code === "42501"
            ? "قاعدة البيانات تمنع الإضافة حاليًا. تحقق من صلاحيات الكتابة."
            : insertError.message,
        );
      }

      setFeatureForm({
        ...EMPTY_FEATURE,
        plan_key: featureForm.plan_key,
      });

      setNotice(
        featureForm.plan_key === "monthly"
          ? "تمت إضافة ميزة الاشتراك الشهري."
          : "تمت إضافة ميزة الاشتراك السنوي.",
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذرت إضافة الميزة.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteFeature(feature: PremiumFeature) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الميزة "${feature.title}"؟ لا يمكن التراجع عن هذا الإجراء.`,
    );

    if (!confirmed) return;

    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      return;
    }

    setError("");
    setNotice("");
    setDeletingFeatureId(feature.id);

    try {
      const { error: deleteError } = await supabase
        .from("premium_features")
        .delete()
        .eq("id", feature.id);

      if (deleteError) {
        throw new Error(
          deleteError.code === "42501"
            ? "ما عندكش صلاحية حذف الميزة. تحقق من سياسات Supabase."
            : deleteError.message,
        );
      }

      setFeatures((current) =>
        current.filter((item) => item.id !== feature.id),
      );

      setNotice(`تم حذف الميزة "${feature.title}" بنجاح.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذر حذف الميزة.",
      );
    } finally {
      setDeletingFeatureId(null);
    }
  }

  async function activateSubscription(subscriptionId: string) {
    setError("");
    setNotice("");

    const confirmed = window.confirm(
      "تأكيد تفعيل هذا الاشتراك؟ سيتم احتساب مدة الخطة ابتداءً من الآن.",
    );

    if (!confirmed) return;

    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      return;
    }

    setActivatingId(subscriptionId);

    try {
      const { error: activationError } = await supabase.rpc(
        "admin_activate_premium_subscription",
        { p_subscription_id: subscriptionId },
      );

      if (activationError) {
        throw new Error(
          activationError.message ||
            "تعذر تفعيل الاشتراك. تحقق من إعدادات قاعدة البيانات.",
        );
      }

      setNotice("تم تفعيل الاشتراك بنجاح.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تفعيل الاشتراك.",
      );
    } finally {
      setActivatingId(null);
    }
  }

  const activeSubscriptions = subscriptions.filter(
    (item) =>
      item.status === "active" &&
      item.expires_at &&
      new Date(item.expires_at).getTime() > Date.now(),
  ).length;

  const pendingSubscriptions = subscriptions.filter(
    (item) => item.status === "pending",
  ).length;

  const monthlyFeatures = features.filter(
    (feature) => feature.plan_key === "monthly",
  );

  const yearlyFeatures = features.filter(
    (feature) => feature.plan_key === "yearly",
  );

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "نظرة عامة", icon: "◈" },
    { id: "plans", label: "الخطط والأسعار", icon: "◇" },
    { id: "features", label: "المميزات", icon: "✦" },
    { id: "subscriptions", label: "المشتركون", icon: "♙" },
  ];

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#071321] p-6 text-slate-100"
      >
        <div className="mx-auto max-w-6xl animate-pulse space-y-5">
          <div className="h-10 w-64 rounded-xl bg-white/10" />
          <div className="h-36 rounded-3xl bg-white/5" />
          <div className="h-64 rounded-3xl bg-white/5" />
          <p className="text-sm text-slate-400">
            جارٍ تحميل بيانات Premium...
          </p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#071321] p-8 text-center text-slate-100"
      >
        <p>جارٍ التحقق من صلاحيات الوصول...</p>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#071321] px-4 py-6 text-slate-100 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/admin"
              className="mb-3 inline-flex text-sm text-cyan-300 transition hover:text-cyan-200"
            >
              ← العودة إلى لوحة الإدارة
            </Link>

            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-300/20 to-cyan-400/10 text-3xl">
                💎
              </div>

              <div>
                <h1 className="text-2xl font-black sm:text-3xl">
                  إدارة MARIS PREMIUM
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  الخطط، المميزات ومتابعة الاشتراكات
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold transition hover:bg-white/10"
          >
            ↻ تحديث البيانات
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200"
          >
            {notice}
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "الخطط",
              value: plans.length,
              detail: "إجمالي الخطط",
              icon: "◇",
            },
            {
              label: "المميزات",
              value: features.length,
              detail: "إجمالي المميزات",
              icon: "✦",
            },
            {
              label: "الاشتراكات النشطة",
              value: activeSubscriptions,
              detail: "ضمن آخر 100 سجل",
              icon: "✓",
            },
            {
              label: "طلبات معلّقة",
              value: pendingSubscriptions,
              detail: "تحتاج مراجعة",
              icon: "◷",
            },
          ].map((stat) => (
            <article
              key={stat.label}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-400">{stat.label}</span>
                <span className="text-xl text-cyan-300">{stat.icon}</span>
              </div>
              <p className="mt-3 text-3xl font-black tabular-nums">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{stat.detail}</p>
            </article>
          ))}
        </section>

        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-2">
          {tabs.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`shrink-0 rounded-xl px-4 py-3 text-sm font-bold transition ${
                tab === item.id
                  ? "bg-gradient-to-l from-cyan-400 to-cyan-300 text-[#061321]"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="ml-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {tab === "overview" && (
          <section className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-400/[0.08] to-transparent p-6">
              <h2 className="text-lg font-black">مسار الاشتراك</h2>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                يختار الطالب الخطة، يرسل طلب الاشتراك، ثم تراجع الإدارة الطلب
                وتؤكد الدفع قبل تفعيل المدة. يبقى حساب الطالب موجودًا بعد انتهاء
                الاشتراك.
              </p>

              <div className="mt-5 space-y-3">
                {[
                  "اختيار الخطة من صفحة Premium",
                  "إرسال طلب الاشتراك",
                  "مراجعة الدفع من الإدارة",
                  "تفعيل الاشتراك بمدة محددة",
                  "انتهاء المدة دون حذف الحساب",
                ].map((step, index) => (
                  <div key={step} className="flex items-center gap-3 text-sm">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-xs font-black text-cyan-200">
                      {index + 1}
                    </span>
                    <span className="text-slate-300">{step}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-amber-300/15 bg-gradient-to-br from-amber-300/[0.07] to-transparent p-6">
              <h2 className="text-lg font-black">توزيع المميزات</h2>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                المميزات مصنفة حسب نوع الاشتراك. يمكنك إضافة ميزات شهرية
                وأخرى سنوية وحذف أي ميزة بعد تأكيد العملية.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
                  <p className="text-sm text-cyan-200">🌊 الشهري</p>
                  <p className="mt-2 text-3xl font-black">
                    {monthlyFeatures.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">ميزة</p>
                </div>

                <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] p-4">
                  <p className="text-sm text-amber-200">👑 السنوي</p>
                  <p className="mt-2 text-3xl font-black">
                    {yearlyFeatures.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">ميزة</p>
                </div>
              </div>
            </article>
          </section>
        )}

        {tab === "plans" && (
          <section className="grid items-start gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <form
              onSubmit={addPlan}
              className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.035] p-5"
            >
              <h2 className="text-lg font-black">إضافة خطة</h2>

              <label className="block space-y-2 text-sm">
                <span className="text-slate-300">نوع الخطة</span>
                <select
                  value={planForm.plan_key}
                  onChange={(event) => {
                    const planKey = event.target.value as PlanKey;

                    setPlanForm((current) => ({
                      ...current,
                      plan_key: planKey,
                      name:
                        planKey === "monthly"
                          ? "Premium شهري"
                          : "Premium سنوي",
                      duration_days: planKey === "monthly" ? "30" : "365",
                    }));
                  }}
                  className="w-full rounded-xl border border-white/10 bg-[#0b1c2e] px-4 py-3 outline-none focus:border-cyan-300/50"
                >
                  <option value="monthly">شهري</option>
                  <option value="yearly">سنوي</option>
                </select>
              </label>

              <label className="block space-y-2 text-sm">
                <span className="text-slate-300">اسم الخطة</span>
                <input
                  required
                  value={planForm.name}
                  onChange={(event) =>
                    setPlanForm({ ...planForm, name: event.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0b1c2e] px-4 py-3 outline-none focus:border-cyan-300/50"
                />
              </label>

              <label className="block space-y-2 text-sm">
                <span className="text-slate-300">السعر بالدينار الجزائري</span>
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={planForm.price}
                  onChange={(event) =>
                    setPlanForm({ ...planForm, price: event.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0b1c2e] px-4 py-3 outline-none focus:border-cyan-300/50"
                />
              </label>

              <label className="block space-y-2 text-sm">
                <span className="text-slate-300">المدة بالأيام</span>
                <input
                  required
                  min="1"
                  step="1"
                  type="number"
                  value={planForm.duration_days}
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      duration_days: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0b1c2e] px-4 py-3 outline-none focus:border-cyan-300/50"
                />
              </label>

              <button
                disabled={saving}
                className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-black text-[#061321] transition hover:bg-cyan-200 disabled:opacity-50"
              >
                {saving ? "جارٍ الحفظ..." : "إضافة الخطة"}
              </button>
            </form>

            <div className="space-y-3">
              <h2 className="text-lg font-black">الخطط الحالية</h2>

              {plans.length === 0 ? (
                <EmptyState message="لا توجد خطط محفوظة في قاعدة البيانات." />
              ) : (
                plans.map((plan) => (
                  <article
                    key={plan.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black">{plan.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {plan.plan_key === "monthly"
                            ? "خطة شهرية"
                            : "خطة سنوية"}
                          {" · "}
                          {plan.duration_days} يومًا
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          plan.is_active
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-slate-400/10 text-slate-400"
                        }`}
                      >
                        {plan.is_active ? "نشطة" : "متوقفة"}
                      </span>
                    </div>

                    <p className="mt-4 text-2xl font-black text-cyan-200">
                      {Number(plan.price).toLocaleString("fr-DZ")}{" "}
                      <span className="text-sm font-medium text-slate-400">
                        {plan.currency}
                      </span>
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {tab === "features" && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.05] p-4 text-sm leading-6 text-slate-300">
              اختار نوع الاشتراك قبل إضافة الميزة. الميزات الشهرية والسنوية
              محفوظة كل واحدة بنوعها، وتقدر تحذف أي ميزة بعد التأكيد.
            </div>

            <form
              onSubmit={addFeature}
              className="grid items-start gap-4 rounded-3xl border border-white/10 bg-white/[0.035] p-5 lg:grid-cols-2"
            >
              <div className="space-y-4">
                <h2 className="text-lg font-black">إضافة ميزة Premium</h2>

                <label className="block space-y-2 text-sm">
                  <span className="text-slate-300">نوع الاشتراك</span>
                  <select
                    value={featureForm.plan_key}
                    onChange={(event) =>
                      setFeatureForm({
                        ...featureForm,
                        plan_key: event.target.value as PlanKey,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0b1c2e] px-4 py-3 outline-none focus:border-cyan-300/50"
                  >
                    <option value="monthly">🌊 ميزات الاشتراك الشهري</option>
                    <option value="yearly">👑 ميزات الاشتراك السنوي</option>
                  </select>
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="text-slate-300">عنوان الميزة</span>
                  <input
                    required
                    maxLength={120}
                    value={featureForm.title}
                    onChange={(event) =>
                      setFeatureForm({
                        ...featureForm,
                        title: event.target.value,
                      })
                    }
                    placeholder="مثال: أدوات مراجعة إضافية"
                    className="w-full rounded-xl border border-white/10 bg-[#0b1c2e] px-4 py-3 outline-none focus:border-cyan-300/50"
                  />
                </label>
              </div>

              <div className="space-y-4">
                <label className="block space-y-2 text-sm">
                  <span className="text-slate-300">وصف الميزة</span>
                  <textarea
                    rows={4}
                    maxLength={500}
                    value={featureForm.description}
                    onChange={(event) =>
                      setFeatureForm({
                        ...featureForm,
                        description: event.target.value,
                      })
                    }
                    placeholder="اشرح الميزة بوضوح دون وعود غير جاهزة."
                    className="w-full resize-y rounded-xl border border-white/10 bg-[#0b1c2e] px-4 py-3 outline-none focus:border-cyan-300/50"
                  />
                </label>

                <button
                  disabled={saving}
                  className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-black text-[#061321] transition hover:bg-cyan-200 disabled:opacity-50"
                >
                  {saving ? "جارٍ الحفظ..." : "إضافة الميزة"}
                </button>
              </div>
            </form>

            <div className="grid items-start gap-5 xl:grid-cols-2">
              <FeatureSection
                title="🌊 ميزات الاشتراك الشهري"
                description="الميزات التابعة للخطة الشهرية."
                features={monthlyFeatures}
                accent="cyan"
                deletingFeatureId={deletingFeatureId}
                onDelete={deleteFeature}
              />

              <FeatureSection
                title="👑 ميزات الاشتراك السنوي"
                description="الميزات التابعة للخطة السنوية."
                features={yearlyFeatures}
                accent="amber"
                deletingFeatureId={deletingFeatureId}
                onDelete={deleteFeature}
              />
            </div>
          </section>
        )}

        {tab === "subscriptions" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-black">الاشتراكات والطلبات</h2>
              <p className="mt-1 text-sm text-slate-400">
                تعرض الصفحة آخر 100 سجل متاح حسب صلاحيات قاعدة البيانات.
              </p>
            </div>

            {subscriptions.length === 0 ? (
              <EmptyState message="لا توجد اشتراكات ظاهرة حاليًا." />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[900px] text-right text-sm">
                  <thead className="bg-white/[0.04] text-slate-400">
                    <tr>
                      <th className="p-4 font-medium">معرّف الطالب</th>
                      <th className="p-4 font-medium">الخطة</th>
                      <th className="p-4 font-medium">الحالة</th>
                      <th className="p-4 font-medium">بداية الاشتراك</th>
                      <th className="p-4 font-medium">الانتهاء</th>
                      <th className="p-4 font-medium">الإجراء</th>
                    </tr>
                  </thead>

                  <tbody>
                    {subscriptions.map((subscription) => {
                      const plan = plans.find(
                        (item) => item.id === subscription.plan_id,
                      );

                      return (
                        <tr
                          key={subscription.id}
                          className="border-t border-white/[0.07]"
                        >
                          <td className="max-w-[220px] truncate p-4 font-mono text-xs">
                            {subscription.user_id}
                          </td>

                          <td className="p-4">
                            {plan?.name ?? "خطة غير معروفة"}
                          </td>

                          <td className="p-4">
                            <StatusLabel status={subscription.status} />
                          </td>

                          <td className="p-4 text-slate-400">
                            {formatDate(subscription.starts_at)}
                          </td>

                          <td className="p-4 text-slate-400">
                            {formatDate(subscription.expires_at)}
                          </td>

                          <td className="p-4">
                            {subscription.status === "pending" ? (
                              <button
                                type="button"
                                disabled={activatingId === subscription.id}
                                onClick={() =>
                                  void activateSubscription(subscription.id)
                                }
                                className="whitespace-nowrap rounded-lg bg-emerald-400 px-3 py-2 text-xs font-black text-[#061321] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {activatingId === subscription.id
                                  ? "جارٍ التفعيل..."
                                  : "تفعيل الاشتراك"}
                              </button>
                            ) : (
                              <span className="text-xs text-slate-500">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-sm leading-6 text-amber-100">
              راجع الدفع قبل تفعيل أي طلب. زر التفعيل يستدعي دالة قاعدة البيانات
              ولا يغيّر حالة الاشتراك مباشرة من المتصفح.
            </p>
          </section>
        )}

        <footer className="border-t border-white/[0.07] pt-5 text-center text-xs text-slate-500">
          MARIS ACADEMY ²⁰²⁷ · PREMIUM MANAGEMENT
        </footer>
      </div>
    </main>
  );
}

function FeatureSection({
  title,
  description,
  features,
  accent,
  deletingFeatureId,
  onDelete,
}: {
  title: string;
  description: string;
  features: PremiumFeature[];
  accent: "cyan" | "amber";
  deletingFeatureId: string | null;
  onDelete: (feature: PremiumFeature) => void;
}) {
  const styles =
    accent === "cyan"
      ? {
          border: "border-cyan-300/15",
          icon: "bg-cyan-300/10 text-cyan-200",
          badge: "bg-cyan-300/10 text-cyan-200",
        }
      : {
          border: "border-amber-300/15",
          icon: "bg-amber-300/10 text-amber-200",
          badge: "bg-amber-300/10 text-amber-200",
        };

  return (
    <section
      className={`space-y-3 rounded-3xl border ${styles.border} bg-white/[0.02] p-4 sm:p-5`}
    >
      <div>
        <h2 className="text-lg font-black">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{description}</p>

        <span
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles.badge}`}
        >
          {features.length} ميزة
        </span>
      </div>

      {features.length === 0 ? (
        <EmptyState message="ما زال ما كاين حتى ميزة في هذا القسم." />
      ) : (
        features.map((feature) => (
          <article
            key={feature.id}
            className="rounded-2xl border border-white/10 bg-[#0b1c2e] p-4"
          >
            <div className="flex items-start gap-3">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl ${styles.icon}`}
              >
                ✦
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="font-black">{feature.title}</h3>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                  {feature.description || "لا يوجد وصف."}
                </p>

                <span
                  className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs ${
                    feature.is_active
                      ? "bg-emerald-400/10 text-emerald-300"
                      : "bg-slate-400/10 text-slate-400"
                  }`}
                >
                  {feature.is_active ? "نشطة" : "متوقفة"}
                </span>

                <button
                  type="button"
                  disabled={deletingFeatureId !== null}
                  onClick={() => onDelete(feature)}
                  className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`حذف الميزة ${feature.title}`}
                >
                  {deletingFeatureId === feature.id
                    ? "جارٍ الحذف..."
                    : "🗑️ حذف الميزة"}
                </button>
              </div>
            </div>
          </article>
        ))
      )}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
      {message}
    </div>
  );
}

function StatusLabel({
  status,
}: {
  status: PremiumSubscription["status"];
}) {
  const labels: Record<PremiumSubscription["status"], string> = {
    pending: "قيد المراجعة",
    active: "نشط",
    expired: "منتهي",
    cancelled: "ملغى",
  };

  const colors: Record<PremiumSubscription["status"], string> = {
    pending: "bg-amber-300/10 text-amber-200",
    active: "bg-emerald-300/10 text-emerald-200",
    expired: "bg-slate-300/10 text-slate-300",
    cancelled: "bg-red-300/10 text-red-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs ${colors[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ar-DZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
