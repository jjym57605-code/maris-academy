"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type {
Session,
SupabaseClient,
} from "@supabase/supabase-js";

import {
getSupabase,
isSupabaseConfigured,
} from "@/lib/supabase";

import { signOut } from "@/services/auth";

import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui";
import SetupNotice from "@/components/SetupNotice";

// ══════════════════════════════════════════════════════
// MARIS ACADEMY — App Shell
// ══════════════════════════════════════════════════════

const NAV_ITEMS = [
{
href: "/dashboard",
icon: "🏠",
label: "الرئيسية",
},
{
href: "/reels",
icon: "🎬",
label: "الريلزات",
},
{
href: "/courses",
icon: "📚",
label: "الدورات",
},
{
href: "/library",
icon: "📖",
label: "مكتبة الدروس",
},
{
href: "/quizzes",
icon: "📝",
label: "الاختبارات",
},
{
href: "/forum",
icon: "💬",
label: "المنتدى",
},
{
href: "/progress",
icon: "📊",
label: "تقدمي",
},
{
href: "/leaderboard",
icon: "🏆",
label: "الترتيب",
},
{
href: "/achievements",
icon: "🏆",
label: "الإنجازات",
},
{
href: "/maris-id",
icon: "🪪",
label: "MARIS ID",
},
{
href: "/profile",
icon: "👤",
label: "ملفي",
},
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

function isActive(
pathname: string,
href: string
) {
return (
pathname === href ||
pathname.startsWith(`${href}/`)
);
}

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
} = await supabase.rpc(
  "is_current_user_admin"
);

if (!rpcError) {
  return rpcData === true;
}

console.error(
  "Admin check error:",
  rpcError
);

return false;


} catch (error) {
console.error(
"Admin check error:",
error
);


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

const [session, setSession] =
useState<Session | null>(null);

const [checking, setChecking] =
useState(true);

const [isAdmin, setIsAdmin] =
useState(false);

const [menuOpen, setMenuOpen] =
useState(false);

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
      data: {
        session: currentSession,
      },
      error,
    } = await supabase.auth.getSession();

    if (!mounted) {
      return;
    }

    if (error) {
      console.error(
        "Supabase session error:",
        error
      );

      setSession(null);
      setIsAdmin(false);
      setChecking(false);

      router.replace("/login");
      return;
    }

    if (!currentSession) {
      setSession(null);
      setIsAdmin(false);
      setChecking(false);

      router.replace("/login");
      return;
    }

    setSession(currentSession);
    setChecking(false);

    void checkAdmin(
      supabase,
      currentSession.user.id
    ).then((adminStatus) => {
      if (!mounted) {
        return;
      }

      setIsAdmin(adminStatus);
    });
  } catch (error) {
    console.error(
      "AppShell session initialization error:",
      error
    );

    if (!mounted) {
      return;
    }

    setSession(null);
    setIsAdmin(false);
    setChecking(false);

    router.replace("/login");
  }
}

void initialize();

// ══════════════════════════════════════════════
// مراقبة تسجيل الدخول / الخروج
// ══════════════════════════════════════════════

const {
  data: {
    subscription,
  },
} = supabase.auth.onAuthStateChange(
  (_event, currentSession) => {
    if (!mounted) {
      return;
    }

    if (!currentSession) {
      setSession(null);
      setIsAdmin(false);
      setChecking(false);

      router.replace("/login");
      return;
    }

    setSession(currentSession);
    setChecking(false);

    void checkAdmin(
      supabase,
      currentSession.user.id
    ).then((adminStatus) => {
      if (!mounted) {
        return;
      }

      setIsAdmin(adminStatus);
    });
  }
);

return () => {
  mounted = false;
  subscription.unsubscribe();
};


}, [router]);

// ══════════════════════════════════════════════════════
// إعادة فحص الأدمن عند الرجوع للتطبيق
// ══════════════════════════════════════════════════════

