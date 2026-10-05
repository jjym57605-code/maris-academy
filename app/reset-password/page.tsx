
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import SetupNotice from "@/components/SetupNotice";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();

    if (supabase === null) {
      return;
    }

    let mounted = true;

    const prepare = async () => {
      const result = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      const session = result.data.session;
      const sessionError = result.error;

      if (sessionError || !session) {
        setError(
          "رابط استعادة كلمة المرور غير صالح أو انتهت صلاحيته."
        );
        return;
      }

      setReady(true);
    };

    prepare();

    const authListener =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          if (!mounted) {
            return;
          }

          if (
            event === "PASSWORD_RECOVERY" &&
            session
          ) {
            setReady(true);
          }
        }
      );

    return () => {
      mounted = false;
      authListener.data.subscription.unsubscribe();
    };
  }, []);

  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError(
        "كلمة المرور يجب أن تكون 6 أحرف على الأقل."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    const supabase = getSupabase();

    if (supabase === null) {
      setError("تعذر الاتصال بالخدمة.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (updateError) {
        throw updateError;
      }

      setSuccess(
        "تم تغيير كلمة المرور بنجاح. سيتم تحويلك إلى تسجيل الدخول..."
      );

      setTimeout(() => {
        router.replace("/login");
      }, 2000);
    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "تعذر تغيير كلمة المرور. حاول مرة أخرى."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="تغيير كلمة المرور"
      subtitle="أنشئ كلمة مرور جديدة لحسابك في MARIS ACADEMY"
    >
      {!ready && !error && (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-300">
          جارٍ التحقق من رابط الاستعادة...
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-2xl border border-teal-400/30 bg-teal-500/10 px-4 py-3 text-sm font-bold text-teal-300">
          {success}
        </div>
      )}

      {ready && !success && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1.5">
            <label
              htmlFor="newPassword"
              className="block text-sm font-bold text-foam/80"
            >
              كلمة المرور الجديدة
            </label>

            <input
              id="newPassword"
              type="password"
              dir="ltr"
              required
              minLength={6}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(e.target.value)
              }
              className="input-field text-left"
              placeholder="6 أحرف على الأقل"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-bold text-foam/80"
            >
              تأكيد كلمة المرور
            </label>

            <input
              id="confirmPassword"
              type="password"
              dir="ltr"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              className="input-field text-left"
              placeholder="أعد كتابة كلمة المرور"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading
              ? "جارٍ تغيير كلمة المرور..."
              : "تغيير كلمة المرور"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}





