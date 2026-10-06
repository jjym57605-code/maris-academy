// ══════════════════════════════════════════════════════
// أنواع قاعدة البيانات — MARIS ACADEMY ²⁰²⁷
// تطابق مخطط Supabase
// ══════════════════════════════════════════════════════

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  stream: string | null;
  maris_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Subject {
  id: string;
  name: string;
  stream: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  is_free: boolean;
  price: number;
  is_published: boolean;
  created_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  resources: LessonResource[];
  order_index: number;
  created_at: string;
}

export interface LessonResource {
  title: string;
  url: string;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: string;
}

export interface Quiz {
  id: string;
  course_id: string | null;
  title: string;
  description: string | null;
  created_at: string;
}

/** سؤال كما يظهر للطالب — بدون الإجابة الصحيحة */
export interface QuizQuestion {
  id: string;
  quiz_id: string;
  text: string;
  options: QuizOption[];
  order_index: number;
}

export interface QuizOption {
  key: string;
  text: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  completed_at: string;
  created_at: string;
}

export interface QuizAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option: string;
  is_correct: boolean;
}

export interface XPTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: "lesson_complete" | "quiz_complete";
  reference_id: string | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string | null;
  icon: string;
  xp_reward: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  seen_at: string | null;
}

/** Achievement يتم فتحه بعد إكمال الاختبار */
export interface SubmitQuizAchievement {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  xp_reward: number;
}

/** نتيجة دالة submit_quiz في قاعدة البيانات */
export interface SubmitQuizResult {
  attempt_id: string;
  score: number;
  correct: number;
  wrong: number;
  total: number;
  xp_earned: number;

  achievement_unlocked: boolean;
  achievement: SubmitQuizAchievement | null;
}

/** الشُعب الدراسية لبكالوريا الجزائر */
export const BAC_STREAMS = [
  "علوم تجريبية",
  "رياضيات",
  "تقني رياضي",
  "تسيير واقتصاد",
  "آداب وفلسفة",
  "لغات أجنبية",
] as const;

