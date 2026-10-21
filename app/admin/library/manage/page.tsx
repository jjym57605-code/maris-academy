
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { getProfile } from "@/services/auth";

type LibrarySubject = {
  id: string;
  stream: string;
  name: string;
  icon: string | null;
  description: string | null;
  order_index: number | null;
  is_active: boolean;
  created_at: string | null;
};

type LibraryResource = {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  resource_type: string;
  content: string | null;
  pdf_url: string | null;
  image_urls?: string[] | null;
  year: number | null;
  is_published: boolean;
  created_at: string | null;
  updated_at: string | null;
};

const RESOURCE_TYPES: Record<string, string> = {
  summary: "📘 ملخص",
  exercise: "📝 تمرين",
  bac_topic: "🎓 موضوع بكالوريا",
  solution: "✅ حل",
};

const STORAGE_BUCKET = "library-pdfs";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400";

const buttonClass =
  "rounded-xl border border-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50";

export default function LibraryManagePage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<LibrarySubject[]>([]);
  const [resources, setResources] = useState<LibraryResource[]>([]);

  const [editingSubject, setEditingSubject] =
    useState<LibrarySubject | null>(null);

  const [editingResource, setEditingResource] =
    useState<LibraryResource | null>(null);

  const [subjectForm, setSubjectForm] = useState({
    stream: "",
    name: "",
    icon: "📚",
    description: "",
    order_index: "0",
    is_active: true,
  });

  const [resourceForm, setResourceForm] = useState({
    subject_id: "",
    title: "",
    description: "",
    resource_type: "summary",
    content: "",
    year: "",
    is_published: false,
  });

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function getAdminSupabase() {
    const supabase = getSupabase();

    if (!supabase) {
      throw new Error("خدمة قاعدة البيانات غير متاحة حالياً.");
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("انتهت جلسة الدخول. سجّل الدخول مجدداً.");
    }

    const profile = await getProfile(supabase, user.id);

    if (!profile?.is_admin) {
      throw new Error("ليس لديك صلاحية تنفيذ هذه العملية.");
    }

    return supabase;
  }

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const supabase = await getAdminSupabase();

      const [subjectsResult, resourcesResult] = await Promise.all([
        supabase
          .from("library_subjects")
          .select(
            "id, stream, name, icon, description, order_index, is_active, created_at"
          )
          .order("stream", { ascending: true })
          .order("order_index", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from("library_resources")
          .select(
            "id, subject_id, title, description, resource_type, content, pdf_url, image_urls, year, is_published, created_at, updated_at"
          )
          .order("created_at", { ascending: false }),
      ]);

      if (subjectsResult.error) {
        throw new Error(subjectsResult.error.message);
      }

      if (resourcesResult.error) {
        throw new Error(resourcesResult.error.message);
      }

      setSubjects((subjectsResult.data ?? []) as LibrarySubject[]);
      setResources((resourcesResult.data ?? []) as LibraryResource[]);
    } catch (err) {
      console.error("Library management load error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل المواد والموارد."
      );
    } finally {
      setLoading(false);
    }
  }

  const normalizedSearch = search.trim().toLocaleLowerCase("ar");

  const subjectMap = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects]
  );

  const filteredSubjects = useMemo(() => {
    if (!normalizedSearch) return subjects;

    return subjects.filter((subject) =>
      [
        subject.name,
        subject.stream,
        subject.description ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("ar")
        .includes(normalizedSearch)
    );
  }, [subjects, normalizedSearch]);

  const filteredResources = useMemo(() => {
    if (!normalizedSearch) return resources;

    return resources.filter((resource) => {
      const subject = subjectMap.get(resource.subject_id);

      return [
        resource.title,
        resource.description ?? "",
        resource.resource_type,
        RESOURCE_TYPES[resource.resource_type] ?? "",
        subject?.name ?? "",
        subject?.stream ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("ar")
        .includes(normalizedSearch);
    });
  }, [resources, subjectMap, normalizedSearch]);

  const visibleSubjects = useMemo(() => {
    if (!normalizedSearch) return subjects;
    const subjectIdsWithMatchingResources = new Set(
      filteredResources.map((resource) => resource.subject_id)
    );
    return subjects.filter(
      (subject) =>
        filteredSubjects.some((item) => item.id === subject.id) ||
        subjectIdsWithMatchingResources.has(subject.id)
    );
  }, [subjects, filteredSubjects, filteredResources, normalizedSearch]);

  const streams = useMemo(
    () => Array.from(new Set(visibleSubjects.map((subject) => subject.stream))).sort((a, b) => a.localeCompare(b, "ar")),
    [visibleSubjects]
  );

  const streamSubjects = useMemo(
    () => visibleSubjects.filter((subject) => subject.stream === selectedStream),
    [visibleSubjects, selectedStream]
  );

  const selectedSubject = selectedSubjectId
    ? subjectMap.get(selectedSubjectId) ?? null
    : null;

  const subjectResources = useMemo(
    () => filteredResources.filter((resource) => resource.subject_id === selectedSubjectId),
    [filteredResources, selectedSubjectId]
  );

  function startEditSubject(subject: LibrarySubject) {
    setEditingSubject(subject);
    setEditingResource(null);

    setSubjectForm({
      stream: subject.stream,
      name: subject.name,
      icon: subject.icon ?? "📚",
      description: subject.description ?? "",
      order_index: String(subject.order_index ?? 0),
      is_active: subject.is_active,
    });

    setError("");
    setSuccess("");
  }

  function startEditResource(resource: LibraryResource) {
    setEditingResource(resource);
    setEditingSubject(null);

    setResourceForm({
      subject_id: resource.subject_id,
      title: resource.title,
      description: resource.description ?? "",
      resource_type: resource.resource_type,
      content: resource.content ?? "",
      year: resource.year ? String(resource.year) : "",
      is_published: resource.is_published,
    });

    setError("");
    setSuccess("");
  }

  function closeForms() {
    setEditingSubject(null);
    setEditingResource(null);
    setError("");
  }

  async function saveSubject() {
    if (!editingSubject) return;

    if (!subjectForm.stream.trim() || !subjectForm.name.trim()) {
      setError("أدخل الشعبة واسم المادة.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const supabase = await getAdminSupabase();

      const { error: updateError } = await supabase
        .from("library_subjects")
        .update({
          stream: subjectForm.stream.trim(),
          name: subjectForm.name.trim(),
          icon: subjectForm.icon.trim() || "📚",
          description: subjectForm.description.trim() || null,
          order_index: Number(subjectForm.order_index) || 0,
          is_active: subjectForm.is_active,
        })
        .eq("id", editingSubject.id);

      if (updateError) throw new Error(updateError.message);

      setSuccess("تم تعديل المادة بنجاح.");
      setEditingSubject(null);
      await loadData();
    } catch (err) {
      console.error("Update subject error:", err);
      setError(
        err instanceof Error ? err.message : "تعذر تعديل المادة."
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleSubject(subject: LibrarySubject) {
    const action = subject.is_active ? "إخفاء" : "إظهار";

    if (
      !window.confirm(
        `هل تريد ${action} مادة "${subject.name}"؟`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const supabase = await getAdminSupabase();

      const { error: updateError } = await supabase
        .from("library_subjects")
        .update({ is_active: !subject.is_active })
        .eq("id", subject.id);

      if (updateError) throw new Error(updateError.message);

      setSuccess(
        subject.is_active
          ? "تم إخفاء المادة."
          : "تم تفعيل المادة."
      );

      await loadData();
    } catch (err) {
      console.error("Toggle subject error:", err);
      setError(
        err instanceof Error ? err.message : "تعذر تغيير حالة المادة."
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteSubject(subject: LibrarySubject) {
    const subjectResources = resources.filter(
      (resource) => resource.subject_id === subject.id
    );

    if (subjectResources.length > 0) {
      setError(
        `لا يمكن حذف المادة لأنها تحتوي على ${subjectResources.length} مورد. احذف مواردها أولاً أو أخفِ المادة.`
      );
      setSuccess("");
      return;
    }

    if (
      !window.confirm(
        `هل أنت متأكد من حذف المادة "${subject.name}" نهائياً؟`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const supabase = await getAdminSupabase();

      const { error: deleteError } = await supabase
        .from("library_subjects")
        .delete()
        .eq("id", subject.id);

      if (deleteError) throw new Error(deleteError.message);

      setSuccess("تم حذف المادة.");
      await loadData();
    } catch (err) {
      console.error("Delete subject error:", err);
      setError(
        err instanceof Error ? err.message : "تعذر حذف المادة."
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveResource() {
    if (!editingResource) return;

    if (
      !resourceForm.subject_id ||
      !resourceForm.title.trim() ||
      !resourceForm.resource_type
    ) {
      setError("أدخل المادة والعنوان ونوع المورد.");
      return;
    }

    if (
      resourceForm.year.trim() &&
      !Number.isFinite(Number(resourceForm.year))
    ) {
      setError("السنة المدخلة غير صحيحة.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const supabase = await getAdminSupabase();

      const { error: updateError } = await supabase
        .from("library_resources")
        .update({
          subject_id: resourceForm.subject_id,
          title: resourceForm.title.trim(),
          description: resourceForm.description.trim() || null,
          resource_type: resourceForm.resource_type,
          content: resourceForm.content.trim() || null,
          year: resourceForm.year.trim()
            ? Number(resourceForm.year)
            : null,
          is_published: resourceForm.is_published,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingResource.id);

      if (updateError) throw new Error(updateError.message);

      setSuccess("تم تعديل المورد بنجاح.");
      setEditingResource(null);
      await loadData();
    } catch (err) {
      console.error("Update resource error:", err);
      setError(
        err instanceof Error ? err.message : "تعذر تعديل المورد."
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleResource(resource: LibraryResource) {
    const action = resource.is_published ? "إخفاء" : "نشر";

    if (
      !window.confirm(
        `هل تريد ${action} المورد "${resource.title}"؟`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const supabase = await getAdminSupabase();

      const { error: updateError } = await supabase
        .from("library_resources")
        .update({
          is_published: !resource.is_published,
          updated_at: new Date().toISOString(),
        })
        .eq("id", resource.id);

      if (updateError) throw new Error(updateError.message);

      setSuccess(
        resource.is_published
          ? "تم إخفاء المورد."
          : "تم نشر المورد."
      );

      await loadData();
    } catch (err) {
      console.error("Toggle resource error:", err);
      setError(
        err instanceof Error ? err.message : "تعذر تغيير حالة المورد."
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteResource(resource: LibraryResource) {
    if (
      !window.confirm(
        `هل أنت متأكد من حذف المورد "${resource.title}" نهائياً؟ لا يمكن التراجع عن هذا الحذف.`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const supabase = await getAdminSupabase();

      // حذف سجل المورد أولاً. لا نحذف ملفات Storage إلا بعد نجاح الحذف.
      const { error: deleteError } = await supabase
        .from("library_resources")
        .delete()
        .eq("id", resource.id);

      if (deleteError) throw new Error(deleteError.message);

      const storedPaths = [
        ...(resource.pdf_url ? [resource.pdf_url] : []),
        ...(Array.isArray(resource.image_urls)
          ? resource.image_urls
          : []),
      ];

      const pathsToRemove = storedPaths
        .filter(
          (path) =>
            typeof path === "string" &&
            path.startsWith(`${STORAGE_BUCKET}/`)
        )
        .map((path) => path.slice(`${STORAGE_BUCKET}/`.length));

      if (pathsToRemove.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(pathsToRemove);

        if (storageError) {
          console.error(
            "Resource deleted but storage cleanup failed:",
            storageError
          );

          setSuccess(
            "تم حذف المورد، لكن بعض الملفات المرفوعة قد تحتاج إلى حذف يدوي من Storage."
          );

          await loadData();
          return;
        }
      }

      setSuccess("تم حذف المورد وملفاته المرفوعة بنجاح.");
      await loadData();
    } catch (err) {
      console.error("Delete resource error:", err);
      setError(
        err instanceof Error ? err.message : "تعذر حذف المورد."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-950/50 via-slate-900/80 to-slate-950 p-5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold tracking-widest text-cyan-300">🌊 MARIS ACADEMY ²⁰²⁷</p>
            <h1 className="text-2xl font-black sm:text-3xl">🗂️ إدارة المواد والموارد</h1>
            <p className="mt-2 text-sm text-white/60">تنظيم المكتبة حسب الشعبة، ثم المادة، ثم مواردها.</p>
          </div>
          <Link href="/admin/library" className={buttonClass}>← العودة إلى مكتبة الدروس</Link>
        </header>

        {error && <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">⚠️ {error}</div>}
        {success && <div role="status" className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">✅ {success}</div>}

        <section className="rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSelectedStream(null);
                setSelectedSubjectId(null);
              }}
              placeholder="🔎 ابحث عن شعبة أو مادة أو مورد..."
              className={inputClass}
            />
            <div className="shrink-0 rounded-xl bg-white/5 px-4 py-3 text-sm text-white/70">
              {subjects.length} مادة <span className="mx-1 text-white/30">·</span> {resources.length} مورد
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/50">
            <span className="rounded-lg bg-cyan-400/10 px-3 py-2 text-cyan-200">1. الشعب</span>
            <span>←</span>
            <span className="rounded-lg bg-cyan-400/10 px-3 py-2 text-cyan-200">2. المواد</span>
            <span>←</span>
            <span className="rounded-lg bg-cyan-400/10 px-3 py-2 text-cyan-200">3. الموارد</span>
          </div>
        </section>

        {editingSubject && (
          <section className="space-y-4 rounded-3xl border border-cyan-400/20 bg-slate-900/80 p-5">
            <h2 className="text-xl font-black">✏️ تعديل المادة</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span>الشعبة</span>
                <input
                  value={subjectForm.stream}
                  onChange={(event) =>
                    setSubjectForm({
                      ...subjectForm,
                      stream: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span>اسم المادة</span>
                <input
                  value={subjectForm.name}
                  onChange={(event) =>
                    setSubjectForm({
                      ...subjectForm,
                      name: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span>الأيقونة</span>
                <input
                  value={subjectForm.icon}
                  onChange={(event) =>
                    setSubjectForm({
                      ...subjectForm,
                      icon: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span>الترتيب</span>
                <input
                  type="number"
                  value={subjectForm.order_index}
                  onChange={(event) =>
                    setSubjectForm({
                      ...subjectForm,
                      order_index: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>

              <label className="space-y-2 text-sm md:col-span-2">
                <span>الوصف</span>
                <textarea
                  rows={3}
                  value={subjectForm.description}
                  onChange={(event) =>
                    setSubjectForm({
                      ...subjectForm,
                      description: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={subjectForm.is_active}
                  onChange={(event) =>
                    setSubjectForm({
                      ...subjectForm,
                      is_active: event.target.checked,
                    })
                  }
                  className="h-5 w-5"
                />
                المادة مفعّلة للطلاب
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveSubject}
                disabled={busy}
                className="rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950 disabled:opacity-50"
              >
                {busy ? "جاري الحفظ..." : "💾 حفظ التعديلات"}
              </button>

              <button
                type="button"
                onClick={closeForms}
                disabled={busy}
                className={buttonClass}
              >
                إلغاء
              </button>
            </div>
          </section>
        )}

        {editingResource && (
          <section className="space-y-4 rounded-3xl border border-emerald-400/20 bg-slate-900/80 p-5">
            <h2 className="text-xl font-black">✏️ تعديل المورد</h2>

            <p className="text-sm text-white/60">
              تعديل المعلومات هنا لا يغيّر الصور أو ملف PDF المرفقين حاليًا.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span>المادة</span>
                <select
                  value={resourceForm.subject_id}
                  onChange={(event) =>
                    setResourceForm({
                      ...resourceForm,
                      subject_id: event.target.value,
                    })
                  }
                  className={inputClass}
                >
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.stream} — {subject.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span>نوع المورد</span>
                <select
                  value={resourceForm.resource_type}
                  onChange={(event) =>
                    setResourceForm({
                      ...resourceForm,
                      resource_type: event.target.value,
                    })
                  }
                  className={inputClass}
                >
                  {Object.entries(RESOURCE_TYPES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm md:col-span-2">
                <span>العنوان</span>
                <input
                  value={resourceForm.title}
                  onChange={(event) =>
                    setResourceForm({
                      ...resourceForm,
                      title: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>

              <label className="space-y-2 text-sm md:col-span-2">
                <span>الوصف</span>
                <textarea
                  rows={3}
                  value={resourceForm.description}
                  onChange={(event) =>
                    setResourceForm({
                      ...resourceForm,
                      description: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>

              <label className="space-y-2 text-sm md:col-span-2">
                <span>المحتوى الداخلي</span>
                <textarea
                  rows={8}
                  value={resourceForm.content}
                  onChange={(event) =>
                    setResourceForm({
                      ...resourceForm,
                      content: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span>السنة</span>
                <input
                  type="number"
                  value={resourceForm.year}
                  onChange={(event) =>
                    setResourceForm({
                      ...resourceForm,
                      year: event.target.value,
                    })
                  }
                  placeholder="مثال: 2026"
                  className={inputClass}
                />
              </label>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={resourceForm.is_published}
                  onChange={(event) =>
                    setResourceForm({
                      ...resourceForm,
                      is_published: event.target.checked,
                    })
                  }
                  className="h-5 w-5"
                />
                المورد منشور للطلاب
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveResource}
                disabled={busy}
                className="rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950 disabled:opacity-50"
              >
                {busy ? "جاري الحفظ..." : "💾 حفظ التعديلات"}
              </button>

              <button
                type="button"
                onClick={closeForms}
                disabled={busy}
                className={buttonClass}
              >
                إلغاء
              </button>
            </div>
          </section>
        )}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-black/20 p-10 text-center text-white/60">جاري تحميل المواد والموارد...</div>
        ) : (
          <div className="space-y-6">
            {!selectedStream ? (
              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-black">🎓 الشعب الدراسية</h2>
                  <p className="mt-1 text-sm text-white/50">اختر شعبة لعرض المواد التابعة لها.</p>
                </div>
                {streams.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-white/50">ما لقيناش شعب أو مواد مطابقة للبحث.</div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {streams.map((stream) => {
                      const streamSubjectList = visibleSubjects.filter((subject) => subject.stream === stream);
                      const streamResourceCount = resources.filter((resource) => streamSubjectList.some((subject) => subject.id === resource.subject_id)).length;
                      return (
                        <button
                          key={stream}
                          type="button"
                          onClick={() => { setSelectedStream(stream); setSelectedSubjectId(null); }}
                          className="group rounded-3xl border border-white/10 bg-black/20 p-5 text-right transition hover:border-cyan-400/40 hover:bg-cyan-950/30"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-3xl">🎓</div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-black leading-6">{stream}</h3>
                              <p className="mt-1 text-xs text-white/50">{streamSubjectList.length} مادة · {streamResourceCount} مورد</p>
                            </div>
                            <span className="text-xl text-cyan-300 transition group-hover:-translate-x-1">←</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : !selectedSubject ? (
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <button type="button" onClick={() => { setSelectedStream(null); setSelectedSubjectId(null); }} className="mb-2 text-sm font-bold text-cyan-300 hover:text-cyan-200">← الرجوع إلى الشعب</button>
                    <h2 className="text-xl font-black">📚 مواد شعبة {selectedStream}</h2>
                    <p className="mt-1 text-sm text-white/50">اختار مادة باش تشوف الموارد الخاصة بها.</p>
                  </div>
                  <span className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/60">{streamSubjects.length} مادة</span>
                </div>
                {streamSubjects.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-white/50">ما كاين حتى مادة مطابقة للبحث في هذي الشعبة.</div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {streamSubjects.map((subject) => {
                      const count = resources.filter((resource) => resource.subject_id === subject.id).length;
                      return (
                        <article key={subject.id} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                          <button type="button" onClick={() => setSelectedSubjectId(subject.id)} className="w-full text-right">
                            <div className="flex items-start gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl">{subject.icon || "📚"}</div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-black">{subject.name}</h3>
                                <p className="mt-1 text-xs text-cyan-300">{subject.stream}</p>
                              </div>
                              <span className="text-lg text-cyan-300">←</span>
                            </div>
                            {subject.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/50">{subject.description}</p>}
                            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                              <span className={subject.is_active ? "text-emerald-300" : "text-red-300"}>{subject.is_active ? "● مفعّلة" : "● مخفية"}</span>
                              <span className="text-white/50">{count} مورد</span>
                            </div>
                          </button>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => startEditSubject(subject)} disabled={busy} className={buttonClass}>✏️ تعديل</button>
                            <button type="button" onClick={() => void toggleSubject(subject)} disabled={busy} className={buttonClass}>{subject.is_active ? "🙈 إخفاء" : "👁️ إظهار"}</button>
                            <button type="button" onClick={() => void deleteSubject(subject)} disabled={busy} className="col-span-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50">🗑️ حذف المادة</button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : (
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <button type="button" onClick={() => setSelectedSubjectId(null)} className="mb-2 text-sm font-bold text-cyan-300 hover:text-cyan-200">← الرجوع إلى مواد {selectedStream}</button>
                    <h2 className="text-xl font-black">{selectedSubject.icon || "📚"} موارد مادة {selectedSubject.name}</h2>
                    <p className="mt-1 text-sm text-white/50">الشعبة: {selectedSubject.stream} · {subjectResources.length} مورد</p>
                  </div>
                  <span className={selectedSubject.is_active ? "rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300" : "rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300"}>{selectedSubject.is_active ? "المادة مفعّلة" : "المادة مخفية"}</span>
                </div>
                {subjectResources.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-white/50">ما كاين حتى مورد في هذي المادة{normalizedSearch ? " يطابق البحث" : " حالياً"}.</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {subjectResources.map((resource) => {
                      const imageCount = Array.isArray(resource.image_urls) ? resource.image_urls.length : 0;
                      return (
                        <article key={resource.id} className="rounded-3xl border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0"><h3 className="font-bold leading-6">{resource.title}</h3><p className="mt-1 text-xs text-cyan-300">{selectedSubject.name}</p><p className="mt-1 text-xs text-white/40">{selectedSubject.stream}</p></div>
                            <span className="shrink-0 rounded-xl bg-white/10 px-3 py-1.5 text-xs">{RESOURCE_TYPES[resource.resource_type] || resource.resource_type}</span>
                          </div>
                          {resource.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/55">{resource.description}</p>}
                          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4 text-xs">
                            {resource.year && <span className="rounded-xl bg-white/5 px-3 py-1.5 text-white/50">📅 {resource.year}</span>}
                            <span className={resource.is_published ? "rounded-xl bg-emerald-500/10 px-3 py-1.5 text-emerald-300" : "rounded-xl bg-yellow-500/10 px-3 py-1.5 text-yellow-300"}>{resource.is_published ? "● منشور" : "● غير منشور"}</span>
                            {resource.pdf_url && <span className="rounded-xl bg-red-500/10 px-3 py-1.5 text-red-300">📄 PDF</span>}
                            {imageCount > 0 && <span className="rounded-xl bg-cyan-500/10 px-3 py-1.5 text-cyan-200">🖼️ {imageCount} صورة</span>}
                            {resource.content && <span className="rounded-xl bg-blue-500/10 px-3 py-1.5 text-blue-300">📝 محتوى</span>}
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => startEditResource(resource)} disabled={busy} className={buttonClass}>✏️ تعديل</button>
                            <button type="button" onClick={() => void toggleResource(resource)} disabled={busy} className={buttonClass}>{resource.is_published ? "🙈 إخفاء" : "🚀 نشر"}</button>
                            <button type="button" onClick={() => void deleteResource(resource)} disabled={busy} className="col-span-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50">🗑️ حذف المورد</button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
