# 🌊 MARIS ACADEMY ²⁰²⁷

منصة تعليمية عربية (RTL) لتلاميذ بكالوريا 2027 في الجزائر.

**Next.js (App Router) · TypeScript · Tailwind CSS · Supabase**

---

## التشغيل المحلي

```bash
npm install
npm run dev      # بيئة التطوير
npm run build    # بناء الإنتاج
npm run start    # تشغيل بناء الإنتاج
```

## الإعداد المطلوب (مرة واحدة)

### 1) إنشاء مشروع Supabase

أنشئ مشروعاً مجانياً على [supabase.com](https://supabase.com).

### 2) تنفيذ مخطط قاعدة البيانات

في لوحة تحكم Supabase:

**SQL Editor → New query** → الصق محتوى `supabase/schema.sql` كاملاً → **Run**

هذا ينشئ الجداول العشرة، سياسات الأمان (RLS)، مُحفّزات نقاط الخبرة،
ودالة تصحيح الاختبارات.

### 3) ضبط متغيرات البيئة

```bash
cp .env.example .env.local
```

ثم املأ القيم من **Project Settings → Data API / API Keys**:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 4) (اختياري) محتوى أولي

المنصة لا تحتوي أي بيانات وهمية — ستظهر حالات فارغة عربية حتى تُضاف
بيانات حقيقية. لإضافة محتوى أولي يمكنك تنفيذ `supabase/seed.example.sql`
(اختياري تماماً)، أو إدخال المحتوى يدوياً من Table Editor.

### ملاحظة عن تأكيد البريد الإلكتروني

افتراضياً يفعّل Supabase تأكيد البريد. لتجربة أسرع أثناء التطوير يمكنك
تعطيله من **Authentication → Sign In / Providers → Email → Confirm email**.
في كلتا الحالتين تعمل المنصة: إن كان التأكيد مفعّلاً تظهر للطالب رسالة
تطالبه بتأكيد بريده.

---

## البنية

```
app/            الصفحات (App Router) — كلها عربية RTL
  page.tsx      صفحة الهبوط
  login/        تسجيل الدخول
  register/     إنشاء حساب
  (app)/        القسم المحمي (حارس جلسة + تنقل RTL)
    dashboard/  لوحة الطالب
    courses/    الدروس والدورات وصفحات الدروس الفردية
    quizzes/    الاختبارات وصفحة أداء الاختبار
    progress/   تقدمي الدراسي
    maris-id/   بطاقة الطالب الرقمية
    profile/    الملف الشخصي
components/     مكونات الواجهة المشتركة
lib/            عميل Supabase + نظام المستويات المركزي + أدوات
services/       طبقة استعلامات قاعدة البيانات (مصدر الحقيقة)
types/          أنواع TypeScript المطابقة للمخطط
supabase/       schema.sql + seed.example.sql
```

## مبادئ الأمان

- نقاط الخبرة تُمنح **فقط** من قاعدة البيانات (مُحفّز + دالة آمنة) —
  الواجهة لا تستطيع تعديلها.
- الإجابات الصحيحة غير مكشوفة: قراءة الأسئلة عبر عرض `questions_public`
  الذي يخفي `correct_option`، والتصحيح داخل دالة `submit_quiz`.
- كل جدول محمي بسياسات RLS: الطالب يرى بياناته فقط.
