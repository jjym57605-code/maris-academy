"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import SetupNotice from "@/components/SetupNotice";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { signIn } from "@/services/auth";

// ══════════════════════════════════════════════════════
// تسجيل الدخول — Supabase Auth الحقيقي
// ══════════════════════════════════════════════════════

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!isSupabaseConfigured()) return <SetupNotice />;

  async function handleResetPassword() {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("أدخل بريدك الإلكتروني أولاً ثم اضغط على استعادة كلمة المرور.");
      return;
    }
    const supabase = getSupabase();
    if (!supabase) return;
    setResetting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim()
      );
      if (resetError) throw resetError;
      setNotice("تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.");
    } catch {
      setError("تعذر إرسال رابط الاستعادة. تحقق من البريد وحاول مرة أخرى.");
    } finally {
      setResetting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      await signIn(supabase, email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes("Invalid login")
          ? "البريد الإلكتروني أو كلمة المرور غير صحيحة."
          : "حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="تسجيل الدخول"
      subtitle="مرحباً بعودتك — واصل رحلتك نحو البكالوريا"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300"
          >
            {error}
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="rounded-2xl border border-teal-400/30 bg-teal-500/10 px-4 py-3 text-sm font-bold text-teal-300"
          >
            {notice}
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-bold text-foam/80">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            type="email"
            dir="ltr"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field text-left"
            placeholder="example@email.com"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-bold text-foam/80"
          >
            كلمة المرور
          </label>
          <input
            id="password"
            type="password"
            dir="ltr"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field text-left"
            placeholder="••••••••"
          />
        </div>

        <div className="text-left">
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={resetting || loading}
            className="text-sm font-bold text-cyan-300 transition-colors hover:text-cyan-200 disabled:opacity-50 min-h-[44px]"
          >
            {resetting ? "جارٍ الإرسال…" : "هل نسيت كلمة المرور؟"}
          </button>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "جارٍ الدخول…" : "دخول"}
        </button>

        <p className="pt-2 text-center text-sm text-foam/60">
          ليس لديك حساب؟{" "}
          <Link
            href="/register"
            className="font-bold text-cyan-300 transition-colors hover:text-cyan-200"
          >
            أنشئ حساباً
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
