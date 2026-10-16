
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

type ThemeBackground = {
  id: string;
  name: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export default function AdminSettingsPage() {
  const supabase = getSupabase();

  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [backgrounds, setBackgrounds] = useState<ThemeBackground[]>([]);

  const [academyName, setAcademyName] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [platformVersion, setPlatformVersion] = useState("");

  const [backgroundName, setBackgroundName] = useState("");
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingBackgroundId, setChangingBackgroundId] =
    useState<string | null>(null);
  const [deletingBackgroundId, setDeletingBackgroundId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [backgroundError, setBackgroundError] = useState("");

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
    setBackgroundError("");

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

      if (error) throw error;

      if (!data) {
        throw new Error("لم يتم العثور على إعدادات المنصة.");
      }

      setSettings(data);
      setAcademyName(data.academy_name);
      setAcademicYear(data.academic_year);
      setPlatformVersion(data.platform_version);

      const {
        data: backgroundData,
        error: backgroundsLoadError,
      } = await supabase
        .from("theme_backgrounds")
        .select(
          "id, name, image_url, is_active, sort_order, created_at"
        )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (backgroundsLoadError) {
        setBackgroundError(
          "تعذر تحميل الخلفيات. تحقق من جدول الخلفيات وسياسات الصلاحيات."
        );
      } else {
        setBackgrounds(
          (backgroundData ?? []) as ThemeBackground[]
        );
      }
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
    void loadSettings();
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

    if (!settings || !supabase) {
      setError("إعدادات المنصة غير محملة.");
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

      if (error) throw error;

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

  async function handleUploadBackground(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setBackgroundError("");

    const cleanName = backgroundName.trim();

    if (!cleanName) {
      setBackgroundError("اكتب اسم الخلفية أولًا.");
      return;
    }

    if (!backgroundFile) {
      setBackgroundError("اختار صورة الخلفية.");
      return;
    }

    if (!backgroundFile.type.startsWith("image/")) {
      setBackgroundError("الملف المختار لازم يكون صورة.");
      return;
    }

    if (backgroundFile.size > 10 * 1024 * 1024) {
      setBackgroundError("حجم الصورة لازم ما يفوتش 10 ميغابايت.");
      return;
    }

    if (!supabase) {
      setBackgroundError("إعدادات Supabase غير مكتملة.");
      return;
    }

    setUploading(true);

    let uploadedPath: string | null = null;

    try {
      const safeFileName = backgroundFile.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "-"
      );

      const filePath =
        `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${safeFileName}`;

      const { data: uploadData, error: uploadError } =
        await supabase.storage
          .from("maris-backgrounds")
          .upload(filePath, backgroundFile, {
            contentType: backgroundFile.type,
            upsert: false,
          });

      if (uploadError) throw uploadError;

      uploadedPath = uploadData.path;

      const { data: publicUrlData } = supabase.storage
        .from("maris-backgrounds")
        .getPublicUrl(uploadData.path);

      const nextOrder =
        backgrounds.length > 0
          ? Math.max(...backgrounds.map((item) => item.sort_order)) + 1
          : 0;

      const { data: insertedBackground, error: insertError } =
        await supabase
          .from("theme_backgrounds")
          .insert({
            name: cleanName,
            image_url: publicUrlData.publicUrl,
            is_active: true,
            sort_order: nextOrder,
          })
          .select(
            "id, name, image_url, is_active, sort_order, created_at"
          )
          .single();

      if (insertError) {
        await supabase.storage
          .from("maris-backgrounds")
          .remove([uploadedPath]);

        throw insertError;
      }

      setBackgrounds((current) =>
        [
          ...current,
          insertedBackground as ThemeBackground,
        ].sort((a, b) => a.sort_order - b.sort_order)
      );

      setBackgroundName("");
      setBackgroundFile(null);
      event.currentTarget.reset();

      setSuccess("تم رفع الخلفية وإضافتها بنجاح.");
    } catch (err) {
      console.error(err);

      setBackgroundError(
        err instanceof Error
          ? `تعذر إضافة الخلفية: ${err.message}`
          : "حدث خطأ أثناء رفع الخلفية."
      );
    } finally {
      setUploading(false);
    }
  }

  async function toggleBackground(background: ThemeBackground) {
    if (!supabase) return;

    setError("");
    setSuccess("");
    setBackgroundError("");
    setChangingBackgroundId(background.id);

    try {
      const { error } = await supabase
        .from("theme_backgrounds")
        .update({ is_active: !background.is_active })
        .eq("id", background.id);

      if (error) throw error;

      setBackgrounds((current) =>
        current.map((item) =>
          item.id === background.id
            ? { ...item, is_active: !background.is_active }
            : item
        )
      );

      setSuccess(
        background.is_active
          ? "تم تعطيل الخلفية."
          : "تم تفعيل الخلفية."
      );
    } catch (err) {
      console.error(err);
      setBackgroundError(
        err instanceof Error
          ? `تعذر تغيير حالة الخلفية: ${err.message}`
          : "تعذر تغيير حالة الخلفية."
      );
    } finally {
      setChangingBackgroundId(null);
    }
  }

  async function deleteBackground(background: ThemeBackground) {
    if (!supabase) return;

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الخلفية "${background.name}"؟`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setBackgroundError("");
    setDeletingBackgroundId(background.id);

    try {
      const { error: deleteRowError } = await supabase
        .from("theme_backgrounds")
        .delete()
        .eq("id", background.id);

      if (deleteRowError) throw deleteRowError;

      setBackgrounds((current) =>
        current.filter((item) => item.id !== background.id)
      );

      const marker =
        "/storage/v1/object/public/maris-backgrounds/";

      const encodedPath = background.image_url
        .split(marker)[1]
        ?.split("?")[0];

      if (encodedPath) {
        const storagePath = encodedPath
          .split("/")
          .map((part) => decodeURIComponent(part))
          .join("/");

        const { error: removeError } = await supabase.storage
          .from("maris-backgrounds")
          .remove([storagePath]);

        if (removeError) {
          console.error(removeError);
          setSuccess(
            "حُذفت الخلفية من القائمة، لكن تعذر حذف ملف الصورة من التخزين."
          );
          return;
        }
      }

      setSuccess("تم حذف الخلفية بنجاح.");
    } catch (err) {
      console.error(err);
      setBackgroundError(
        err instanceof Error
          ? `تعذر حذف الخلفية: ${err.message}`
          : "حدث خطأ أثناء حذف الخلفية."
      );
    } finally {
      setDeletingBackgroundId(null);
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
              تحكم في المعلومات الأساسية ومظهر المنصة.
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

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl">
        <div className="mb-6">
          <h2 className="text-xl font-black">📝 المعلومات الأساسية</h2>
          <p className="mt-1 text-sm text-slate-500">
            أي تغيير تقوم به هنا يتم حفظه في قاعدة البيانات.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
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
          </div>

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
          </div>

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
          </div>

          <div className="border-t border-white/10 pt-6">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-cyan-500 px-5 py-3.5 font-black text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? "جاري حفظ التغييرات..." : "💾 حفظ التغييرات"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-cyan-500/20 bg-slate-900/70 p-6 shadow-xl">
        <div className="mb-6">
          <div className="mb-2 text-sm font-bold text-cyan-400">
            🌊 MARIS APPEARANCE
          </div>
          <h2 className="text-2xl font-black">
            إدارة خلفيات المنصة
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            أضف خلفيات جديدة وفعّل أو عطّل الخلفيات الموجودة.
            الخلفيات المعطّلة لا تظهر ضمن الخيارات المتاحة للطلبة.
          </p>
        </div>

        {backgroundError && (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {backgroundError}
          </div>
        )}

        <form
          onSubmit={handleUploadBackground}
          className="mb-8 space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-5"
        >
          <h3 className="font-black">➕ إضافة خلفية جديدة</h3>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              اسم الخلفية
            </label>
            <input
              type="text"
              value={backgroundName}
              onChange={(e) => setBackgroundName(e.target.value)}
              placeholder="مثال: محيط الأعماق"
              maxLength={80}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              صورة الخلفية
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setBackgroundFile(e.target.files?.[0] ?? null)
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300 file:me-3 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-3 file:py-2 file:font-bold file:text-slate-950"
            />
            <p className="mt-2 text-xs text-slate-500">
              الصور فقط، والحد الأقصى للحجم 10 ميغابايت.
            </p>
          </div>

          {backgroundFile && (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <p className="bg-slate-900 px-3 py-2 text-xs text-slate-400">
                معاينة الصورة المختارة
              </p>
              <div className="relative h-44 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(backgroundFile)}
                  alt="معاينة الخلفية المختارة"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="w-full rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {uploading ? "جاري رفع الخلفية..." : "⬆️ رفع وإضافة الخلفية"}
          </button>
        </form>

        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-black">الخلفيات المضافة</h3>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {backgrounds.length} خلفية
          </span>
        </div>

        {backgrounds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
            <div className="text-4xl">🖼️</div>
            <p className="mt-3 font-bold text-slate-300">
              ما زدت حتى خلفية جديدة
            </p>
            <p className="mt-1 text-sm text-slate-500">
              استعمل النموذج أعلاه لإضافة أول خلفية.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {backgrounds.map((background) => (
              <article
                key={background.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60"
              >
                <div className="relative h-40 bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={background.image_url}
                    alt={background.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <span
                    className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-black ${
                      background.is_active
                        ? "bg-emerald-400 text-slate-950"
                        : "bg-slate-950/90 text-slate-300"
                    }`}
                  >
                    {background.is_active ? "مفعّلة" : "معطّلة"}
                  </span>
                </div>

                <div className="space-y-3 p-4">
                  <h4 className="truncate font-black">
                    {background.name}
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={
                        changingBackgroundId === background.id ||
                        deletingBackgroundId === background.id
                      }
                      onClick={() => void toggleBackground(background)}
                      className={`rounded-xl px-3 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
                        background.is_active
                          ? "border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                          : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                      }`}
                    >
                      {changingBackgroundId === background.id
                        ? "جاري التغيير..."
                        : background.is_active
                          ? "تعطيل"
                          : "تفعيل"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        deletingBackgroundId === background.id ||
                        changingBackgroundId === background.id
                      }
                      onClick={() => void deleteBackground(background)}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {deletingBackgroundId === background.id
                        ? "جاري الحذف..."
                        : "🗑️ حذف"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {settings && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-lg font-black">👀 القيم الحالية</h2>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="text-xs text-slate-500">الأكاديمية</div>
              <div className="mt-1 font-bold">{settings.academy_name}</div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="text-xs text-slate-500">السنة</div>
              <div className="mt-1 font-bold">{settings.academic_year}</div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="text-xs text-slate-500">الإصدار</div>
              <div className="mt-1 font-bold">{settings.platform_version}</div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
