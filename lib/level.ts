// ══════════════════════════════════════════════════════
// نظام المستويات المركزي — MARIS ACADEMY ²⁰²⁷
// ⚠️ هذا هو المصدر الوحيد لحساب المستوى.
// كل الصفحات (لوحة الطالب، الملف الشخصي، MARIS ID)
// تستخدم هذه الدالة نفسها لضمان توحيد النتيجة.
// ══════════════════════════════════════════════════════

export const XP_PER_LEVEL = 100;

const LEVEL_NAMES = [
  "مبتدئ", // 1
  "متعلم", // 2
  "مجتهد", // 3
  "متقدم", // 4
  "متفوق", // 5
  "متميز", // 6
  "خبير", // 7
  "عبقري", // 8
  "نجم MARIS", // 9
  "أسطورة", // 10+
] as const;

export interface LevelInfo {
  /** رقم المستوى (يبدأ من 1) */
  level: number;
  /** اسم المستوى بالعربية */
  name: string;
  /** مجموع نقاط الخبرة */
  totalXP: number;
  /** النقاط المكتسبة داخل المستوى الحالي */
  xpIntoLevel: number;
  /** النقاط اللازمة لإتمام المستوى الحالي */
  xpForNext: number;
  /** نسبة التقدم نحو المستوى التالي (0–100) */
  progress: number;
}

export function getLevelInfo(totalXP: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXP || 0));
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = xp % XP_PER_LEVEL;

  return {
    level,
    name: LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)],
    totalXP: xp,
    xpIntoLevel,
    xpForNext: XP_PER_LEVEL,
    progress: Math.round((xpIntoLevel / XP_PER_LEVEL) * 100),
  };
}

/** حساب سلسلة الدراسة (أيام متتالية) من تواريخ نشاط حقيقية */
export function calculateStreak(activityDates: string[]): number {
  if (activityDates.length === 0) return 0;

  const days = new Set(
    activityDates.map((d) => new Date(d).toISOString().slice(0, 10))
  );

  const today = new Date();
  const cursor = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  // إذا لم يكن هناك نشاط اليوم، نبدأ العد من الأمس
  const key = (d: Date) => d.toISOString().slice(0, 10);
  if (!days.has(key(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!days.has(key(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(key(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
