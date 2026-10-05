import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-card max-w-md space-y-4 p-10 text-center">
        <span className="text-5xl" aria-hidden>
          🌊
        </span>
        <h1 className="text-2xl font-extrabold text-white">
          الصفحة غير موجودة
        </h1>
        <p className="text-foam/60">
          يبدو أنك أبحرت بعيداً — هذه الصفحة غير متوفرة.
        </p>
        <Link href="/" className="btn-primary">
          العودة إلى الرئيسية
        </Link>
      </div>
    </main>
  );
}
