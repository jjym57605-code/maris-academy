
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Edit3,
  Eye,
  EyeOff,
  Globe2,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import countries from "i18n-iso-countries";
import arLocale from "i18n-iso-countries/langs/ar.json";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(arLocale);
countries.registerLocale(enLocale);

type MapLesson = {
  id: string;
  title: string;
  description: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type CountryLink = {
  id: string;
  lesson_id: string;
  country_code: string;
};

type CountryOption = {
  code: string;
  name: string;
};

export default function AdminMapsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lessons, setLessons] = useState<MapLesson[]>([]);
  const [countryLinks, setCountryLinks] = useState<CountryLink[]>([]);
  const [search, setSearch] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [published, setPublished] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  // جلب جميع رموز ISO alpha-2 من المكتبة، ثم تحويلها إلى alpha-3.
  // الأسماء العربية لها الأولوية، والإنجليزية تُستخدم عند غياب الترجمة العربية.
  const countryOptions = useMemo<CountryOption[]>(() => {
    const arabicNames = countries.getNames("ar");
    const englishNames = countries.getNames("en");
    const alpha2Codes = Object.keys(countries.getAlpha2Codes());

    return alpha2Codes
      .map((alpha2) => {
        const code = countries.alpha2ToAlpha3(alpha2);
        const name =
          arabicNames[alpha2] ||
          englishNames[alpha2] ||
          alpha2;

        if (!code) return null;

        return {
          code,
          name,
        };
      })
      .filter((item): item is CountryOption => item !== null)
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, []);

  const countryByCode = useMemo(
    () =>
      new Map(
        countryOptions.map((country) => [country.code, country.name]),
      ),
    [countryOptions],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("Supabase غير مهيأ.");
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data: adminStatus, error: adminError } =
        await supabase.rpc("is_current_user_admin");

      if (adminError || adminStatus !== true) {
        router.replace("/dashboard");
        return;
      }

      const [lessonsResult, linksResult] = await Promise.all([
        supabase
          .from("map_lessons")
          .select(
            "id, title, description, sort_order, is_published, created_at, updated_at",
          )
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false }),

        supabase
          .from("map_lesson_countries")
          .select("id, lesson_id, country_code"),
      ]);

      if (lessonsResult.error) throw lessonsResult.error;
      if (linksResult.error) throw linksResult.error;

      setLessons((lessonsResult.data ?? []) as MapLesson[]);
      setCountryLinks((linksResult.data ?? []) as CountryLink[]);
    } catch (err) {
      console.error("Failed to load map lessons:", err);

      setError(
        err instanceof Error
          ? `تعذّر تحميل البيانات: ${err.message}`
          : "ما قدرناش نحمّلو بيانات الخرائط. عاود حاول.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setSortOrder("0");
    setPublished(false);
    setSelectedCountries([]);
    setCountrySearch("");
    setShowCountryPicker(false);
    setError("");
    setNotice("");
  };

  const startEditing = (lesson: MapLesson) => {
    setEditingId(lesson.id);
    setTitle(lesson.title);
    setDescription(lesson.description ?? "");
    setSortOrder(String(lesson.sort_order ?? 0));
    setPublished(lesson.is_published);

    setSelectedCountries(
      countryLinks
        .filter((link) => link.lesson_id === lesson.id)
        .map((link) => link.country_code),
    );

    setCountrySearch("");
    setShowCountryPicker(false);
    setError("");
    setNotice("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleCountry = (code: string) => {
    setSelectedCountries((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code],
    );
  };

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLocaleLowerCase("ar");

    if (!query) return countryOptions;

    return countryOptions.filter(
      (country) =>
        country.name.toLocaleLowerCase("ar").includes(query) ||
        country.code.toLowerCase().includes(query),
    );
  }, [countryOptions, countrySearch]);

  const filteredLessons = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar");

    if (!query) return lessons;

    return lessons.filter((lesson) => {
      const linkedCountries = countryLinks
        .filter((link) => link.lesson_id === lesson.id)
        .map(
          (link) =>
            countryByCode.get(link.country_code) ?? link.country_code,
        )
        .join(" ");

      return `${lesson.title} ${lesson.description} ${linkedCountries}`
        .toLocaleLowerCase("ar")
        .includes(query);
    });
  }, [lessons, countryLinks, countryByCode, search]);

  const saveLesson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const parsedOrder = Number(sortOrder);

    if (!cleanTitle) {
      setError("اكتب عنوان الدرس أولاً.");
      return;
    }

    if (cleanTitle.length > 200) {
      setError("العنوان لازم يكون أقل من 200 حرف.");
      return;
    }

    if (
      !Number.isInteger(parsedOrder) ||
      parsedOrder < 0 ||
      !Number.isFinite(parsedOrder)
    ) {
      setError("ترتيب العرض لازم يكون رقم صحيح موجب أو صفر.");
      return;
    }

    if (selectedCountries.length === 0) {
      setError("اختار دولة واحدة على الأقل لهذا العنوان.");
      return;
    }

    setSaving(true);

    try {
      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("Supabase غير مهيأ.");
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError("الجلسة انتهت. عاود سجّل الدخول.");
        router.replace("/login");
        return;
      }

      const { data: adminStatus, error: adminError } =
        await supabase.rpc("is_current_user_admin");

      if (adminError || adminStatus !== true) {
        setError("ما عندكش صلاحية إدارة الخرائط.");
        return;
      }

      let lessonId = editingId;

      if (editingId) {
        const { error: updateError } = await supabase
          .from("map_lessons")
          .update({
            title: cleanTitle,
            description: cleanDescription,
            sort_order: parsedOrder,
            is_published: published,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);

        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from("map_lessons")
          .insert({
            title: cleanTitle,
            description: cleanDescription,
            sort_order: parsedOrder,
            is_published: published,
            created_by: user.id,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        lessonId = data.id;
      }

      if (!lessonId) {
        throw new Error("ما قدرناش نحددو معرّف العنوان.");
      }

      const { error: deleteLinksError } = await supabase
        .from("map_lesson_countries")
        .delete()
        .eq("lesson_id", lessonId);

      if (deleteLinksError) {
        throw new Error(
          "تم حفظ العنوان، بصح ما قدرناش نحدّثو الدول المرتبطة به.",
        );
      }

      const { error: insertLinksError } = await supabase
        .from("map_lesson_countries")
        .insert(
          selectedCountries.map((countryCode) => ({
            lesson_id: lessonId,
            country_code: countryCode,
          })),
        );

      if (insertLinksError) {
        throw new Error(
          "تم حفظ العنوان، بصح صرا مشكل في ربط الدول به. افتح التعديل وعاود احفظ.",
        );
      }

      const wasEditing = Boolean(editingId);

      resetForm();

      setNotice(
        wasEditing ? "تحدّث العنوان بنجاح." : "تضاف العنوان بنجاح.",
      );

      await loadData();
    } catch (err) {
      console.error("Failed to save map lesson:", err);

      setError(
        err instanceof Error
          ? err.message
          : "وقع خطأ أثناء حفظ البيانات.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteLesson = async (lesson: MapLesson) => {
    if (
      !window.confirm(
        `متأكد بلي حاب تحذف "${lesson.title}"؟ هذا الإجراء ما يتراجعش.`,
      )
    ) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("Supabase غير مهيأ.");
      }

      const { data: adminStatus, error: adminError } =
        await supabase.rpc("is_current_user_admin");

      if (adminError || adminStatus !== true) {
        setError("ما عندكش صلاحية حذف العناوين.");
        return;
      }

      const { error: deleteError } = await supabase
        .from("map_lessons")
        .delete()
        .eq("id", lesson.id);

      if (deleteError) throw deleteError;

      if (editingId === lesson.id) resetForm();

      setNotice("تحذف العنوان بنجاح.");
      await loadData();
    } catch (err) {
      console.error("Failed to delete map lesson:", err);

      setError(
        err instanceof Error
          ? err.message
          : "ما قدرناش نحذفو العنوان.",
      );
    }
  };

  const togglePublished = async (lesson: MapLesson) => {
    setError("");
    setNotice("");

    try {
      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("Supabase غير مهيأ.");
      }

      const { data: adminStatus, error: adminError } =
        await supabase.rpc("is_current_user_admin");

      if (adminError || adminStatus !== true) {
        setError("ما عندكش صلاحية تغيير حالة النشر.");
        return;
      }

      const { error: updateError } = await supabase
        .from("map_lessons")
        .update({
          is_published: !lesson.is_published,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lesson.id);

      if (updateError) throw updateError;

      setNotice(
        lesson.is_published
          ? "تم إخفاء العنوان عن الطلبة."
          : "تم نشر العنوان للطلبة.",
      );

      await loadData();
    } catch (err) {
      console.error("Failed to toggle map lesson:", err);

      setError(
        err instanceof Error
          ? err.message
          : "ما قدرناش نغيّرو حالة النشر.",
      );
    }
  };

  const publishedCount = lessons.filter(
    (lesson) => lesson.is_published,
  ).length;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#061321] px-4 py-6 text-slate-100 sm:px-6 lg:px-10"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              aria-label="العودة إلى لوحة الإدارة"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition hover:bg-white/10"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>

            <div>
              <p className="text-sm text-cyan-300">
                MARIS ACADEMY ²⁰²⁷
              </p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                إدارة دروس الخرائط
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                أنشئ العناوين واربط كل عنوان بالدول المناسبة.
              </p>
            </div>
          </div>

          <Link
            href="/flashcards/maps"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/15"
          >
            <Globe2 className="h-4 w-4" />
            معاينة الخريطة
          </Link>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200"
          >
            <X className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200"
          >
            <Check className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{notice}</p>
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="إجمالي العناوين"
            value={lessons.length}
            icon={<BookOpen className="h-5 w-5" />}
          />

          <StatCard
            label="العناوين المنشورة"
            value={publishedCount}
            icon={<Eye className="h-5 w-5" />}
          />

          <StatCard
            label="روابط الدول"
            value={countryLinks.length}
            icon={<Globe2 className="h-5 w-5" />}
          />
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0b1d30] p-4 shadow-xl shadow-black/10 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">
                {editingId ? "تعديل العنوان" : "إضافة عنوان جديد"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                العنوان والدول المرتبطة به هما الأساس في هذا الدرس.
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5"
              >
                <X className="h-4 w-4" />
                إلغاء التعديل
              </button>
            )}
          </div>

          <form onSubmit={saveLesson} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="map-title"
                  className="mb-2 block text-sm font-bold text-slate-300"
                >
                  عنوان الدرس
                </label>

                <input
                  id="map-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                  required
                  placeholder="مثال: دول حوض البحر الأبيض المتوسط"
                  className="w-full rounded-xl border border-white/10 bg-[#061321] px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label
                  htmlFor="map-order"
                  className="mb-2 block text-sm font-bold text-slate-300"
                >
                  ترتيب العرض
                </label>

                <input
                  id="map-order"
                  type="number"
                  min={0}
                  step={1}
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#061321] px-4 py-3 outline-none transition focus:border-cyan-400/60"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="map-description"
                className="mb-2 block text-sm font-bold text-slate-300"
              >
                وصف الدرس
              </label>

              <textarea
                id="map-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="اكتب وصفًا مختصرًا لمحتوى العنوان..."
                className="w-full resize-y rounded-xl border border-white/10 bg-[#061321] px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60"
              />
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-bold text-slate-300">
                  الدول المرتبطة بالعنوان
                </label>

                <span className="text-xs text-cyan-300">
                  تم اختيار {selectedCountries.length} دولة
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCountryPicker((current) => !current)
                }
                aria-expanded={showCountryPicker}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#061321] px-4 py-3 text-right transition hover:border-cyan-400/40"
              >
                <span className="flex items-center gap-3">
                  <Globe2 className="h-5 w-5 text-cyan-300" />

                  <span>
                    <span className="block font-bold">
                      اختيار الدول من القائمة
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      ابحث عن اسم الدولة واضغط عليها لاختيارها.
                    </span>
                  </span>
                </span>

                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-slate-400 transition ${
                    showCountryPicker ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showCountryPicker && (
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#071625]">
                  <div className="border-b border-white/10 p-3">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                      <input
                        value={countrySearch}
                        onChange={(event) =>
                          setCountrySearch(event.target.value)
                        }
                        placeholder="ابحث عن دولة..."
                        className="w-full rounded-xl border border-white/10 bg-[#061321] py-3 pr-10 pl-4 outline-none focus:border-cyan-400/60"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCountries((current) => [
                            ...new Set([
                              ...current,
                              ...filteredCountries.map(
                                (country) => country.code,
                              ),
                            ]),
                          ])
                        }
                        className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-400/20"
                      >
                        اختيار نتائج البحث
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedCountries([])}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
                      >
                        إلغاء اختيار الكل
                      </button>
                    </div>
                  </div>

                  <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto p-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredCountries.map((country) => {
                      const checked = selectedCountries.includes(
                        country.code,
                      );

                      return (
                        <button
                          key={country.code}
                          type="button"
                          onClick={() => toggleCountry(country.code)}
                          aria-pressed={checked}
                          className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-3 text-right text-sm transition ${
                            checked
                              ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                              : "border-white/5 bg-white/[0.02] text-slate-300 hover:border-white/15 hover:bg-white/5"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">
                              {country.name}
                            </span>
                            <span className="mt-1 block text-xs text-slate-500">
                              {country.code}
                            </span>
                          </span>

                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                              checked
                                ? "border-cyan-300 bg-cyan-300 text-[#061321]"
                                : "border-slate-600"
                            }`}
                          >
                            {checked && (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </span>
                        </button>
                      );
                    })}

                    {filteredCountries.length === 0 && (
                      <p className="col-span-full py-6 text-center text-sm text-slate-500">
                        ما لقيناش دولة بهذا الاسم.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedCountries.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedCountries.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => toggleCountry(code)}
                      title="إزالة الدولة"
                      className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-red-500/10 hover:text-red-200"
                    >
                      {countryByCode.get(code) ?? code}
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-[#061321] p-4">
              <input
                type="checkbox"
                checked={published}
                onChange={(event) => setPublished(event.target.checked)}
                className="h-5 w-5 accent-cyan-400"
              />

              <span>
                <span className="block font-bold">
                  نشر العنوان للطلبة
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  إذا ما فعلتش هذا الخيار، يبقى العنوان غير منشور.
                </span>
              </span>
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-black text-[#061321] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : editingId ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}

                {saving
                  ? "جارٍ الحفظ..."
                  : editingId
                    ? "حفظ التعديلات"
                    : "إضافة العنوان"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-xl border border-white/10 px-5 py-3 font-bold text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
                >
                  إلغاء
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">العناوين المسجلة</h2>
              <p className="mt-1 text-sm text-slate-400">
                عدّل العناوين أو الدول المرتبطة بها وتحكّم في النشر.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث في العناوين..."
                className="w-full rounded-xl border border-white/10 bg-[#0b1d30] py-3 pr-10 pl-4 outline-none focus:border-cyan-400/60"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-48 items-center justify-center gap-3 rounded-3xl border border-white/10 bg-[#0b1d30] text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
              جارٍ تحميل البيانات...
            </div>
          ) : filteredLessons.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#0b1d30] px-5 py-12 text-center">
              <Globe2 className="mx-auto h-10 w-10 text-slate-600" />

              <h3 className="mt-4 font-bold">
                {search
                  ? "ما لقيناش نتائج"
                  : "مازال ما كاين حتى عنوان"}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {search
                  ? "جرب كلمات أخرى في البحث."
                  : "استعمل النموذج اللي فوق باش تضيف أول عنوان للخريطة."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {filteredLessons.map((lesson) => {
                const linkedCountries = countryLinks.filter(
                  (link) => link.lesson_id === lesson.id,
                );

                return (
                  <article
                    key={lesson.id}
                    className="rounded-2xl border border-white/10 bg-[#0b1d30] p-4 transition hover:border-cyan-400/20 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-400">
                            ترتيب {lesson.sort_order}
                          </span>

                          <span
                            className={`rounded-lg px-2 py-1 text-xs font-bold ${
                              lesson.is_published
                                ? "bg-emerald-400/10 text-emerald-300"
                                : "bg-amber-400/10 text-amber-200"
                            }`}
                          >
                            {lesson.is_published
                              ? "منشور"
                              : "مسودة"}
                          </span>
                        </div>

                        <h3 className="break-words text-lg font-black">
                          {lesson.title}
                        </h3>

                        {lesson.description && (
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-400">
                            {lesson.description}
                          </p>
                        )}
                      </div>

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/10 text-cyan-200">
                        <Globe2 className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-white/5 bg-[#061321]/70 p-3">
                      <p className="mb-2 text-xs font-bold text-slate-400">
                        الدول المرتبطة ({linkedCountries.length})
                      </p>

                      {linkedCountries.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {linkedCountries.map((link) => (
                            <span
                              key={link.id}
                              className="rounded-lg border border-white/5 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300"
                            >
                              {countryByCode.get(link.country_code) ??
                                link.country_code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          ما كاين حتى دولة مرتبطة بهذا العنوان.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-4">
                      <button
                        type="button"
                        onClick={() => startEditing(lesson)}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-white/5"
                      >
                        <Edit3 className="h-4 w-4" />
                        تعديل
                      </button>

                      <button
                        type="button"
                        onClick={() => void togglePublished(lesson)}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-white/5"
                      >
                        {lesson.is_published ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}

                        {lesson.is_published ? "إخفاء" : "نشر"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteLesson(lesson)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-400/15 px-3 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </button>
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

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1d30] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{label}</p>

        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-3xl font-black tabular-nums">
        {value}
      </p>
    </div>
  );
}
