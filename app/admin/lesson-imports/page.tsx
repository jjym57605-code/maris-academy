
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CloudUpload,
  Eye,
  EyeOff,
  File,
  FileText,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";

type Subject = {
  id: string;
  name: string;
  stream: string | null;
};

type Course = {
  id: string;
  title: string;
  subject_id: string;
};

type ImportRecord = {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  status: string;
  detected_stream: string | null;
  detected_subject: string | null;
  detected_course: string | null;
  detected_lesson_title: string | null;
  extracted_content: string | null;
  review_notes: string | null;
  created_at: string;
};

const STREAMS = [
  "علوم تجريبية",
  "رياضيات",
  "تقني رياضي",
  "تسيير واقتصاد",
  "آداب وفلسفة",
  "لغات أجنبية",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "txt",
  "ppt",
  "pptx",
  "odt",
  "rtf",
  "jpg",
  "jpeg",
  "png",
  "webp",
];

const EXTRACTABLE_EXTENSIONS = ["pdf", "docx", "txt"];

const IMPORT_SELECT =
  "id, file_name, file_type, file_size, status, detected_stream, detected_subject, detected_course, detected_lesson_title, extracted_content, review_notes, created_at";

function formatSize(bytes: number | null) {
  if (bytes === null || !Number.isFinite(bytes)) return "غير معروف";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    uploaded: "تم الرفع",
    processing: "قيد المعالجة",
    review: "في انتظار المراجعة",
    approved: "مقبول",
    rejected: "مرفوض",
    failed: "فشل",
  };

  return labels[status] ?? status;
}

function safeFileName(name: string) {
  return name
    .normalize("NFKC")
    .replace(/[\/\\]/g, "_")
    .replace(/[^\p{L}\p{N}._() -]/gu, "_")
    .slice(0, 180);
}

function titleFromFileName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

function fileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export default function LessonImportsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [stream, setStream] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");

  const [uploading, setUploading] = useState(false);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const supabase = useMemo(() => getSupabase(), []);

  const selectedSubject = subjects.find(
    (subject) => subject.id === subjectId
  );

  const selectedCourse = courses.find((course) => course.id === courseId);

  const filteredSubjects = useMemo(() => {
    if (!stream) return subjects;
    return subjects.filter((subject) => subject.stream === stream);
  }, [subjects, stream]);

  const filteredCourses = useMemo(() => {
    if (!subjectId) return [];
    return courses.filter((course) => course.subject_id === subjectId);
  }, [courses, subjectId]);

  const loadRecords = useCallback(async () => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("lesson_imports")
      .select(IMPORT_SELECT)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    setRecords((data ?? []) as ImportRecord[]);
  }, [supabase]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      if (!supabase) {
        if (active) {
          setErrorMessage(
            "تعذر الاتصال بقاعدة البيانات. تحقق من إعدادات Supabase."
          );
          setLoading(false);
        }
        return;
      }

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("لازم تسجل الدخول بحساب الإدارة أولًا.");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profile?.is_admin) {
          if (active) {
            setIsAdmin(false);
            setLoading(false);
          }
          return;
        }

        const [subjectsResult, coursesResult, importsResult] =
          await Promise.all([
            supabase
              .from("subjects")
              .select("id, name, stream")
              .order("name"),
            supabase
              .from("courses")
              .select("id, title, subject_id")
              .order("title"),
            supabase
              .from("lesson_imports")
              .select(IMPORT_SELECT)
              .order("created_at", { ascending: false })
              .limit(100),
          ]);

        if (subjectsResult.error) throw subjectsResult.error;
        if (coursesResult.error) throw coursesResult.error;
        if (importsResult.error) throw importsResult.error;

        if (!active) return;

        setIsAdmin(true);
        setSubjects((subjectsResult.data ?? []) as Subject[]);
        setCourses((coursesResult.data ?? []) as Course[]);
        setRecords((importsResult.data ?? []) as ImportRecord[]);
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "تعذر تحميل صفحة استيراد الدروس."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [supabase]);

  function handleStreamChange(value: string) {
    setStream(value);
    setSubjectId("");
    setCourseId("");
  }

  function handleSubjectChange(value: string) {
    setSubjectId(value);
    setCourseId("");
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;

    setErrorMessage("");
    setMessage("");

    const incoming = Array.from(fileList);
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of incoming) {
      const extension = fileExtension(file.name);

      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        errors.push(`${file.name}: صيغة الملف غير مدعومة.`);
        continue;
      }

      if (file.size <= 0) {
        errors.push(`${file.name}: الملف فارغ.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: الحجم يتجاوز 50 MB.`);
        continue;
      }

      validFiles.push(file);
    }

    setSelectedFiles((previous) => {
      const existing = new Set(
        previous.map(
          (file) => `${file.name}:${file.size}:${file.lastModified}`
        )
      );

      return [
        ...previous,
        ...validFiles.filter(
          (file) =>
            !existing.has(
              `${file.name}:${file.size}:${file.lastModified}`
            )
        ),
      ];
    });

    if (errors.length) setErrorMessage(errors.join("\n"));

    if (validFiles.length) {
      setMessage(`تمت إضافة ${validFiles.length} ملف/ملفات إلى القائمة.`);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    if (!supabase || !isAdmin) return;

    setErrorMessage("");
    setMessage("");

    if (!selectedFiles.length) {
      setErrorMessage("اختار ملفًا واحدًا على الأقل.");
      return;
    }

    if (!stream) {
      setErrorMessage("اختار الشعبة أولًا.");
      return;
    }

    if (!subjectId || !selectedSubject) {
      setErrorMessage("اختار المادة المناسبة للملفات.");
      return;
    }

    if (selectedSubject.stream && selectedSubject.stream !== stream) {
      setErrorMessage("المادة المختارة لا تتبع الشعبة المحددة.");
      return;
    }

    if (courseId && !selectedCourse) {
      setErrorMessage("الدورة المختارة غير صالحة. عاود اختيارها.");
      return;
    }

    setUploading(true);

    let successful = 0;
    const failures: string[] = [];
    const successfullyUploaded = new Set<string>();

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("انتهت الجلسة. سجل الدخول مجددًا.");
      }

      for (const file of selectedFiles) {
        const extension = fileExtension(file.name);
        const storedName = safeFileName(file.name);
        const path = `${user.id}/${crypto.randomUUID()}-${storedName}`;

        try {
          const { error: storageError } = await supabase.storage
            .from("lesson-imports")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type || undefined,
            });

          if (storageError) throw storageError;

          const title =
            lessonTitle.trim() ||
            titleFromFileName(file.name) ||
            `درس مستورد - ${new Date().toLocaleDateString("fr-FR")}`;

          const { error: insertError } = await supabase
            .from("lesson_imports")
            .insert({
              created_by: user.id,
              file_name: file.name,
              file_path: path,
              file_type: file.type || extension,
              file_size: file.size,
              status: "review",
              detected_stream: stream,
              detected_subject: selectedSubject.name,
              detected_course: selectedCourse?.title ?? null,
              detected_lesson_title: title,
              course_id: selectedCourse?.id ?? null,
              review_notes:
                "بانتظار استخراج النص ومراجعة الإدارة قبل إنشاء الدرس أو نشره.",
            });

          if (insertError) {
            await supabase.storage.from("lesson-imports").remove([path]);
            throw insertError;
          }

          successful += 1;
          successfullyUploaded.add(
            `${file.name}:${file.size}:${file.lastModified}`
          );
        } catch (error) {
          console.error("Lesson import failed:", file.name, error);
          failures.push(
            `${file.name}: ${
              error instanceof Error ? error.message : "تعذر رفع الملف."
            }`
          );
        }
      }

      if (successful > 0) {
        setSelectedFiles((previous) =>
          previous.filter(
            (file) =>
              !successfullyUploaded.has(
                `${file.name}:${file.size}:${file.lastModified}`
              )
          )
        );

        setLessonTitle("");
        await loadRecords();

        setMessage(
          `تم رفع ${successful} ملف/ملفات وحفظها في قائمة المراجعة. لم يتم نشر أي درس.`
        );
      }

      if (failures.length) {
        setErrorMessage(
          `تعذر رفع ${failures.length} ملف/ملفات:\n${failures.join("\n")}`
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "حدث خطأ أثناء رفع الملفات."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleExtract(record: ImportRecord) {
    if (!supabase || !isAdmin || extractingId) return;

    setErrorMessage("");
    setMessage("");

    if (record.status === "approved") {
      setErrorMessage("لا يمكن إعادة معالجة ملف مقبول.");
      return;
    }

    const extension = fileExtension(record.file_name);

    if (!EXTRACTABLE_EXTENSIONS.includes(extension)) {
      setErrorMessage(
        "استخراج النص متاح حاليًا لملفات PDF وDOCX وTXT فقط. الملف محفوظ ولن يتم حذفه."
      );
      return;
    }

    setExtractingId(record.id);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.access_token) {
        throw new Error("انتهت الجلسة. سجل الدخول مجددًا.");
      }

      const response = await fetch("/api/admin/lesson-imports/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ import_id: record.id }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        extracted?: boolean;
        message?: string;
        character_count?: number;
        truncated?: boolean;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "تعذرت معالجة الملف.");
      }

      await loadRecords();

      if (result.extracted) {
        setPreviewId(record.id);
        setMessage(
          `${result.message || "تم استخراج النص."} عدد الأحرف: ${(
            result.character_count ?? 0
          ).toLocaleString("ar-DZ")}${
            result.truncated ? " (تم تحديد طول النص المحفوظ)." : ""
          }`
        );
      } else {
        setMessage(
          result.message ||
            "لم يتم العثور على نص قابل للاستخراج. قد يحتاج الملف إلى OCR."
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء استخراج النص."
      );
    } finally {
      setExtractingId(null);
    }
  }

  async function deleteImport(record: ImportRecord) {
    if (!supabase || !isAdmin) return;

    const confirmed = window.confirm(
      `هل تريد حذف سجل "${record.file_name}" والملف المرتبط به؟`
    );

    if (!confirmed) return;

    setErrorMessage("");
    setMessage("");

    try {
      const { data: row, error: readError } = await supabase
        .from("lesson_imports")
        .select("id, file_path, status")
        .eq("id", record.id)
        .maybeSingle();

      if (readError) throw readError;
      if (!row) throw new Error("هذا السجل غير موجود.");

      if (row.status === "approved") {
        throw new Error("لا يمكن حذف استيراد مقبول من هذه الصفحة.");
      }

      const { error: storageError } = await supabase.storage
        .from("lesson-imports")
        .remove([row.file_path]);

      if (storageError) throw storageError;

      const { error: deleteError } = await supabase
        .from("lesson_imports")
        .delete()
        .eq("id", record.id);

      if (deleteError) throw deleteError;

      setRecords((previous) =>
        previous.filter((item) => item.id !== record.id)
      );

      if (previewId === record.id) setPreviewId(null);

      setMessage("تم حذف سجل الاستيراد والملف.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "تعذر حذف الملف."
      );
    }
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-[60vh] items-center justify-center bg-slate-950 text-slate-200"
      >
        <LoaderCircle className="ml-3 h-6 w-6 animate-spin text-cyan-400" />
        جارٍ تحميل صفحة استيراد الدروس...
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main
        dir="rtl"
        className="flex min-h-[60vh] items-center justify-center bg-slate-950 px-4 text-center text-slate-200"
      >
        <div className="max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-cyan-400" />
          <h1 className="text-xl font-bold">الوصول مخصص للإدارة</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            لازم تكون داخل بحساب إداري باش تستعمل استيراد الدروس.
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950"
          >
            الرجوع إلى لوحة الإدارة
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-3 inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"
            >
              <ArrowRight className="h-4 w-4" />
              لوحة الإدارة
            </Link>

            <h1 className="flex items-center gap-3 text-2xl font-black sm:text-3xl">
              <BookOpen className="h-8 w-8 text-cyan-400" />
              استيراد الدروس والملخصات
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
              ارفع ملفاتك، حدّد الشعبة والمادة، استخرج النص وراجعه قبل إضافته
              إلى محتوى المنصة. لا يتم نشر أي درس تلقائيًا.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadRecords().catch((error) => {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "تعذر تحديث القائمة."
                );
              })
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث القائمة
          </button>
        </header>

        {errorMessage && (
          <div className="flex items-start gap-3 whitespace-pre-line rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-200">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {message && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-black/10 sm:p-7">
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-2xl bg-cyan-400/10 p-3">
              <CloudUpload className="h-6 w-6 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">رفع ملفات جديدة</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                يمكنك اختيار عدة ملفات في نفس الوقت. الحجم الأقصى للملف الواحد
                50 MB.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                الشعبة
              </label>
              <select
                value={stream}
                onChange={(event) => handleStreamChange(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              >
                <option value="">اختار الشعبة</option>
                {STREAMS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                المادة
              </label>
              <select
                value={subjectId}
                onChange={(event) => handleSubjectChange(event.target.value)}
                disabled={!stream}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-cyan-400"
              >
                <option value="">اختار المادة</option>
                {filteredSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              {stream && filteredSubjects.length === 0 && (
                <p className="mt-2 text-xs text-amber-300">
                  ما لقيناش مواد مسجلة لهذه الشعبة في جدول subjects.
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                الدورة المرتبطة (اختياري)
              </label>
              <select
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
                disabled={!subjectId}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-cyan-400"
              >
                <option value="">بدون دورة محددة الآن</option>
                {filteredCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                عنوان الدرس (اختياري)
              </label>
              <input
                value={lessonTitle}
                onChange={(event) => setLessonTitle(event.target.value)}
                placeholder="إذا خليته فارغًا، نستعمل اسم الملف"
                maxLength={200}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-cyan-400"
              />
              <p className="mt-2 text-xs text-slate-500">
                العنوان المدخل هنا يُطبّق على كل الملفات المختارة في هذه الدفعة.
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.odt,.rtf,.jpg,.jpeg,.png,.webp"
            onChange={(event) => addFiles(event.target.files)}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-6 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cyan-400/30 bg-cyan-400/[0.04] px-5 py-9 text-center transition hover:border-cyan-300/70 hover:bg-cyan-400/[0.08]"
          >
            <Upload className="mb-3 h-9 w-9 text-cyan-300" />
            <span className="font-bold">اضغط لاختيار الملفات</span>
            <span className="mt-2 text-xs leading-6 text-slate-500">
              PDF، Word، PowerPoint، TXT، وصور
            </span>
          </button>

          {selectedFiles.length > 0 && (
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold">
                  الملفات المختارة ({selectedFiles.length})
                </h3>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => setSelectedFiles([])}
                  className="text-sm text-rose-300 hover:text-rose-200 disabled:opacity-40"
                >
                  مسح القائمة
                </button>
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/70 p-3"
                  >
                    <FileText className="h-5 w-5 shrink-0 text-cyan-300" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium">
                        {file.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatSize(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`حذف ${file.name} من قائمة الرفع`}
                      disabled={uploading}
                      onClick={() =>
                        setSelectedFiles((previous) =>
                          previous.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                      className="rounded-lg p-2 text-slate-500 hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={uploading}
                onClick={() => void handleUpload()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3.5 font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                    جارٍ رفع الملفات وحفظها...
                  </>
                ) : (
                  <>
                    <CloudUpload className="h-5 w-5" />
                    رفع وحفظ للمراجعة
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 sm:p-7">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">ملفات الاستيراد</h2>
              <p className="mt-1 text-sm text-slate-400">
                استخرج النص من الملفات المدعومة، ثم افتح المعاينة لمراجعته.
              </p>
            </div>
            <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
              {records.length} ملف
            </span>
          </div>

          {records.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center">
              <File className="mx-auto mb-3 h-9 w-9 text-slate-600" />
              <p className="font-semibold text-slate-300">
                مازال ما رفعت حتى ملف
              </p>
              <p className="mt-2 text-sm text-slate-500">
                الملفات الجديدة تظهر هنا بعد تسجيلها بنجاح.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => {
                const extension = fileExtension(record.file_name);
                const canExtract = EXTRACTABLE_EXTENSIONS.includes(extension);
                const isExtracting = extractingId === record.id;
                const hasExtractedText = Boolean(
                  record.extracted_content?.trim()
                );
                const isPreviewOpen = previewId === record.id;

                return (
                  <article
                    key={record.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <div className="h-fit rounded-xl bg-cyan-400/10 p-3">
                          <FileText className="h-5 w-5 text-cyan-300" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="break-words font-bold">
                            {record.file_name}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatSize(record.file_size)} ·{" "}
                            {new Date(record.created_at).toLocaleString(
                              "ar-DZ"
                            )}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {record.detected_stream && (
                              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                                {record.detected_stream}
                              </span>
                            )}
                            {record.detected_subject && (
                              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                                {record.detected_subject}
                              </span>
                            )}
                            {record.detected_course && (
                              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                                {record.detected_course}
                              </span>
                            )}
                          </div>

                          {record.detected_lesson_title && (
                            <p className="mt-3 text-sm text-slate-300">
                              العنوان: {record.detected_lesson_title}
                            </p>
                          )}

                          {record.review_notes && (
                            <p className="mt-2 text-xs leading-6 text-slate-500">
                              {record.review_notes}
                            </p>
                          )}

                          {hasExtractedText && (
                            <p className="mt-2 text-xs text-emerald-300">
                              <CheckCircle2 className="ml-1 inline h-3.5 w-3.5" />
                              النص المستخرج محفوظ ({record.extracted_content!.length.toLocaleString("ar-DZ")} حرف)
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                            record.status === "approved"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : record.status === "rejected" ||
                                  record.status === "failed"
                                ? "bg-rose-400/10 text-rose-300"
                                : "bg-amber-400/10 text-amber-200"
                          }`}
                        >
                          {statusLabel(record.status)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-4">
                      {canExtract && record.status !== "approved" && (
                        <button
                          type="button"
                          disabled={Boolean(extractingId)}
                          onClick={() => void handleExtract(record)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isExtracting ? (
                            <>
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                              جارٍ استخراج النص...
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4" />
                              {hasExtractedText
                                ? "إعادة استخراج النص"
                                : "استخراج النص"}
                            </>
                          )}
                        </button>
                      )}

                      {hasExtractedText && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewId(isPreviewOpen ? null : record.id)
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
                        >
                          {isPreviewOpen ? (
                            <>
                              <EyeOff className="h-4 w-4" />
                              إخفاء المعاينة
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4" />
                              معاينة النص
                            </>
                          )}
                        </button>
                      )}

                      {record.status !== "approved" && (
                        <button
                          type="button"
                          disabled={Boolean(extractingId)}
                          onClick={() => void deleteImport(record)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-400/20 px-4 py-2.5 text-sm text-rose-300 hover:bg-rose-400/10 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف
                        </button>
                      )}
                    </div>

                    {isPreviewOpen && hasExtractedText && (
                      <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-slate-950 p-4">
                        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <h4 className="font-bold text-cyan-200">
                            معاينة النص المستخرج
                          </h4>
                          <span className="text-xs text-slate-500">
                            للقراءة والمراجعة فقط — لم يُنشر الدرس
                          </span>
                        </div>

                        <textarea
                          readOnly
                          value={record.extracted_content ?? ""}
                          dir="auto"
                          spellCheck={false}
                          className="min-h-64 w-full resize-y rounded-xl border border-white/10 bg-slate-900 p-4 text-sm leading-7 text-slate-200 outline-none focus:border-cyan-400"
                          aria-label={`معاينة النص المستخرج من ${record.file_name}`}
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const content = record.extracted_content ?? "";
                            void navigator.clipboard
                              .writeText(content)
                              .then(() => {
                                setErrorMessage("");
                                setMessage("تم نسخ النص المستخرج.");
                              })
                              .catch(() => {
                                setErrorMessage(
                                  "تعذر النسخ التلقائي. تقدر تحدد النص من المعاينة وتنسخه يدويًا."
                                );
                              });
                          }}
                          className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
                        >
                          نسخ النص
                        </button>
                      </div>
                    )}

                    {!canExtract && record.status !== "approved" && (
                      <p className="mt-3 text-xs leading-6 text-amber-200/80">
                        الملف محفوظ. استخراج النص لهذه الصيغة لم يُفعّل بعد.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="flex items-start gap-2 text-xs leading-6 text-slate-500">
          <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-cyan-400" />
          الملفات محفوظة في مخزن خاص. استخراج النص لا ينشئ درسًا ولا ينشره.
          ملفات PDF المصوّرة تحتاج إلى OCR، وسيتم تجهيز دعمها في مرحلة منفصلة.
        </p>
      </div>
    </main>
  );
}
