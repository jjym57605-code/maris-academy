// ══════════════════════════════════════════════════════
// تنبيه الإعداد — يظهر عندما لا تكون مفاتيح Supabase
// مضبوطة بعد، بدلاً من أي بيانات وهمية أو انهيار.
// ══════════════════════════════════════════════════════

export default function SetupNotice() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-card max-w-lg space-y-4 p-8 text-center">
        <span className="text-5xl" aria-hidden>
          🌊
        </span>
        <h1 className="text-2xl font-extrabold text-white">
          الإعداد غير مكتمل
        </h1>
        <p className="leading-relaxed text-foam/70">
          لم يتم ضبط مفاتيح Supabase بعد. أنشئ ملف{" "}
          <code
            dir="ltr"
            className="rounded-lg bg-navy-800 px-2 py-0.5 font-grotesk text-cyan-300"
          >
            .env.local
          </code>{" "}
          انطلاقاً من{" "}
          <code
            dir="ltr"
            className="rounded-lg bg-navy-800 px-2 py-0.5 font-grotesk text-cyan-300"
          >
            .env.example
          </code>{" "}
          وضع فيه عنوان مشروعك والمفتاح العام، ثم أعد تشغيل الخادم.
        </p>
        <p className="text-sm text-foam/40">
          لا تعرض المنصة أي بيانات وهمية — ستظهر بياناتك الحقيقية فور اكتمال
          الإعداد.
        </p>
      </div>
    </main>
  );
}