useEffect(() => {
const supabaseClient = getSupabase();


if (
  !supabaseClient ||
  !session?.user?.id
) {
  return;
}

const supabase = supabaseClient;
const userId = session.user.id;

async function handleVisibilityChange() {
  if (
    document.visibilityState !== "visible"
  ) {
    return;
  }

  try {
    const {
      data: {
        session: currentSession,
      },
    } = await supabase.auth.getSession();

    if (!currentSession) {
      setSession(null);
      setIsAdmin(false);
      router.replace("/login");
      return;
    }

    setSession(currentSession);

    const adminStatus =
      await checkAdmin(
        supabase,
        userId
      );

    setIsAdmin(adminStatus);
  } catch (error) {
    console.error(
      "Admin refresh error:",
      error
    );
  }
}

document.addEventListener(
  "visibilitychange",
  handleVisibilityChange
);

return () => {
  document.removeEventListener(
    "visibilitychange",
    handleVisibilityChange
  );
};


}, [
router,
session?.user?.id,
]);

// ══════════════════════════════════════════════════════
// إغلاق القائمة عند تغيير الصفحة
// ══════════════════════════════════════════════════════

useEffect(() => {
setMenuOpen(false);
}, [pathname]);

// ══════════════════════════════════════════════════════
// منع Scroll في الخلفية
// ══════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════
// ESC لإغلاق القائمة
// ══════════════════════════════════════════════════════

useEffect(() => {
function handleKeyDown(
event: KeyboardEvent
) {
if (event.key === "Escape") {
setMenuOpen(false);
}
}


if (menuOpen) {
  window.addEventListener(
    "keydown",
    handleKeyDown
  );
}

return () => {
  window.removeEventListener(
    "keydown",
    handleKeyDown
  );
};


}, [menuOpen]);

// ══════════════════════════════════════════════════════
// إعداد Supabase
// ══════════════════════════════════════════════════════

if (!isSupabaseConfigured()) {
return <SetupNotice />;
}

// ══════════════════════════════════════════════════════
// التحقق من الجلسة
// ══════════════════════════════════════════════════════

if (checking || !session) {
return ( <Spinner label="جارٍ التحقق من الجلسة…" />
);
}

// ══════════════════════════════════════════════════════
// تسجيل الخروج
// ══════════════════════════════════════════════════════

async function handleSignOut() {
const supabase = getSupabase();

setMenuOpen(false);

if (supabase) {
  await signOut(supabase).catch(
    () => undefined
  );
}

setSession(null);
setIsAdmin(false);

router.replace("/login");


}

