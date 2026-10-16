
"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { ensureProfile } from "@/services/auth";
import { getTotalXP } from "@/services/stats";
import { getLevelInfo } from "@/lib/level";
import { formatDateAr } from "@/lib/utils";
import type { Profile, ThemePreference } from "@/types/database";
import {
  ErrorState,
  GlassCard,
  PageHeader,
  ProgressBar,
  Spinner,
} from "@/components/ui";

const FALLBACK = "غير متوفر حالياً";

type ThemeOption = {
  id: string;
  name: string;
  description: string;
  image: string;
  colors: string[];
};

type ThemeBackgroundRow = {
  id: string;
  name: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
};

const DEFAULT_THEMES: ThemeOption[] = [
  {
    id: "ocean-navy",
    name: "Deep Ocean",
    description: "المحيط العميق",
    image: "/images/ocean-navy.png",
    colors: ["#06182d", "#0891b2", "#67e8f9"],
  },
  {
    id: "ocean-midnight",
    name: "Midnight Abyss",
    description: "أعماق منتصف الليل",
    image: "/images/ocean-midnight.png",
    colors: ["#090d29", "#4f46e5", "#a5b4fc"],
  },
  {
    id: "ocean-foam",
    name: "Sea Foam",
    description: "زَبَد البحر",
    image: "/images/ocean-foam.png",
    colors: ["#042a36", "#0d9488", "#99f6e4"],
  },
];

const DEFAULT_TEXT_COLOR = "#E2E8F0";

const TEXT_COLORS = [
  {
    value: "#E2E8F0",
    name: "رمادي فاتح",
    description: "اللون الافتراضي",
  },
  {
    value: "#FFFFFF",
    name: "أبيض",
    description: "أبيض واضح",
  },
  {
    value: "#67E8F9",
    name: "سماوي",
    description: "لون المحيط",
  },
  {
    value: "#99F6E4",
    name: "فيروزي",
    description: "لون زبد البحر",
  },
  {
    value: "#C4B5FD",
    name: "بنفسجي",
    description: "بنفسجي هادئ",
  },
  {
    value: "#FDE68A",
    name: "ذهبي",
    description: "ذهبي دافئ",
  },
  {
    value: "#FDA4AF",
    name: "وردي",
    description: "وردي ناعم",
  },
] as const;

