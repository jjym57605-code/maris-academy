"use client";

import Link from "next/link";

export default function MaintenanceScreen() {
  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#031323] px-5 py-12 text-white"
    >
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-2xl text-center">
        <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-cyan-300/20 bg-cyan-300/[0.07] shadow-[0_0_60px_rgba(34,211,238,0.12)]">
          <span className="text-5xl">🐋</span>
        </div>

        <p
          dir="ltr"
          className="mb-5 text-xs font-bold tracking-[0.35em] text-cyan-300 sm:text-sm"
        >
          MARIS ACADEMY · 2027
        </p>

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-4 py-2 text-xs font-semibold text-amber-200 sm:text-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />
          المنصة قيد التطوير
        </div>

        <h1 className="text-3xl font-black leading-tight sm:text-5xl">
          نحضّرولكم تجربة
          <span className="mt-2 block bg-gradient-to-l from-cyan-200 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            تستاهل تطلّعاتكم
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-sm leading-8 text-slate-300 sm:text-base">
          رانا نخدمو على تطوير MARIS ACADEMY وتحسين فضاء التعلّم،
          باش نقدّمولكم تجربة دراسية أفضل لبكالوريا 2027.
          نرجعو نفتحولكم المنصة كي نكملو التحضيرات اللازمة.
        </p>

        <div className="mx-auto mt-9 grid max-w-md grid-cols-3 gap-3">
          {[
            { icon: "📚", label: "تعلّم أفضل" },
            { icon: "🌊", label: "تجربة جديدة" },
            { icon: "🎯", label: "نحو النجاح" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-2 py-4"
            >
              <div className="text-2xl">{item.icon}</div>
              <p className="mt-2 text-[11px] font-semibold text-slate-300 sm:text-xs">
                {item.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 h-px max-w-xs bg-gradient-to-l from-transparent via-cyan-400/30 to-transparent" />

        <p className="mt-6 text-xs leading-6 text-slate-500">
          شكرًا على صبركم وثقتكم في MARIS ACADEMY 💙
        </p>

        <Link
          href="/about"
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-5 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-300/10"
        >
          اكتشف الأكاديمية ←
        </Link>
      </div>
    </main>
  );
}
