"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getSupabase } from "@/lib/supabase";
import { getProfile } from "@/services/auth";

type LibrarySubject = {
  id: string;
  name: string;
  stream: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

type LibraryResource = {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  resource_type: string;
  file_url: string | null;
  external_url: string | null;
  is_active: boolean;
  created_at: string;
  subject?: {
    name: string;
    stream: string;
  } | null;
};

const RESOURCE_TYPES = [
  {
    value: "pdf",
    label: "📄 PDF",
  },
  {
    value: "link",
    label: "🔗 رابط",
  },
  {
    value: "video",
    label: "🎥 فيديو",
  },
  {
    value: "document",
    label: "📝 وثيقة",
  },
  {
    value: "other",
    label: "📦 أخرى",
  },
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

  const [selectedStream, setSelectedStream] =
    useState("all");

  const [selectedSubjectId, setSelectedSubjectId] =
    useState("");

  const [showSubjectForm, setShowSubjectForm] =
    useState(false);

  const [showResourceForm, setShowResourceForm] =
    useState(false);

  const resourceFormRef =
    useRef<HTMLElement | null>(null);

  const [editingSubject, setEditingSubject] =
    useState<LibrarySubject | null>(null);

  const [editingResource, setEditingResource] =
    useState<LibraryResource | null>(null);

  const [selectedPdfFile, setSelectedPdfFile] =
    useState<File | null>(null);

  const [subjectName, setSubjectName] = useState("");
  const [subjectStream, setSubjectStream] =
    useState("");
  const [subjectDescription, setSubjectDescription] =
    useState("");

  const [resourceTitle, setResourceTitle] =
    useState("");

  const [resourceDescription, setResourceDescription] =
    useState("");

  const [resourceType, setResourceType] =
    useState("pdf");

  const [resourceSubjectId, setResourceSubjectId] =
    useState("");

  const [resourceFileUrl, setResourceFileUrl] =
    useState("");

  const [resourceExternalUrl, setResourceExternalUrl] =
    useState("");

  /*
   * getSupabase() في مشروعك معرفة أنها ممكن ترجع null.
   * هنا نضمن لـ TypeScript أن العميل موجود،
   * لأن الصفحة أصلاً تعتمد عليه في جميع عمليات المكتبة.
   */
  const supabase = getSupabase()!;

  async function loadLibrary() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "يجب تسجيل الدخول أولاً.",
        );
      }

      const profile = await getProfile(
        supabase,
        user.id,
      );

      if (!profile?.is_admin) {
        throw new Error(
          "ليس لديك صلاحية الدخول إلى هذه الصفحة.",
        );
      }

      const [
        { data: subjectsData, error: subjectsError },
        { data: resourcesData, error: resourcesError },
      ] = await Promise.all([
        supabase
          .from("library_subjects")
          .select("*")
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from("library_resources")
          .select(
            `
              *,
              subject:library_subjects(
                name,
                stream
              )
            `,
          )
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (subjectsError) {
        throw subjectsError;
      }

      if (resourcesError) {
        throw resourcesError;
      }

      setSubjects(
        (subjectsData ?? []) as LibrarySubject[],
      );

      setResources(
        (resourcesData ?? []) as LibraryResource[],
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل المكتبة.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLibrary();
  }, []);

  /*
   * عندما يفتح فورم إضافة/تعديل المورد،
   * ننزل تلقائياً للفورم.
   */
  useEffect(() => {
    if (!showResourceForm) return;

    const timer = window.setTimeout(() => {
      resourceFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);

    return () => {
      window.clearTimeout(timer);
    };
  }, [showResourceForm]);

  const streams = useMemo(() => {
    const uniqueStreams = Array.from(
      new Set(
        subjects
          .map((subject) => subject.stream)
          .filter(Boolean),
      ),
    );

    return uniqueStreams;
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    if (selectedStream === "all") {
      return subjects;
    }

    return subjects.filter(
      (subject) =>
        subject.stream === selectedStream,
    );
  }, [subjects, selectedStream]);

  const resourcesBySubject = useMemo(() => {
    const grouped: Record<
      string,
      LibraryResource[]
    > = {};

    for (const resource of resources) {
      if (!grouped[resource.subject_id]) {
        grouped[resource.subject_id] = [];
      }

      grouped[resource.subject_id].push(resource);
    }

    return grouped;
  }, [resources]);

  function resetSubjectForm() {
    setSubjectName("");
    setSubjectStream("");
    setSubjectDescription("");
    setEditingSubject(null);
  }

  function resetResourceForm() {
    setResourceTitle("");
    setResourceDescription("");
    setResourceType("pdf");
    setResourceSubjectId("");
    setResourceFileUrl("");
    setResourceExternalUrl("");
    setSelectedPdfFile(null);
    setEditingResource(null);
  }

  function openNewSubject() {
    setError("");
    setSuccess("");

    resetSubjectForm();

    setShowSubjectForm(true);
    setShowResourceForm(false);
  }

  function openEditSubject(
    subject: LibrarySubject,
  ) {
    setError("");
    setSuccess("");

    setEditingSubject(subject);

    setSubjectName(subject.name);
    setSubjectStream(subject.stream);
    setSubjectDescription(
      subject.description ?? "",
    );

    setShowSubjectForm(true);
    setShowResourceForm(false);
  }

  function openNewResource(subjectId?: string) {
    setError("");
    setSuccess("");

    resetResourceForm();

    if (subjectId) {
      setResourceSubjectId(subjectId);
    }

    setShowResourceForm(true);
    setShowSubjectForm(false);
  }

  function openEditResource(
    resource: LibraryResource,
  ) {
    setError("");
    setSuccess("");

    setEditingResource(resource);

    setResourceTitle(resource.title);

    setResourceDescription(
      resource.description ?? "",
    );

    setResourceType(resource.resource_type);

    setResourceSubjectId(resource.subject_id);

    setResourceFileUrl(
      resource.file_url ?? "",
    );

    setResourceExternalUrl(
      resource.external_url ?? "",
    );

    setSelectedPdfFile(null);

    setShowResourceForm(true);
    setShowSubjectForm(false);
  }

  function closeSubjectForm() {
    setShowSubjectForm(false);
    resetSubjectForm();
  }

  function closeResourceForm() {
    setShowResourceForm(false);
    resetResourceForm();
  }

  async function uploadPdf(
    file: File,
  ): Promise<string> {
    if (file.size > MAX_PDF_SIZE) {
      throw new Error(
        "حجم الملف كبير جداً. الحد الأقصى هو 20MB.",
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      throw new Error(
        "يسمح فقط برفع ملفات PDF.",
      );
    }

    setUploadingPdf(true);

    try {
      const safeName = file.name
        .replace(
          /[^a-zA-Z0-9._-]/g,
          "_",
        )
        .replace(/_+/g, "_");

      const path = `library/${Date.now()}-${safeName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("library")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: "application/pdf",
          });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("library")
        .getPublicUrl(path);

      return publicUrlData.publicUrl;
    } finally {
      setUploadingPdf(false);
    }
  }

  async function deleteStorageFile(
    fileUrl: string | null,
  ) {
    if (!fileUrl) return;

    try {
      const marker =
        "/storage/v1/object/public/library/";

      const index =
        fileUrl.indexOf(marker);

      if (index === -1) return;

      const path = decodeURIComponent(
        fileUrl.slice(
          index + marker.length,
        ),
      );

      if (!path) return;

      await supabase.storage
        .from("library")
        .remove([path]);
    } catch (err) {
      console.error(
        "Storage delete error:",
        err,
      );
    }
  }

  async function saveSubject(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!subjectName.trim()) {
      setError("أدخل اسم المادة.");
      return;
    }

    if (!subjectStream.trim()) {
      setError("اختر الشعبة.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: subjectName.trim(),
        stream: subjectStream.trim(),
        description:
          subjectDescription.trim() ||
          null,
      };

      if (editingSubject) {
        const { error: updateError } =
          await supabase
            .from("library_subjects")
            .update(payload)
            .eq(
              "id",
              editingSubject.id,
            );

        if (updateError) {
          throw updateError;
        }

        setSuccess(
          "تم تعديل المادة بنجاح ✅",
        );
      } else {
        const { error: insertError } =
          await supabase
            .from("library_subjects")
            .insert(payload);

        if (insertError) {
          throw insertError;
        }

        setSuccess(
          "تمت إضافة المادة بنجاح ✅",
        );
      }

      closeSubjectForm();

      await loadLibrary();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء حفظ المادة.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveResource(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!resourceTitle.trim()) {
      setError("أدخل عنوان المورد.");
      return;
    }

    if (!resourceSubjectId) {
      setError("اختر المادة.");
      return;
    }

    if (
      resourceType === "pdf" &&
      !editingResource &&
      !selectedPdfFile
    ) {
      setError(
        "اختر ملف PDF لإضافته.",
      );
      return;
    }

    if (
      resourceType !== "pdf" &&
      !resourceExternalUrl.trim()
    ) {
      setError("أدخل رابط المورد.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      let finalFileUrl =
        editingResource?.file_url ?? null;

      if (selectedPdfFile) {
        const newFileUrl =
          await uploadPdf(
            selectedPdfFile,
          );

        if (
          editingResource?.file_url &&
          editingResource.file_url !==
            newFileUrl
        ) {
          await deleteStorageFile(
            editingResource.file_url,
          );
        }

        finalFileUrl = newFileUrl;
      }

      const payload = {
        subject_id: resourceSubjectId,
        title: resourceTitle.trim(),
        description:
          resourceDescription.trim() ||
          null,
        resource_type: resourceType,
        file_url:
          resourceType === "pdf"
            ? finalFileUrl
            : null,
        external_url:
          resourceType === "pdf"
            ? null
            : resourceExternalUrl.trim() ||
              null,
      };

      if (editingResource) {
        const { error: updateError } =
          await supabase
            .from("library_resources")
            .update(payload)
            .eq(
              "id",
              editingResource.id,
            );

        if (updateError) {
          throw updateError;
        }

        setSuccess(
          "تم تعديل المورد بنجاح ✅",
        );
      } else {
        const { error: insertError } =
          await supabase
            .from("library_resources")
            .insert(payload);

        if (insertError) {
          throw insertError;
        }

        setSuccess(
          "تمت إضافة المورد بنجاح ✅",
        );
      }

      closeResourceForm();

      await loadLibrary();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء حفظ المورد.",
      );
    } finally {
      setSaving(false);
      setUploadingPdf(false);
    }
  }

  async function toggleSubject(
    subject: LibrarySubject,
  ) {
    try {
      setError("");
      setSuccess("");

      const { error: updateError } =
        await supabase
          .from("library_subjects")
          .update({
            is_active:
              !subject.is_active,
          })
          .eq("id", subject.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess(
        subject.is_active
          ? "تم إخفاء المادة بنجاح."
          : "تم تفعيل المادة بنجاح.",
      );

      await loadLibrary();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحديث المادة.",
      );
    }
  }

  async function deleteSubject(
    subject: LibrarySubject,
  ) {
    const confirmed =
      window.confirm(
        `هل أنت متأكد من حذف مادة "${subject.name}"؟ سيتم حذف الموارد المرتبطة بها أيضاً إذا كانت قاعدة البيانات مضبوطة على CASCADE.`,
      );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const subjectResources =
        resourcesBySubject[
          subject.id
        ] ?? [];

      for (const resource of subjectResources) {
        if (resource.file_url) {
          await deleteStorageFile(
            resource.file_url,
          );
        }
      }

      const { error: deleteError } =
        await supabase
          .from("library_subjects")
          .delete()
          .eq("id", subject.id);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess(
        "تم حذف المادة بنجاح.",
      );

      await loadLibrary();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء حذف المادة.",
      );
    }
  }

  async function toggleResource(
    resource: LibraryResource,
  ) {
    try {
      setError("");
      setSuccess("");

      const { error: updateError } =
        await supabase
          .from("library_resources")
          .update({
            is_active:
              !resource.is_active,
          })
          .eq("id", resource.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess(
        resource.is_active
          ? "تم إخفاء المورد بنجاح."
          : "تم تفعيل المورد بنجاح.",
      );

      await loadLibrary();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحديث المورد.",
      );
    }
  }

  async function deleteResource(
    resource: LibraryResource,
  ) {
    const confirmed =
      window.confirm(
        `هل أنت متأكد من حذف المورد "${resource.title}"؟`,
      );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      if (resource.file_url) {
        await deleteStorageFile(
          resource.file_url,
        );
      }

      const { error: deleteError } =
        await supabase
          .from("library_resources")
          .delete()
          .eq("id", resource.id);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess(
        "تم حذف المورد بنجاح.",
      );

      await loadLibrary();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء حذف المورد.",
      );
    }
  }

  const visibleResources =
    selectedSubjectId
      ? resources.filter(
          (resource) =>
            resource.subject_id ===
            selectedSubjectId,
        )
      : resources;

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-950 px-4 py-10 text-white"
      >
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <div className="text-4xl">
              🌊
            </div>

            <p className="mt-4 text-slate-300">
              جاري تحميل مكتبة الدروس...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
        <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-950/40 via-slate-900 to-emerald-950/30 p-6 shadow-2xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 text-sm font-medium text-cyan-300">
                MARIS ACADEMY ²⁰²⁷
              </div>

              <h1 className="text-3xl font-black sm:text-4xl">
                📚 مكتبة الدروس
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                إدارة المواد والملفات والمصادر التعليمية
                التي تظهر للطلبة داخل مكتبة MARIS.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openNewSubject}
                className="rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-400"
              >
                ➕ إضافة مادة
              </button>

              <button
                type="button"
                onClick={() =>
                  openNewResource()
                }
                disabled={
                  subjects.length === 0
                }
                className="rounded-2xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                📚 إضافة مورد
              </button>
            </div>
          </div>
        </section>

        {/* MESSAGES */}
        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-950/30 px-5 py-4 text-sm text-red-200">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-950/30 px-5 py-4 text-sm text-emerald-200">
            {success}
          </div>
        )}

        {/* STATS */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-400">
              المواد
            </div>

            <div className="mt-2 text-3xl font-black">
              {subjects.length}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-400">
              المواد النشطة
            </div>

            <div className="mt-2 text-3xl font-black text-emerald-400">
              {
                subjects.filter(
                  (subject) =>
                    subject.is_active,
                ).length
              }
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-400">
              الموارد
            </div>

            <div className="mt-2 text-3xl font-black">
              {resources.length}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-400">
              الموارد النشطة
            </div>

            <div className="mt-2 text-3xl font-black text-cyan-400">
              {
                resources.filter(
                  (resource) =>
                    resource.is_active,
                ).length
              }
            </div>
          </div>
        </section>

        {/* FILTER */}
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-bold text-slate-300">
                فلترة حسب الشعبة
              </label>

              <select
                value={selectedStream}
                onChange={(event) => {
                  setSelectedStream(
                    event.target.value,
                  );

                  setSelectedSubjectId("");
                }}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
              >
                <option value="all">
                  🌊 جميع الشعب
                </option>

                {streams.map((stream) => (
                  <option
                    key={stream}
                    value={stream}
                  >
                    {stream}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="mb-2 block text-sm font-bold text-slate-300">
                فلترة حسب المادة
              </label>

              <select
                value={selectedSubjectId}
                onChange={(event) =>
                  setSelectedSubjectId(
                    event.target.value,
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
              >
                <option value="">
                  📚 جميع المواد
                </option>

                {filteredSubjects.map(
                  (subject) => (
                    <option
                      key={subject.id}
                      value={subject.id}
                    >
                      {subject.name} —{" "}
                      {subject.stream}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
        </section>

        {/* SUBJECT FORM */}
        {showSubjectForm && (
          <section className="rounded-3xl border border-cyan-400/20 bg-cyan-950/20 p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">
                  {editingSubject
                    ? "✏️ تعديل المادة"
                    : "➕ إضافة مادة جديدة"}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  أنشئ المادة التي ستظهر داخل مكتبة
                  الدروس.
                </p>
              </div>

              <button
                type="button"
                onClick={closeSubjectForm}
                className="rounded-xl border border-white/10 px-4 py-2 text-slate-300 transition hover:bg-white/5"
              >
                ✕ إغلاق
              </button>
            </div>

            <form
              onSubmit={saveSubject}
              className="space-y-5"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold">
                    اسم المادة
                  </label>

                  <input
                    value={subjectName}
                    onChange={(event) =>
                      setSubjectName(
                        event.target.value,
                      )
                    }
                    placeholder="مثال: الرياضيات"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    الشعبة
                  </label>

                  <input
                    value={subjectStream}
                    onChange={(event) =>
                      setSubjectStream(
                        event.target.value,
                      )
                    }
                    placeholder="مثال: تقني رياضي"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  وصف المادة
                </label>

                <textarea
                  value={subjectDescription}
                  onChange={(event) =>
                    setSubjectDescription(
                      event.target.value,
                    )
                  }
                  rows={4}
                  placeholder="وصف مختصر للمادة..."
                  className="w-full resize-none rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-cyan-500 px-6 py-3 font-black text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
                >
                  {saving
                    ? "⏳ جاري الحفظ..."
                    : editingSubject
                      ? "💾 حفظ التعديلات"
                      : "➕ إضافة المادة"}
                </button>

                <button
                  type="button"
                  onClick={closeSubjectForm}
                  className="rounded-2xl border border-white/10 px-6 py-3 font-bold text-slate-300 transition hover:bg-white/5"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </section>
        )}

        {/* SUBJECTS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black">
                📚 المواد
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                إدارة المواد والمصادر التابعة لها.
              </p>
            </div>
          </div>

          {filteredSubjects.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
              <div className="text-5xl">
                📚
              </div>

              <p className="mt-4 font-bold">
                لا توجد مواد حالياً
              </p>

              <p className="mt-2 text-sm text-slate-500">
                أضف أول مادة من زر "إضافة مادة".
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredSubjects.map(
                (subject) => {
                  const subjectResources =
                    resourcesBySubject[
                      subject.id
                    ] ?? [];

                  return (
                    <article
                      key={subject.id}
                      className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:border-cyan-400/30"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs font-bold text-cyan-300">
                            {subject.stream}
                          </div>

                          <h3 className="mt-1 text-xl font-black">
                            {subject.name}
                          </h3>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            subject.is_active
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-red-500/15 text-red-300"
                          }`}
                        >
                          {subject.is_active
                            ? "نشطة"
                            : "مخفية"}
                        </span>
                      </div>

                      {subject.description && (
                        <p className="mt-4 text-sm leading-6 text-slate-400">
                          {subject.description}
                        </p>
                      )}

                      <div className="mt-5 rounded-2xl bg-slate-950/60 p-4">
                        <div className="text-xs text-slate-500">
                          الموارد
                        </div>

                        <div className="mt-1 text-2xl font-black">
                          {
                            subjectResources.length
                          }
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openNewResource(
                              subject.id,
                            )
                          }
                          className="rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/25"
                        >
                          ➕ مورد
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEditSubject(
                              subject,
                            )
                          }
                          className="rounded-xl bg-cyan-500/15 px-3 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500/25"
                        >
                          ✏️ تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleSubject(
                              subject,
                            )
                          }
                          className="rounded-xl bg-yellow-500/15 px-3 py-2 text-sm font-bold text-yellow-300 transition hover:bg-yellow-500/25"
                        >
                          {subject.is_active
                            ? "🙈 إخفاء"
                            : "👁️ تفعيل"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteSubject(
                              subject,
                            )
                          }
                          className="rounded-xl bg-red-500/15 px-3 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/25"
                        >
                          🗑️ حذف
                        </button>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>

        {/* RESOURCE FORM */}
        {showResourceForm && (
          <section
            ref={resourceFormRef}
            className="scroll-mt-24 rounded-3xl border border-emerald-400/20 bg-emerald-950/20 p-6"
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">
                  {editingResource
                    ? "✏️ تعديل المورد"
                    : "📚 إضافة مورد جديد"}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  أضف PDF أو رابط أو مصدر تعليمي
                  للطلبة.
                </p>
              </div>

              <button
                type="button"
                onClick={closeResourceForm}
                className="rounded-xl border border-white/10 px-4 py-2 text-slate-300 transition hover:bg-white/5"
              >
                ✕ إغلاق
              </button>
            </div>

            <form
              onSubmit={saveResource}
              className="space-y-5"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold">
                    عنوان المورد
                  </label>

                  <input
                    value={resourceTitle}
                    onChange={(event) =>
                      setResourceTitle(
                        event.target.value,
                      )
                    }
                    placeholder="مثال: ملخص الوحدة الأولى"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    المادة
                  </label>

                  <select
                    value={resourceSubjectId}
                    onChange={(event) =>
                      setResourceSubjectId(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
                  >
                    <option value="">
                      اختر المادة
                    </option>

                    {subjects.map(
                      (subject) => (
                        <option
                          key={subject.id}
                          value={subject.id}
                        >
                          {subject.name} —{" "}
                          {subject.stream}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold">
                    نوع المورد
                  </label>

                  <select
                    value={resourceType}
                    onChange={(event) => {
                      setResourceType(
                        event.target.value,
                      );

                      if (
                        event.target.value ===
                        "pdf"
                      ) {
                        setResourceExternalUrl(
                          "",
                        );
                      } else {
                        setSelectedPdfFile(
                          null,
                        );

                        setResourceFileUrl(
                          "",
                        );
                      }
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
                  >
                    {RESOURCE_TYPES.map(
                      (type) => (
                        <option
                          key={type.value}
                          value={type.value}
                        >
                          {type.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    وصف المورد
                  </label>

                  <input
                    value={resourceDescription}
                    onChange={(event) =>
                      setResourceDescription(
                        event.target.value,
                      )
                    }
                    placeholder="وصف مختصر..."
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"
                  />
                </div>
              </div>

              {resourceType === "pdf" ? (
                <div className="rounded-2xl border border-dashed border-emerald-400/30 bg-slate-950/50 p-5">
                  <label className="mb-3 block text-sm font-bold">
                    📄 ملف PDF
                  </label>

                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) => {
                      const file =
                        event.target.files?.[0] ??
                        null;

                      if (!file) {
                        setSelectedPdfFile(
                          null,
                        );
                        return;
                      }

                      if (
                        file.size >
                        MAX_PDF_SIZE
                      ) {
                        setError(
                          "حجم الملف كبير جداً. الحد الأقصى هو 20MB.",
                        );

                        event.target.value =
                          "";

                        setSelectedPdfFile(
                          null,
                        );

                        return;
                      }

                      if (
                        file.type !==
                          "application/pdf" &&
                        !file.name
                          .toLowerCase()
                          .endsWith(".pdf")
                      ) {
                        setError(
                          "الملف يجب أن يكون PDF.",
                        );

                        event.target.value =
                          "";

                        setSelectedPdfFile(
                          null,
                        );

                        return;
                      }

                      setError("");

                      setSelectedPdfFile(
                        file,
                      );
                    }}
                    className="block w-full cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:font-bold file:text-slate-950 hover:file:bg-emerald-400"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    الحد الأقصى: 20MB
                  </p>

                  {selectedPdfFile && (
                    <div className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                      📄{" "}
                      {selectedPdfFile.name}
                    </div>
                  )}

                  {editingResource?.file_url &&
                    !selectedPdfFile && (
                      <div className="mt-4 rounded-xl bg-cyan-500/10 px-4 py-3 text-sm text-cyan-300">
                        يوجد ملف PDF حالي. اختر
                        ملفاً جديداً لاستبداله.
                      </div>
                    )}
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-sm font-bold">
                    🔗 رابط المورد
                  </label>

                  <input
                    type="url"
                    value={resourceExternalUrl}
                    onChange={(event) =>
                      setResourceExternalUrl(
                        event.target.value,
                      )
                    }
                    placeholder="https://..."
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={
                    saving ||
                    uploadingPdf
                  }
                  className="rounded-2xl bg-emerald-500 px-6 py-3 font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {uploadingPdf
                    ? "📤 جاري رفع الملف..."
                    : saving
                      ? "⏳ جاري الحفظ..."
                      : editingResource
                        ? "💾 حفظ التعديلات"
                        : "📚 إضافة المورد"}
                </button>

                <button
                  type="button"
                  onClick={
                    closeResourceForm
                  }
                  className="rounded-2xl border border-white/10 px-6 py-3 font-bold text-slate-300 transition hover:bg-white/5"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </section>
        )}

        {/* RESOURCES */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-black">
              📦 الموارد
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              جميع الموارد الموجودة داخل المكتبة.
            </p>
          </div>

          {visibleResources.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
              <div className="text-5xl">
                📦
              </div>

              <p className="mt-4 font-bold">
                لا توجد موارد حالياً
              </p>

              <p className="mt-2 text-sm text-slate-500">
                أضف أول مورد من الأعلى.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleResources.map(
                (resource) => (
                  <article
                    key={resource.id}
                    className="rounded-3xl border border-white/10 bg-white/5 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-emerald-300">
                          {resource.subject
                            ?.name ??
                            "بدون مادة"}
                        </div>

                        <h3 className="mt-1 text-lg font-black">
                          {resource.title}
                        </h3>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          resource.is_active
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-red-500/15 text-red-300"
                        }`}
                      >
                        {resource.is_active
                          ? "نشط"
                          : "مخفي"}
                      </span>
                    </div>

                    {resource.description && (
                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        {resource.description}
                      </p>
                    )}

                    <div className="mt-4 rounded-2xl bg-slate-950/60 p-4 text-sm">
                      <div className="text-slate-500">
                        النوع
                      </div>

                      <div className="mt-1 font-bold">
                        {
                          RESOURCE_TYPES.find(
                            (type) =>
                              type.value ===
                              resource.resource_type,
                          )?.label ??
                          resource.resource_type
                        }
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {resource.file_url && (
                        <a
                          href={
                            resource.file_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500/25"
                        >
                          📄 فتح PDF
                        </a>
                      )}

                      {resource.external_url && (
                        <a
                          href={
                            resource.external_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500/25"
                        >
                          🔗 فتح الرابط
                        </a>
                      )}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEditResource(
                            resource,
                          )
                        }
                        className="rounded-xl bg-cyan-500/15 px-3 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500/25"
                      >
                        ✏️ تعديل
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toggleResource(
                            resource,
                          )
                        }
                        className="rounded-xl bg-yellow-500/15 px-3 py-2 text-sm font-bold text-yellow-300 transition hover:bg-yellow-500/25"
                      >
                        {resource.is_active
                          ? "🙈 إخفاء"
                          : "👁️ تفعيل"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteResource(
                            resource,
                          )
                        }
                        className="col-span-2 rounded-xl bg-red-500/15 px-3 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/25"
                      >
                        🗑️ حذف المورد
                      </button>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
