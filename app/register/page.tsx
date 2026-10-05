"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import SetupNotice from "@/components/SetupNotice";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { signUp } from "@/services/auth";
import { BAC_STREAMS } from "@/types/database";

// ══════════════════════════════════════════════════════
// إنشاء حساب — Supabase Auth الحقيقي + ملف شخصي
// ══════════════════════════════════════════════════════

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stream, setStream] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured()) return <SetupNotice />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!stream) {
      setError("يرجى اختيار الشعبة.");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
      return;
    }

    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const result = await signUp(
        supabase,
        email.trim(),
        password,
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          stream,
        }
      );

      if (result.session) {
        router.replace("/dashboard");
      } else {
        // تأكيد البريد مفعّل في مشروع Supabase
        setNotice(
          "تم إنشاء حسابك. تحقق من بريدك الإلكتروني لتأكيد الحساب ثم سجّل الدخول."
        );
        setLoading(false);
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes("already registered")
          ? "هذا البريد الإلكتروني مسجّل من قبل. جرّب تسجيل الدخول."
          : "حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى.";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="إنشاء حساب"
      subtitle="انضم إلى رحلة بكالوريا 2027 — حسابك الحقيقي وبياناتك الحقيقية"
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="firstName"
              className="block text-sm font-bold text-foam/80"
            >
              الاسم
            </label>
            <input
              id="firstName"
              type="text"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input-field"
              placeholder="محمد"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="lastName"
              className="block text-sm font-bold text-foam/80"
            >
              اللقب
            </label>
            <input
              id="lastName"
              type="text"
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input-field"
              placeholder="بن أحمد"
            />
          </div>
        </div>

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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field text-left"
            placeholder="6 أحرف على الأقل"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="stream" className="block text-sm font-bold text-foam/80">
            الشعبة
          </label>
          <select
            id="stream"
            required
            value={stream}
            onChange={(e) => setStream(e.target.value)}
            className="input-field appearance-none"
          >
            <option value="" disabled>
              اختر شعبتك الدراسية
            </option>
            {BAC_STREAMS.map((s) => (
              <option key={s} value={s} className="bg-navy-900">
                {s}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "جارٍ إنشاء الحساب…" : "إنشاء الحساب"}
        </button>

        <p className="pt-2 text-center text-sm text-foam/60">
          لديك حساب بالفعل؟{" "}
          <Link
            href="/login"
            className="font-bold text-cyan-300 transition-colors hover:text-cyan-200"
          >
            سجّل الدخول
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