return ( <div className="min-h-screen">
{/* ═══════════════════════════════════════════════
TOP BAR
═══════════════════════════════════════════════ */}


  <header className="sticky top-0 z-30 border-b border-white/5 bg-navy-950/85 backdrop-blur-xl">
    <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
      <button
        type="button"
        onClick={() =>
          setMenuOpen(
            (current) => !current
          )
        }
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-2xl",
          "border border-white/10 bg-white/5",
          "text-2xl text-foam",
          "transition-all duration-200",
          "hover:bg-white/10 hover:text-cyan-300",
          "active:scale-95"
        )}
        aria-label={
          menuOpen
            ? "إغلاق القائمة"
            : "فتح القائمة"
        }
        aria-expanded={menuOpen}
      >
        <span aria-hidden>
          {menuOpen ? "✕" : "☰"}
        </span>
      </button>

      <Link
        href="/dashboard"
        className="flex items-center gap-2"
        aria-label="MARIS ACADEMY — الرئيسية"
      >
        <span
          className="text-2xl"
          aria-hidden
        >
          🌊
        </span>

        <span className="font-grotesk text-xs font-bold leading-tight tracking-widest text-white sm:text-sm">
          MARIS
          <br />
          ACADEMY{" "}
          <span className="text-cyan-400">
            ²⁰²⁷
          </span>
        </span>
      </Link>
    </div>
  </header>

  {/* ═══════════════════════════════════════════════
      الخلفية عند فتح القائمة
  ═══════════════════════════════════════════════ */}

  {menuOpen && (
    <button
      type="button"
      aria-label="إغلاق القائمة"
      onClick={() =>
        setMenuOpen(false)
      }
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
    />
  )}

  {/* ═══════════════════════════════════════════════
      القائمة الجانبية
  ═══════════════════════════════════════════════ */}

  <aside
    className={cn(
      "fixed inset-y-0 right-0 z-50 w-[min(88vw,320px)]",
      "border-l border-white/10",
      "bg-navy-950/98 shadow-2xl backdrop-blur-2xl",
      "transition-transform duration-300 ease-out",
      menuOpen
        ? "translate-x-0"
        : "translate-x-full"
    )}
    aria-hidden={!menuOpen}
  >
    <div className="flex items-center justify-between border-b border-white/5 px-5 py-5">
      <Link
        href="/dashboard"
        onClick={() =>
          setMenuOpen(false)
        }
        className="flex items-center gap-3"
      >
        <span
          className="text-3xl"
          aria-hidden
        >
          🌊
        </span>

        <span className="font-grotesk text-sm font-bold leading-tight tracking-widest text-white">
          MARIS
          <br />
          ACADEMY{" "}
          <span className="text-cyan-400">
            ²⁰²⁷
          </span>
        </span>
      </Link>

      <button
        type="button"
        onClick={() =>
          setMenuOpen(false)
        }
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
        {NAV_ITEMS.map(
          (item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() =>
                setMenuOpen(false)
              }
              className={cn(
                "flex min-h-[50px] items-center gap-4 rounded-2xl px-4 py-3",
                "font-bold transition-all duration-200",
                isActive(
                  pathname,
                  item.href
                )
                  ? "bg-gradient-to-l from-ocean-500/25 to-cyan-400/15 text-cyan-300 shadow-glow"
                  : "text-foam/65 hover:bg-white/5 hover:text-foam"
              )}
            >
              <span
                className="flex w-7 justify-center text-xl"
                aria-hidden
              >
                {item.icon}
              </span>

              <span>
                {item.label}
              </span>

              {isActive(
                pathname,
                item.href
              ) && (
                <span className="mr-auto text-cyan-400">
                  ●
                </span>
              )}
            </Link>
          )
        )}

        <div className="my-3 border-t border-white/5" />

        <Link
          href={ABOUT_NAV_ITEM.href}
          onClick={() =>
            setMenuOpen(false)
          }
          className={cn(
            "flex min-h-[50px] items-center gap-4 rounded-2xl px-4 py-3",
            "font-bold transition-all duration-200",
            isActive(
              pathname,
              ABOUT_NAV_ITEM.href
            )
              ? "bg-gradient-to-l from-ocean-500/25 to-cyan-400/15 text-cyan-300 shadow-glow"
              : "text-foam/65 hover:bg-white/5 hover:text-foam"
          )}
        >
          <span
            className="flex w-7 justify-center text-xl"
            aria-hidden
          >
            {ABOUT_NAV_ITEM.icon}
          </span>

          <span>
            {ABOUT_NAV_ITEM.label}
          </span>

          {isActive(
            pathname,
            ABOUT_NAV_ITEM.href
          ) && (
            <span className="mr-auto text-cyan-400">
              ●
            </span>
          )}
        </Link>

        {isAdmin && (
          <>
            <div className="my-3 border-t border-white/5" />

            <Link
              href={ADMIN_NAV_ITEM.href}
              onClick={() =>
                setMenuOpen(false)
              }
              className={cn(
                "flex min-h-[52px] items-center gap-4 rounded-2xl px-4 py-3",
                "border font-bold transition-all duration-200",
                isActive(
                  pathname,
                  ADMIN_NAV_ITEM.href
                )
                  ? "border-amber-400/30 bg-gradient-to-l from-amber-500/20 to-cyan-400/10 text-amber-300 shadow-glow"
                  : "border-amber-400/10 bg-amber-400/5 text-amber-300/80 hover:bg-amber-400/10 hover:text-amber-200"
              )}
            >
              <span
                className="flex w-7 justify-center text-xl"
                aria-hidden
              >
                👑
              </span>

              <span>
                لوحة الإدارة
              </span>

              {isActive(
                pathname,
                ADMIN_NAV_ITEM.href
              ) && (
                <span className="mr-auto text-amber-300">
                  ●
                </span>
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
        <span
          className="flex w-7 justify-center text-xl"
          aria-hidden
        >
          🚪
        </span>

        تسجيل الخروج
      </button>
    </div>
  </aside>

  <main className="px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
    <div className="mx-auto w-full max-w-7xl">
      {children}
    </div>
  </main>
</div>


);
}

