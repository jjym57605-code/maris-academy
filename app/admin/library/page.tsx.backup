"use client";

import { useEffect, useState } from "react";
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
};

const RESOURCE_TYPES = [
  { value: "summary", label: "📘 ملخص" },
  { value: "exercise", label: "📝 تمرين" },
  { value: "bac_topic", label: "🎓 موضوع بكالوريا" },
  { value: "solution", label: "✅ حل" },
];

const MAX_PDF_SIZE = 20 * 1024 * 1024;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 20;
const STORAGE_BUCKET = "library-pdfs";

export default function AdminLibraryPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [subjects, setSubjects] = useState<LibrarySubject[]>([]);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

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

      const { data, error: subjectsError } = await supabase
        .from("library_subjects")
        .select(
          "id, stream, name, icon, description, order_index, is_active"
        )
        .order("stream", { ascending: true })
        .order("order_index", { ascending: true })
        .order("name", { ascending: true });

      if (subjectsError) throw subjectsError;

      setSubjects((data ?? []) as LibrarySubject[]);
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء تحميل المواد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetSubjectForm() {
    setSubjectForm({
      stream: "",
      name: "",
      icon: "📚",
      description: "",
      order_index: "0",
      is_active: true,
    });
  }

  function resetResourceForm() {
    setResourceForm({
      subject_id: subjects[0]?.id ?? "",
      title: "",
      description: "",
      resource_type: "summary",
      content: "",
      pdf_url: "",
      year: "",
      is_published: false,
    });

    setSelectedPdfFile(null);
    setSelectedImages([]);
  }

  function openNewSubject() {
    resetSubjectForm();
    setShowSubjectForm(true);
    setShowResourceForm(false);
    setError("");
    setSuccess("");
  }

  function openNewResource() {
    if (subjects.length === 0) {
      setError("أضف مادة أولاً حتى تتمكن من إضافة مورد.");
      setSuccess("");
      return;
    }

    resetResourceForm();
    setShowResourceForm(true);
    setShowSubjectForm(false);
    setError("");
    setSuccess("");
  }

  function handlePdfSelection(file: File | undefined) {
    setError("");
    setSuccess("");

    if (!file) {
      setSelectedPdfFile(null);
      return;
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
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

  function handleImagesSelection(fileList: FileList | null) {
    setError("");
    setSuccess("");

    if (!fileList || fileList.length === 0) {
      setSelectedImages([]);
      return;
    }

    const files = Array.from(fileList);

    if (files.length > MAX_IMAGES) {
      setSelectedImages([]);
      setError(`يمكنك اختيار ${MAX_IMAGES} صورة كحد أقصى لكل مورد.`);
      return;
    }

    const invalidFile = files.find(
      (file) => !file.type.startsWith("image/")
    );

    if (invalidFile) {
      setSelectedImages([]);
      setError(`الملف "${invalidFile.name}" ليس صورة صالحة.`);
      return;
    }

    const oversizedFile = files.find(
      (file) => file.size > MAX_IMAGE_SIZE
    );

    if (oversizedFile) {
      setSelectedImages([]);
      setError(
        `الصورة "${oversizedFile.name}" تتجاوز الحجم المسموح وهو 5MB.`
      );
      return;
    }

    setSelectedImages(files);
  }

  function getSafeFileName(name: string) {
    return (
      name
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "file"
    );
  }

  async function uploadPdf(
    file: File,
    subjectId: string,
    resourceId: string
  ) {
    if (!supabase) {
      throw new Error("خدمة قاعدة البيانات غير متاحة حالياً.");
    }

    const fileName = getSafeFileName(file.name);
    const storagePath =
      `${subjectId}/${resourceId}-${Date.now()}-${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    return `${STORAGE_BUCKET}/${storagePath}`;
  }

  async function uploadImages(
    files: File[],
    subjectId: string,
    resourceId: string
  ): Promise<string[]> {
    if (!supabase) {
      throw new Error("خدمة قاعدة البيانات غير متاحة حالياً.");
    }

    const uploadedPaths: string[] = [];

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const fileName = getSafeFileName(file.name);

      const storagePath =
        `${subjectId}/${resourceId}/images/${Date.now()}-${index}-${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      uploadedPaths.push(`${STORAGE_BUCKET}/${storagePath}`);
    }

    return uploadedPaths;
  }

  async function deleteUploadedFiles(paths: string[]) {
    if (!supabase || paths.length === 0) return;

    const cleanPaths = paths
      .filter((path) => path.startsWith(`${STORAGE_BUCKET}/`))
      .map((path) => path.slice(`${STORAGE_BUCKET}/`.length));

    if (cleanPaths.length === 0) return;

    const { error: removeError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(cleanPaths);

    if (removeError) {
      console.error("Storage cleanup error:", removeError);
    }
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

      const { error: insertError } = await supabase
        .from("library_subjects")
        .insert(payload);

      if (insertError) throw insertError;

      setSuccess("تمت إضافة المادة بنجاح.");
      setShowSubjectForm(false);
      resetSubjectForm();
      await loadLibrary();
    } catch (err) {
      console.error(err);
      setError("تعذر حفظ المادة. تحقق من البيانات والصلاحيات.");
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

    if (selectedPdfFile && resourceForm.pdf_url.trim()) {
      setError(
        "اختر رفع PDF من جهازك أو استعمال رابط خارجي، وليس الاثنين معاً."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    let createdResourceId: string | null = null;
    const uploadedPaths: string[] = [];

    try {
      const payload = {
        subject_id: resourceForm.subject_id,
        title: resourceForm.title.trim(),
        description: resourceForm.description.trim() || null,
        resource_type: resourceForm.resource_type,
        content: resourceForm.content.trim() || null,
        pdf_url: resourceForm.pdf_url.trim() || null,
        image_urls: [],
        year: resourceForm.year ? Number(resourceForm.year) : null,
        is_published: resourceForm.is_published,
        updated_at: new Date().toISOString(),
      };

      const { data: insertedResource, error: insertError } = await supabase
        .from("library_resources")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) throw insertError;

      if (!insertedResource?.id) {
        throw new Error("لم يتم الحصول على معرف المورد.");
      }

      createdResourceId = insertedResource.id;

      if (selectedPdfFile) {
        setUploadingPdf(true);

        const uploadedPdfPath = await uploadPdf(
          selectedPdfFile,
          resourceForm.subject_id,
          insertedResource.id
        );

        uploadedPaths.push(uploadedPdfPath);

        const { error: pdfUpdateError } = await supabase
          .from("library_resources")
          .update({
            pdf_url: uploadedPdfPath,
            updated_at: new Date().toISOString(),
          })
          .eq("id", insertedResource.id);

        if (pdfUpdateError) throw pdfUpdateError;
      }

      if (selectedImages.length > 0) {
        setUploadingImages(true);

        const imagePaths = await uploadImages(
          selectedImages,
          resourceForm.subject_id,
          insertedResource.id
        );

        uploadedPaths.push(...imagePaths);

        const { error: imagesUpdateError } = await supabase
          .from("library_resources")
          .update({
            image_urls: imagePaths,
            updated_at: new Date().toISOString(),
          })
          .eq("id", insertedResource.id);

        if (imagesUpdateError) throw imagesUpdateError;
      }

      const mediaDescription = [
        selectedPdfFile ? "PDF" : "",
        selectedImages.length > 0
          ? `${selectedImages.length} صورة`
          : "",
      ]
        .filter(Boolean)
        .join(" و");

      setSuccess(
        `تمت إضافة المورد${mediaDescription ? ` ورفع ${mediaDescription}` : ""}${
          resourceForm.is_published
            ? " ونشره بنجاح."
            : " بنجاح، وهو محفوظ كمسودة."
        }`
      );

      setShowResourceForm(false);
      resetResourceForm();
      await loadLibrary();
    } catch (err) {
      console.error("Save resource error:", err);

      await deleteUploadedFiles(uploadedPaths);

      if (createdResourceId) {
        const { error: cleanupError } = await supabase
          .from("library_resources")
          .delete()
          .eq("id", createdResourceId);

        if (cleanupError) {
          console.error("Resource cleanup error:", cleanupError);
        }
      }

      setError(
        err instanceof Error
          ? `تعذر حفظ المورد: ${err.message}`
          : "تعذر حفظ المورد."
      );
    } finally {
      setSaving(false);
      setUploadingPdf(false);
      setUploadingImages(false);
    }
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-950 px-4 py-10 text-white"
      >
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          جاري تحميل مكتبة الدروس...
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-950 px-4 py-8 text-white"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-950/60 via-slate-900 to-slate-950 p-6 shadow-2xl">
          <div className="mb-2 text-sm text-cyan-300">
            🌊 MARIS ACADEMY ²⁰²⁷
          </div>

          <h1 className="text-3xl font-black">📖 مكتبة الدروس</h1>

          <p className="mt-2 text-sm text-slate-300">
            إضافة المواد والموارد ونشرها للطلاب.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openNewSubject}
              className="rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-400"
            >
              ➕ إضافة مادة
            </button>

            <button
              type="button"
              onClick={openNewResource}
              disabled={subjects.length === 0}
              className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 font-bold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              📚 إضافة مورد
            </button>

            <Link
              href="/admin/library/manage"
              className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/15"
            >
              🗂️ إدارة المواد والموارد
            </Link>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-200"
          >
            ❌ {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200"
          >
            ✅ {success}
          </div>
        )}

        {showSubjectForm && (
          <section className="rounded-3xl border border-cyan-400/20 bg-cyan-950/20 p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">➕ إضافة مادة</h2>
                <p className="mt-1 text-sm text-slate-400">
                  أدخل معلومات المادة، وبعد الحفظ تلقاها في صفحة الإدارة.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSubjectForm(false);
                  resetSubjectForm();
                  setError("");
                }}
                className="rounded-xl border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/5"
              >
                إغلاق
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold">الشعبة</label>
                <input
                  value={subjectForm.stream}
                  onChange={(event) =>
                    setSubjectForm((current) => ({
                      ...current,
                      stream: event.target.value,
                    }))
                  }
                  placeholder="مثال: تقني رياضي"
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
                <label className="mb-2 block text-sm font-bold">الأيقونة</label>
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
                <label className="mb-2 block text-sm font-bold">الوصف</label>
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
              type="button"
              onClick={saveSubject}
              disabled={saving}
              className="mt-5 rounded-2xl bg-cyan-500 px-6 py-3 font-black text-slate-950 disabled:opacity-50"
            >
              {saving ? "جاري الحفظ..." : "💾 حفظ المادة"}
            </button>
          </section>
        )}

        {showResourceForm && (
          <section className="rounded-3xl border border-emerald-400/20 bg-emerald-950/20 p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">📚 إضافة مورد جديد</h2>
                <p className="mt-1 text-sm text-slate-400">
                  اكتب المحتوى أو ارفع PDF أو عدة صور للمورد نفسه.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowResourceForm(false);
                  resetResourceForm();
                  setError("");
                }}
                className="rounded-xl border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/5"
              >
                إغلاق
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold">المادة</label>
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
                <label className="mb-2 block text-sm font-bold">العنوان</label>
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
                <label className="mb-2 block text-sm font-bold">الوصف</label>
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
                  اختياري إذا كان المورد عبارة عن PDF أو صور.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold">
                  📸 صور المورد
                </label>
                <div className="rounded-2xl border border-dashed border-cyan-400/30 bg-cyan-400/5 p-4">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) =>
                      handleImagesSelection(event.target.files)
                    }
                    className="block w-full cursor-pointer text-sm text-slate-300"
                  />

                  <p className="mt-3 text-xs leading-6 text-slate-500">
                    اختر حتى 20 صورة من الهاتف أو الكمبيوتر. الحد الأقصى لكل
                    صورة 5MB. تقدر تختار الصور كامل دفعة واحدة.
                  </p>

                  {selectedImages.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <p className="font-bold text-cyan-200">
                        تم اختيار {selectedImages.length} صورة
                      </p>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {selectedImages.map((file, index) => (
                          <div
                            key={`${file.name}-${file.lastModified}-${index}`}
                            className="overflow-hidden rounded-xl border border-white/10 bg-slate-900"
                          >
                            <div className="aspect-square bg-white/5">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <div className="p-2">
                              <p
                                className="truncate text-xs text-slate-300"
                                title={file.name}
                              >
                                {file.name}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedImages([])}
                        className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300"
                      >
                        إزالة الصور المختارة
                      </button>
                    </div>
                  )}
                </div>
              </div>

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
                    className="block w-full cursor-pointer text-sm text-slate-300"
                  />

                  <p className="mt-3 text-xs leading-6 text-slate-500">
                    اختياري. الحد الأقصى 20MB. تقدر تستعمل PDF والصور مع بعض.
                  </p>

                  {selectedPdfFile && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-400/10 px-4 py-3">
                      <div>
                        <p className="font-bold text-emerald-200">
                          📄 {selectedPdfFile.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {(selectedPdfFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedPdfFile(null)}
                        className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300"
                      >
                        إزالة
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold">
                  🔗 رابط PDF خارجي — اختياري
                </label>
                <input
                  type="url"
                  value={resourceForm.pdf_url}
                  onChange={(event) =>
                    setResourceForm((current) => ({
                      ...current,
                      pdf_url: event.target.value,
                    }))
                  }
                  placeholder="https://..."
                  disabled={Boolean(selectedPdfFile)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400 disabled:opacity-40"
                />
                <p className="mt-2 text-xs text-slate-500">
                  إذا رفعت PDF من جهازك، لا تحتاج إلى إدخال رابط هنا.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">السنة</label>
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
              type="button"
              onClick={saveResource}
              disabled={saving || uploadingPdf || uploadingImages}
              className="mt-5 rounded-2xl bg-emerald-500 px-6 py-3 font-black text-slate-950 disabled:opacity-50"
            >
              {uploadingImages
                ? "⬆️ جاري رفع الصور..."
                : uploadingPdf
                  ? "⬆️ جاري رفع PDF..."
                  : saving
                    ? "جاري الحفظ..."
                    : "💾 حفظ المورد"}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}