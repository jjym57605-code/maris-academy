"use client";

import { useEffect, useMemo, useState } from "react";

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
  year: number | null;
  is_published: boolean;
  created_at: string | null;
  updated_at: string | null;
};

const RESOURCE_TYPES = [
  { value: "summary", label: "📘 ملخص" },
  { value: "exercise", label: "📝 تمرين" },
  { value: "bac_topic", label: "🎓 موضوع بكالوريا" },
  { value: "solution", label: "✅ حل" },
];

const MAX_PDF_SIZE = 20 * 1024 * 1024;

export default function AdminLibraryPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [subjects, setSubjects] = useState<LibrarySubject[]>([]);
  const [resources, setResources] = useState<LibraryResource[]>([]);

  const [selectedStream, setSelectedStream] = useState("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);

  const [editingSubject, setEditingSubject] =
    useState<LibrarySubject | null>(null);

  const [editingResource, setEditingResource] =
    useState<LibraryResource | null>(null);

  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);

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
    pdf_url: "",
    year: "",
    is_published: false,
  });

  const supabase = getSupabase();

  async function loadLibrary() {
    setLoading(true);
    setError("");

    if (!supabase) {
      setError("خدمة قاعدة البيانات غير متاحة حالياً.");
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("يجب تسجيل الدخول.");
        setLoading(false);
        return;
      }

      const profile = await getProfile(supabase, user.id);

      if (!profile?.is_admin) {
        setError("ليس لديك صلاحية الوصول إلى هذه الصفحة.");
        setLoading(false);
        return;
      }

      const [subjectsResult, resourcesResult] = await Promise.all([
        supabase
          .from("library_subjects")
          .select("*")
          .order("stream", { ascending: true })
          .order("order_index", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from("library_resources")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (subjectsResult.error) {
        throw subjectsResult.error;
      }

      if (resourcesResult.error) {
        throw resourcesResult.error;
      }

      setSubjects((subjectsResult.data ?? []) as LibrarySubject[]);
      setResources((resourcesResult.data ?? []) as LibraryResource[]);
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء تحميل مكتبة الدروس.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLibrary();
  }, []);

  const streams = useMemo(() => {
    return Array.from(new Set(subjects.map((subject) => subject.stream))).sort(
      (a, b) => a.localeCompare(b, "ar")
    );
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    if (selectedStream === "all") {
      return subjects;
    }

    return subjects.filter((subject) => subject.stream === selectedStream);
  }, [subjects, selectedStream]);

  const resourcesBySubject = useMemo(() => {
    const map = new Map<string, number>();

    for (const resource of resources) {
      map.set(
        resource.subject_id,
        (map.get(resource.subject_id) ?? 0) + 1
      );
    }

    return map;
  }, [resources]);

  function resetSubjectForm() {
    setSubjectForm({
      stream: selectedStream !== "all" ? selectedStream : "",
      name: "",
      icon: "📚",
      description: "",
      order_index: "0",
      is_active: true,
    });

    setEditingSubject(null);
  }

  function resetResourceForm() {
    setResourceForm({
      subject_id: selectedSubjectId || filteredSubjects[0]?.id || "",
      title: "",
      description: "",
      resource_type: "summary",
      content: "",
      pdf_url: "",
      year: "",
      is_published: false,
    });

    setSelectedPdfFile(null);
    setEditingResource(null);
  }

  function openNewSubject() {
    resetSubjectForm();
    setShowSubjectForm(true);
    setSuccess("");
    setError("");
  }

  function openEditSubject(subject: LibrarySubject) {
    setEditingSubject(subject);

    setSubjectForm({
      stream: subject.stream,
      name: subject.name,
      icon: subject.icon ?? "📚",
      description: subject.description ?? "",
      order_index: String(subject.order_index ?? 0),
      is_active: subject.is_active,
    });

    setShowSubjectForm(true);
    setSuccess("");
    setError("");
  }

  function openNewResource(subjectId?: string) {
    const targetSubject =
      subjectId ||
      selectedSubjectId ||
      filteredSubjects[0]?.id ||
      subjects[0]?.id ||
      "";

    setEditingResource(null);
    setSelectedPdfFile(null);

    setResourceForm({
      subject_id: targetSubject,
      title: "",
      description: "",
      resource_type: "summary",
      content: "",
      pdf_url: "",
      year: "",
      is_published: false,
    });

    setShowResourceForm(true);
    setSuccess("");
    setError("");
  }

  function openEditResource(resource: LibraryResource) {
    setEditingResource(resource);
    setSelectedPdfFile(null);

    setResourceForm({
      subject_id: resource.subject_id,
      title: resource.title,
      description: resource.description ?? "",
      resource_type: resource.resource_type,
      content: resource.content ?? "",
      pdf_url: resource.pdf_url ?? "",
      year: resource.year ? String(resource.year) : "",
      is_published: resource.is_published,
    });

    setShowResourceForm(true);
    setSuccess("");
    setError("");
  }

  function handlePdfSelection(file: File | undefined) {
    setError("");
    setSuccess("");

    if (!file) {
      setSelectedPdfFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setSelectedPdfFile(null);
      setError("الملف يجب أن يكون بصيغة PDF فقط.");
      return;
    }

    if (file.size > MAX_PDF_SIZE) {
      setSelectedPdfFile(null);
      setError("حجم ملف PDF يجب ألا يتجاوز 20MB.");
      return;
    }

    setSelectedPdfFile(file);
  }

  function isStoragePath(value: string | null) {
    return Boolean(
      value &&
        (value.startsWith("library-pdfs/") ||
          value.startsWith("library-pdfs\\"))
    );
  }

  async function deleteStorageFile(path: string | null) {
    if (!supabase || !path || !isStoragePath(path)) {
      return;
    }

    const cleanPath = path
      .replace(/^library-pdfs[\\/]/, "")
      .replace(/^\/+/, "");

    if (!cleanPath) {
      return;
    }

    const { error: removeError } = await supabase.storage
      .from("library-pdfs")
      .remove([cleanPath]);

    if (removeError) {
      console.error("PDF delete error:", removeError);
    }
  }

  async function uploadPdf(
    file: File,
    subjectId: string,
    resourceId: string
  ) {
    if (!supabase) {
      throw new Error("خدمة قاعدة البيانات غير متاحة حالياً.");
    }

    const safeFileName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const fileName = safeFileName || "document.pdf";

    const storagePath = `${subjectId}/${resourceId}-${Date.now()}-${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("library-pdfs")
      .upload(storagePath, file, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    return `library-pdfs/${storagePath}`;
  }

  async function saveSubject() {
    if (!supabase) {
      setError("خدمة قاعدة البيانات غير متاحة حالياً.");
      return;
    }

    if (!subjectForm.stream.trim() || !subjectForm.name.trim()) {
      setError("أدخل الشعبة واسم المادة.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        stream: subjectForm.stream.trim(),
        name: subjectForm.name.trim(),
        icon: subjectForm.icon.trim() || "📚",
        description: subjectForm.description.trim() || null,
        order_index: Number(subjectForm.order_index) || 0,
        is_active: subjectForm.is_active,
      };

      if (editingSubject) {
        const { error: updateError } = await supabase
          .from("library_subjects")
          .update(payload)
          .eq("id", editingSubject.id);

        if (updateError) {
          throw updateError;
        }

        setSuccess("تم تعديل المادة بنجاح.");
      } else {
        const { error: insertError } = await supabase
          .from("library_subjects")
          .insert(payload);

        if (insertError) {
          throw insertError;
        }

        setSuccess("تمت إضافة المادة بنجاح.");
      }

      setShowSubjectForm(false);
      resetSubjectForm();

      await loadLibrary();
    } catch (err) {
      console.error(err);
      setError("تعذر حفظ المادة.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSubject(subject: LibrarySubject) {
    if (!supabase) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error: updateError } = await supabase
        .from("library_subjects")
        .update({
          is_active: !subject.is_active,
        })
        .eq("id", subject.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess(
        subject.is_active ? "تم إخفاء المادة." : "تم تفعيل المادة."
      );

      await loadLibrary();
    } catch (err) {
      console.error(err);
      setError("تعذر تغيير حالة المادة.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSubject(subject: LibrarySubject) {
    if (!supabase) return;

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف المادة "${subject.name}"؟\nسيتم حذف جميع الموارد التابعة لها أيضاً.`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const subjectResources = resources.filter(
        (resource) => resource.subject_id === subject.id
      );

      for (const resource of subjectResources) {
        await deleteStorageFile(resource.pdf_url);
      }

      const { error: deleteError } = await supabase
        .from("library_subjects")
        .delete()
        .eq("id", subject.id);

      if (deleteError) {
        throw deleteError;
      }

      if (selectedSubjectId === subject.id) {
        setSelectedSubjectId("");
      }

      setSuccess("تم حذف المادة والموارد التابعة لها.");

      await loadLibrary();
    } catch (err) {
      console.error(err);
      setError("تعذر حذف المادة.");
    } finally {
      setSaving(false);
    }
  }

  async function saveResource() {
    if (!supabase) {
      setError("خدمة قاعدة البيانات غير متاحة حالياً.");
      return;
    }

    if (
      !resourceForm.subject_id ||
      !resourceForm.title.trim() ||
      !resourceForm.resource_type
    ) {
      setError("أدخل المادة والعنوان ونوع المورد.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    let createdResourceId: string | null = null;

    try {
      const basePayload = {
        subject_id: resourceForm.subject_id,
        title: resourceForm.title.trim(),
        description: resourceForm.description.trim() || null,
        resource_type: resourceForm.resource_type,
        content: resourceForm.content.trim() || null,
        pdf_url:
          editingResource?.pdf_url ??
          (resourceForm.pdf_url.trim() || null),
        year: resourceForm.year ? Number(resourceForm.year) : null,
        is_published: resourceForm.is_published,
        updated_at: new Date().toISOString(),
      };

      let resourceId: string;

      if (editingResource) {
        resourceId = editingResource.id;

        const { error: updateError } = await supabase
          .from("library_resources")
          .update(basePayload)
          .eq("id", editingResource.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { data: insertedResource, error: insertError } = await supabase
          .from("library_resources")
          .insert(basePayload)
          .select("id")
          .single();

        if (insertError) {
          throw insertError;
        }

        if (!insertedResource?.id) {
          throw new Error("لم يتم الحصول على معرف المورد.");
        }

        resourceId = insertedResource.id;
        createdResourceId = resourceId;
      }

      let newPdfPath: string | null = null;

      if (selectedPdfFile) {
        setUploadingPdf(true);

        newPdfPath = await uploadPdf(
          selectedPdfFile,
          resourceForm.subject_id,
          resourceId
        );

        const { error: pdfUpdateError } = await supabase
          .from("library_resources")
          .update({
            pdf_url: newPdfPath,
            updated_at: new Date().toISOString(),
          })
          .eq("id", resourceId);

        if (pdfUpdateError) {
          await deleteStorageFile(newPdfPath);
          throw pdfUpdateError;
        }

        if (
          editingResource?.pdf_url &&
          editingResource.pdf_url !== newPdfPath
        ) {
          await deleteStorageFile(editingResource.pdf_url);
        }
      }

      setSuccess(
        editingResource
          ? selectedPdfFile
            ? "تم تعديل المورد واستبدال ملف PDF بنجاح."
            : "تم تعديل المورد بنجاح."
          : selectedPdfFile
            ? "تمت إضافة المورد ورفع ملف PDF بنجاح."
            : "تمت إضافة المورد بنجاح."
      );

      setShowResourceForm(false);
      resetResourceForm();

      await loadLibrary();
    } catch (err) {
      console.error("Save resource error:", err);

      if (createdResourceId) {
        await supabase
          .from("library_resources")
          .delete()
          .eq("id", createdResourceId);
      }

      setError(
        err instanceof Error
          ? `تعذر حفظ المورد: ${err.message}`
          : "تعذر حفظ المورد."
      );
    } finally {
      setSaving(false);
      setUploadingPdf(false);
    }
  }

  async function toggleResource(resource: LibraryResource) {
    if (!supabase) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error: updateError } = await supabase
        .from("library_resources")
        .update({
          is_published: !resource.is_published,
          updated_at: new Date().toISOString(),
        })
        .eq("id", resource.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess(
        resource.is_published ? "تم إخفاء المورد." : "تم نشر المورد."
      );

      await loadLibrary();
    } catch (err) {
      console.error(err);
      setError("تعذر تغيير حالة المورد.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteResource(resource: LibraryResource) {
    if (!supabase) return;

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف المورد "${resource.title}"؟`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await deleteStorageFile(resource.pdf_url);

      const { error: deleteError } = await supabase
        .from("library_resources")
        .delete()
        .eq("id", resource.id);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess("تم حذف المورد وملف PDF المرتبط به.");

      await loadLibrary();
    } catch (err) {
      console.error(err);
      setError("تعذر حذف المورد.");
    } finally {
      setSaving(false);
    }
  }

  function getSubjectName(subjectId: string) {
    return subjects.find((subject) => subject.id === subjectId)?.name ?? "—";
  }

  function getResourceTypeLabel(type: string) {
    return (
      RESOURCE_TYPES.find((item) => item.value === type)?.label ?? type
    );
  }

  const visibleResources = useMemo(() => {
    if (selectedSubjectId) {
      return resources.filter(
        (resource) => resource.subject_id === selectedSubjectId
      );
    }

    if (selectedStream === "all") {
      return resources;
    }

    const subjectIds = new Set(
      filteredSubjects.map((subject) => subject.id)
    );

    return resources.filter((resource) =>
      subjectIds.has(resource.subject_id)
    );
  }, [
    resources,
    selectedSubjectId,
    selectedStream,
    filteredSubjects,
  ]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            جاري تحميل مكتبة الدروس...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-950 px-4 py-8 text-white"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-950/60 via-slate-900 to-slate-950 p-6 shadow-2xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 text-sm text-cyan-300">
                🌊 MARIS ACADEMY ²⁰²⁷
              </div>

              <h1 className="text-3xl font-black">
                📖 إدارة مكتبة الدروس
              </h1>

              <p className="mt-2 text-sm text-slate-300">
                إدارة المواد والملخصات والتمارين ومواضيع البكالوريا والحلول.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={openNewSubject}
                className="rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-400"
              >
                ➕ إضافة مادة
              </button>

              <button
                onClick={() => openNewResource()}
                disabled={subjects.length === 0}
                className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 font-bold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                📚 إضافة مورد
              </button>
            </div>
          </div>
        </section>

        {/* Messages */}
        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
            ✅ {success}
          </div>
        )}

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-400">المواد</div>

            <div className="mt-2 text-3xl font-black">
              {subjects.length}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-400">الموارد</div>

            <div className="mt-2 text-3xl font-black">
              {resources.length}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-400">منشورة</div>

            <div className="mt-2 text-3xl font-black text-emerald-300">
              {resources.filter((resource) => resource.is_published).length}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-400">الشعب الموجودة</div>

            <div className="mt-2 text-3xl font-black text-cyan-300">
              {streams.length}
            </div>
          </div>
        </section>

        {/* Stream filter */}
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <label className="mb-2 block text-sm font-bold text-slate-300">
            تصفية حسب الشعبة
          </label>

          <select
            value={selectedStream}
            onChange={(event) => {
              setSelectedStream(event.target.value);
              setSelectedSubjectId("");
            }}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400 lg:max-w-md"
          >
            <option value="all">كل الشعب</option>

            {streams.map((stream) => (
              <option key={stream} value={stream}>
                {stream}
              </option>
            ))}
          </select>
        </section>

        {/* Subject form */}
        {showSubjectForm && (
          <section className="rounded-3xl border border-cyan-400/20 bg-cyan-950/20 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">
                  {editingSubject ? "✏️ تعديل المادة" : "➕ إضافة مادة"}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  المادة مرتبطة بشعبة محددة.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowSubjectForm(false);
                  resetSubjectForm();
                }}
                className="rounded-xl border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/5"
              >
                إغلاق
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  الشعبة
                </label>

                <input
                  value={subjectForm.stream}
                  onChange={(event) =>
                    setSubjectForm((current) => ({
                      ...current,
                      stream: event.target.value,
                    }))
                  }
                  placeholder="مثال: رياضيات"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  اسم المادة
                </label>

                <input
                  value={subjectForm.name}
                  onChange={(event) =>
                    setSubjectForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="مثال: الرياضيات"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  الأيقونة
                </label>

                <input
                  value={subjectForm.icon}
                  onChange={(event) =>
                    setSubjectForm((current) => ({
                      ...current,
                      icon: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  ترتيب المادة
                </label>

                <input
                  type="number"
                  value={subjectForm.order_index}
                  onChange={(event) =>
                    setSubjectForm((current) => ({
                      ...current,
                      order_index: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold">
                  الوصف
                </label>

                <textarea
                  value={subjectForm.description}
                  onChange={(event) =>
                    setSubjectForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="وصف مختصر للمادة..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={subjectForm.is_active}
                  onChange={(event) =>
                    setSubjectForm((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                  className="h-5 w-5"
                />

                المادة مفعلة للطلاب
              </label>
            </div>

            <button
              onClick={saveSubject}
              disabled={saving}
              className="mt-5 rounded-2xl bg-cyan-500 px-6 py-3 font-black text-slate-950 disabled:opacity-50"
            >
              {saving ? "جاري الحفظ..." : "💾 حفظ المادة"}
            </button>
          </section>
        )}

        {/* Subjects */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">📚 المواد</h2>

            <span className="text-sm text-slate-400">
              {filteredSubjects.length} مادة
            </span>
          </div>

          {filteredSubjects.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-slate-400">
              لا توجد مواد مضافة حالياً.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredSubjects.map((subject) => (
                <article
                  key={subject.id}
                  className={`rounded-3xl border p-5 ${
                    selectedSubjectId === subject.id
                      ? "border-cyan-400/50 bg-cyan-950/20"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <button
                      onClick={() =>
                        setSelectedSubjectId(
                          selectedSubjectId === subject.id
                            ? ""
                            : subject.id
                        )
                      }
                      className="flex min-w-0 flex-1 items-start gap-3 text-right"
                    >
                      <span className="text-3xl">
                        {subject.icon || "📚"}
                      </span>

                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black">
                          {subject.name}
                        </h3>

                        <p className="mt-1 text-sm text-cyan-300">
                          {subject.stream}
                        </p>

                        {subject.description && (
                          <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                            {subject.description}
                          </p>
                        )}
                      </div>
                    </button>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        subject.is_active
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-red-500/10 text-red-300"
                      }`}
                    >
                      {subject.is_active ? "مفعلة" : "مخفية"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                    <span className="rounded-xl bg-white/5 px-3 py-2">
                      📄 {resourcesBySubject.get(subject.id) ?? 0} مورد
                    </span>

                    <span className="rounded-xl bg-white/5 px-3 py-2">
                      ترتيب: {subject.order_index ?? 0}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => openNewResource(subject.id)}
                      className="rounded-xl bg-cyan-500/10 px-3 py-2 text-sm font-bold text-cyan-300 hover:bg-cyan-500/20"
                    >
                      ➕ مورد
                    </button>

                    <button
                      onClick={() => openEditSubject(subject)}
                      className="rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
                    >
                      ✏️ تعديل
                    </button>

                    <button
                      onClick={() => toggleSubject(subject)}
                      className="rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
                    >
                      {subject.is_active ? "🙈 إخفاء" : "👁️ تفعيل"}
                    </button>

                    <button
                      onClick={() => deleteSubject(subject)}
                      className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-bold text-red-300 hover:bg-red-500/20"
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Resource form */}
        {showResourceForm && (
          <section className="rounded-3xl border border-emerald-400/20 bg-emerald-950/20 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">
                  {editingResource
                    ? "✏️ تعديل المورد"
                    : "➕ إضافة مورد جديد"}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  يمكنك كتابة المحتوى داخل المنصة أو رفع ملف PDF من الهاتف أو الكمبيوتر.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowResourceForm(false);
                  resetResourceForm();
                }}
                className="rounded-xl border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/5"
              >
                إغلاق
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  المادة
                </label>

                <select
                  value={resourceForm.subject_id}
                  onChange={(event) =>
                    setResourceForm((current) => ({
                      ...current,
                      subject_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                >
                  <option value="">اختر المادة</option>

                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.stream} — {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  نوع المورد
                </label>

                <select
                  value={resourceForm.resource_type}
                  onChange={(event) =>
                    setResourceForm((current) => ({
                      ...current,
                      resource_type: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                >
                  {RESOURCE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold">
                  العنوان
                </label>

                <input
                  value={resourceForm.title}
                  onChange={(event) =>
                    setResourceForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="مثال: ملخص الدوال العددية"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold">
                  الوصف
                </label>

                <textarea
                  value={resourceForm.description}
                  onChange={(event) =>
                    setResourceForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="وصف مختصر للمورد..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold">
                  المحتوى الداخلي
                </label>

                <textarea
                  value={resourceForm.content}
                  onChange={(event) =>
                    setResourceForm((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  rows={10}
                  placeholder="اكتب محتوى الملخص أو التمرين أو الحل هنا..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                />

                <p className="mt-2 text-xs text-slate-500">
                  اختياري. يمكن تركه فارغاً إذا كان المورد PDF فقط.
                </p>
              </div>

              {/* PDF Upload */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold">
                  📄 ملف PDF
                </label>

                <div className="rounded-2xl border border-dashed border-emerald-400/30 bg-emerald-400/5 p-4">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) =>
                      handlePdfSelection(event.target.files?.[0])
                    }
                    className="block w-full cursor-pointer text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:font-bold file:text-slate-950 hover:file:bg-emerald-400"
                  />

                  <p className="mt-3 text-xs leading-6 text-slate-500">
                    يمكنك اختيار ملف PDF من الكمبيوتر أو الهاتف. الحد الأقصى للحجم 20MB.
                  </p>

                  {selectedPdfFile && (
                    <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-emerald-200">
                            📄 {selectedPdfFile.name}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            {(selectedPdfFile.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedPdfFile(null)}
                          className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20"
                        >
                          إزالة
                        </button>
                      </div>
                    </div>
                  )}

                  {!selectedPdfFile && editingResource?.pdf_url && (
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                      📎 يوجد PDF مرتبط بهذا المورد حالياً.

                      <span className="mr-1 text-slate-500">
                        اختر ملفاً جديداً إذا أردت استبداله.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* External PDF URL */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold">
                  🔗 رابط PDF خارجي — اختياري
                </label>

                <input
                  type="url"
                  value={
                    isStoragePath(resourceForm.pdf_url)
                      ? ""
                      : resourceForm.pdf_url
                  }
                  onChange={(event) =>
                    setResourceForm((current) => ({
                      ...current,
                      pdf_url: event.target.value,
                    }))
                  }
                  placeholder="https://..."
                  disabled={Boolean(selectedPdfFile)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                />

                <p className="mt-2 text-xs text-slate-500">
                  إذا رفعت PDF من جهازك، لا تحتاج إلى إدخال رابط هنا.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  السنة
                </label>

                <input
                  type="number"
                  value={resourceForm.year}
                  onChange={(event) =>
                    setResourceForm((current) => ({
                      ...current,
                      year: event.target.value,
                    }))
                  }
                  placeholder="مثال: 2026"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={resourceForm.is_published}
                  onChange={(event) =>
                    setResourceForm((current) => ({
                      ...current,
                      is_published: event.target.checked,
                    }))
                  }
                  className="h-5 w-5"
                />

                نشر المورد للطلاب مباشرة
              </label>
            </div>

            <button
              onClick={saveResource}
              disabled={saving || uploadingPdf}
              className="mt-5 rounded-2xl bg-emerald-500 px-6 py-3 font-black text-slate-950 disabled:opacity-50"
            >
              {uploadingPdf
                ? "⬆️ جاري رفع PDF..."
                : saving
                  ? "جاري الحفظ..."
                  : "💾 حفظ المورد"}
            </button>
          </section>
        )}

        {/* Resources */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">📄 الموارد</h2>

              <p className="mt-1 text-sm text-slate-400">
                {selectedSubjectId
                  ? `عرض موارد: ${getSubjectName(selectedSubjectId)}`
                  : "جميع الموارد حسب الفلتر الحالي"}
              </p>
            </div>

            {selectedSubjectId && (
              <button
                onClick={() => setSelectedSubjectId("")}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/5"
              >
                عرض الكل
              </button>
            )}
          </div>

          {visibleResources.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-slate-400">
              لا توجد موارد في هذا القسم حالياً.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleResources.map((resource) => (
                <article
                  key={resource.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-xl bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
                          {getResourceTypeLabel(resource.resource_type)}
                        </span>

                        <span
                          className={`rounded-xl px-3 py-1 text-xs font-bold ${
                            resource.is_published
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-slate-500/10 text-slate-400"
                          }`}
                        >
                          {resource.is_published ? "منشور" : "مسودة"}
                        </span>

                        {resource.year && (
                          <span className="rounded-xl bg-white/5 px-3 py-1 text-xs text-slate-400">
                            {resource.year}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-lg font-black">
                        {resource.title}
                      </h3>

                      <p className="mt-1 text-sm text-cyan-300">
                        {getSubjectName(resource.subject_id)}
                      </p>

                      {resource.description && (
                        <p className="mt-2 text-sm text-slate-400">
                          {resource.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        {resource.content && (
                          <span className="rounded-xl bg-white/5 px-3 py-2">
                            ✍️ محتوى داخلي
                          </span>
                        )}

                        {resource.pdf_url && (
                          <span className="rounded-xl bg-emerald-500/10 px-3 py-2 text-emerald-300">
                            📄 PDF مرتبط
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openEditResource(resource)}
                        className="rounded-xl bg-white/5 px-3 py-2 text-sm font-bold hover:bg-white/10"
                      >
                        ✏️ تعديل
                      </button>

                      <button
                        onClick={() => toggleResource(resource)}
                        className="rounded-xl bg-white/5 px-3 py-2 text-sm font-bold hover:bg-white/10"
                      >
                        {resource.is_published ? "🙈 إخفاء" : "🌐 نشر"}
                      </button>

                      {resource.pdf_url &&
                        !isStoragePath(resource.pdf_url) && (
                          <a
                            href={resource.pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl bg-cyan-500/10 px-3 py-2 text-sm font-bold text-cyan-300 hover:bg-cyan-500/20"
                          >
                            📄 فتح PDF
                          </a>
                        )}

                      <button
                        onClick={() => deleteResource(resource)}
                        className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-bold text-red-300 hover:bg-red-500/20"
                      >
                        🗑️ حذف
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
