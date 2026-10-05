"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type PlatformSettings = {
  id: number;
  academy_name: string;
  academic_year: string;
  platform_version: string;
  updated_at: string;
};

export default function AdminSettingsPage() {
  const supabase = getSupabase();

  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  const [academyName, setAcademyName] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [platformVersion, setPlatformVersion] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function checkAdmin() {
    if (!supabase) {
      throw new Error("إعدادات Supabase غير مكتملة.");
    }

    const { data, error } = await supabase.rpc(
      "is_current_user_admin"
    );

    if (error) {
      throw new Error("تعذر التحقق من صلاحيات الإدارة.");
    }

    if (!data) {
      window.location.href = "/dashboard";
      return false;
    }

    return true;
  }

  async function loadSettings() {
    setLoading(true);
    setError("");

    try {
      if (!supabase) {
        throw new Error("إعدادات Supabase غير مكتملة.");
      }

      const isAdmin = await checkAdmin();

      if (!isAdmin) return;

      const { data, error } = await supabase
        .from("platform_settings")
        .select(
          "id, academy_name, academic_year, platform_version, updated_at"
        )
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("لم يتم العثور على إعدادات المنصة.");
      }

      setSettings(data);

      setAcademyName(data.academy_name);
      setAcademicYear(data.academic_year);
      setPlatformVersion(data.platform_version);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل الإعدادات."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanAcademyName = academyName.trim();
    const cleanAcademicYear = academicYear.trim();
    const cleanPlatformVersion = platformVersion.trim();

    if (!cleanAcademyName) {
      setError("اسم الأكاديمية مطلوب.");
      return;
    }

    if (!cleanAcademicYear) {
      setError("السنة الدراسية مطلوبة.");
      return;
    }

    if (!cleanPlatformVersion) {
      setError("إصدار المنصة مطلوب.");
      return;
    }

    if (!settings) {
      setError("إعدادات المنصة غير محملة.");
      return;
    }

    if (!supabase) {
      setError("إعدادات Supabase غير مكتملة.");
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .update({
          academy_name: cleanAcademyName,
          academic_year: cleanAcademicYear,
          platform_version: cleanPlatformVersion,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settings.id)
        .select(
          "id, academy_name, academic_year, platform_version, updated_at"
        )
        .single();

      if (error) {
        throw error;
      }

      setSettings(data);

      setAcademyName(data.academy_name);
      setAcademicYear(data.academic_year);
      setPlatformVersion(data.platform_version);

      setSuccess("تم حفظ إعدادات المنصة بنجاح.");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء حفظ الإعدادات."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="text-4xl">⚙️</div>

          <p className="mt-3 text-sm text-slate-400">
            جاري تحميل الإعدادات...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      {/* Header */}
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 text-sm font-bold text-cyan-400">
              MARIS ACADEMY
            </div>

            <h1 className="text-3xl font-black">
              ⚙️ إعدادات المنصة
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              تحكم في المعلومات الأساسية الخاصة بالأكاديمية.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex w-fit items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            ← لوحة الإدارة
          </Link>
        </div>
      </section>

      {/* Messages */}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {/* Settings Form */}
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl">
        <div className="mb-6">
          <h2 className="text-xl font-black">
            📝 المعلومات الأساسية
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            أي تغيير تقوم به هنا يتم حفظه في قاعدة البيانات.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Academy Name */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              🌊 اسم الأكاديمية
            </label>

            <input
              type="text"
              value={academyName}
              onChange={(e) => setAcademyName(e.target.value)}
              placeholder="MARIS ACADEMY"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              هذا الاسم سيصبح الاسم الرسمي للأكاديمية داخل النظام.
            </p>
          </div>

          {/* Academic Year */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              📅 السنة الدراسية
            </label>

            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="BAC 2027"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              مثال: BAC 2027 أو BAC 2028.
            </p>
          </div>

          {/* Version */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              🛠️ إصدار المنصة
            </label>

            <input
              type="text"
              value={platformVersion}
              onChange={(e) => setPlatformVersion(e.target.value)}
              placeholder="V1"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              مثال: V1 أو V1.1 أو V2.
            </p>
          </div>

          {/* Save */}
          <div className="border-t border-white/10 pt-6">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-cyan-500 px-5 py-3.5 font-black text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving
                ? "جاري حفظ التغييرات..."
                : "💾 حفظ التغييرات"}
            </button>
          </div>
        </form>
      </section>

      {/* Current Values */}
      {settings && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-lg font-black">
            👀 القيم الحالية
          </h2>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="text-xs text-slate-500">
                الأكاديمية
              </div>

              <div className="mt-1 font-bold">
                {settings.academy_name}
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="text-xs text-slate-500">
                السنة
              </div>

              <div className="mt-1 font-bold">
                {settings.academic_year}
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="text-xs text-slate-500">
                الإصدار
              </div>

              <div className="mt-1 font-bold">
                {settings.platform_version}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}