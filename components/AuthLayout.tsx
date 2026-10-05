import Link from "next/link";

// ══════════════════════════════════════════════════════
// تخطيط صفحات المصادقة — لوحة تعريفية + نموذج
// ══════════════════════════════════════════════════════

export default function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-6">
      {/* زخارف محيطية */}
      <div
        className="pointer-events-none absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-ocean-500/20 blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-teal-400/10 blur-[120px]"
        aria-hidden
      />

      <div className="relative w-full max-w-md animate-fade-up">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-3"
          aria-label="العودة إلى الصفحة الرئيسية"
        >
          <span className="text-4xl" aria-hidden>
            🌊
          </span>
          <span className="font-grotesk text-lg font-bold tracking-widest text-white">
            MARIS ACADEMY <span className="text-cyan-400">²⁰²⁷</span>
          </span>
        </Link>

        <div className="glass-card p-6 sm:p-8">
          <h1 className="text-center text-2xl font-extrabold text-white">
            {title}
          </h1>
          <p className="mb-6 mt-2 text-center text-sm text-foam/60">
            {subtitle}
          </p>
          {children}
        </div>
      </div>
    </main>
  );
}
