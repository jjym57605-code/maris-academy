"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabase } from "@/lib/supabase";

import {
  ANNOUNCEMENT_TYPES,
  createAnnouncement,
  deleteAnnouncement,
  deleteAnnouncementImage,
  getAllAnnouncements,
  toggleAnnouncement,
  updateAnnouncement,
  uploadAnnouncementImage,
  type Announcement,
  type AnnouncementType,
} from "@/services/announcements";

const EMPTY_FORM = {
  title: "",
  content: "",
  type: "general" as AnnouncementType,
};

function getTypeLabel(type: AnnouncementType) {
  return (
    ANNOUNCEMENT_TYPES.find((item) => item.value === type)?.label ??
    "إعلان عام"
  );
}

function getTypeIcon(type: AnnouncementType) {
  switch (type) {
    case "course":
      return "📚";
    case "teacher":
      return "👨‍🏫";
    case "update":
      return "🔔";
    default:
      return "📢";
  }
}

export default function AdminAnnouncementsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [form, setForm] = useState(EMPTY_FORM);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function checkAdmin() {
    const supabase = getSupabase();

    if (!supabase) {
      setErrorMessage("تعذر الاتصال بقاعدة البيانات.");
      return false;
    }

    const { data, error } = await supabase.rpc(
      "is_current_user_admin",
    );

    if (error || data !== true) {
      router.replace("/dashboard");
      return false;
    }

    return true;
  }

  async function loadAnnouncements() {
    try {
      setLoading(true);
      setErrorMessage("");

      const isAdmin = await checkAdmin();

      if (!isAdmin) {
        return;
      }

      const data = await getAllAnnouncements();

      setAnnouncements(data);
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تحميل الإعلانات.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnnouncements();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function resetImageSelection() {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setRemoveCurrentImage(false);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    resetImageSelection();
    setMessage("");
    setErrorMessage("");
  }

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("الملف المختار ليس صورة.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("حجم الصورة يجب ألا يتجاوز 10MB.");
      event.target.value = "";
      return;
    }

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setRemoveCurrentImage(false);
    setErrorMessage("");

    event.target.value = "";
  }

  function removeSelectedImage() {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
  }

  function removeExistingImage() {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setRemoveCurrentImage(true);
  }

  function startEdit(announcement: Announcement) {
    setEditingId(announcement.id);

    setForm({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
    });

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setRemoveCurrentImage(false);

    setMessage("");
    setErrorMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!form.title.trim()) {
      setErrorMessage("اكتب عنوان الإعلان.");
      return;
    }

    if (!form.content.trim()) {
      setErrorMessage("اكتب محتوى الإعلان.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setErrorMessage("");

      const currentAnnouncement = editingId
        ? announcements.find((item) => item.id === editingId)
        : null;

      let imageUrl = currentAnnouncement?.image_url ?? null;
      let uploadedNewImage: string | null = null;

      if (selectedFile) {
        uploadedNewImage =
          await uploadAnnouncementImage(selectedFile);

        imageUrl = uploadedNewImage;
      } else if (removeCurrentImage) {
        imageUrl = null;
      }

      if (editingId) {
        await updateAnnouncement(editingId, {
          title: form.title.trim(),
          content: form.content.trim(),
          type: form.type,
          image_url: imageUrl,
        });

        if (
          currentAnnouncement?.image_url &&
          currentAnnouncement.image_url !== imageUrl
        ) {
          await deleteAnnouncementImage(
            currentAnnouncement.image_url,
          );
        }

        setMessage("✅ تم تعديل الإعلان بنجاح.");
      } else {
        try {
          await createAnnouncement({
            title: form.title.trim(),
            content: form.content.trim(),
            type: form.type,
            image_url: imageUrl,
          });
        } catch (createError) {
          if (uploadedNewImage) {
            await deleteAnnouncementImage(uploadedNewImage);
          }

          throw createError;
        }

        setMessage("✅ تم إنشاء الإعلان بنجاح.");
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      resetImageSelection();

      await loadAnnouncements();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء حفظ الإعلان.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(announcement: Announcement) {
    try {
      setMessage("");
      setErrorMessage("");

      await toggleAnnouncement(
        announcement.id,
        !announcement.is_active,
      );

      setAnnouncements((current) =>
        current.map((item) =>
          item.id === announcement.id
            ? {
                ...item,
                is_active: !item.is_active,
              }
            : item,
        ),
      );

      setMessage(
        announcement.is_active
          ? "⏸️ تم إيقاف الإعلان."
          : "▶️ تم تفعيل الإعلان.",
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تغيير حالة الإعلان.",
      );
    }
  }

  async function handleDelete(announcement: Announcement) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الإعلان:\n\n${announcement.title}`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setMessage("");
      setErrorMessage("");

      await deleteAnnouncement(announcement.id);

      if (announcement.image_url) {
        await deleteAnnouncementImage(
          announcement.image_url,
        );
      }

      setAnnouncements((current) =>
        current.filter((item) => item.id !== announcement.id),
      );

      if (editingId === announcement.id) {
        setForm(EMPTY_FORM);
        setEditingId(null);
        resetImageSelection();
      }

      setMessage("🗑️ تم حذف الإعلان بنجاح.");
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء حذف الإعلان.",
      );
    }
  }

  const editingAnnouncement = editingId
    ? announcements.find((item) => item.id === editingId)
    : null;

  const displayedPreview =
    previewUrl ??
    (!removeCurrentImage
      ? editingAnnouncement?.image_url ?? null
      : null);

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#06131b] px-4 py-6 text-white md:px-8"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-cyan-300/10 bg-white/[0.03] p-6 shadow-2xl shadow-cyan-950/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-cyan-300">
                MARIS ACADEMY
              </p>

              <h1 className="mt-2 text-2xl font-black md:text-3xl">
                📢 إدارة الإعلانات
              </h1>

              <p className="mt-2 text-sm leading-7 text-white/50">
                أنشئ إعلانات تظهر مباشرة للطلبة داخل المنصة.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
            >
              ← لوحة الإدارة
            </button>
          </div>
        </section>

        {message && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-300">
            {errorMessage}
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">
                {editingId
                  ? "✏️ تعديل الإعلان"
                  : "➕ إنشاء إعلان جديد"}
              </h2>

              <p className="mt-1 text-xs text-white/40">
                {editingId
                  ? "عدّل المعلومات والصورة ثم احفظ التغييرات."
                  : "الإعلان الجديد سيكون مفعّلًا مباشرة."}
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-white/80">
                عنوان الإعلان
              </label>

              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="مثال: دورة جديدة في الرياضيات"
                maxLength={150}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-white/20 focus:border-cyan-300/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-white/80">
                نوع الإعلان
              </label>

              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as AnnouncementType,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-[#0a202b] px-4 py-3 text-sm outline-none focus:border-cyan-300/40"
              >
                {ANNOUNCEMENT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-white/80">
                محتوى الإعلان
              </label>

              <textarea
                value={form.content}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                placeholder="اكتب تفاصيل الإعلان هنا..."
                maxLength={5000}
                rows={6}
                className="w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 outline-none transition placeholder:text-white/20 focus:border-cyan-300/40"
              />
            </div>

            {/* ================================
                IMAGE UPLOAD
            ================================= */}

            <div>
              <label className="mb-2 block text-sm font-bold text-white/80">
                صورة الإعلان
              </label>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/20 bg-cyan-300/[0.03] px-5 py-8 text-center transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.05]">
                <span className="text-3xl">🖼️</span>

                <span className="mt-3 text-sm font-bold text-white/80">
                  اختر صورة من الهاتف أو الكمبيوتر
                </span>

                <span className="mt-1 text-xs text-white/40">
                  PNG, JPG, WEBP — الحد الأقصى 10MB
                </span>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              {displayedPreview && (
                <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <img
                    src={displayedPreview}
                    alt="معاينة صورة الإعلان"
                    className="max-h-[420px] w-full object-contain"
                  />

                  <div className="absolute left-3 top-3 flex gap-2">
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={removeSelectedImage}
                        className="rounded-xl bg-black/70 px-3 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-black"
                      >
                        ✕ إلغاء الصورة الجديدة
                      </button>
                    )}

                    {!selectedFile &&
                      editingAnnouncement?.image_url &&
                      !removeCurrentImage && (
                        <button
                          type="button"
                          onClick={removeExistingImage}
                          className="rounded-xl bg-red-500/80 px-3 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-red-500"
                        >
                          🗑️ إزالة الصورة
                        </button>
                      )}
                  </div>
                </div>
              )}

              {removeCurrentImage && !selectedFile && (
                <div className="mt-3 rounded-xl border border-amber-400/10 bg-amber-400/5 px-4 py-3 text-xs font-bold text-amber-300">
                  سيتم حذف الصورة الحالية عند حفظ التعديل.
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-cyan-300 px-5 py-3.5 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "جاري الحفظ والرفع..."
                : editingId
                  ? "حفظ التعديلات"
                  : "نشر الإعلان 📢"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">
                الإعلانات الحالية
              </h2>

              <p className="mt-1 text-xs text-white/40">
                {announcements.length} إعلان
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/5 bg-black/10 p-8 text-center text-sm text-white/40">
              جاري تحميل الإعلانات...
            </div>
          ) : announcements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-10 text-center">
              <div className="text-4xl">📢</div>

              <h3 className="mt-3 font-black">
                لا توجد إعلانات حاليًا
              </h3>

              <p className="mt-2 text-sm text-white/40">
                أنشئ أول إعلان من النموذج أعلاه.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <article
                  key={announcement.id}
                  className={`overflow-hidden rounded-2xl border transition ${
                    announcement.is_active
                      ? "border-cyan-300/10 bg-cyan-300/[0.03]"
                      : "border-white/5 bg-black/10 opacity-60"
                  }`}
                >
                  {announcement.image_url && (
                    <div className="border-b border-white/5 bg-black/20">
                      <img
                        src={announcement.image_url}
                        alt={announcement.title}
                        className="max-h-[360px] w-full object-contain"
                      />
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/60">
                            {getTypeIcon(announcement.type)}{" "}
                            {getTypeLabel(announcement.type)}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              announcement.is_active
                                ? "bg-emerald-400/10 text-emerald-300"
                                : "bg-white/5 text-white/40"
                            }`}
                          >
                            {announcement.is_active
                              ? "مفعّل"
                              : "متوقف"}
                          </span>
                        </div>

                        <h3 className="mt-3 text-lg font-black">
                          {announcement.title}
                        </h3>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/60">
                          {announcement.content}
                        </p>

                        <p className="mt-3 text-xs text-white/30">
                          {new Intl.DateTimeFormat("ar-DZ", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(
                            new Date(announcement.created_at),
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 md:w-[210px] md:justify-end">
                        <button
                          type="button"
                          onClick={() => startEdit(announcement)}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                        >
                          ✏️ تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleToggle(announcement)
                          }
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                        >
                          {announcement.is_active
                            ? "⏸️ إيقاف"
                            : "▶️ تفعيل"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(announcement)
                          }
                          className="rounded-xl border border-red-400/10 bg-red-400/5 px-4 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400/10"
                        >
                          🗑️ حذف
                        </button>
                      </div>
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



