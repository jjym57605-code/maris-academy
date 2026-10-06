
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getSession, signOut } from "@/services/auth";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui";
import SetupNotice from "@/components/SetupNotice";

// ══════════════════════════════════════════════════════
// هيكل التطبيق — حارس المصادقة + التنقل العربي RTL
// الشريط الجانبي على اليمين (سطح المكتب)
// شريط سفلي (الهاتف)
// ══════════════════════════════════════════════════════

const NAV_ITEMS = [
  { href: "/dashboard", icon: "🏠", label: "الرئيسية" },
  { href: "/reels", icon: "🎬", label: "الريلزات" },
  { href: "/courses", icon: "📚", label: "الدروس" },
  { href: "/quizzes", icon: "📝", label: "الاختبارات" },
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

const ADMIN_NAV_ITEM = {
  href: "/admin",
  icon: "👑",
  label: "لوحة الإدارة",
} as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
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

  useEffect(() => {
    const supabase = getSupabase();

    if (!supabase) {
      setChecking(false);
      return;
    }

    let mounted = true;

    getSession(supabase).then(async (s) => {
      if (!mounted) return;

      if (!s) {
        router.replace("/login");
        return;
      }

      setSession(s);

      const { data } = await supabase.rpc("is_current_user_admin");

      if (mounted) {
        setIsAdmin(data === true);
        setChecking(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      setSession(session);

      supabase.rpc("is_current_user_admin").then(({ data }) => {
        if (mounted) {
          setIsAdmin(data === true);
        }
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (!isSupabaseConfigured()) return <SetupNotice />;

  if (checking || !session) {
    return <Spinner label="جارٍ التحقق من الجلسة…" />;
  }

  async function handleSignOut() {
    const supabase = getSupabase();

    if (supabase) {
      await signOut(supabase).catch(() => undefined);
    }

    router.replace("/login");
  }

  return (
    <div className="min-h-screen">
      {/* ═══ الشريط الجانبي — يمين الشاشة (سطح المكتب) ═══ */}
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-64 flex-col border-l border-white/5 bg-navy-900/80 backdrop-blur-xl lg:flex">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-6 py-7"
          aria-label="MARIS ACADEMY — الرئيسية"
        >
          <span className="text-3xl" aria-hidden>
            🌊
          </span>

          <span className="font-grotesk text-sm font-bold leading-tight tracking-widest text-white">
            MARIS
            <br />
            ACADEMY <span className="text-cyan-400">²⁰²⁷</span>
          </span>
        </Link>

        <nav
          className="flex-1 space-y-1 overflow-y-auto px-3"
          aria-label="التنقل الرئيسي"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[44px] items-center gap-3 rounded-2xl px-4 py-3 font-bold transition-all duration-200",
                isActive(pathname, item.href)
                  ? "bg-gradient-to-l from-ocean-500/25 to-cyan-400/15 text-cyan-300 shadow-glow"
                  : "text-foam/60 hover:bg-white/5 hover:text-foam"
              )}
            >
              <span className="text-xl" aria-hidden>
                {item.icon}
              </span>

              {item.label}
            </Link>
          ))}

          {/* ═══ عن MARIS ═══ */}
          <Link
            href={ABOUT_NAV_ITEM.href}
            className={cn(
              "mt-3 flex min-h-[44px] items-center gap-3 rounded-2xl px-4 py-3 font-bold transition-all duration-200",
              isActive(pathname, ABOUT_NAV_ITEM.href)
                ? "bg-gradient-to-l from-ocean-500/25 to-cyan-400/15 text-cyan-300 shadow-glow"
                : "text-foam/60 hover:bg-white/5 hover:text-foam"
            )}
          >
            <span className="text-xl" aria-hidden>
              {ABOUT_NAV_ITEM.icon}
            </span>

            {ABOUT_NAV_ITEM.label}
          </Link>

          {/* ═══ لوحة الإدارة — للأدمن فقط ═══ */}
          {isAdmin && (
            <Link
              href={ADMIN_NAV_ITEM.href}
              className={cn(
                "mt-3 flex min-h-[48px] items-center gap-3 rounded-2xl border px-4 py-3 font-bold transition-all duration-200",
                isActive(pathname, ADMIN_NAV_ITEM.href)
                  ? "border-amber-400/30 bg-gradient-to-l from-amber-500/20 to-cyan-400/10 text-amber-300 shadow-glow"
                  : "border-amber-400/10 bg-amber-400/5 text-amber-300/80 hover:bg-amber-400/10 hover:text-amber-200"
              )}
            >
              <span className="text-xl" aria-hidden>
                {ADMIN_NAV_ITEM.icon}
              </span>

              {ADMIN_NAV_ITEM.label}
            </Link>
          )}
        </nav>

        <div className="border-t border-white/5 p-4">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-2xl px-4 py-3 font-bold text-foam/50 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <span className="text-xl" aria-hidden>
              🚪
            </span>

            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ═══ المحتوى الرئيسي ═══ */}
      <main className="px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pr-72 lg:pt-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>

      {/* ═══ شريط التنقل السفلي — الهاتف ═══ */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-900/90 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="التنقل الرئيسي"
      >
        <div
          className={cn(
            "grid",
            isAdmin ? "grid-cols-7" : "grid-cols-6"
          )}
        >
          {NAV_ITEMS.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-bold transition-colors",
                isActive(pathname, item.href)
                  ? "text-cyan-300"
                  : "text-foam/50 hover:text-foam"
              )}
            >
              <span className="text-lg" aria-hidden>
                {item.icon}
              </span>

              {item.label}
            </Link>
          ))}

          <Link
            href={ABOUT_NAV_ITEM.href}
            className={cn(
              "flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-bold transition-colors",
              isActive(pathname, ABOUT_NAV_ITEM.href)
                ? "text-cyan-300"
                : "text-foam/50 hover:text-foam"
            )}
          >
            <span className="text-lg" aria-hidden>
              {ABOUT_NAV_ITEM.icon}
            </span>

            {ABOUT_NAV_ITEM.label}
          </Link>

          {isAdmin && (
            <Link
              href={ADMIN_NAV_ITEM.href}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-bold transition-colors",
                isActive(pathname, ADMIN_NAV_ITEM.href)
                  ? "text-amber-300"
                  : "text-amber-300/60 hover:text-amber-200"
              )}
            >
              <span className="text-lg" aria-hidden>
                👑
              </span>

              لوحة الإدارة
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}



