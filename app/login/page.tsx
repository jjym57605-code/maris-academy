
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import SetupNotice from "@/components/SetupNotice";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { signIn } from "@/services/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);
    setNotice(null);

    if (!email.trim() || !password) {
      setError("أدخل البريد الإلكتروني وكلمة المرور.");
      return;
    }

    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بالخدمة.");
      return;
    }

    setLoading(true);

    try {
      await signIn(
        supabase,
        email.trim(),
        password
      );

      router.replace("/dashboard");
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "البريد الإلكتروني أو كلمة المرور غير صحيحة."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    setError(null);
    setNotice(null);

    if (!email.trim()) {
      setError(
        "أدخل بريدك الإلكتروني أولاً ثم اضغط على استعادة كلمة المرور."
      );
      return;
    }

    const supabase = getSupabase();

    if (!supabase) {
      setError("تعذر الاتصال بالخدمة.");
      return;
    }

    const redirectTo =
      `${window.location.origin}/reset-password`;

    console.log(
      "🔥 PASSWORD RESET REDIRECT:",
      redirectTo
    );

    setResetting(true);

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo,
          }
        );

      if (resetError) {
        throw resetError;
      }

      setNotice(
        "تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني."
      );
    } catch (err) {
      console.error(
        "PASSWORD RESET ERROR:",
        err
      );

      setError(
        "تعذر إرسال رابط الاستعادة. تحقق من البريد وحاول مرة أخرى."
      );
    } finally {
      setResetting(false);
    }
  }

  return (
    <AuthLayout
      title="تسجيل الدخول"
      subtitle="مرحباً بك من جديد في MARIS ACADEMY"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-2xl border border-teal-400/30 bg-teal-500/10 px-4 py-3 text-sm font-bold text-teal-300">
            {notice}
          </div>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-bold text-foam/80"
          >
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

        <button
          type="submit"
          disabled={loading || resetting}
          className="btn-primary w-full"
        >
          {loading
            ? "جارٍ تسجيل الدخول..."
            : "تسجيل الدخول"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleResetPassword}
        disabled={loading || resetting}
        className="mt-4 w-full text-sm font-bold text-cyan-300 transition hover:text-cyan-200 disabled:opacity-50"
      >
        {resetting
          ? "جارٍ إرسال الرابط..."
          : "هل نسيت كلمة المرور؟"}
      </button>

      <div className="mt-6 text-center text-sm text-foam/60">
        ما عندكش حساب؟
        <Link
          href="/register"
          className="mr-1 font-bold text-cyan-300 hover:text-cyan-200"
        >
          إنشاء حساب
        </Link>
      </div>
    </AuthLayout>
  );
}