function isThemePreference(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTextColor(value: unknown): value is string {
  return TEXT_COLORS.some((color) => color.value === value);
}

function getThemeColors(id: string): string[] {
  if (id === "ocean-midnight") {
    return ["#090d29", "#4f46e5", "#a5b4fc"];
  }

  if (id === "ocean-foam") {
    return ["#042a36", "#0d9488", "#99f6e4"];
  }

  return ["#06182d", "#0891b2", "#67e8f9"];
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // الخلفيات القديمة والجديدة
  const [themes, setThemes] = useState<ThemeOption[]>(DEFAULT_THEMES);
  const [selectedTheme, setSelectedTheme] =
    useState<string>("ocean-navy");
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeMessage, setThemeMessage] = useState("");
  const [themeError, setThemeError] = useState(false);

  // لون النص
  const [selectedTextColor, setSelectedTextColor] =
    useState<string>(DEFAULT_TEXT_COLOR);
  const [savingTextColor, setSavingTextColor] = useState(false);
  const [textColorMessage, setTextColorMessage] = useState("");
  const [textColorError, setTextColorError] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabase();

    if (!supabase) {
      setError(true);
      setLoading(false);
      return;
    }

    setError(false);
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(true);
        return;
      }

      const [profileData, xpTotal, backgroundsResult] =
        await Promise.all([
          ensureProfile(supabase, user),
          getTotalXP(supabase, user.id),
          supabase
            .from("theme_backgrounds")
            .select("id, name, image_url, is_active, sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
        ]);

      setProfile(profileData);
      setEmail(user.email ?? null);
      setXp(xpTotal);

      // نبقاو محافظين على الخلفيات الأصلية دائمًا
      const availableThemes: ThemeOption[] = [...DEFAULT_THEMES];

      if (backgroundsResult.error) {
        console.error(
          "Theme backgrounds loading error:",
          backgroundsResult.error
        );
      } else {
        const rows = (backgroundsResult.data ??
          []) as ThemeBackgroundRow[];

        for (const background of rows) {
          if (
            !background.id ||
            !background.image_url ||
            !background.is_active
          ) {
            continue;
          }

          // إذا كانت الخلفية موجودة مسبقًا بنفس المعرّف،
          // ما نكرروش إضافتها.
          const existingIndex = availableThemes.findIndex(
            (theme) => theme.id === background.id
          );

          const dynamicTheme: ThemeOption = {
            id: background.id,
            name: background.name?.trim() || "خلفية جديدة",
            description: background.name?.trim() || "خلفية من MARIS",
            image: background.image_url,
            colors: getThemeColors(background.id),
          };

          if (existingIndex >= 0) {
            availableThemes[existingIndex] = dynamicTheme;
          } else {
            availableThemes.push(dynamicTheme);
          }
        }
      }

      setThemes(availableThemes);

      const savedTheme: unknown = profileData?.theme_preference;

      setSelectedTheme(
        isThemePreference(savedTheme) &&
          availableThemes.some((theme) => theme.id === savedTheme)
          ? savedTheme
          : "ocean-navy"
      );

      const savedTextColor: unknown = profileData?.text_color;

      setSelectedTextColor(
        isTextColor(savedTextColor)
          ? savedTextColor
          : DEFAULT_TEXT_COLOR
      );
    } catch (loadError) {
      console.error("Profile loading error:", loadError);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ══════════════════════════════════════════════════════
  // حفظ الخلفية
  // ══════════════════════════════════════════════════════

  const saveTheme = async () => {
    const supabase = getSupabase();

    if (!supabase || savingTheme) return;

    setSavingTheme(true);
    setThemeMessage("");
    setThemeError(false);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "ما قدرناش نتحققو من حسابك. عاود سجّل الدخول."
        );
      }

      // ما نحفظوش خلفية غير موجودة أو تم تعطيلها
      const chosenTheme = themes.find(
        (theme) => theme.id === selectedTheme
      );

      if (!chosenTheme) {
        throw new Error(
          "هاذ الخلفية ما بقاتش متاحة. حدّث الصفحة واختار خلفية أخرى."
        );
      }

      // الخلفيات المضافة من الأدمن لازم تبقى مفعّلة
      const isDefaultTheme = DEFAULT_THEMES.some(
        (theme) => theme.id === selectedTheme
      );

      if (!isDefaultTheme) {
        const { data: background, error: backgroundError } =
          await supabase
            .from("theme_backgrounds")
            .select("id, is_active")
            .eq("id", selectedTheme)
            .eq("is_active", true)
            .maybeSingle();

        if (backgroundError) {
          throw backgroundError;
        }

        if (!background) {
          throw new Error(
            "هاذ الخلفية ما بقاتش متاحة. اختار خلفية أخرى."
          );
        }
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          theme_preference: selectedTheme as ThemePreference,
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      setProfile((current) =>
        current
          ? {
              ...current,
              theme_preference: selectedTheme as ThemePreference,
            }
          : current
      );

      // تطبيق الخلفية مباشرة دون إعادة تحميل الصفحة
      window.dispatchEvent(
        new CustomEvent("maris-theme-change", {
          detail: selectedTheme,
        })
      );

      setThemeMessage("تم حفظ الخلفية بنجاح 🌊");
       } catch (saveError: unknown) {
      console.error("Theme saving error details:", saveError);
      setThemeError(true);

      const errorDetails =
        typeof saveError === "object" &&
        saveError !== null &&
        "message" in saveError &&
        typeof saveError.message === "string"
          ? saveError.message
          : saveError instanceof Error
            ? saveError.message
            : "خطأ غير معروف";

      setThemeMessage(`فشل حفظ الخلفية: ${errorDetails}`);
    } finally {
      setSavingTheme(false);
    }
  };

  // ══════════════════════════════════════════════════════
  // حفظ لون النص
  // ══════════════════════════════════════════════════════

  const saveTextColor = async () => {
    const supabase = getSupabase();

    if (!supabase || savingTextColor) return;

    setSavingTextColor(true);
    setTextColorMessage("");
    setTextColorError(false);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "ما قدرناش نتحققو من حسابك. عاود سجّل الدخول."
        );
      }

      if (!isTextColor(selectedTextColor)) {
        throw new Error("اختار لون من الألوان المتاحة.");
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ text_color: selectedTextColor })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      setProfile((current) =>
        current
          ? { ...current, text_color: selectedTextColor }
          : current
      );

      window.dispatchEvent(
        new CustomEvent("maris-text-color-change", {
          detail: selectedTextColor,
        })
      );

      setTextColorMessage("تم حفظ لون النص بنجاح 🎨");
    } catch (saveError) {
      console.error("Text color saving error:", saveError);
      setTextColorError(true);

      setTextColorMessage(
        saveError instanceof Error &&
          saveError.message.startsWith("ما قدرناش")
          ? saveError.message
          : "ما قدرناش نحفظو لون النص. تأكد من الاتصال وحاول مرة أخرى."
      );
    } finally {
      setSavingTextColor(false);
    }
  };

  if (error) return <ErrorState onRetry={load} />;
  if (loading) return <Spinner />;

  const level = getLevelInfo(xp);

  const orFallback = (value?: string | null) =>
    value && value.trim().length > 0 ? value : FALLBACK;

  const rows = [
    { label: "الاسم", value: orFallback(profile?.first_name) },
    { label: "اللقب", value: orFallback(profile?.last_name) },
    { label: "البريد الإلكتروني", value: orFallback(email), ltr: true },
    { label: "الشعبة", value: orFallback(profile?.stream) },
    { label: "MARIS ID", value: orFallback(profile?.maris_id), ltr: true },
    {
      label: "تاريخ الانضمام",
      value: profile?.created_at
        ? formatDateAr(profile.created_at)
        : FALLBACK,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="الملف الشخصي" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* بطاقة المستوى */}
        <GlassCard className="flex flex-col items-center gap-4 p-6 text-center lg:col-span-1">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-l from-ocean-500/30 to-cyan-400/20 text-4xl">
            🏆
          </div>

          <div>
            <p className="text-2xl font-extrabold text-white">
              المستوى {level.level}
            </p>
            <p className="mt-1 font-bold text-cyan-300">
              {level.name}
            </p>
          </div>

          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-sm text-foam/60">
              <span>نقاط الخبرة</span>
              <span className="font-grotesk font-bold text-cyan-300">
                {xp} XP
              </span>
            </div>

            <ProgressBar percent={level.progress} />

            <p className="text-xs text-foam/40">
              {level.xpIntoLevel} / {level.xpForNext} XP نحو المستوى التالي
            </p>
          </div>
        </GlassCard>

        {/* البيانات الشخصية */}
        <GlassCard className="p-6 lg:col-span-2">
          <h2 className="mb-5 text-lg font-extrabold text-white">
            البيانات الشخصية
          </h2>

          <dl className="divide-y divide-white/5">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex flex-wrap items-center justify-between gap-2 py-3.5"
              >
                <dt className="text-sm text-foam/50">
                  {row.label}
                </dt>

                <dd
                  dir={row.ltr ? "ltr" : "rtl"}
                  className="break-words font-bold text-foam"
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </GlassCard>
      </div>

      {/* ══════════════════════════════════════════════════════
          تخصيص الخلفية
      ══════════════════════════════════════════════════════ */}

      <GlassCard className="space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-extrabold text-white">
            🌊 خصّص محيطك
          </h2>

          <p className="mt-1 text-sm leading-6 text-foam/60">
            اختار الخلفية اللي تعجبك. الخلفيات الجديدة اللي يضيفها
            فريق MARIS تظهر هنا تلقائيًا، واختيارك يتحفظ في حسابك.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {themes.map((theme) => {
            const selected = selectedTheme === theme.id;

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  setSelectedTheme(theme.id);
                  setThemeMessage("");
                  setThemeError(false);
                }}
                aria-pressed={selected}
                className={`group overflow-hidden rounded-2xl border text-right transition-all duration-200 ${
                  selected
                    ? "border-cyan-300 ring-2 ring-cyan-300/30"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <div
                  className="relative h-36 bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(rgba(2, 11, 24, 0.12), rgba(2, 11, 24, 0.55)), url("${theme.image}")`,
                  }}
                >
                  {selected && (
                    <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-cyan-300 text-sm font-black text-slate-950">
                      ✓
                    </span>
                  )}

                  <div className="absolute bottom-3 right-3 flex gap-1.5">
                    {theme.colors.map((color) => (
                      <span
                        key={color}
                        className="h-4 w-4 rounded-full border border-white/40"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1 bg-slate-950/40 p-4">
                  <p className="font-bold text-white">
                    {theme.description}
                  </p>

                  <p className="text-xs text-foam/50" dir="ltr">
                    {theme.name}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-foam/50">
            الخلفية الافتراضية هي Deep Ocean.
          </p>

          <button
            type="button"
            onClick={saveTheme}
            disabled={savingTheme}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-cyan-500 to-ocean-500 px-6 py-3 font-bold text-white shadow-lg shadow-cyan-950/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingTheme ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                جارٍ الحفظ...
              </>
            ) : (
              "حفظ الخلفية"
            )}
          </button>
        </div>

        {themeMessage && (
          <p
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm ${
              themeError
                ? "border-red-400/20 bg-red-400/5 text-red-300"
                : "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
            }`}
          >
            {themeMessage}
          </p>
        )}
      </GlassCard>

      {/* ══════════════════════════════════════════════════════
          تخصيص لون النص
      ══════════════════════════════════════════════════════ */}

      <GlassCard className="space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-extrabold text-white">
            🎨 خصّص لون النص
          </h2>

          <p className="mt-1 text-sm leading-6 text-foam/60">
            اختار اللون اللي يريحك في القراءة. اللون يتحفظ في حسابك
            ويتطبق على محتوى صفحات الطالب.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TEXT_COLORS.map((color) => {
            const selected = selectedTextColor === color.value;

            return (
              <button
                key={color.value}
                type="button"
                onClick={() => {
                  setSelectedTextColor(color.value);
                  setTextColorMessage("");
                  setTextColorError(false);
                }}
                aria-pressed={selected}
                className={`flex min-h-[100px] flex-col items-center justify-center gap-3 rounded-2xl border p-4 transition-all ${
                  selected
                    ? "border-cyan-300 bg-cyan-400/10 ring-2 ring-cyan-300/30"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                }`}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/30 shadow-lg"
                  style={{ backgroundColor: color.value }}
                >
                  {selected && (
                    <span className="font-black text-slate-950">
                      ✓
                    </span>
                  )}
                </span>

                <span className="text-sm font-bold text-white">
                  {color.name}
                </span>

                <span className="text-center text-xs text-foam/50">
                  {color.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* معاينة اللون المختار */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <p className="mb-2 text-xs text-foam/50">
            معاينة لون النص
          </p>

          <p
            className="text-base font-bold"
            style={{ color: selectedTextColor }}
          >
            مرحباً بك في MARIS ACADEMY ²⁰²⁷ 🌊
          </p>

          <p
            className="mt-2 text-sm"
            style={{ color: selectedTextColor }}
          >
            هكذا يظهر النص باللون اللي اخترته.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-foam/50">
            اللون الافتراضي هو الرمادي الفاتح.
          </p>

          <button
            type="button"
            onClick={saveTextColor}
            disabled={savingTextColor}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-cyan-500 to-ocean-500 px-6 py-3 font-bold text-white shadow-lg shadow-cyan-950/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingTextColor ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                جارٍ الحفظ...
              </>
            ) : (
              "حفظ لون النص"
            )}
          </button>
        </div>

        {textColorMessage && (
          <p
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm ${
              textColorError
                ? "border-red-400/20 bg-red-400/5 text-red-300"
                : "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
            }`}
          >
            {textColorMessage}
          </p>
        )}
      </GlassCard>
    </div>
  );
}
