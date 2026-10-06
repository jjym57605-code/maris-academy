"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getSession, signOut } from "@/services/auth";

type NavItem = {
  href: string;
  icon: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    icon: "🏠",
    label: "الرئيسية",
  },
  {
    href: "/courses",
    icon: "📚",
    label: "الدورات",
  },
  {
    href: "/quizzes",
    icon: "📝",
    label: "الاختبارات",
  },
  {
    href: "/reels",
    icon: "🎬",
    label: "الريلزات",
  },
  {
    href: "/achievements",
    icon: "🏆",
    label: "الإنجازات",
  },
  {
    href: "/stats",
    icon: "📊",
    label: "إحصائياتي",
  },
];

const ABOUT_NAV_ITEM: NavItem = {
  href: "/about",
  icon: "💙",
  label: "عن MARIS",
};

const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin",
  icon: "👑",
  label: "لوحة الإدارة",
};

export default function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      if (!isSupabaseConfigured()) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      const supabase = getSupabase();

      if (!supabase) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const currentSession = await getSession(supabase);

        if (!mounted) return;

        setSession(currentSession);

        if (currentSession?.user) {
          const { data } = await supabase.rpc(
            "is_current_user_admin"
          );

          if (mounted) {
            setIsAdmin(data === true);
          }
        }
      } catch (error) {
        console.error("APP SHELL ERROR:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSignOut() {
    const supabase = getSupabase();

    if (!supabase) {
      router.replace("/login");
      return;
    }

    try {
      await signOut(supabase);
      router.replace("/login");
    } catch (error) {
      console.error("SIGN OUT ERROR:", error);
    }
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#03111d] text-slate-100"
    >
      {/* TOP BAR */}
      <header className="sticky top-0 z-50 border-b border-cyan-400/10 bg-[#03111d]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/10 text-xl">
              🌊
            </div>

            <div className="hidden sm:block">
              <p className="text-sm font-bold text-white">
                MARIS ACADEMY
              </p>

              <p className="text-[10px] font-medium tracking-widest text-cyan-400">
                ²⁰²⁷
              </p>
            </div>
          </Link>

          {!loading && session && (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`hidden rounded-xl border px-3 py-2 text-xs font-semibold transition md:inline-flex ${
                    isActive("/admin")
                      ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                      : "border-white/5 bg-white/[0.025] text-slate-400 hover:border-cyan-400/15 hover:bg-cyan-400/5 hover:text-white"
                  }`}
                >
                  👑 الإدارة
                </Link>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-red-400/20 hover:bg-red-400/5 hover:text-red-300"
              >
                خروج
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* SIDEBAR */}
        <aside className="hidden w-64 shrink-0 border-l border-cyan-400/10 lg:block">
          <div className="sticky top-16 p-4">
            <nav className="space-y-2">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? "border border-cyan-400/15 bg-cyan-400/10 text-cyan-300"
                        : "border border-transparent text-slate-400 hover:border-cyan-400/10 hover:bg-cyan-400/5 hover:text-white"
                    }`}
                  >
                    <span className="text-lg">
                      {item.icon}
                    </span>

                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <div className="my-4 border-t border-white/5" />

              <Link
                href={ABOUT_NAV_ITEM.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive(ABOUT_NAV_ITEM.href)
                    ? "border border-cyan-400/15 bg-cyan-400/10 text-cyan-300"
                    : "border border-transparent text-slate-400 hover:border-cyan-400/10 hover:bg-cyan-400/5 hover:text-white"
                }`}
              >
                <span className="text-lg">
                  {ABOUT_NAV_ITEM.icon}
                </span>

                <span>{ABOUT_NAV_ITEM.label}</span>
              </Link>

              {isAdmin && (
                <Link
                  href={ADMIN_NAV_ITEM.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive("/admin")
                      ? "border border-yellow-400/15 bg-yellow-400/10 text-yellow-300"
                      : "border border-transparent text-slate-400 hover:border-yellow-400/10 hover:bg-yellow-400/5 hover:text-white"
                  }`}
                >
                  <span className="text-lg">
                    {ADMIN_NAV_ITEM.icon}
                  </span>

                  <span>{ADMIN_NAV_ITEM.label}</span>
                </Link>
              )}
            </nav>
          </div>
        </aside>

        {/* CONTENT */}
        <main className="min-w-0 flex-1 pb-24">
          {children}
        </main>
      </div>

      {/* MOBILE NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-cyan-400/10 bg-[#03111d]/95 px-2 py-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-around gap-1">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-2 transition ${
                  active
                    ? "bg-cyan-400/10 text-cyan-300"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <span className="text-lg">
                  {item.icon}
                </span>

                <span className="mt-1 truncate text-[9px] font-medium">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/admin"
              className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-2 transition ${
                isActive("/admin")
                  ? "bg-yellow-400/10 text-yellow-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <span className="text-lg">👑</span>

              <span className="mt-1 truncate text-[9px] font-medium">
                الإدارة
              </span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}


