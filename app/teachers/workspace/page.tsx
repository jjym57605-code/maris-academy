
"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";

type TeacherApplication = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  subject: string;
  stream: string;
  bio: string;
  status: string;
  admin_note: string | null;
};

type Subject = {
  id: string;
  name: string;
};

type CourseStatus = "draft" | "pending" | "approved" | "rejected";

type TeacherCourse = {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  is_free: boolean;
  price: number | null;
  is_published: boolean;
  review_status: CourseStatus;
  created_at: string;
};

type TeacherLesson = {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  resources: unknown;
  order_index: number;
  created_at: string;
  video_url: string | null;
};

type PageState =
  | "loading"
  | "logged_out"
  | "not_found"
  | "pending"
  | "rejected"
  | "approved"
  | "error";

const LESSON_SELECT =
  "id, course_id, title, content, resources, order_index, created_at, video_url";

function resourceLines(resources: unknown): string[] {
  if (Array.isArray(resources)) {
    return resources
      .map((item) => {
        if (typeof item === "string") return item;

        if (
          item &&
          typeof item === "object" &&
          "url" in item &&
          typeof item.url === "string"
        ) {
          return item.url;
        }

        return "";
      })
      .filter(Boolean);
  }

  if (typeof resources === "string" && resources.trim()) {
    return [resources];
  }

  return [];
}

function validHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export default function TeacherWorkspacePage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [teacher, setTeacher] = useState<TeacherApplication | null>(null);
  const [userId, setUserId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [contentMessage, setContentMessage] = useState("");
  const [contentError, setContentError] = useState("");
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);

  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [lessonSaving, setLessonSaving] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonResources, setLessonResources] = useState("");

  useEffect(() => {
    let active = true;

    async function loadWorkspace() {
      setPageState("loading");
      setErrorMessage("");
      setContentError("");

      const supabase = getSupabase();

      if (!supabase) {
        if (active) {
          setErrorMessage("الاتصال بقاعدة البيانات غير متاح حاليًا.");
          setPageState("error");
        }
        return;
      }

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          if (authError.name === "AuthSessionMissingError") {
            if (active) setPageState("logged_out");
            return;
          }
          throw authError;
        }

        if (!user) {
          if (active) setPageState("logged_out");
          return;
        }

        const { data, error } = await supabase
          .from("teacher_applications")
          .select(
            "id, first_name, last_name, email, subject, stream, bio, status, admin_note"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;
        if (!active) return;

        if (!data) {
          setPageState("not_found");
          return;
        }

        const application = data as TeacherApplication;
        setTeacher(application);
        setUserId(user.id);

        if (application.status === "pending") {
          setPageState("pending");
          return;
        }

        if (application.status === "rejected") {
          setPageState("rejected");
          return;
        }

        if (application.status !== "approved") {
          setErrorMessage("حالة طلبك غير معروفة. تواصل مع الإدارة.");
          setPageState("error");
          return;
        }

        const [subjectsResult, coursesResult] = await Promise.all([
          supabase.from("subjects").select("id, name").order("name"),
          supabase
            .from("courses")
            .select(
              "id, subject_id, title, description, thumbnail_url, is_free, price, is_published, review_status, created_at"
            )
            .eq("teacher_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        if (!active) return;

        if (subjectsResult.error) {
          setContentError(
            "تعذّر تحميل قائمة المواد. حدّث الصفحة وحاول مجددًا."
          );
        } else {
          setSubjects((subjectsResult.data ?? []) as Subject[]);
        }

        if (coursesResult.error) {
          setContentError((current) =>
            current
              ? `${current} وتعذّر تحميل دوراتك.`
              : "تعذّر تحميل دوراتك. حاول تحديث الصفحة."
          );
        } else {
          setCourses((coursesResult.data ?? []) as TeacherCourse[]);
        }

        setPageState("approved");
      } catch (error: unknown) {
        console.error("Teacher workspace error:", error);

        if (active) {
          setErrorMessage(
            "تعذّر التحقق من حسابك أو طلبك. تحقق من الاتصال وحاول مجددًا."
          );
          setPageState("error");
        }
      }
    }

    void loadWorkspace();

    return () => {
      active = false;
    };
  }, [retry]);

  async function openCourseLessons(course: TeacherCourse) {
    setContentError("");
    setContentMessage("");
    setSelectedCourseId(course.id);
    setLessons([]);
    setLoadingLessons(true);
    setEditingLessonId(null);
    resetLessonForm();

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("الاتصال بقاعدة البيانات غير متاح.");

      const { data, error } = await supabase
        .from("lessons")
        .select(LESSON_SELECT)
        .eq("course_id", course.id)
        .order("order_index", { ascending: true });

      if (error) throw error;

      setLessons((data ?? []) as TeacherLesson[]);
    } catch (error: unknown) {
      console.error("Load teacher lessons error:", error);
      setContentError(
        error instanceof Error
          ? error.message
          : "تعذّر تحميل دروس الدورة."
      );
    } finally {
      setLoadingLessons(false);
    }
  }

  function resetLessonForm() {
    setLessonTitle("");
    setLessonContent("");
    setLessonVideoUrl("");
    setLessonResources("");
    setEditingLessonId(null);
  }

  function startEditingLesson(lesson: TeacherLesson) {
    setEditingLessonId(lesson.id);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.content ?? "");
    setLessonVideoUrl(lesson.video_url ?? "");
    setLessonResources(resourceLines(lesson.resources).join("\n"));
    setContentError("");
    setContentMessage("");
  }

  async function handleCreateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContentMessage("");
    setContentError("");

    const supabase = getSupabase();

    if (!supabase || !userId) {
      setContentError("انتهت الجلسة أو تعذّر الاتصال. أعد تسجيل الدخول.");
      return;
    }

    if (pageState !== "approved" || teacher?.status !== "approved") {
      setContentError("إنشاء الدورات متاح للأساتذة المقبولين فقط.");
      return;
    }

    if (!subjectId || !title.trim()) {
      setContentError("اختَر المادة واكتب عنوان الدورة.");
      return;
    }

    const parsedPrice = isFree ? 0 : Number(price);

    if (
      !isFree &&
      (!price.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0)
    ) {
      setContentError("أدخل سعرًا صحيحًا وأكبر من صفر للدورة المدفوعة.");
      return;
    }

    if (thumbnailUrl.trim() && !validHttpUrl(thumbnailUrl.trim())) {
      setContentError("رابط صورة الدورة غير صالح.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user || user.id !== userId) {
        throw new Error("انتهت الجلسة أو تغيّر الحساب. سجّل الدخول مجددًا.");
      }

      const { data: application, error: applicationError } = await supabase
        .from("teacher_applications")
        .select("status")
        .eq("id", user.id)
        .maybeSingle();

      if (applicationError) throw applicationError;

      if (application?.status !== "approved") {
        setContentError(
          "حالة اعتمادك تغيّرت. حدّث الصفحة للتأكد من صلاحياتك."
        );
        return;
      }

      const { data: createdCourse, error: insertError } = await supabase
        .from("courses")
        .insert({
          teacher_id: user.id,
          subject_id: subjectId,
          title: title.trim(),
          description: description.trim() || null,
          thumbnail_url: thumbnailUrl.trim() || null,
          is_free: isFree,
          price: parsedPrice,
          is_published: false,
          review_status: "draft",
          reviewed_by: null,
        })
        .select(
          "id, subject_id, title, description, thumbnail_url, is_free, price, is_published, review_status, created_at"
        )
        .single();

      if (insertError) throw insertError;

      const course = createdCourse as TeacherCourse;

      setCourses((current) => [course, ...current]);
      setTitle("");
      setDescription("");
      setThumbnailUrl("");
      setIsFree(true);
      setPrice("");
      setSubjectId("");
      setShowCourseForm(false);
      setContentMessage(
        "تحفظت الدورة كمسودة. افتحها لإضافة الدروس، ثم أرسلها للمراجعة."
      );

      await openCourseLessons(course);
    } catch (error: unknown) {
      console.error("Create teacher course error:", error);
      setContentError(
        error instanceof Error
          ? error.message
          : "تعذّر إنشاء الدورة. تحقق من صلاحيات قاعدة البيانات."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContentError("");
    setContentMessage("");

    const supabase = getSupabase();
    const selectedCourse = courses.find(
      (course) => course.id === selectedCourseId
    );

    if (!supabase || !userId || !selectedCourse) {
      setContentError("اختَر دورة صحيحة ثم حاول مجددًا.");
      return;
    }

    if (
      selectedCourse.review_status !== "draft" &&
      selectedCourse.review_status !== "pending"
    ) {
      setContentError("تعديل الدروس متاح للدورات قيد الإعداد أو المراجعة فقط.");
      return;
    }

    if (!lessonTitle.trim()) {
      setContentError("اكتب عنوان الدرس.");
      return;
    }

    if (!lessonContent.trim() && !lessonVideoUrl.trim()) {
      setContentError("أضف محتوى الدرس أو رابط الفيديو على الأقل.");
      return;
    }

    if (lessonVideoUrl.trim() && !validHttpUrl(lessonVideoUrl.trim())) {
      setContentError("رابط الفيديو غير صالح. استعمل رابط HTTP أو HTTPS.");
      return;
    }

    const resourceUrls = lessonResources
      .split("\n")
      .map((url) => url.trim())
      .filter(Boolean);

    if (resourceUrls.some((url) => !validHttpUrl(url))) {
      setContentError(
        "أحد روابط الموارد غير صالح. ضع كل رابط صحيح في سطر مستقل."
      );
      return;
    }

    setLessonSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user || user.id !== userId) {
        throw new Error("انتهت الجلسة. سجّل الدخول مجددًا.");
      }

      const lessonData = {
        title: lessonTitle.trim(),
        content: lessonContent.trim() || null,
        video_url: lessonVideoUrl.trim() || null,
        resources: resourceUrls,
      };

      if (editingLessonId) {
        const { error } = await supabase
          .from("lessons")
          .update(lessonData)
          .eq("id", editingLessonId)
          .eq("course_id", selectedCourseId);

        if (error) throw error;

        setContentMessage("تم تحديث الدرس.");
      } else {
        const nextOrder =
          lessons.reduce(
            (maximum, lesson) => Math.max(maximum, lesson.order_index),
            0
          ) + 1;

        const { error } = await supabase.from("lessons").insert({
          course_id: selectedCourseId,
          ...lessonData,
          order_index: nextOrder,
        });

        if (error) throw error;

        setContentMessage("تمت إضافة الدرس للدورة.");
      }

      const { data, error: loadError } = await supabase
        .from("lessons")
        .select(LESSON_SELECT)
        .eq("course_id", selectedCourseId)
        .order("order_index", { ascending: true });

      if (loadError) throw loadError;

      setLessons((data ?? []) as TeacherLesson[]);
      resetLessonForm();
    } catch (error: unknown) {
      console.error("Save teacher lesson error:", error);
      setContentError(
        error instanceof Error
          ? error.message
          : "تعذّر حفظ الدرس. تحقق من صلاحيات قاعدة البيانات."
      );
    } finally {
      setLessonSaving(false);
    }
  }

  async function handleDeleteLesson(lesson: TeacherLesson) {
    const supabase = getSupabase();

    if (!supabase || !selectedCourseId) {
      setContentError("الاتصال بقاعدة البيانات غير متاح.");
      return;
    }

    if (
      !window.confirm(`هل تريد حذف الدرس «${lesson.title}»؟`)
    ) {
      return;
    }

    setContentError("");
    setContentMessage("");

    try {
      const { error } = await supabase
        .from("lessons")
        .delete()
        .eq("id", lesson.id)
        .eq("course_id", selectedCourseId);

      if (error) throw error;

      setLessons((current) =>
        current.filter((item) => item.id !== lesson.id)
      );

      if (editingLessonId === lesson.id) resetLessonForm();

      setContentMessage("تم حذف الدرس.");
    } catch (error: unknown) {
      console.error("Delete teacher lesson error:", error);
      setContentError(
        error instanceof Error ? error.message : "تعذّر حذف الدرس."
      );
    }
  }

  async function handleSubmitCourse(course: TeacherCourse) {
    const supabase = getSupabase();

    setContentError("");
    setContentMessage("");

    if (!supabase || !userId) {
      setContentError("انتهت الجلسة أو تعذّر الاتصال.");
      return;
    }

    if (course.review_status !== "draft") {
      setContentError("هذه الدورة ليست مسودة قابلة للإرسال.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user || user.id !== userId) {
        throw new Error("انتهت الجلسة. سجّل الدخول مجددًا.");
      }

      const { count, error: countError } = await supabase
        .from("lessons")
        .select("id", { count: "exact", head: true })
        .eq("course_id", course.id);

      if (countError) throw countError;

      if (!count || count < 1) {
        setContentError(
          "زيد درسًا واحدًا على الأقل قبل إرسال الدورة للمراجعة."
        );
        setSelectedCourseId(course.id);
        await openCourseLessons(course);
        return;
      }

      const { data, error } = await supabase
        .from("courses")
        .update({
          review_status: "pending",
          is_published: false,
          reviewed_by: null,
        })
        .eq("id", course.id)
        .eq("teacher_id", user.id)
        .eq("review_status", "draft")
        .select(
          "id, subject_id, title, description, thumbnail_url, is_free, price, is_published, review_status, created_at"
        )
        .single();

      if (error) throw error;

      const updatedCourse = data as TeacherCourse;

      setCourses((current) =>
        current.map((item) =>
          item.id === updatedCourse.id ? updatedCourse : item
        )
      );

      setContentMessage(
        "تم إرسال الدورة كاملة للإدارة. ستبقى غير منشورة حتى تتم الموافقة عليها ونشرها."
      );
    } catch (error: unknown) {
      console.error("Submit teacher course error:", error);
      setContentError(
        error instanceof Error
          ? error.message
          : "تعذّر إرسال الدورة للمراجعة."
      );
    } finally {
      setSaving(false);
    }
  }

  const buttonClass =
    "inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-cyan-400/40 hover:text-cyan-300";

  function StatusScreen({
    icon,
    title,
    description,
    children,
  }: {
    icon: string;
    title: string;
    description: string;
    children?: React.ReactNode;
  }) {
    return (
      <main
        dir="rtl"
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#061426] px-4 py-12 text-white"
      >
        <div
          className="pointer-events-none absolute -top-32 right-1/4 h-80 w-80 rounded-full bg-cyan-400/10 blur-[100px]"
          aria-hidden
        />
        <section className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.035] p-7 text-center sm:p-10">
          <div className="text-5xl" aria-hidden>{icon}</div>
          <h1 className="mt-5 text-2xl font-black">{title}</h1>
          <p className="mt-4 text-sm leading-8 text-white/65">{description}</p>
          {children && (
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {children}
            </div>
          )}
          <p className="mt-8 text-xs text-white/35">MARIS ACADEMY ²⁰²⁷</p>
        </section>
      </main>
    );
  }

  if (pageState === "loading") {
    return (
      <StatusScreen
        icon="🌊"
        title="جارٍ التحقق من حسابك"
        description="نراجع حالة طلب الأستاذ قبل فتح مساحة العمل."
      />
    );
  }

  if (pageState === "logged_out") {
    return (
      <StatusScreen
        icon="🔐"
        title="سجّل الدخول أولًا"
        description="ادخل بحساب MARIS نفسه الذي استعملته عند تقديم طلب الأستاذ."
      >
        <Link href="/login" className={buttonClass}>تسجيل الدخول</Link>
        <Link href="/teachers" className={buttonClass}>فضاء الأساتذة</Link>
      </StatusScreen>
    );
  }

  if (pageState === "not_found") {
    return (
      <StatusScreen
        icon="📋"
        title="ما لقيناش طلب أستاذ"
        description="هذا الحساب ما عندوش طلب انضمام مرتبط به. تأكد أنك دخلت بالحساب الصحيح."
      >
        <Link href="/teachers/register" className={buttonClass}>تقديم طلب</Link>
        <Link href="/teachers" className={buttonClass}>رجوع</Link>
      </StatusScreen>
    );
  }

  if (pageState === "pending") {
    return (
      <StatusScreen
        icon="⏳"
        title="طلبك قيد المراجعة"
        description="الإدارة ما زالت تراجع طلب انضمامك. الدخول يتفعّل بعد الموافقة."
      >
        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
          className={buttonClass}
        >
          تحديث الحالة
        </button>
        <Link href="/teachers" className={buttonClass}>فضاء الأساتذة</Link>
      </StatusScreen>
    );
  }

  if (pageState === "rejected") {
    return (
      <StatusScreen
        icon="📄"
        title="طلب الانضمام غير مقبول"
        description="حاليًا ما عندكش صلاحية الدخول إلى مساحة الأستاذ. إذا تحتاج توضيحًا، تواصل مع الإدارة."
      >
        {teacher?.admin_note && (
          <p className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white/70">
            <span className="font-bold text-cyan-300">ملاحظة الإدارة:</span>
            <br />
            {teacher.admin_note}
          </p>
        )}
        <Link href="/teachers" className={buttonClass}>رجوع</Link>
      </StatusScreen>
    );
  }

  if (pageState === "error") {
    return (
      <StatusScreen
        icon="⚠️"
        title="تعذّر فتح فضاء الأستاذ"
        description={errorMessage || "حدث خطأ غير متوقع."}
      >
        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
          className={buttonClass}
        >
          إعادة المحاولة
        </button>
        <Link href="/" className={buttonClass}>الرئيسية</Link>
      </StatusScreen>
    );
  }

  const selectedCourse = courses.find(
    (course) => course.id === selectedCourseId
  );

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#061426] text-white"
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-cyan-400/10 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link href="/" className="text-lg font-black sm:text-xl">
            MARIS <span className="text-cyan-400">ACADEMY ²⁰²⁷</span>
          </Link>
          <Link href="/teachers" className={buttonClass}>الصفحة العامة</Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8">
          <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300">
            🎓 فضاء الأستاذ
          </span>
          <h1 className="mt-5 text-3xl font-black sm:text-4xl">
            مرحبًا أستاذ {teacher?.first_name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
            حضّر دوراتك ودروسك على راحتك، ثم أرسل الدورة كاملة للإدارة
            للمراجعة قبل نشرها.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <h2 className="text-xl font-black">معلوماتك المهنية</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoItem label="الاسم واللقب">
                {teacher?.first_name} {teacher?.last_name}
              </InfoItem>
              <InfoItem label="البريد الإلكتروني">{teacher?.email}</InfoItem>
              <InfoItem label="المادة">{teacher?.subject}</InfoItem>
              <InfoItem label="الشعبة">{teacher?.stream}</InfoItem>
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-[#071a2d]/80 p-5">
              <h3 className="text-sm font-bold text-cyan-300">نبذة عنك</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-white/65">
                {teacher?.bio || "لم تتم إضافة نبذة."}
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-cyan-400/15 bg-gradient-to-bl from-cyan-400/[0.08] to-white/[0.02] p-6 sm:p-8">
            <div className="text-3xl" aria-hidden>📚</div>
            <h2 className="mt-4 text-xl font-black">أدواتك التعليمية</h2>
            <p className="mt-3 text-sm leading-8 text-white/60">
              أنشئ مسودة، أضف دروسها وروابط الفيديو والموارد، ثم أرسلها
              للمراجعة بعد إكمالها.
            </p>

            <button
              type="button"
              onClick={() => {
                setContentMessage("");
                setContentError("");
                setShowCourseForm((value) => !value);
              }}
              className="mt-6 w-full rounded-xl bg-cyan-400 px-5 py-3 font-black text-[#061426] transition hover:bg-cyan-300"
            >
              {showCourseForm ? "إغلاق النموذج" : "＋ إنشاء دورة جديدة"}
            </button>

            <div className="mt-4 space-y-3">
              <WorkspaceItem icon="🎬" title="إعداد الريلزات" description="سيُضاف في خطوة لاحقة" />
              <WorkspaceItem icon="🧩" title="إعداد الاختبارات" description="سيُضاف في خطوة لاحقة" />
            </div>

            <div className="mt-6 rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-4 text-xs leading-7 text-cyan-100/80">
              موافقة الإدارة على طلب الأستاذ لا تمنح صلاحيات الإدارة أو النشر التلقائي.
            </div>
          </section>
        </div>

        {showCourseForm && (
          <section className="mt-6 rounded-3xl border border-cyan-400/20 bg-white/[0.035] p-6 sm:p-8">
            <h2 className="text-xl font-black">إنشاء دورة جديدة</h2>
            <p className="mt-2 text-sm leading-7 text-white/55">
              تُحفظ الدورة كمسودة أولًا، ولن تُرسل للمراجعة حتى تضيف دروسها وتضغط على زر الإرسال.
            </p>

            <form onSubmit={handleCreateCourse} className="mt-6 space-y-5">
              <div>
                <label htmlFor="course-subject" className="mb-2 block text-sm font-bold">
                  المادة *
                </label>
                <select
                  id="course-subject"
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#071a2d] px-4 py-3 text-white outline-none focus:border-cyan-400"
                >
                  <option value="">اختَر المادة</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                {subjects.length === 0 && (
                  <p className="mt-2 text-xs text-amber-300">
                    قائمة المواد فارغة أو لم تُحمّل. حدّث الصفحة أو تحقق من جدول المواد.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="course-title" className="mb-2 block text-sm font-bold">
                  عنوان الدورة *
                </label>
                <input
                  id="course-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  maxLength={160}
                  placeholder="مثال: مراجعة شاملة في الرياضيات"
                  className="w-full rounded-xl border border-white/10 bg-[#071a2d] px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-cyan-400"
                />
              </div>

              <div>
                <label htmlFor="course-description" className="mb-2 block text-sm font-bold">
                  وصف الدورة
                </label>
                <textarea
                  id="course-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  maxLength={5000}
                  placeholder="اشرح محتوى الدورة وما سيتعلمه الطالب..."
                  className="w-full resize-y rounded-xl border border-white/10 bg-[#071a2d] px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-cyan-400"
                />
              </div>

              <div>
                <label htmlFor="course-thumbnail" className="mb-2 block text-sm font-bold">
                  رابط صورة الدورة (اختياري)
                </label>
                <input
                  id="course-thumbnail"
                  type="url"
                  value={thumbnailUrl}
                  onChange={(event) => setThumbnailUrl(event.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/10 bg-[#071a2d] px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-cyan-400"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#071a2d]/80 p-4">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(event) => setIsFree(event.target.checked)}
                    className="h-4 w-4 accent-cyan-400"
                  />
                  دورة مجانية
                </label>

                {!isFree && (
                  <div className="mt-4">
                    <label htmlFor="course-price" className="mb-2 block text-sm font-bold">
                      السعر *
                    </label>
                    <input
                      id="course-price"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      required
                      placeholder="أدخل السعر"
                      className="w-full rounded-xl border border-white/10 bg-[#061426] px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-cyan-400"
                    />
                    <p className="mt-2 text-xs text-white/40">
                      العملة وطريقة الدفع تُحدّدان حسب إعدادات المنصة.
                    </p>
                  </div>
                )}
              </div>

              {contentError && (
                <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-7 text-red-200">
                  {contentError}
                </p>
              )}

              <button
                type="submit"
                disabled={saving || subjects.length === 0}
                className="w-full rounded-xl bg-cyan-400 px-5 py-3 font-black text-[#061426] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "جارٍ حفظ المسودة..." : "حفظ الدورة كمسودة"}
              </button>
            </form>
          </section>
        )}

        {contentError && !showCourseForm && (
          <p role="alert" className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-7 text-red-200">
            {contentError}
          </p>
        )}

        {contentMessage && !showCourseForm && (
          <p role="status" className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-7 text-emerald-200">
            {contentMessage}
          </p>
        )}

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">دوراتي</h2>
              <p className="mt-2 text-sm text-white/50">
                المسودات والدورات التي أرسلتها للمراجعة.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold">
              {courses.length} دورة
            </span>
          </div>

          {courses.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-8 text-center">
              <div className="text-3xl" aria-hidden>📚</div>
              <p className="mt-3 font-bold">ما أنشأت حتى دورة حاليًا</p>
              <p className="mt-2 text-sm text-white/45">
                اضغط على «إنشاء دورة جديدة» للبدء.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {courses.map((course) => (
                <article
                  key={course.id}
                  className="rounded-2xl border border-white/10 bg-[#071a2d]/80 p-5"
                >
                  {course.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.thumbnail_url}
                      alt=""
                      className="mb-4 h-40 w-full rounded-xl object-cover"
                    />
                  )}

                  <p className="text-xs font-bold text-cyan-300">
                    {subjects.find((subject) => subject.id === course.subject_id)?.name ?? "مادة غير محددة"}
                  </p>
                  <h3 className="mt-2 text-lg font-black">{course.title}</h3>

                  {course.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/55">
                      {course.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <StatusBadge status={course.review_status} />
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/65">
                      {course.is_free ? "مجانية" : `السعر: ${course.price ?? 0}`}
                    </span>
                    {course.is_published && course.review_status === "approved" && (
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                        منشورة
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-xs text-white/35">
                    أُنشئت في {new Date(course.created_at).toLocaleDateString("ar-DZ")}
                  </p>

                  {(course.review_status === "draft" ||
                    course.review_status === "pending") && (
                    <button
                      type="button"
                      onClick={() => void openCourseLessons(course)}
                      className="mt-5 w-full rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/20"
                    >
                      📚 إدارة الدروس
                    </button>
                  )}

                  {course.review_status === "draft" && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSubmitCourse(course)}
                      className="mt-3 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-[#061426] transition hover:bg-cyan-300 disabled:opacity-50"
                    >
                      {saving ? "جارٍ الإرسال..." : "إرسال الدورة للمراجعة"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {selectedCourse && (
          <section className="mt-6 rounded-3xl border border-cyan-400/20 bg-white/[0.035] p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-cyan-300">
                  إدارة محتوى الدورة
                </span>
                <h2 className="mt-2 text-2xl font-black">
                  {selectedCourse.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-white/50">
                  أضف الدروس بالترتيب، ويمكنك تعديلها أو حذفها قبل الإرسال.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedCourseId("");
                  setLessons([]);
                  resetLessonForm();
                  setContentError("");
                  setContentMessage("");
                }}
                className={buttonClass}
              >
                إغلاق الدروس
              </button>
            </div>

            {selectedCourse.review_status !== "draft" &&
              selectedCourse.review_status !== "pending" && (
                <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                  هذه الدورة ليست في حالة تسمح بتعديل الدروس من هذا الفضاء.
                </p>
              )}

            {loadingLessons ? (
              <p className="mt-6 text-sm text-white/60">جارٍ تحميل الدروس...</p>
            ) : (
              <>
                <div className="mt-6">
                  <h3 className="text-lg font-black">
                    الدروس ({lessons.length})
                  </h3>

                  {lessons.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/50">
                      مازال ما ضفت حتى درس. استعمل النموذج لإضافة أول درس.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {lessons.map((lesson, index) => (
                        <article
                          key={lesson.id}
                          className="rounded-2xl border border-white/10 bg-[#071a2d]/80 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-cyan-300">
                                الدرس {index + 1}
                              </p>
                              <h4 className="mt-1 font-black">{lesson.title}</h4>

                              {lesson.video_url && (
                                <a
                                  href={lesson.video_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-block break-all text-sm text-cyan-200 underline"
                                >
                                  فتح رابط الفيديو
                                </a>
                              )}

                              {lesson.content && (
                                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-7 text-white/50">
                                  {lesson.content}
                                </p>
                              )}

                              {resourceLines(lesson.resources).length > 0 && (
                                <p className="mt-2 text-xs text-white/40">
                                  {resourceLines(lesson.resources).length} مورد مرفق
                                </p>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => startEditingLesson(lesson)}
                                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white/80 hover:border-cyan-400/40"
                              >
                                تعديل
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteLesson(lesson)}
                                className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-400/10"
                              >
                                حذف
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                {selectedCourse.review_status !== "draft" &&
                selectedCourse.review_status !== "pending" ? null : (
                  <form
                    onSubmit={handleSaveLesson}
                    className="mt-8 space-y-5 border-t border-white/10 pt-7"
                  >
                    <h3 className="text-lg font-black">
                      {editingLessonId ? "تعديل الدرس" : "إضافة درس جديد"}
                    </h3>

                    <div>
                      <label htmlFor="lesson-title" className="mb-2 block text-sm font-bold">
                        عنوان الدرس *
                      </label>
                      <input
                        id="lesson-title"
                        value={lessonTitle}
                        onChange={(event) => setLessonTitle(event.target.value)}
                        required
                        maxLength={200}
                        placeholder="مثال: مقدمة في الدرس الأول"
                        className="w-full rounded-xl border border-white/10 bg-[#071a2d] px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label htmlFor="lesson-content" className="mb-2 block text-sm font-bold">
                        محتوى الدرس
                      </label>
                      <textarea
                        id="lesson-content"
                        value={lessonContent}
                        onChange={(event) => setLessonContent(event.target.value)}
                        rows={6}
                        maxLength={30000}
                        placeholder="اكتب شرح الدرس هنا..."
                        className="w-full resize-y rounded-xl border border-white/10 bg-[#071a2d] px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label htmlFor="lesson-video" className="mb-2 block text-sm font-bold">
                        رابط الفيديو
                      </label>
                      <input
                        id="lesson-video"
                        type="url"
                        value={lessonVideoUrl}
                        onChange={(event) => setLessonVideoUrl(event.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-xl border border-white/10 bg-[#071a2d] px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label htmlFor="lesson-resources" className="mb-2 block text-sm font-bold">
                        روابط الموارد الإضافية
                      </label>
                      <textarea
                        id="lesson-resources"
                        value={lessonResources}
                        onChange={(event) => setLessonResources(event.target.value)}
                        rows={3}
                        placeholder={"ضع كل رابط في سطر مستقل\nhttps://..."}
                        className="w-full resize-y rounded-xl border border-white/10 bg-[#071a2d] px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-cyan-400"
                      />
                      <p className="mt-2 text-xs text-white/40">
                        يمكن إضافة روابط ملفات أو مراجع خارجية؛ كل رابط في سطر.
                      </p>
                    </div>

                    {contentError && (
                      <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-7 text-red-200">
                        {contentError}
                      </p>
                    )}

                    {contentMessage && (
                      <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-7 text-emerald-200">
                        {contentMessage}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={lessonSaving}
                        className="flex-1 rounded-xl bg-cyan-400 px-5 py-3 font-black text-[#061426] transition hover:bg-cyan-300 disabled:opacity-50"
                      >
                        {lessonSaving
                          ? "جارٍ الحفظ..."
                          : editingLessonId
                            ? "حفظ التعديلات"
                            : "＋ إضافة الدرس"}
                      </button>

                      {editingLessonId && (
                        <button
                          type="button"
                          onClick={resetLessonForm}
                          className={buttonClass}
                        >
                          إلغاء التعديل
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </>
            )}
          </section>
        )}
      </section>

      <footer className="relative z-10 border-t border-white/10 px-4 py-6 text-center text-xs text-white/35">
        MARIS ACADEMY ²⁰²⁷ — معًا من أجل تعليم أفضل
      </footer>
    </main>
  );
}

function StatusBadge({ status }: { status: CourseStatus }) {
  const styles: Record<CourseStatus, string> = {
    draft: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    pending: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    approved: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    rejected: "border-red-400/20 bg-red-400/10 text-red-200",
  };

  const labels: Record<CourseStatus, string> = {
    draft: "مسودة",
    pending: "في انتظار المراجعة",
    approved: "مقبولة",
    rejected: "مرفوضة",
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function InfoItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#071a2d]/80 p-4">
      <p className="text-xs font-semibold text-white/40">{label}</p>
      <p className="mt-2 break-words text-sm font-bold leading-7 text-white/90">
        {children}
      </p>
    </div>
  );
}

function WorkspaceItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#071a2d]/70 p-4">
      <span className="text-2xl" aria-hidden>{icon}</span>
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="mt-1 text-xs text-white/40">{description}</p>
      </div>
    </div>
  );
}
