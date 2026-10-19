"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

import {
  getSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { signOut } from "@/services/auth";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui";
import SetupNotice from "@/components/SetupNotice";
import MarisTour from "@/components/MarisTour";
import { StreamPreviewProvider } from "@/contexts/stream-preview";

// ══════════════════════════════════════════════════════
// MARIS ACADEMY — App Shell
// ══════════════════════════════════════════════════════

const NAV_ITEMS = [
  { href: "/dashboard", icon: "🏠", label: "الرئيسية" },
  { href: "/reels", icon: "🎬", label: "الريلزات" },
  { href: "/courses", icon: "📚", label: "الدورات" },
  { href: "/library", icon: "📖", label: "مكتبة الدروس" },
  { href: "/flashcards", icon: "🧠", label: "حفظني" },
  { href: "/quizzes", icon: "📝", label: "الاختبارات" },
  { href: "/arena", icon: "⚔️", label: "ساحة التحديات" },
  { href: "/study-sessions", icon: "⏱️", label: "الجلسات الدراسية" },
  { href: "/forum", icon: "💬", label: "المنتدى" },
  { href: "/progress", icon: "📊", label: "تقدمي" },
  { href: "/leaderboard", icon: "🏆", label: "الترتيب" },
  { href: "/achievements", icon: "🏆", label: "الإنجازات" },
  { href: "/maris-id", icon: "🪪", label: "MARIS ID" },
  { href: "/profile", icon: "👤", label: "ملفي" },
] as const;

const ABOUT_NAV_ITEM = {
  href: "/about",
  icon: "💙",
  label: "عن MARIS",
} as const;

const REVIEW_NAV_ITEM = {
  href: "/review",
  icon: "⭐",
  label: "أضف تقييمك",
} as const;

const ADMIN_NAV_ITEM = {
  href: "/admin",
  icon: "👑",
  label: "لوحة الإدارة",
} as const;

// الخلفيات القديمة — تبقى مدعومة
const DEFAULT_THEME_BACKGROUNDS: Record<string, string> = {
  "ocean-navy": "/images/ocean-navy.png",
  "ocean-midnight": "/images/ocean-midnight.png",
  "ocean-foam": "/images/ocean-foam.png",
};

type ThemeBackgroundRow = {
  id: string;
  image_url: string;
  is_active: boolean;
  sort_order?: number;
};

const DEFAULT_TEXT_COLOR = "#E2E8F0";

const TEXT_COLORS = [
  "#E2E8F0",
  "#FFFFFF",
  "#67E8F9",
  "#99F6E4",
  "#C4B5FD",
  "#FDE68A",
  "#FDA4AF",
] as const;

function isTextColor(
  value: unknown
): value is (typeof TEXT_COLORS)[number] {
  return TEXT_COLORS.some((color) => color === value);
}

// يقبل الخلفيات القديمة ومعرّفات UUID للخلفيات الجديدة
function isThemePreference(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ══════════════════════════════════════════════════════
// فقاعات التنقّل — توقيت وسرعة مختلفان لكل فقاعة
// ══════════════════════════════════════════════════════

const NAVIGATION_BUBBLES = Array.from(
  { length: 24 },
  (_, index) => ({
    id: index,
    left: `${(index * 41 + 13) % 100}%`,
    size: `${10 + ((index * 17 + 7) % 27)}px`,
    duration: `${3 + ((index * 19 + 5) % 21) / 10}s`,
    delay: `${((index * 23 + 11) % 16) / 10}s`,
    drift: `${((index * 31) % 81) - 40}px`,
  })
);

// ══════════════════════════════════════════════════════
// فحص صلاحية الأدمن
// ══════════════════════════════════════════════════════

async function checkAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();

    if (!profileError && profile) {
      return profile.is_admin === true;
    }

    const {
      data: rpcData,
      error: rpcError,
    } = await supabase.rpc("is_current_user_admin");

    if (!rpcError) {
      return rpcData === true;
    }

    console.error("Admin check error:", rpcError);
    return false;
  } catch (error) {
    console.error("Admin check error:", error);
    return false;
  }
}

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckedFor, setAdminCheckedFor] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // فقاعات تظهر فقط عند الانتقال إلى صفحة أخرى
  const [showNavigationBubbles, setShowNavigationBubbles] = useState(false);
  const previousPathname = useRef<string | null>(null);
  const navigationBubbleTimer = useRef<number | null>(null);

  // الثيم المحفوظ في حساب المستخدم
  const [themePreference, setThemePreference] =
    useState<string>("ocean-navy");

  // الخلفيات القديمة والجديدة من قاعدة البيانات
  const [themeBackgrounds, setThemeBackgrounds] = useState<
    Record<string, string>
  >(DEFAULT_THEME_BACKGROUNDS);

  // لون النص المحفوظ في حساب المستخدم
  const [textColor, setTextColor] = useState<string>(DEFAULT_TEXT_COLOR);

  // شاشة التحميل السينمائية
  const [showCinematicLoader, setShowCinematicLoader] = useState(false);
  const [isLoaderExiting, setIsLoaderExiting] = useState(false);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [loaderMessage, setLoaderMessage] = useState("نوجدو فضاءك الدراسي...");
  const [loaderStartedAt, setLoaderStartedAt] = useState(0);

  // ══════════════════════════════════════════════════════
  // فقاعات تظهر عند تغيير الصفحة فقط
  // ══════════════════════════════════════════════════════

  useEffect(() => {
    // لا نظهر الفقاعات عند أول تحميل للتطبيق
    if (previousPathname.current === null) {
      previousPathname.current = pathname;
      return;
    }

    if (previousPathname.current === pathname) {
      return;
    }

    previousPathname.current = pathname;

    // لا نشغّل التأثير إذا كان المستخدم يفضّل تقليل الحركة
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
      setShowNavigationBubbles(false);
      return;
    }

    setShowNavigationBubbles(true);

    if (navigationBubbleTimer.current !== null) {
      window.clearTimeout(navigationBubbleTimer.current);
    }

    // نخلي وقت كافي باش تكمل حتى آخر الفقاعات صعودها
    navigationBubbleTimer.current = window.setTimeout(() => {
      setShowNavigationBubbles(false);
      navigationBubbleTimer.current = null;
    }, 7000);
  }, [pathname]);

  // تنظيف المؤقت عند مغادرة المكوّن
  useEffect(() => {
    return () => {
      if (navigationBubbleTimer.current !== null) {
        window.clearTimeout(navigationBubbleTimer.current);
      }
    };
  }, []);

  // ══════════════════════════════════════════════════════
  // المصادقة
  // ══════════════════════════════════════════════════════

  useEffect(() => {
    const supabaseClient = getSupabase();

    if (!supabaseClient) {
      setChecking(false);
      return;
    }

    const supabase = supabaseClient;
    let mounted = true;

    async function initialize() {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("Supabase session error:", error);
          setSession(null);
          setIsAdmin(false);
          setAdminCheckedFor(null);
          setChecking(false);
          router.replace("/login");
          return;
        }

        if (!currentSession) {
          setSession(null);
          setIsAdmin(false);
          setAdminCheckedFor(null);
          setChecking(false);
          router.replace("/login");
          return;
        }

        setSession(currentSession);
        setChecking(false);

        const userId = currentSession.user.id;
        const adminStatus = await checkAdmin(supabase, userId);

        if (!mounted) return;

        setIsAdmin(adminStatus);
        setAdminCheckedFor(userId);
      } catch (error) {
        console.error("AppShell session initialization error:", error);

        if (!mounted) return;

        setSession(null);
        setIsAdmin(false);
        setAdminCheckedFor(null);
        setChecking(false);
        router.replace("/login");
      }
    }

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;

      if (!currentSession) {
        setSession(null);
        setIsAdmin(false);
        setAdminCheckedFor(null);
        setChecking(false);
        setThemePreference("ocean-navy");
        setThemeBackgrounds(DEFAULT_THEME_BACKGROUNDS);
        setTextColor(DEFAULT_TEXT_COLOR);
        router.replace("/login");
        return;
      }

      setSession(currentSession);
      setChecking(false);
      setAdminCheckedFor(null);

      const userId = currentSession.user.id;

      void checkAdmin(supabase, userId).then((adminStatus) => {
        if (!mounted) return;

        setIsAdmin(adminStatus);
        setAdminCheckedFor(userId);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  // ══════════════════════════════════════════════════════
  // تحميل الخلفيات والثيم ولون النص من Supabase
  // ══════════════════════════════════════════════════════

  useEffect(() => {
    const supabaseClient = getSupabase();

    if (!supabaseClient) return;

    const client = supabaseClient;
    const userId = session?.user?.id;

    if (!userId) return;

    let active = true;

    async function loadPreferences() {
      const availableBackgrounds: Record<string, string> = {
        ...DEFAULT_THEME_BACKGROUNDS,
      };

      const {
        data: backgroundsData,
        error: backgroundsError,
      } = await client
        .from("theme_backgrounds")
        .select("id, image_url, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!active) return;

      if (backgroundsError) {
        console.error(
          "Theme backgrounds loading error:",
          backgroundsError
        );
      } else {
        const rows = (backgroundsData ?? []) as ThemeBackgroundRow[];

        for (const background of rows) {
          if (
            background.is_active &&
            typeof background.id === "string" &&
            background.id.length > 0 &&
            typeof background.image_url === "string" &&
            background.image_url.length > 0
          ) {
            availableBackgrounds[background.id] = background.image_url;
          }
        }
      }

      setThemeBackgrounds(availableBackgrounds);

      const { data, error } = await client
        .from("profiles")
        .select("theme_preference, text_color")
        .eq("id", userId)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("Theme and text color loading error:", error);
        return;
      }

      const savedTheme: unknown = data?.theme_preference;
      const savedTextColor: unknown = data?.text_color;

      setThemePreference(
        isThemePreference(savedTheme) &&
          Object.prototype.hasOwnProperty.call(
            availableBackgrounds,
            savedTheme
          )
          ? savedTheme
          : "ocean-navy"
      );

      setTextColor(
        isTextColor(savedTextColor)
          ? savedTextColor
          : DEFAULT_TEXT_COLOR
      );
    }

    void loadPreferences();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  // ══════════════════════════════════════════════════════
  // تحديث الثيم مباشرة عند تغييره من الملف الشخصي
  // ══════════════════════════════════════════════════════

  useEffect(() => {
    function handleThemeChange(event: Event) {
      const customEvent = event as CustomEvent<unknown>;

      if (isThemePreference(customEvent.detail)) {
        setThemePreference(customEvent.detail);
      }
    }

    window.addEventListener("maris-theme-change", handleThemeChange);

    return () => {
      window.removeEventListener("maris-theme-change", handleThemeChange);
    };
  }, []);

  // ══════════════════════════════════════════════════════
  // تحديث لون النص مباشرة عند تغييره من الملف الشخصي
  // ══════════════════════════════════════════════════════

  useEffect(() => {
    function handleTextColorChange(event: Event) {
      const customEvent = event as CustomEvent<unknown>;

      if (isTextColor(customEvent.detail)) {
        setTextColor(customEvent.detail);
      }
    }

    window.addEventListener(
      "maris-text-color-change",
      handleTextColorChange
    );

    return () => {
      window.removeEventListener(
        "maris-text-color-change",
        handleTextColorChange
      );
    };
  }, []);

  // ══════════════════════════════════════════════════════
  // إعادة فحص الأدمن عند الرجوع للتطبيق
  // ══════════════════════════════════════════════════════

  useEffect(() => {
    const supabaseClient = getSupabase();

    if (!supabaseClient || !session?.user?.id) {
      return;
    }

    const supabase = supabaseClient;

    async function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;

      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!currentSession) {
          setSession(null);
          setIsAdmin(false);
          setAdminCheckedFor(null);
          setThemePreference("ocean-navy");
          setThemeBackgrounds(DEFAULT_THEME_BACKGROUNDS);
          setTextColor(DEFAULT_TEXT_COLOR);
          router.replace("/login");
          return;
        }

        setSession(currentSession);
        setAdminCheckedFor(null);

        const adminStatus = await checkAdmin(
          supabase,
          currentSession.user.id
        );

        setIsAdmin(adminStatus);
        setAdminCheckedFor(currentSession.user.id);
      } catch (error) {
        console.error("Admin refresh error:", error);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router, session?.user?.id]);

  // شاشة التحميل بعد تسجيل الدخول
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      const pending = window.sessionStorage.getItem("maris-wave-pending");
      if (pending !== "true") return;

      setIsLoaderExiting(false);
      setLoaderProgress(0);
      setLoaderMessage("نوجدو فضاءك الدراسي...");
      setLoaderStartedAt(performance.now());
      setShowCinematicLoader(true);
      window.sessionStorage.removeItem("maris-wave-pending");
    } catch (error) {
      console.error("MARIS loading screen error:", error);
    }
  }, [session?.user?.id]);

  // تقدم شاشة التحميل
  useEffect(() => {
    const userId = session?.user?.id;
    if (!showCinematicLoader || !userId) return;

    const ready = !checking && adminCheckedFor === userId;
    const target = checking ? 28 : adminCheckedFor !== userId ? 62 : 92;

    if (checking) {
      setLoaderMessage("نتحققو من جلسة الدخول...");
    } else if (adminCheckedFor !== userId) {
      setLoaderMessage("نحضّرو حسابك ونفحصو الصلاحيات...");
    } else {
      setLoaderMessage("نكمّلو تجهيز فضاءك الدراسي...");
    }

    const progressTimer = window.setInterval(() => {
      setLoaderProgress((current) =>
        current >= target ? current : Math.min(target, current + 1)
      );
    }, 35);

    let finishTimer: number | undefined;
    let exitTimer: number | undefined;

    if (ready) {
      const minimumVisibleMs = 3600;
      const elapsed = performance.now() - (loaderStartedAt || performance.now());
      const remaining = Math.max(0, minimumVisibleMs - elapsed);

      finishTimer = window.setTimeout(() => {
        setLoaderProgress(100);
        setLoaderMessage("كلش واجد، مرحبا بيك!");
        exitTimer = window.setTimeout(() => setIsLoaderExiting(true), 1650);
      }, remaining);
    }

    return () => {
      window.clearInterval(progressTimer);
      if (finishTimer !== undefined) window.clearTimeout(finishTimer);
      if (exitTimer !== undefined) window.clearTimeout(exitTimer);
    };
  }, [
    showCinematicLoader,
    session?.user?.id,
    adminCheckedFor,
    checking,
    loaderStartedAt,
  ]);

  // إزالة شاشة التحميل
  useEffect(() => {
    if (!showCinematicLoader || !isLoaderExiting) return;

    const timeoutId = window.setTimeout(() => {
      setShowCinematicLoader(false);
      setIsLoaderExiting(false);
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [showCinematicLoader, isLoaderExiting]);

  // إغلاق القائمة عند تغيير الصفحة
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // منع التمرير عند فتح القائمة
  useEffect(() => {
    if (!menuOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // ESC لإغلاق القائمة
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  // إعداد Supabase
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  // التحقق من الجلسة
  if (checking || !session) {
    return <Spinner label="جارٍ التحقق من الجلسة…" />;
  }

  // تسجيل الخروج
  async function handleSignOut() {
    const supabase = getSupabase();

    setMenuOpen(false);

    if (supabase) {
      await signOut(supabase).catch(() => undefined);
    }

    setSession(null);
    setIsAdmin(false);
    setAdminCheckedFor(null);
    setThemePreference("ocean-navy");
    setThemeBackgrounds(DEFAULT_THEME_BACKGROUNDS);
    setTextColor(DEFAULT_TEXT_COLOR);
    router.replace("/login");
  }

  // اختيار صورة الخلفية، مع الرجوع إلى الخلفية القديمة الافتراضية
  const selectedBackground =
    themeBackgrounds[themePreference] ??
    DEFAULT_THEME_BACKGROUNDS["ocean-navy"];

  return (
    <StreamPreviewProvider isAdmin={isAdmin}>
      <div
        className="relative min-h-screen"
        data-maris-theme={themePreference}
        style={{
          backgroundImage: `linear-gradient(rgba(2, 11, 24, 0.28), rgba(2, 11, 24, 0.42)), url("${selectedBackground}")`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
          backgroundColor: "#020b18",
        }}
      >
        {/* تأثير فقاعات التنقّل */}
        {showNavigationBubbles && !showCinematicLoader && (
          <div
            className="maris-navigation-bubbles"
            aria-hidden="true"
          >
            <style>{`
              .maris-navigation-bubbles {
                position: fixed;
                inset: 0;
                z-index: 60;
                overflow: hidden;
                pointer-events: none;
                contain: strict;
              }

              .maris-navigation-bubble {
                position: absolute;
                bottom: -70px;
                left: var(--bubble-left);
                display: block;
                width: var(--bubble-size);
                height: var(--bubble-size);
                border: 1px solid rgba(165, 243, 252, 0.72);
                border-radius: 50%;
                background:
                  radial-gradient(
                    circle at 32% 25%,
                    rgba(255, 255, 255, 0.95) 0%,
                    rgba(207, 250, 254, 0.48) 12%,
                    rgba(34, 211, 238, 0.13) 43%,
                    rgba(8, 145, 178, 0.04) 72%
                  );
                box-shadow:
                  inset -3px -4px 8px rgba(34, 211, 238, 0.08),
                  0 0 12px rgba(34, 211, 238, 0.12);
                opacity: 0;
                will-change: transform, opacity;
                animation: maris-bubble-rise
                  var(--bubble-duration)
                  linear
                  var(--bubble-delay)
                  both;
              }

              @keyframes maris-bubble-rise {
                0% {
                  opacity: 0;
                  transform: translate3d(0, 0, 0) scale(0.65);
                }

                10% {
                  opacity: 0.78;
                }

                32% {
                  opacity: 0.88;
                }

                72% {
                  opacity: 0.68;
                }

                100% {
                  opacity: 0;
                  transform: translate3d(
                    var(--bubble-drift),
                    -115vh,
                    0
                  ) scale(1.1);
                }
              }

              @media (max-width: 640px) {
                .maris-navigation-bubble {
                  box-shadow: 0 0 8px rgba(34, 211, 238, 0.1);
                }
              }

              @media (prefers-reduced-motion: reduce) {
                .maris-navigation-bubbles {
                  display: none !important;
                }
              }
            `}</style>

            {NAVIGATION_BUBBLES.map((bubble) => (
              <span
                key={bubble.id}
                className="maris-navigation-bubble"
                style={
                  {
                    "--bubble-left": bubble.left,
                    "--bubble-size": bubble.size,
                    "--bubble-duration": bubble.duration,
                    "--bubble-delay": bubble.delay,
                    "--bubble-drift": bubble.drift,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        )}

        {/* الشريط العلوي */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-navy-950/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
            <button
              type="button"
              data-tour="app-menu-button"
              onClick={() => setMenuOpen((current) => !current)}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl",
                "border border-white/10 bg-white/5",
                "text-2xl text-foam",
                "transition-all duration-200",
                "hover:bg-white/10 hover:text-cyan-300",
                "active:scale-95"
              )}
              aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
              aria-expanded={menuOpen}
            >
              <span aria-hidden>{menuOpen ? "✕" : "☰"}</span>
            </button>

            <Link
              href="/dashboard"
              className="flex items-center gap-2"
              aria-label="MARIS ACADEMY — الرئيسية"
            >
              <span className="text-2xl" aria-hidden>🌊</span>
              <span className="font-grotesk text-xs font-bold leading-tight tracking-widest text-white sm:text-sm">
                MARIS
                <br />
                ACADEMY{" "}
                <span className="text-cyan-400">²⁰²⁷</span>
              </span>
            </Link>
          </div>
        </header>

        {/* خلفية إغلاق القائمة */}
        {menuOpen && (
          <button
            type="button"
            aria-label="إغلاق القائمة"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
          />
        )}

        {/* القائمة الجانبية */}
        <aside
          className={cn(
            "fixed inset-y-0 right-0 z-50 w-[min(88vw,320px)]",
            "border-l border-white/10",
            "bg-navy-950/98 shadow-2xl backdrop-blur-2xl",
            "transition-transform duration-300 ease-out",
            menuOpen ? "translate-x-0" : "translate-x-full"
          )}
          aria-hidden={!menuOpen}
        >
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-5">
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3"
            >
              <span className="text-3xl" aria-hidden>🌊</span>
              <span className="font-grotesk text-sm font-bold leading-tight tracking-widest text-white">
                MARIS
                <br />
                ACADEMY{" "}
                <span className="text-cyan-400">²⁰²⁷</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-foam/60 transition hover:bg-white/10 hover:text-white"
              aria-label="إغلاق القائمة"
            >
              ✕
            </button>
          </div>

          <nav
            className="h-[calc(100vh-145px)] overflow-y-auto px-3 py-4"
            aria-label="التنقل الرئيسي"
          >
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex min-h-[50px] items-center gap-4 rounded-2xl px-4 py-3",
                    "font-bold transition-all duration-200",
                    isActive(pathname, item.href)
                      ? "bg-gradient-to-l from-ocean-500/25 to-cyan-400/15 text-cyan-300 shadow-glow"
                      : "text-foam/65 hover:bg-white/5 hover:text-foam"
                  )}
                >
                  <span className="flex w-7 justify-center text-xl" aria-hidden>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {isActive(pathname, item.href) && (
                    <span className="mr-auto text-cyan-400">●</span>
                  )}
                </Link>
              ))}

              <div className="my-3 border-t border-white/5" />

              <Link
                href={ABOUT_NAV_ITEM.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex min-h-[50px] items-center gap-4 rounded-2xl px-4 py-3",
                  "font-bold transition-all duration-200",
                  isActive(pathname, ABOUT_NAV_ITEM.href)
                    ? "bg-gradient-to-l from-ocean-500/25 to-cyan-400/15 text-cyan-300 shadow-glow"
                    : "text-foam/65 hover:bg-white/5 hover:text-foam"
                )}
              >
                <span className="flex w-7 justify-center text-xl" aria-hidden>
                  {ABOUT_NAV_ITEM.icon}
                </span>
                <span>{ABOUT_NAV_ITEM.label}</span>
                {isActive(pathname, ABOUT_NAV_ITEM.href) && (
                  <span className="mr-auto text-cyan-400">●</span>
                )}
              </Link>

              <Link
                href={REVIEW_NAV_ITEM.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex min-h-[50px] items-center gap-4 rounded-2xl px-4 py-3",
                  "font-bold transition-all duration-200",
                  isActive(pathname, REVIEW_NAV_ITEM.href)
                    ? "bg-gradient-to-l from-ocean-500/25 to-cyan-400/15 text-cyan-300 shadow-glow"
                    : "text-foam/65 hover:bg-white/5 hover:text-foam"
                )}
              >
                <span className="flex w-7 justify-center text-xl" aria-hidden>
                  {REVIEW_NAV_ITEM.icon}
                </span>
                <span>{REVIEW_NAV_ITEM.label}</span>
                {isActive(pathname, REVIEW_NAV_ITEM.href) && (
                  <span className="mr-auto text-cyan-400">●</span>
                )}
              </Link>

              {isAdmin && (
                <>
                  <div className="my-3 border-t border-white/5" />

                  <Link
                    href={ADMIN_NAV_ITEM.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex min-h-[52px] items-center gap-4 rounded-2xl px-4 py-3",
                      "border font-bold transition-all duration-200",
                      isActive(pathname, ADMIN_NAV_ITEM.href)
                        ? "border-amber-400/30 bg-gradient-to-l from-amber-500/20 to-cyan-400/10 text-amber-300 shadow-glow"
                        : "border-amber-400/10 bg-amber-400/5 text-amber-300/80 hover:bg-amber-400/10 hover:text-amber-200"
                    )}
                  >
                    <span className="flex w-7 justify-center text-xl" aria-hidden>
                      {ADMIN_NAV_ITEM.icon}
                    </span>
                    <span>{ADMIN_NAV_ITEM.label}</span>
                    {isActive(pathname, ADMIN_NAV_ITEM.href) && (
                      <span className="mr-auto text-amber-300">●</span>
                    )}
                  </Link>
                </>
              )}
            </div>
          </nav>

          <div className="absolute inset-x-0 bottom-0 border-t border-white/5 bg-navy-950/95 p-3">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex min-h-[50px] w-full items-center gap-4 rounded-2xl px-4 py-3 font-bold text-red-300/80 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <span className="flex w-7 justify-center text-xl" aria-hidden>🚪</span>
              تسجيل الخروج
            </button>
          </div>
        </aside>

        {/* محتوى الصفحة مع لون النص المخصص */}
        <main
          className="px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8"
          data-maris-text-color={textColor}
          style={
            {
              color: textColor,
              "--maris-text-color": textColor,
            } as React.CSSProperties
          }
        >
          <style>{`
            main[data-maris-text-color] :is(
              [class~="text-foam"],
              [class~="text-white"],
              [class*="text-foam/"],
              [class*="text-white/"]
            ) {
              color: var(--maris-text-color) !important;
            }
          `}</style>

          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        {!showCinematicLoader && adminCheckedFor === session.user.id && (
          <MarisTour userId={session.user.id} isAdmin={isAdmin} />
        )}

        {/* شاشة التحميل السينمائية */}
        {showCinematicLoader && (
          <div
            role="status"
            aria-live="polite"
            aria-label="جارٍ تجهيز MARIS ACADEMY"
            aria-busy={loaderProgress < 100}
            className={`maris-cinematic-loader fixed inset-0 z-[100] flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#020817] text-white transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isLoaderExiting
                ? "pointer-events-none translate-y-1 opacity-0 scale-[1.02]"
                : "translate-y-0 opacity-100 scale-100"
            }`}
          >
            <style>{`
              @keyframes maris-loader-shimmer {
                from { transform: translateX(-120%); }
                to { transform: translateX(260%); }
              }

              @media (prefers-reduced-motion: reduce) {
                .maris-loader-motion { animation: none !important; }
                .maris-cinematic-loader { transition-duration: 1ms !important; }
              }
            `}</style>

            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat sm:bg-cover"
              style={{ backgroundImage: "url('/maris-loader-bg.png')" }}
              aria-hidden="true"
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#020817]/70 via-[#031126]/10 to-[#020817]/15" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(8,145,178,0.16),transparent_45%)]" />

            <div className="pointer-events-none absolute inset-x-0 top-[17%] z-10 flex flex-col items-center px-4 text-center sm:top-[15%]">
              <div className="mb-4 flex h-[76px] w-[76px] items-center justify-center rounded-full border border-amber-200/65 bg-[#061b30]/45 shadow-[0_0_35px_rgba(251,191,36,0.16),inset_0_0_24px_rgba(34,211,238,0.12)] backdrop-blur-sm sm:h-[92px] sm:w-[92px]">
                <span className="bg-gradient-to-b from-white via-sky-200 to-blue-400 bg-clip-text font-serif text-6xl font-semibold leading-none text-transparent sm:text-7xl">
                  M
                </span>
              </div>

              <h1
                dir="ltr"
                aria-label="MARIS"
                className="font-serif text-4xl font-semibold tracking-[0.2em] text-white drop-shadow-[0_3px_18px_rgba(56,189,248,0.45)] sm:text-6xl"
                style={{ direction: "ltr", unicodeBidi: "isolate" }}
              >
                {Array.from("MARIS").map((letter, index) => (
                  <span
                    key={`maris-${letter}-${index}`}
                    className={`maris-letter ${
                      loaderProgress >= (index + 1) * 5 ? "is-formed" : ""
                    }`}
                    style={{ transitionDelay: `${index * 45}ms` }}
                  >
                    {letter}
                  </span>
                ))}
              </h1>

              <div className="mt-1 flex items-center gap-3 text-xs font-semibold tracking-[0.48em] text-amber-200 sm:mt-2 sm:text-base">
                <span className="h-px w-8 bg-amber-200/80 sm:w-14" />

                <span
                  dir="ltr"
                  aria-label="ACADEMY"
                  style={{
                    direction: "ltr",
                    unicodeBidi: "isolate",
                    display: "inline-flex",
                  }}
                >
                  {Array.from("ACADEMY").map((letter, index) => (
                    <span
                      key={`academy-${letter}-${index}`}
                      className={`maris-letter ${
                        loaderProgress >= 30 + (index + 1) * 5
                          ? "is-formed"
                          : ""
                      }`}
                      style={{ transitionDelay: `${index * 35}ms` }}
                    >
                      {letter}
                    </span>
                  ))}
                </span>

                <span className="h-px w-8 bg-amber-200/80 sm:w-14" />
              </div>

              <p
                dir="ltr"
                className="mt-2 text-sm tracking-[0.55em] text-sky-200 sm:mt-3 sm:text-lg"
                style={{ direction: "ltr", unicodeBidi: "isolate" }}
              >
                {Array.from("2027").map((digit, index) => (
                  <span
                    key={`year-${digit}-${index}`}
                    className={`maris-letter ${
                      loaderProgress >= 70 + (index + 1) * 5 ? "is-formed" : ""
                    }`}
                    style={{ transitionDelay: `${index * 55}ms` }}
                  >
                    {digit}
                  </span>
                ))}
              </p>
            </div>

            <div className="absolute bottom-[7.5%] left-1/2 z-10 w-[min(82vw,620px)] -translate-x-1/2 sm:bottom-[8%]">
              <div className="mb-3 flex items-center justify-between gap-4 text-xs font-semibold sm:text-sm">
                <span className="min-w-0 truncate text-white/85">
                  {loaderMessage}
                </span>
                <span className="shrink-0 tabular-nums text-amber-200">
                  {loaderProgress}%
                </span>
              </div>

              <div
                className="relative h-2.5 overflow-hidden rounded-full border border-white/25 bg-[#06152c]/85 shadow-[0_0_32px_rgba(34,211,238,0.35)] backdrop-blur-md sm:h-3"
                role="progressbar"
                aria-label="تقدم تجهيز المنصة"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={loaderProgress}
              >
                <div
                  className="relative h-full rounded-full bg-gradient-to-l from-amber-200 via-cyan-300 to-blue-500 shadow-[0_0_18px_rgba(103,232,249,0.7)] transition-[width] duration-[900ms] ease-in-out"
                  style={{ width: `${loaderProgress}%` }}
                >
                  <span
                    className="maris-loader-motion absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                    style={{
                      animation:
                        loaderProgress < 100
                          ? "maris-loader-shimmer 1.5s ease-in-out infinite"
                          : "none",
                    }}
                  />
                </div>
              </div>

              <p className="mt-2 text-center text-[9px] tracking-[0.32em] text-white/70 sm:text-[10px]">
                MARIS ACADEMY · 2027
              </p>
            </div>
          </div>
        )}
      </div>
    </StreamPreviewProvider>
  );
}