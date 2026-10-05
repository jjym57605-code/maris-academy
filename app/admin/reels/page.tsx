"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type Subject = {
  id: string;
  name?: string;
  name_ar?: string;
  title?: string;
};

type Reel = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  subject_id: string | null;
  is_published: boolean;
  views_count: number;
  created_at: string;
};

export default function AdminReelsPage() {
  const supabase = getSupabase();

  const [reels, setReels] = useState<Reel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [currentThumbnailUrl, setCurrentThumbnailUrl] = useState("");

  async function checkAdmin() {
    if (!supabase) {
      console.error("Supabase is not configured.");
      return false;
    }

    const { data, error } = await supabase.rpc(
      "is_current_user_admin"
    );

    if (error) {
      console.error("ADMIN CHECK ERROR:", error);
      return false;
    }

    return data === true;
  }

  async function loadData() {
    setLoading(true);

    if (!supabase) {
      console.error("Supabase is not configured.");
      setLoading(false);
      return;
    }

    const isAdmin = await checkAdmin();

    if (!isAdmin) {
      window.location.href = "/dashboard";
      return;
    }

    const [reelsResult, subjectsResult] = await Promise.all([
      supabase
        .from("reels")
        .select(
          "id,title,description,video_url,thumbnail_url,subject_id,is_published,views_count,created_at"
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("subjects")
        .select("*")
        .order("name", { ascending: true }),
    ]);

    if (reelsResult.error) {
      console.error("REELS LOAD ERROR:", reelsResult.error);

      alert(
        `حدث خطأ أثناء تحميل الريلزات: ${reelsResult.error.message}`
      );
    } else {
      setReels((reelsResult.data ?? []) as Reel[]);
    }

    if (subjectsResult.error) {
      console.error("SUBJECTS LOAD ERROR:", subjectsResult.error);
    } else {
      setSubjects((subjectsResult.data ?? []) as Subject[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setSubjectId("");
    setVideoFile(null);
    setThumbnailFile(null);
    setCurrentVideoUrl("");
    setCurrentThumbnailUrl("");
    setShowForm(false);
  }

  function startEdit(reel: Reel) {
    setEditingId(reel.id);
    setTitle(reel.title);
    setDescription(reel.description ?? "");
    setSubjectId(reel.subject_id ?? "");
    setVideoFile(null);
    setThumbnailFile(null);
    setCurrentVideoUrl(reel.video_url);
    setCurrentThumbnailUrl(reel.thumbnail_url ?? "");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function uploadFile(
    file: File,
    folder: string
  ): Promise<string | null> {
    if (!supabase) {
      console.error("Supabase is not configured.");
      alert("إعدادات Supabase غير مكتملة.");
      return null;
    }

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "bin";

    const fileName = `${folder}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from("reels")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("STORAGE UPLOAD ERROR:", error);

      alert(`فشل رفع الملف: ${error.message}`);

      return null;
    }

    const { data } = supabase.storage
      .from("reels")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!title.trim()) {
      alert("اكتب عنوان الريلز");
      return;
    }

    if (!editingId && !videoFile) {
      alert("اختر فيديو الريلز");
      return;
    }

    if (!supabase) {
      alert("إعدادات Supabase غير مكتملة.");
      return;
    }

    setSaving(true);

    try {
      let videoUrl = currentVideoUrl;
      let thumbnailUrl = currentThumbnailUrl || null;

      if (videoFile) {
        const uploadedVideo = await uploadFile(
          videoFile,
          "videos"
        );

        if (!uploadedVideo) return;

        videoUrl = uploadedVideo;
      }

      if (thumbnailFile) {
        const uploadedThumbnail = await uploadFile(
          thumbnailFile,
          "thumbnails"
        );

        if (!uploadedThumbnail) return;

        thumbnailUrl = uploadedThumbnail;
      }

      if (editingId) {
        const { error } = await supabase
          .from("reels")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            subject_id: subjectId || null,
            video_url: videoUrl,
            thumbnail_url: thumbnailUrl,
          })
          .eq("id", editingId);

        if (error) {
          console.error("REEL UPDATE ERROR:", error);

          alert(`فشل تعديل الريلز: ${error.message}`);

          return;
        }

        alert("تم تعديل الريلز بنجاح ✅");
      } else {
        const { error } = await supabase
          .from("reels")
          .insert({
            title: title.trim(),
            description: description.trim() || null,
            subject_id: subjectId || null,
            video_url: videoUrl,
            thumbnail_url: thumbnailUrl,
            is_published: false,
            views_count: 0,
          });

        if (error) {
          console.error("REEL INSERT ERROR:", error);

          alert(`فشل إضافة الريلز: ${error.message}`);

          return;
        }

        alert("تمت إضافة الريلز بنجاح ✅");
      }

      resetForm();

      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(reel: Reel) {
    if (!supabase) {
      alert("إعدادات Supabase غير مكتملة.");
      return;
    }

    const { error } = await supabase
      .from("reels")
      .update({
        is_published: !reel.is_published,
      })
      .eq("id", reel.id);

    if (error) {
      console.error("PUBLISH ERROR:", error);

      alert(`حدث خطأ: ${error.message}`);

      return;
    }

    await loadData();
  }

  async function deleteReel(reel: Reel) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الريلز "${reel.title}"؟`
    );

    if (!confirmed) return;

    if (!supabase) {
      alert("إعدادات Supabase غير مكتملة.");
      return;
    }

    const { error } = await supabase
      .from("reels")
      .delete()
      .eq("id", reel.id);

    if (error) {
      console.error("DELETE REEL ERROR:", error);

      alert(`فشل حذف الريلز: ${error.message}`);

      return;
    }

    alert("تم حذف الريلز ✅");

    await loadData();
  }

  function getSubjectName(subjectId: string | null) {
    if (!subjectId) return "بدون مادة";

    const subject = subjects.find(
      (item) => item.id === subjectId
    );

    if (!subject) return "غير معروف";

    return (
      subject.name ??
      subject.name_ar ??
      subject.title ??
      "بدون اسم"
    );
  }

  const totalViews = reels.reduce(
    (total, reel) => total + (reel.views_count || 0),
    0
  );

  const publishedCount = reels.filter(
    (reel) => reel.is_published
  ).length;

  const unpublishedCount = reels.filter(
    (reel) => !reel.is_published
  ).length;

  if (loading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-[70vh] items-center justify-center"
      >
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-3xl shadow-[0_0_30px_rgba(34,211,238,0.12)]">
            🎬
          </div>

          <p className="text-sm font-medium text-slate-400">
            جاري تحميل الريلزات...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-full space-y-7 text-slate-100"
    >
      {/* PAGE HEADER */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-[#071b2d] via-[#08283d] to-[#063247] p-6 shadow-2xl shadow-cyan-950/20">
        <div className="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 right-10 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300">
              <span>🌊</span>
              <span>MARIS ACADEMY</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              🎬 إدارة الريلزات
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              إدارة محتوى الفيديوهات القصيرة الخاصة
              بالأكاديمية
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-400 px-5 py-3 text-sm font-bold text-[#032235] shadow-lg shadow-cyan-500/10 transition hover:bg-cyan-300"
          >
            {showForm ? "✕ إلغاء" : "＋ إضافة ريلز"}
          </button>
        </div>
      </div>

      {/* FORM */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-3xl border border-cyan-400/10 bg-[#071b2d]/90 shadow-xl shadow-black/20"
        >
          <div className="border-b border-white/5 bg-gradient-to-r from-cyan-400/10 to-transparent p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-xl">
                {editingId ? "✏️" : "🎬"}
              </div>

              <div>
                <h2 className="font-bold text-white">
                  {editingId
                    ? "تعديل الريلز"
                    : "إضافة ريلز جديد"}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  البيانات تحفظ مباشرة في Supabase
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">
            {/* TITLE */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                عنوان الريلز
              </label>

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: نصيحة مهمة في الرياضيات"
                className="w-full rounded-xl border border-white/10 bg-[#041524] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>

            {/* DESCRIPTION */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                الوصف
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                rows={4}
                placeholder="وصف مختصر للريلز..."
                className="w-full resize-none rounded-xl border border-white/10 bg-[#041524] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>

            {/* SUBJECT */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                المادة
              </label>

              <select
                value={subjectId}
                onChange={(e) =>
                  setSubjectId(e.target.value)
                }
                className="w-full rounded-xl border border-white/10 bg-[#041524] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
              >
                <option
                  value=""
                  className="bg-[#071b2d]"
                >
                  بدون مادة
                </option>

                {subjects.map((subject) => (
                  <option
                    key={subject.id}
                    value={subject.id}
                    className="bg-[#071b2d]"
                  >
                    {subject.name ??
                      subject.name_ar ??
                      subject.title ??
                      "بدون اسم"}
                  </option>
                ))}
              </select>
            </div>

            {/* VIDEO */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                فيديو الريلز
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-cyan-400/20 bg-cyan-400/[0.03] p-4 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.06]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-lg">
                  🎥
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-200">
                    اختر فيديو
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {videoFile
                      ? videoFile.name
                      : "MP4 / MOV / WebM"}
                  </p>
                </div>

                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) =>
                    setVideoFile(
                      e.target.files?.[0] ?? null
                    )
                  }
                  className="hidden"
                />
              </label>

              {editingId && currentVideoUrl && (
                <p className="mt-2 text-xs text-slate-500">
                  اتركه فارغًا للإبقاء على الفيديو الحالي.
                </p>
              )}
            </div>

            {/* THUMBNAIL */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                صورة الغلاف
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-cyan-400/20 bg-cyan-400/[0.03] p-4 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.06]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-lg">
                  🖼️
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-200">
                    اختر صورة
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {thumbnailFile
                      ? thumbnailFile.name
                      : "JPG / PNG / WebP"}
                  </p>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setThumbnailFile(
                      e.target.files?.[0] ?? null
                    )
                  }
                  className="hidden"
                />
              </label>

              {editingId && currentThumbnailUrl && (
                <p className="mt-2 text-xs text-slate-500">
                  اتركه فارغًا للإبقاء على صورة الغلاف الحالية.
                </p>
              )}
            </div>
          </div>

          {/* FORM ACTIONS */}
          <div className="flex flex-wrap gap-3 border-t border-white/5 bg-black/10 p-6">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-[#032235] shadow-lg shadow-cyan-500/10 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "⏳ جاري الحفظ..."
                : editingId
                ? "💾 حفظ التعديلات"
                : "＋ إضافة الريلز"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* STATS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="group rounded-2xl border border-cyan-400/10 bg-[#071b2d]/80 p-5 shadow-lg shadow-black/10 transition hover:border-cyan-400/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">
                إجمالي الريلزات
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {reels.length}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-xl">
              🎬
            </div>
          </div>
        </div>

        <div className="group rounded-2xl border border-emerald-400/10 bg-[#071b2d]/80 p-5 shadow-lg shadow-black/10 transition hover:border-emerald-400/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">
                منشورة
              </p>

              <p className="mt-2 text-3xl font-bold text-emerald-400">
                {publishedCount}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10 text-xl">
              📢
            </div>
          </div>
        </div>

        <div className="group rounded-2xl border border-amber-400/10 bg-[#071b2d]/80 p-5 shadow-lg shadow-black/10 transition hover:border-amber-400/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">
                غير منشورة
              </p>

              <p className="mt-2 text-3xl font-bold text-amber-400">
                {unpublishedCount}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-xl">
              📝
            </div>
          </div>
        </div>

        <div className="group rounded-2xl border border-sky-400/10 bg-[#071b2d]/80 p-5 shadow-lg shadow-black/10 transition hover:border-sky-400/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">
                إجمالي المشاهدات
              </p>

              <p className="mt-2 text-3xl font-bold text-sky-400">
                {totalViews}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-400/10 text-xl">
              👁️
            </div>
          </div>
        </div>
      </div>

      {/* REELS LIST */}
      <div className="overflow-hidden rounded-3xl border border-cyan-400/10 bg-[#071b2d]/80 shadow-xl shadow-black/20">
        <div className="flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-cyan-400/[0.06] to-transparent p-5">
          <div>
            <h2 className="font-bold text-white">
              جميع الريلزات
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              المحتوى الموجود حاليًا في المنصة
            </p>
          </div>

          <div className="rounded-full border border-cyan-400/10 bg-cyan-400/5 px-3 py-1 text-xs font-medium text-cyan-300">
            {reels.length} ريلز
          </div>
        </div>

        {reels.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-400/10 text-4xl">
              🎬
            </div>

            <p className="mt-5 font-semibold text-slate-200">
              مازال ما كاش ريلزات
            </p>

            <p className="mt-2 text-sm text-slate-500">
              أضف أول ريلز من الزر الموجود فوق.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {reels.map((reel) => (
              <div
                key={reel.id}
                className="p-5 transition hover:bg-cyan-400/[0.025] md:p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                  {/* REAL VIDEO PREVIEW */}
                  <div className="relative shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-lg shadow-black/20">
                    <video
                      src={reel.video_url}
                      poster={
                        reel.thumbnail_url ?? undefined
                      }
                      controls
                      preload="metadata"
                      playsInline
                      className="h-40 w-full bg-black object-cover sm:w-60"
                    >
                      المتصفح لا يدعم تشغيل الفيديو.
                    </video>

                    {!reel.is_published && (
                      <div className="pointer-events-none absolute right-2 top-2 rounded-full border border-amber-400/20 bg-black/70 px-2.5 py-1 text-[10px] font-bold text-amber-300 backdrop-blur-sm">
                        غير منشور
                      </div>
                    )}
                  </div>

                  {/* INFO */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-white">
                        {reel.title}
                      </h3>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          reel.is_published
                            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                            : "border-amber-400/20 bg-amber-400/10 text-amber-300"
                        }`}
                      >
                        {reel.is_published
                          ? "● منشور"
                          : "● غير منشور"}
                      </span>
                    </div>

                    {reel.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
                        {reel.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400">
                        📚 {getSubjectName(reel.subject_id)}
                      </span>

                      <span className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400">
                        👁️ {reel.views_count || 0} مشاهدة
                      </span>

                      <span className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400">
                        📅{" "}
                        {new Date(
                          reel.created_at
                        ).toLocaleDateString("ar-DZ")}
                      </span>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex flex-wrap gap-2 lg:w-56 lg:justify-end">
                    <Link
                      href={reel.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:border-cyan-400/20 hover:bg-cyan-400/10"
                    >
                      ▶️ مشاهدة
                    </Link>

                    <button
                      type="button"
                      onClick={() => startEdit(reel)}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                    >
                      ✏️ تعديل
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        togglePublish(reel)
                      }
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        reel.is_published
                          ? "border border-amber-400/10 bg-amber-400/5 text-amber-300 hover:bg-amber-400/10"
                          : "border border-emerald-400/10 bg-emerald-400/5 text-emerald-300 hover:bg-emerald-400/10"
                      }`}
                    >
                      {reel.is_published
                        ? "🙈 إخفاء"
                        : "📢 نشر"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteReel(reel)}
                      className="rounded-xl border border-red-400/10 bg-red-400/5 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-400/10"
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

