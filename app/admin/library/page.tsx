
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

type LibraryUnit = {
  id: string;
  subject_id: string;
  name: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
};

type ResourceType = "summary" | "exercise" | "bac_topic" | "solution";

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: "summary", label: "📘 ملخص" },
  { value: "exercise", label: "📝 تمرين" },
  { value: "bac_topic", label: "🎓 موضوع بكالوريا" },
  { value: "solution", label: "✅ حل" },
];

const MAX_PDF_SIZE = 20 * 1024 * 1024;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_BATCH_FILES = 50;
const STORAGE_BUCKET = "library-pdfs";

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400";

function fileTitle(name: string) {
  return name.replace(/\.[^.]+$/, "").trim() || name;
}

function getSafeFileName(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "file"
  );
}

function isPdf(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function isImage(file: File) {
  return file.type.startsWith("image/");
}

export default function AdminLibraryPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLabel, setUploadingLabel] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [subjects, setSubjects] = useState<LibrarySubject[]>([]);
  const [units, setUnits] = useState<LibraryUnit[]>([]);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [unitMode, setUnitMode] = useState<"existing" | "new" | "none">(
    "existing"
  );
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitDescription, setNewUnitDescription] = useState("");

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
    unit_id: "",
    description: "",
    resource_type: "summary" as ResourceType,
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
        return;
      }

      const profile = await getProfile(supabase, user.id);

      if (!profile?.is_admin) {
        setError("ليس لديك صلاحية الوصول إلى هذه الصفحة.");
        return;
      }

      const [subjectsResult, unitsResult] = await Promise.all([
        supabase
          .from("library_subjects")
          .select(
            "id, stream, name, icon, description, order_index, is_active"
          )
          .order("stream", { ascending: true })
          .order("order_index", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("library_units")
          .select(
            "id, subject_id, name, description, order_index, is_active"
          )
          .order("order_index", { ascending: true })
          .order("name", { ascending: true }),
      ]);

      if (subjectsResult.error) throw subjectsResult.error;

      setSubjects((subjectsResult.data ?? []) as LibrarySubject[]);

      if (unitsResult.error) {
        console.error("Load library units error:", unitsResult.error);
        setUnits([]);
        setError(
          "تم تحميل المواد، لكن تعذر تحميل الوحدات. تحقق من صلاحيات جدول library_units."
        );
      } else {
        setUnits((unitsResult.data ?? []) as LibraryUnit[]);
      }
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء تحميل مواد المكتبة ووحداتها.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedSubject = subjects.find(
    (subject) => subject.id === resourceForm.subject_id
  );

  const subjectUnits = units.filter(
    (unit) =>
      unit.subject_id === resourceForm.subject_id && unit.is_active
  );

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
      unit_id: "",
      description: "",
      resource_type: "summary",
      content: "",
      pdf_url: "",
      year: "",
      is_published: false,
    });

    setSelectedFiles([]);
    setNewUnitName("");
    setNewUnitDescription("");
    setUnitMode("existing");
    setUploadingLabel("");
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

  function handleFilesSelection(fileList: FileList | null) {
    setError("");
    setSuccess("");

    if (!fileList || fileList.length === 0) {
      setSelectedFiles([]);
      return;
    }

    const files = Array.from(fileList);

    if (files.length > MAX_BATCH_FILES) {
      setSelectedFiles([]);
      setError(`يمكنك اختيار ${MAX_BATCH_FILES} ملفًا كحد أقصى في الدفعة الواحدة.`);
      return;
    }

    const invalidFile = files.find(
      (file) => !isPdf(file) && !isImage(file)
    );

    if (invalidFile) {
      setSelectedFiles([]);
      setError(
        `الملف "${invalidFile.name}" ليس PDF أو صورة مدعومة.`
      );
      return;
    }

    const oversizedPdf = files.find(
      (file) => isPdf(file) && file.size > MAX_PDF_SIZE
    );

    if (oversizedPdf) {
      setSelectedFiles([]);
      setError(`حجم PDF "${oversizedPdf.name}" يتجاوز 20MB.`);
      return;
    }

    const oversizedImage = files.find(
      (file) => isImage(file) && file.size > MAX_IMAGE_SIZE
    );

    if (oversizedImage) {
      setSelectedFiles([]);
      setError(`حجم الصورة "${oversizedImage.name}" يتجاوز 5MB.`);
      return;
    }

    setSelectedFiles(files);
  }

  async function uploadFile(
    file: File,
    subjectId: string,
    resourceId: string
  ): Promise<string> {
    if (!supabase) {
      throw new Error("خدمة قاعدة البيانات غير متاحة حالياً.");
    }

    const safeName = getSafeFileName(file.name);
    const storagePath =
      `${subjectId}/${resourceId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        contentType: isPdf(file)
          ? "application/pdf"
          : file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    return `${STORAGE_BUCKET}/${storagePath}`;
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

  async function createUnit(
    subjectId: string,
    name: string,
    description: string
  ): Promise<LibraryUnit> {
    if (!supabase) {
      throw new Error("خدمة قاعدة البيانات غير متاحة حالياً.");
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      throw new Error("اكتب اسم الوحدة الجديدة.");
    }

    const existingUnit = units.find(
      (unit) =>
        unit.subject_id === subjectId &&
        unit.name.trim().toLocaleLowerCase() ===
          trimmedName.toLocaleLowerCase()
    );

    if (existingUnit) {
      throw new Error("توجد وحدة بهذا الاسم في المادة المختارة.");
    }

    const nextOrder =
      Math.max(
        -1,
        ...units
          .filter((unit) => unit.subject_id === subjectId)
          .map((unit) => unit.order_index ?? 0)
      ) + 1;

    const { data, error: insertError } = await supabase
      .from("library_units")
      .insert({
        subject_id: subjectId,
        name: trimmedName,
        description: description.trim() || null,
        order_index: nextOrder,
        is_active: true,
      })
      .select(
        "id, subject_id, name, description, order_index, is_active"
      )
      .single();

    if (insertError) throw insertError;
    if (!data) throw new Error("تعذر الحصول على الوحدة الجديدة.");

    const unit = data as LibraryUnit;

    setUnits((current) =>
      [...current, unit].sort(
        (a, b) =>
          a.order_index - b.order_index ||
          a.name.localeCompare(b.name)
      )
    );

    return unit;
  }

  async function saveOneFile(
    file: File,
    unitId: string | null,
    subjectId: string,
    description: string,
    resourceType: ResourceType,
    content: string,
    year: number | null,
    isPublished: boolean
  ) {
    if (!supabase) {
      throw new Error("خدمة قاعدة البيانات غير متاحة حالياً.");
    }

    let resourceId: string | null = null;
    const uploadedPaths: string[] = [];

    try {
      const title = fileTitle(file.name);

      const { data: insertedResource, error: insertError } = await supabase
        .from("library_resources")
        .insert({
          subject_id: subjectId,
          unit_id: unitId,
          title,
          description: description.trim() || null,
          resource_type: resourceType,
          content: content.trim() || null,
          pdf_url: null,
          image_urls: [],
          year,
          is_published: isPublished,
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      if (!insertedResource?.id) {
        throw new Error(`تعذر إنشاء المورد "${title}".`);
      }

      resourceId = insertedResource.id;

      const uploadedPath = await uploadFile(
        file,
        subjectId,
        insertedResource.id
      );

      uploadedPaths.push(uploadedPath);

      const updatePayload = isPdf(file)
        ? {
            pdf_url: uploadedPath,
            updated_at: new Date().toISOString(),
          }
        : {
            image_urls: [uploadedPath],
            updated_at: new Date().toISOString(),
          };

      const { error: updateError } = await supabase
        .from("library_resources")
        .update(updatePayload)
        .eq("id", insertedResource.id);

      if (updateError) throw updateError;
    } catch (err) {
      await deleteUploadedFiles(uploadedPaths);

      if (resourceId && supabase) {
        const { error: cleanupError } = await supabase
          .from("library_resources")
          .delete()
          .eq("id", resourceId);

        if (cleanupError) {
          console.error("Resource cleanup error:", cleanupError);
        }
      }

      throw err;
    }
  }

  async function saveResource() {
    if (!supabase) {
      setError("خدمة قاعدة البيانات غير متاحة حالياً.");
      return;
    }

    if (!resourceForm.subject_id || !resourceForm.resource_type) {
      setError("اختر المادة ونوع المورد.");
      return;
    }

    if (unitMode === "existing" && !resourceForm.unit_id) {
      setError("اختر وحدة أو أنشئ وحدة جديدة، أو اختر بدون وحدة.");
      return;
    }

    if (unitMode === "new" && !newUnitName.trim()) {
      setError("أدخل اسم الوحدة الجديدة.");
      return;
    }

    if (selectedFiles.length === 0) {
      if (
        !resourceForm.content.trim() &&
        !resourceForm.pdf_url.trim()
      ) {
        setError("اختر ملفًا واحدًا على الأقل، أو أدخل محتوى أو رابط PDF خارجي.");
        return;
      }

      if (resourceForm.pdf_url.trim()) {
        try {
          const parsedUrl = new URL(resourceForm.pdf_url.trim());
          if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
            setError("رابط PDF غير صالح.");
            return;
          }
        } catch {
          setError("أدخل رابط PDF صالحًا يبدأ بـ https:// أو http://.");
          return;
        }
      }
    }

    if (
      selectedFiles.length > 0 &&
      resourceForm.pdf_url.trim()
    ) {
      setError("امسح رابط PDF الخارجي إذا كنت ترفع ملفات من جهازك.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    let completed = 0;
    let failed = 0;
    const failures: string[] = [];

    try {
      let unitId: string | null = null;

      if (unitMode === "existing") {
        unitId = resourceForm.unit_id || null;
      } else if (unitMode === "new") {
        setUploadingLabel("جاري إنشاء الوحدة...");
        const unit = await createUnit(
          resourceForm.subject_id,
          newUnitName,
          newUnitDescription
        );
        unitId = unit.id;
      }

      const year = resourceForm.year.trim()
        ? Number(resourceForm.year)
        : null;

      if (
        year !== null &&
        (!Number.isInteger(year) || year < 1900 || year > 2200)
      ) {
        throw new Error("أدخل سنة صحيحة بين 1900 و2200.");
      }

      if (selectedFiles.length > 0) {
        for (let index = 0; index < selectedFiles.length; index++) {
          const file = selectedFiles[index];

          setUploadingLabel(
            `جاري رفع الملف ${index + 1} من ${selectedFiles.length}: ${file.name}`
          );

          try {
            await saveOneFile(
              file,
              unitId,
              resourceForm.subject_id,
              resourceForm.description,
              resourceForm.resource_type,
              resourceForm.content,
              year,
              resourceForm.is_published
            );
            completed++;
          } catch (err) {
            failed++;
            console.error(`Failed to upload ${file.name}:`, err);
            failures.push(file.name);
          }
        }

        if (completed === 0) {
          throw new Error(
            `فشل رفع جميع الملفات. أول ملف فشل: ${failures[0] ?? "غير معروف"}`
          );
        }

        setSuccess(
          `تم إنشاء ${completed} مورد بنجاح من أصل ${selectedFiles.length}.` +
            (failed > 0
              ? ` فشل ${failed} ملف: ${failures.slice(0, 3).join("، ")}${failures.length > 3 ? "..." : ""}.`
              : "") +
            (resourceForm.is_published
              ? " الموارد الناجحة منشورة للطلاب."
              : " الموارد الناجحة محفوظة كمسودات.")
        );
      } else {
        setUploadingLabel("جاري حفظ المورد...");

        const { error: insertError } = await supabase
          .from("library_resources")
          .insert({
            subject_id: resourceForm.subject_id,
            unit_id: unitId,
            title:
              resourceForm.pdf_url.trim()
                ? fileTitle(
                    resourceForm.pdf_url.trim().split("/").pop() ||
                      "مورد جديد"
                  )
                : "مورد نصي",
            description: resourceForm.description.trim() || null,
            resource_type: resourceForm.resource_type,
            content: resourceForm.content.trim() || null,
            pdf_url: resourceForm.pdf_url.trim() || null,
            image_urls: [],
            year,
            is_published: resourceForm.is_published,
            updated_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;

        setSuccess(
          resourceForm.is_published
            ? "تم حفظ المورد ونشره بنجاح."
            : "تم حفظ المورد كمسودة بنجاح."
        );
      }

      setShowResourceForm(false);
      resetResourceForm();
      await loadLibrary();
    } catch (err) {
      console.error("Save resources error:", err);
      setError(
        err instanceof Error
          ? `تعذر إكمال العملية: ${err.message}`
          : "تعذر حفظ الموارد."
      );
    } finally {
      setSaving(false);
      setUploadingLabel("");
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
            رفع جماعي للملفات، وتنظيم الموارد حسب المادة والوحدة.
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
              📚 رفع موارد
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
                  أدخل معلومات المادة.
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
                  className={inputClass}
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
                  className={inputClass}
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
                  className={inputClass}
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
                  className={inputClass}
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
                  className={inputClass}
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
                <h2 className="text-xl font-black">
                  📚 رفع الموارد دفعة واحدة
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  كل PDF أو صورة يصبح موردًا مستقلًا، وعنوانه مأخوذ من اسم
                  الملف دون الامتداد.
                </p>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setShowResourceForm(false);
                  resetResourceForm();
                  setError("");
                }}
                className="rounded-xl border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/5 disabled:opacity-40"
              >
                إغلاق
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold">المادة</label>
                <select
                  value={resourceForm.subject_id}
                  disabled={saving}
                  onChange={(event) =>
                    setResourceForm((current) => ({
                      ...current,
                      subject_id: event.target.value,
                      unit_id: "",
                    }))
                  }
                  className={inputClass}
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
                  نوع جميع الموارد
                </label>
                <select
                  value={resourceForm.resource_type}
                  disabled={saving}
                  onChange={(event) =>
                    setResourceForm((current) => ({
                      ...current,
                      resource_type: event.target.value as ResourceType,
                    }))
                  }
                  className={inputClass}
                >
                  {RESOURCE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                <label className="mb-3 block text-sm font-bold">
                  🗂️ الوحدة
                </label>

                <div className="flex flex-wrap gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={unitMode === "existing"}
                      disabled={saving}
                      onChange={() => setUnitMode("existing")}
                    />
                    اختيار وحدة موجودة
                  </label>

                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={unitMode === "new"}
                      disabled={saving}
                      onChange={() => setUnitMode("new")}
                    />
                    إنشاء وحدة جديدة
                  </label>

                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={unitMode === "none"}
                      disabled={saving}
                      onChange={() => setUnitMode("none")}
                    />
                    بدون وحدة
                  </label>
                </div>

                {unitMode === "existing" && (
                  <div className="mt-4">
                    <select
                      value={resourceForm.unit_id}
                      disabled={saving || !resourceForm.subject_id}
                      onChange={(event) =>
                        setResourceForm((current) => ({
                          ...current,
                          unit_id: event.target.value,
                        }))
                      }
                      className={inputClass}
                    >
                      <option value="">اختر الوحدة</option>
                      {subjectUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>

                    {!resourceForm.subject_id && (
                      <p className="mt-2 text-xs text-amber-200">
                        اختر المادة أولًا.
                      </p>
                    )}

                    {resourceForm.subject_id && subjectUnits.length === 0 && (
                      <p className="mt-2 text-xs text-slate-400">
                        لا توجد وحدات مفعلة لهذه المادة. يمكنك إنشاء وحدة
                        جديدة من الخيار أعلاه.
                      </p>
                    )}
                  </div>
                )}

                {unitMode === "new" && (
                  <div className="mt-4 grid gap-3">
                    <input
                      value={newUnitName}
                      disabled={saving}
                      onChange={(event) => setNewUnitName(event.target.value)}
                      placeholder="اسم الوحدة، مثال: الدوال العددية"
                      className={inputClass}
                    />

                    <textarea
                      value={newUnitDescription}
                      disabled={saving}
                      onChange={(event) =>
                        setNewUnitDescription(event.target.value)
                      }
                      rows={2}
                      placeholder="وصف الوحدة — اختياري"
                      className={inputClass}
                    />

                    <p className="text-xs leading-5 text-slate-400">
                      تُنشأ الوحدة داخل المادة المختارة وتُربط بها الموارد
                      الناجحة في هذه الدفعة.
                    </p>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold">
                  📂 الملفات المراد رفعها
                </label>

                <div className="rounded-2xl border border-dashed border-cyan-400/30 bg-cyan-400/5 p-4">
                  <input
                    type="file"
                    accept="application/pdf,.pdf,image/*"
                    multiple
                    disabled={saving}
                    onChange={(event) => {
                      handleFilesSelection(event.target.files);
                      event.target.value = "";
                    }}
                    className="block w-full cursor-pointer text-sm text-slate-300 disabled:opacity-40"
                  />

                  <p className="mt-3 text-xs leading-6 text-slate-400">
                    يمكنك اختيار حتى {MAX_BATCH_FILES} ملفًا معًا. PDF بحد
                    أقصى 20MB، والصورة بحد أقصى 5MB. كل ملف يصبح موردًا
                    مستقلًا، حتى لو اخترت PDF وصورًا في الدفعة نفسها.
                  </p>

                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-cyan-200">
                          تم اختيار {selectedFiles.length} ملف
                        </p>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => setSelectedFiles([])}
                          className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 disabled:opacity-40"
                        >
                          إزالة جميع الملفات
                        </button>
                      </div>

                      <div className="max-h-80 space-y-2 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${file.lastModified}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/80 p-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-white">
                                {isPdf(file) ? "📄" : "🖼️"}{" "}
                                {fileTitle(file.name)}
                              </p>
                              <p
                                className="mt-1 truncate text-xs text-slate-500"
                                title={file.name}
                              >
                                {file.name}
                              </p>
                            </div>

                            <div className="shrink-0 text-left">
                              <p className="text-xs text-slate-400">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  setSelectedFiles((current) =>
                                    current.filter((_, i) => i !== index)
                                  )
                                }
                                className="mt-1 text-xs text-red-300 disabled:opacity-40"
                              >
                                إزالة
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="text-xs text-slate-400">
                        عدد الموارد التي سيتم إنشاؤها: {selectedFiles.length}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold">
                  📝 وصف مشترك — اختياري
                </label>
                <textarea
                  value={resourceForm.description}
                  disabled={saving}
                  onChange={(event) =>
                    setResourceForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="وصف يضاف إلى كل مورد في الدفعة..."
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold">
                  المحتوى الداخلي — اختياري
                </label>
                <textarea
                  value={resourceForm.content}
                  disabled={saving}
                  onChange={(event) =>
                    setResourceForm((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="يمكنك إضافة محتوى نصي مشترك للموارد..."
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-slate-500">
                  إذا اخترت ملفات، يُضاف هذا النص إلى كل مورد في الدفعة.
                  إذا لم تختر ملفات، يمكنك حفظ مورد نصي بهذا المحتوى.
                </p>
              </div>

              {selectedFiles.length === 0 && (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold">
                    🔗 رابط PDF خارجي — اختياري
                  </label>
                  <input
                    type="url"
                    value={resourceForm.pdf_url}
                    disabled={saving}
                    onChange={(event) =>
                      setResourceForm((current) => ({
                        ...current,
                        pdf_url: event.target.value,
                      }))
                    }
                    placeholder="https://..."
                    className={inputClass}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    يُحفظ المورد النصي أو ذو الرابط بعنوان «مورد نصي» أو
                    باسم الملف المستخرج من الرابط.
                  </p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-bold">السنة</label>
                <input
                  type="number"
                  value={resourceForm.year}
                  disabled={saving}
                  onChange={(event) =>
                    setResourceForm((current) => ({
                      ...current,
                      year: event.target.value,
                    }))
                  }
                  placeholder="مثال: 2026"
                  className={inputClass}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={resourceForm.is_published}
                  disabled={saving}
                  onChange={(event) =>
                    setResourceForm((current) => ({
                      ...current,
                      is_published: event.target.checked,
                    }))
                  }
                  className="h-5 w-5"
                />
                نشر الموارد الناجحة للطلاب مباشرة
              </label>
            </div>

            {saving && (
              <div
                role="status"
                className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-200"
              >
                <p className="font-bold">⏳ {uploadingLabel || "جاري الحفظ..."}</p>
                <p className="mt-1 text-xs text-slate-400">
                  لا تغلق الصفحة حتى تنتهي العملية.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={saveResource}
              disabled={saving}
              className="mt-5 rounded-2xl bg-emerald-500 px-6 py-3 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "⏳ جاري معالجة الملفات..."
                : selectedFiles.length > 0
                  ? `⬆️ رفع وإنشاء ${selectedFiles.length} مورد`
                  : "💾 حفظ المورد"}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
