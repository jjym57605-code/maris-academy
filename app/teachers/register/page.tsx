
"use client";

import Link from "next/link";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { signUp } from "@/services/auth";

type TeacherForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  subject: string;
  stream: string;
  bio: string;
};

const MAX_CV_SIZE = 5 * 1024 * 1024;

export default function TeacherRegisterPage() {
  const [form, setForm] = useState<TeacherForm>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    subject: "",
    stream: "",
    bio: "",
  });

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvPath, setCvPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [accountCreated, setAccountCreated] = useState(false);
  const [retryUserId, setRetryUserId] = useState("");

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setErrorMessage("");
  }

  function handleCvChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;

    setErrorMessage("");
    setCvFile(null);

    if (!file) return;

    if (
      file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      e.target.value = "";
      setErrorMessage("السيرة الذاتية لازم تكون بصيغة PDF.");
      return;
    }

    if (file.size > MAX_CV_SIZE) {
      e.target.value = "";
      setErrorMessage("حجم السيرة الذاتية تجاوز 5 MB.");
      return;
    }

    setCvFile(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    if (!cvPath && !cvFile) {
      setErrorMessage("ارفق السيرة الذاتية (CV) بصيغة PDF قبل إرسال الطلب.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const supabase = getSupabase();

    if (!supabase) {
      setErrorMessage(
        "الاتصال بقاعدة البيانات غير متاح حاليًا. تحقق من إعدادات المنصة."
      );
      setLoading(false);
      return;
    }

    try {
      let userId = retryUserId;

      if (!userId) {
        const { user, session } = await signUp(
          supabase,
          form.email.trim().toLowerCase(),
          form.password,
          {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            accountType: "teacher",
          }
        );

        if (!user) {
          throw new Error(
            "لم يتم إرجاع بيانات الحساب. تحقق من حالة التسجيل."
          );
        }

        if (!session) {
          setAccountCreated(true);
          setErrorMessage(
            "تم إنشاء الحساب، لكن لم تُنشأ جلسة دخول، لذلك لم يُحفظ طلب الأستاذ. لا تعاود التسجيل بنفس البريد. تأكد من إعدادات تأكيد البريد في Supabase، ثم سجّل الدخول بنفس الحساب."
          );
          return;
        }

        userId = user.id;
        setRetryUserId(userId);
        setAccountCreated(true);
      }

      let uploadedCvPath = cvPath;

      if (!uploadedCvPath) {
        if (!cvFile) {
          throw new Error("ارفق السيرة الذاتية بصيغة PDF لإكمال التسجيل.");
        }

        const filePath = `${userId}/${crypto.randomUUID()}.pdf`;

        const { error: uploadError } = await supabase.storage
          .from("teacher-cvs")
          .upload(filePath, cvFile, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(
            `تعذّر رفع السيرة الذاتية: ${uploadError.message}`
          );
        }

        uploadedCvPath = filePath;
        setCvPath(filePath);
      }

      const { error: insertError } = await supabase
        .from("teacher_applications")
        .insert({
          id: userId,
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          subject: form.subject.trim(),
          stream: form.stream,
          bio: form.bio.trim(),
          cv_path: uploadedCvPath,
          status: "pending",
        });

      if (insertError) {
        throw insertError;
      }

      setSuccess(true);
      setRetryUserId("");
    } catch (error: unknown) {
      console.error("Teacher registration error:", error);

      const message = error instanceof Error ? error.message : "";

      if (
        message.toLowerCase().includes("duplicate key") ||
        message.toLowerCase().includes("already registered")
      ) {
        setErrorMessage(
          "هذا البريد مسجّل من قبل. لا تنشئ حسابًا جديدًا بنفس البريد. إذا كان الحساب لك، سجّل الدخول أو تواصل مع الإدارة."
        );
      } else if (
        message.toLowerCase().includes("row-level security") ||
        message.toLowerCase().includes("permission denied") ||
        message.toLowerCase().includes("unauthorized")
      ) {
        setErrorMessage(
          "رفضت قاعدة البيانات العملية بسبب الصلاحيات. لم تُمنح أي صلاحيات أستاذ؛ يلزم مراجعة سياسات قاعدة البيانات والتخزين."
        );
      } else if (retryUserId || accountCreated || cvPath) {
        setErrorMessage(
          `لم يكتمل حفظ الطلب. حسابك لم يُمنح صلاحيات أستاذ تلقائيًا. صحّح المشكلة ثم اضغط على إعادة المحاولة. ${message}`
        );
      } else {
        setErrorMessage(
          message || "تعذّر إكمال التسجيل. تحقق من البيانات وحاول مجددًا."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-[#071a2d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 disabled:opacity-60";

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-hidden bg-[#061525] text-white"
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <header className="relative border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <Link href="/" className="text-xl font-black tracking-wide">
            MARIS <span className="text-cyan-400">ACADEMY</span>
          </Link>

          <Link
            href="/teachers"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
          >
            العودة لفضاء الأساتذة
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-3xl">
            🎓
          </div>

          <p className="mb-3 text-sm font-bold text-cyan-400">
            MARIS TEACHERS
          </p>

          <h1 className="text-3xl font-black leading-tight sm:text-4xl">
            انضم إلينا كأستاذ
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
            شارك علمك وخبرتك مع طلبة البكالوريا، وساهم في بناء تجربة تعليمية
            أفضل داخل MARIS ACADEMY.
          </p>
        </div>

        {success ? (
          <div className="rounded-3xl border border-cyan-400/20 bg-[#0b2033] p-7 text-center sm:p-10">
            <div className="mb-4 text-4xl">✅</div>

            <h2 className="text-xl font-black text-cyan-300">
              تم إرسال طلبك بنجاح
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-300">
              طلب الانضمام تاعك تسجّل في MARIS ACADEMY، وحالته حاليًا قيد
              المراجعة. الإدارة راح تراجع معلوماتك والسيرة الذاتية قبل الموافقة
              على انضمامك كأستاذ.
            </p>

            <p className="mt-4 text-sm font-bold text-amber-300">
              طلبك قيد المراجعة — Pending
            </p>

            <Link
              href="/teachers"
              className="mt-6 inline-flex rounded-xl bg-cyan-400 px-6 py-3 font-bold text-[#061525] transition hover:bg-cyan-300"
            >
              العودة لفضاء الأساتذة
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/10 bg-[#0b2033]/90 p-5 shadow-2xl shadow-black/20 sm:p-8"
          >
            <div className="mb-7">
              <h2 className="text-lg font-black">
                إنشاء حساب وتقديم طلب
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                أنشئ حسابك وأرفق سيرتك الذاتية، ثم نرسل معلوماتك للإدارة للمراجعة.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="mb-2 block text-sm font-bold text-slate-200">
                  الاسم
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="الاسم"
                  autoComplete="given-name"
                  maxLength={100}
                  required
                  disabled={loading || Boolean(retryUserId)}
                />
              </div>

              <div>
                <label htmlFor="lastName" className="mb-2 block text-sm font-bold text-slate-200">
                  اللقب
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="اللقب"
                  autoComplete="family-name"
                  maxLength={100}
                  required
                  disabled={loading || Boolean(retryUserId)}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-200">
                  البريد الإلكتروني
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="example@email.com"
                  autoComplete="email"
                  maxLength={254}
                  required
                  disabled={loading || Boolean(retryUserId)}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-200">
                  كلمة السر
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="6 أحرف على الأقل"
                  autoComplete="new-password"
                  minLength={6}
                  maxLength={72}
                  required
                  disabled={loading || Boolean(retryUserId)}
                />
                <p className="mt-2 text-xs text-slate-500">
                  استعمل كلمة سر خاصة بحسابك، وما تشاركها مع حتى واحد.
                </p>
              </div>

              <div>
                <label htmlFor="subject" className="mb-2 block text-sm font-bold text-slate-200">
                  المادة التي تدرّسها
                </label>
                <input
                  id="subject"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="مثال: الرياضيات"
                  maxLength={150}
                  required
                  disabled={loading || Boolean(retryUserId)}
                />
              </div>

              <div>
                <label htmlFor="stream" className="mb-2 block text-sm font-bold text-slate-200">
                  الشعبة
                </label>
                <select
                  id="stream"
                  name="stream"
                  value={form.stream}
                  onChange={handleChange}
                  className={inputClass}
                  required
                  disabled={loading || Boolean(retryUserId)}
                >
                  <option value="">اختر الشعبة</option>
                  <option value="علوم تجريبية">علوم تجريبية</option>
                  <option value="رياضيات">رياضيات</option>
                  <option value="تقني رياضي">تقني رياضي</option>
                  <option value="تسيير واقتصاد">تسيير واقتصاد</option>
                  <option value="آداب وفلسفة">آداب وفلسفة</option>
                  <option value="لغات أجنبية">لغات أجنبية</option>
                  <option value="عام">جميع الشعب</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="bio" className="mb-2 block text-sm font-bold text-slate-200">
                  نبذة عنك
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  className={`${inputClass} min-h-32 resize-y`}
                  placeholder="عرّف بنفسك وبخبرتك وطريقتك في التعليم..."
                  maxLength={1000}
                  required
                  disabled={loading || Boolean(retryUserId)}
                />
                <p className="mt-2 text-xs text-slate-500">
                  الحد الأقصى 1000 حرف.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="cvFile" className="mb-2 block text-sm font-bold text-slate-200">
                  السيرة الذاتية (CV) — PDF
                </label>

                <div className="rounded-2xl border border-dashed border-cyan-400/30 bg-cyan-400/5 p-4">
                  <input
                    id="cvFile"
                    name="cvFile"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleCvChange}
                    className="block w-full cursor-pointer text-sm text-slate-300 file:ml-4 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:font-bold file:text-[#061525] hover:file:bg-cyan-300"
                    required={!cvPath}
                    disabled={loading || Boolean(cvPath)}
                  />

                  <p className="mt-3 text-xs leading-6 text-slate-400">
                    ارفع CV يوضح تكوينك وخبرتك المهنية. الملفات المقبولة PDF فقط،
                    والحجم الأقصى 5 MB.
                  </p>

                  {cvFile && (
                    <p className="mt-2 text-sm text-cyan-300">
                      📄 {cvFile.name}
                    </p>
                  )}

                  {cvPath && (
                    <p className="mt-2 text-sm text-green-300">
                      ✓ تم رفع السيرة الذاتية بنجاح.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm leading-7 text-red-200"
              >
                {errorMessage}

                {accountCreated && !retryUserId && (
                  <p className="mt-2">
                    تقدر تروح إلى{" "}
                    <Link href="/login" className="font-bold text-cyan-300 underline">
                      صفحة تسجيل الدخول
                    </Link>
                    .
                  </p>
                )}
              </div>
            )}

            <div className="mt-7 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4">
              <p className="text-sm leading-7 text-slate-300">
                <span className="font-bold text-cyan-300">مهم:</span>{" "}
                الانضمام يخضع لمراجعة الإدارة. إنشاء الحساب وإرسال الطلب لا يمنحانك
                صلاحيات الأستاذ أو النشر تلقائيًا. سيرتك الذاتية مخزنة في مساحة
                خاصة وليست متاحة للعامة.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-7 w-full rounded-xl bg-cyan-400 px-6 py-4 font-black text-[#061525] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "جارٍ إنشاء الحساب ورفع السيرة الذاتية..."
                : retryUserId
                  ? "إعادة محاولة حفظ الطلب"
                  : "إنشاء الحساب وإرسال الطلب"}
            </button>

            <p className="mt-4 text-center text-xs leading-6 text-slate-500">
              معلوماتك المهنية والسيرة الذاتية تُرسل إلى قاعدة بيانات MARIS
              لمراجعتها من طرف الإدارة.
            </p>
          </form>
        )}
      </section>

      <footer className="relative border-t border-white/10 px-5 py-6 text-center text-xs text-slate-500">
        © 2027 MARIS ACADEMY — معًا نحو بكالوريا أفضل
      </footer>
    </main>
  );
}
