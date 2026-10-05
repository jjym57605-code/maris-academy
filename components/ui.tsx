import { cn } from "@/lib/utils";

// ══════════════════════════════════════════════════════
// مكوّنات واجهة مشتركة — MARIS ACADEMY ²⁰²⁷
// ══════════════════════════════════════════════════════

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-8 animate-fade-up">
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="mt-2 text-foam/60">{subtitle}</p>}
    </header>
  );
}

export function GlassCard({
  children,
  className,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={cn("glass-card", hover && "glass-card-hover", className)}>
      {children}
    </div>
  );
}

export function ProgressBar({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div
      className={cn("progress-track", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress-fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function Spinner({ label = "جارٍ التحميل…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4"
      role="status"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-cyan-400/20 border-t-cyan-400" />
      <p className="text-sm text-foam/60">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass-card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden>
        {icon}
      </span>
      <p className="text-lg font-bold text-foam/90">{title}</p>
      {description && (
        <p className="max-w-md text-sm leading-relaxed text-foam/50">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message = "حدث خطأ أثناء تحميل البيانات. حاول مرة أخرى.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="glass-card flex flex-col items-center gap-3 border-red-400/20 px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden>
        ⚠️
      </span>
      <p className="text-lg font-bold text-red-300">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-2">
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}
