
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const ADMIN_ITEMS = [
  {
    label: "الرئيسية",
    icon: "🏠",
    href: "/admin",
    active: true,
  },
  {
    label: "الريلزات",
    icon: "🎬",
    href: "/admin/reels",
    active: true,
  },
  {
    label: "الدورات",
    icon: "📚",
    href: "/admin/courses",
    active: true,
  },
  {
    label: "مكتبة الدروس",
    icon: "📖",
    href: "/admin/library",
    active: true,
  },
  {
    label: "الطلاب",
    icon: "👥",
    href: "/admin/students",
    active: true,
  },
  {
    label: "آراء الطلبة",
    icon: "💬",
    href: "/admin/reviews",
    active: true,
  },
  {
    label: "الإنجازات",
    icon: "🏆",
    href: "/admin/achievements",
    active: true,
  },
  {
    label: "الاختبارات",
    icon: "📝",
    href: "/admin/quizzes",
    active: true,
  },
  {
    label: "المنتدى",
    icon: "💬",
    href: "/admin/forum",
    active: true,
  },
  {
  label: "الإعلانات",
  icon: "📢",
  href: "/admin/announcements",
  active: true,
},
  {
    label: "الإحصائيات",
    icon: "📊",
    href: "/admin/stats",
    active: true,
  },
  {
    label: "الإعدادات",
    icon: "⚙️",
    href: "/admin/settings",
    active: true,
  },
];

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-950 text-white"
    >
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-black">🌊 MARIS ACADEMY</h1>
            <p className="text-xs text-slate-400">لوحة الإدارة</p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10"
          >
            العودة
          </Link>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 border-l border-white/10 bg-slate-900/80 lg:block">
          <div className="sticky top-0 flex h-screen flex-col p-5">
            {/* Logo */}
            <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-1 text-xl font-black">
                🌊 MARIS ACADEMY
              </div>

              <div className="text-sm font-bold text-cyan-400">
                لوحة الإدارة
              </div>

              <div className="mt-1 text-xs text-slate-500">
                MARIS ACADEMY ²⁰²⁷
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2">
              {ADMIN_ITEMS.map((item) => {
                const isActive =
                  item.active &&
                  (pathname === item.href ||
                    (item.href !== "/admin" &&
                      pathname.startsWith(`${item.href}/`)));

                if (!item.active) {
                  return (
                    <div
                      key={item.label}
                      className="flex cursor-not-allowed items-center justify-between rounded-xl px-4 py-3 text-slate-600 opacity-70"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{item.icon}</span>
                        <span className="font-bold">{item.label}</span>
                      </div>

                      <span className="rounded-full bg-white/5 px-2 py-1 text-[10px]">
                        قريبًا
                      </span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 font-bold transition ${
                      isActive
                        ? "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/20"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Back to Student Dashboard */}
            <div className="mt-5 border-t border-white/10 pt-5">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-xl px-4 py-3 font-bold text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <span>↩️</span>
                <span>العودة للمنصة</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
