"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type Achievement = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  icon: string | null;
  xp_reward: number;
  created_at: string;
};

export default function AdminAchievementsPage() {
  const supabase = getSupabase();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🏆");
  const [xpReward, setXpReward] = useState("50");

  async function checkAdmin() {
    if (!supabase) {
      throw new Error("إعدادات Supabase غير مكتملة.");
    }

    const { data, error } = await supabase.rpc("is_current_user_admin");

    if (error) {
      throw new Error("تعذر التحقق من صلاحيات الإدارة");
    }

    if (!data) {
      window.location.href = "/dashboard";
      return false;
    }

    return true;
  }

  async function loadAchievements() {
    setLoading(true);
    setError("");

    try {
      if (!supabase) {
        throw new Error("إعدادات Supabase غير مكتملة.");
      }

      const isAdmin = await checkAdmin();

      if (!isAdmin) return;

      const { data, error } = await supabase
        .from("achievements")
        .select(
          "id, code, title, description, icon, xp_reward, created_at"
        )
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      setAchievements(data ?? []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل الإنجازات."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAchievements();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanCode = code.trim().toLowerCase();
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanIcon = icon.trim() || "🏆";
    const xp = Number(xpReward);

    if (!cleanCode || !cleanTitle) {
      setError("الكود والعنوان مطلوبان.");
      return;
    }

    if (!Number.isFinite(xp) || xp < 0) {
      setError("قيمة XP غير صحيحة.");
      return;
    }

    if (!supabase) {
      setError("إعدادات Supabase غير مكتملة.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("achievements").insert({
        code: cleanCode,
        title: cleanTitle,
        description: cleanDescription || null,
        icon: cleanIcon,
        xp_reward: xp,
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("هذا الكود موجود مسبقاً.");
        }

        throw error;
      }

      setCode("");
      setTitle("");
      setDescription("");
      setIcon("🏆");
      setXpReward("50");

      setSuccess("تمت إضافة الإنجاز بنجاح.");

      await loadAchievements();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء إضافة الإنجاز."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(achievement: Achievement) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الإنجاز "${achievement.title}"؟`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingId(achievement.id);

    if (!supabase) {
      setError("إعدادات Supabase غير مكتملة.");
      setDeletingId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("achievements")
        .delete()
        .eq("id", achievement.id);

      if (error) {
        throw error;
      }

      setSuccess(`تم حذف الإنجاز "${achievement.title}" بنجاح.`);

      await loadAchievements();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء حذف الإنجاز."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 text-sm text-cyan-400">
              MARIS ACADEMY ²⁰²⁷
            </div>

            <h1 className="text-3xl font-bold">
              🏆 إدارة الإنجازات
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              إدارة الإنجازات المرتبطة بتقدم الطلبة ونظام XP.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex w-fit items-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium transition hover:border-cyan-500 hover:bg-slate-800"
          >
            ← لوحة الإدارة
          </Link>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Create */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
            <div className="mb-5">
              <h2 className="text-xl font-bold">
                ➕ إضافة إنجاز
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                أضف إنجازاً جديداً إلى النظام.
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Code
                </label>

                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="example_achievement"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
                />

                <p className="mt-1 text-xs text-slate-500">
                  الكود يجب أن يكون فريداً.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  العنوان
                </label>

                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثلاً: أول اختبار"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  الوصف
                </label>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف مختصر للإنجاز..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    الأيقونة
                  </label>

                  <input
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="🏆"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-xl outline-none transition focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    XP
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={xpReward}
                    onChange={(e) => setXpReward(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "جاري الحفظ..." : "إضافة الإنجاز"}
              </button>
            </form>
          </section>

          {/* List */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  الإنجازات الموجودة
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {achievements.length} إنجاز
                </p>
              </div>

              <button
                onClick={loadAchievements}
                disabled={loading}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm transition hover:border-cyan-500 hover:bg-slate-800 disabled:opacity-50"
              >
                🔄 تحديث
              </button>
            </div>

            {loading ? (
              <div className="flex min-h-60 items-center justify-center text-slate-400">
                جاري تحميل الإنجازات...
              </div>
            ) : achievements.length === 0 ? (
              <div className="flex min-h-60 items-center justify-center rounded-2xl border border-dashed border-slate-700 text-slate-500">
                لا توجد إنجازات حالياً.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 transition hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
                          {achievement.icon || "🏆"}
                        </div>

                        <div>
                          <h3 className="font-bold">
                            {achievement.title}
                          </h3>

                          <code className="text-xs text-cyan-400">
                            {achievement.code}
                          </code>
                        </div>
                      </div>

                      <div className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                        +{achievement.xp_reward} XP
                      </div>
                    </div>

                    <p className="mt-4 min-h-10 text-sm leading-6 text-slate-400">
                      {achievement.description || "بدون وصف"}
                    </p>

                    <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-600">
                      ID: {achievement.id}
                    </div>

                    <button
                      onClick={() => handleDelete(achievement)}
                      disabled={deletingId === achievement.id}
                      className="mt-4 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:border-red-500/60 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === achievement.id
                        ? "جاري الحذف..."
                        : "🗑️ حذف الإنجاز"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}