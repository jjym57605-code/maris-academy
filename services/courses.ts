import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Course,
  Lesson,
  Subject,
  Quiz,
} from "@/types/database";

// ══════════════════════════════════════════════════════
// خدمة الدروس والدورات — الشعبة ← المادة ← الدورة ← الدرس
// ══════════════════════════════════════════════════════

export interface CourseWithMeta extends Course {
  subject: Subject | null;
  lessonsCount: number;
  completedLessons: number;

  /** نسبة تقدم الطالب في الدورة (0–100) */
  progressPercent: number;
}

/** كل الدورات مع تقدم الطالب الحقيقي في كل واحدة */
export async function listCoursesWithProgress(
  supabase: SupabaseClient,
  userId: string,
  stream?: string | null
): Promise<CourseWithMeta[]> {
  let subjectsQuery = supabase
    .from("subjects")
    .select("*")
    .order("name");

  // المواد العامة (stream = null) تظهر للجميع
  // + مواد شعبة الطالب
  if (stream) {
    subjectsQuery = subjectsQuery.or(
      `stream.is.null,stream.eq.${stream}`
    );
  }

  const {
    data: subjects,
    error: subjectsError,
  } = await subjectsQuery;

  if (subjectsError) throw subjectsError;

  const subjectIds = (subjects ?? []).map(
    (s) => s.id
  );

  if (subjectIds.length === 0) return [];

  const [
    coursesRes,
    lessonsRes,
    progressRes,
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .in("subject_id", subjectIds)
      .order("created_at"),

    supabase
      .from("lessons")
      .select("id, course_id"),

    supabase
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", userId),
  ]);

  if (coursesRes.error) throw coursesRes.error;
  if (lessonsRes.error) throw lessonsRes.error;
  if (progressRes.error) throw progressRes.error;

  const subjectMap = new Map(
    (subjects ?? []).map((s) => [
      s.id,
      s as Subject,
    ])
  );

  const completedSet = new Set(
    (progressRes.data ?? []).map(
      (p) => p.lesson_id
    )
  );

  return (coursesRes.data ?? []).map((course) => {
    const courseLessons = (
      lessonsRes.data ?? []
    ).filter(
      (l) => l.course_id === course.id
    );

    const completed = courseLessons.filter(
      (l) => completedSet.has(l.id)
    ).length;

    return {
      ...(course as Course),

      subject:
        subjectMap.get(course.subject_id) ??
        null,

      lessonsCount:
        courseLessons.length,

      completedLessons:
        completed,

      progressPercent:
        courseLessons.length > 0
          ? Math.round(
              (completed /
                courseLessons.length) *
                100
            )
          : 0,
    };
  });
}

/** جلب دورة واحدة مع المادة */
export async function getCourse(
  supabase: SupabaseClient,
  courseId: string
): Promise<
  (Course & {
    subject: Subject | null;
  }) | null
> {
  const {
    data,
    error,
  } = await supabase
    .from("courses")
    .select("*, subject:subjects(*)")
    .eq("id", courseId)
    .maybeSingle();

  if (error) throw error;

  return data as
    | (Course & {
        subject: Subject | null;
      })
    | null;
}

/** جلب دروس الدورة مرتبة */
export async function getCourseLessons(
  supabase: SupabaseClient,
  courseId: string
): Promise<Lesson[]> {
  const {
    data,
    error,
  } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index")
    .order("created_at");

  if (error) throw error;

  return (data ?? []) as Lesson[];
}

/** جلب اختبارات الدورة */
export async function getCourseQuizzes(
  supabase: SupabaseClient,
  courseId: string
): Promise<Quiz[]> {
  const {
    data,
    error,
  } = await supabase
    .from("quizzes")
    .select(
      "id, course_id, title, description, created_at"
    )
    .eq("course_id", courseId)
    .order("created_at");

  if (error) throw error;

  return (data ?? []) as Quiz[];
}

/** جلب IDs الدروس المكتملة للطالب */
export async function getCompletedLessonIds(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const {
    data,
    error,
  } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .eq("user_id", userId);

  if (error) throw error;

  return new Set(
    (data ?? []).map(
      (p) => p.lesson_id
    )
  );
}

/**
 * أول درس غير مكتمل للطالب
 * لبطاقة "تابع التعلم".
 */
export async function getNextLesson(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  lesson: Lesson;
  course: Course | null;
} | null> {
  const {
    data: lessons,
    error,
  } = await supabase
    .from("lessons")
    .select("*")
    .order("order_index")
    .order("created_at");

  if (error) throw error;

  if (
    !lessons ||
    lessons.length === 0
  ) {
    return null;
  }

  const completed =
    await getCompletedLessonIds(
      supabase,
      userId
    );

  const next = (
    lessons as Lesson[]
  ).find(
    (lesson) =>
      !completed.has(lesson.id)
  );

  if (!next) return null;

  const course = await getCourse(
    supabase,
    next.course_id
  );

  return {
    lesson: next,
    course,
  };
}