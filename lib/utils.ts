// أدوات مساعدة عامة

/** دمج أسماء الأصناف بشكل شرطي */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** توليد معرّف MARIS فريد: MR-XXXXXX */
export function generateMarisId(): string {
  // أبجدية بدون أحرف متشابهة (0/O, 1/I/L)
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `MR-${suffix}`;
}

/** تنسيق تاريخ بالعربية */
export function formatDateAr(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ar-DZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

/** ترجمة سبب معاملة نقاط الخبرة */
export function xpReasonLabel(reason: string): string {
  switch (reason) {
    case "lesson_complete":
      return "إتمام درس";
    case "quiz_complete":
      return "إتمام اختبار";
    default:
      return "نشاط تعليمي";
  }
}
