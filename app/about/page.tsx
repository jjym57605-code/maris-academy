"use client";

import Link from "next/link";

const SOCIAL_LINKS = [
  {
    name: "Telegram",
    icon: "telegram",
    description: "الإعلانات وآخر مستجدات الأكاديمية",
    href: "https://t.me/bac2027maris",
  },
  {
    name: "YouTube",
    icon: "youtube",
    description: "الدروس والشروحات التعليمية",
    href: "https://www.youtube.com/@academymaris",
  },
  {
    name: "Instagram",
    icon: "instagram",
    description: "أخبار MARIS ومحتوى الأكاديمية",
    href: "https://www.instagram.com/_maris_academy__/",
  },
];

const FEATURES = [
  {
    icon: "📚",
    title: "مكتبة الدروس",
    description:
      "محتوى تعليمي منظم يساعدك تلقى واش تحتاج في رحلتك الدراسية.",
  },
  {
    icon: "🎯",
    title: "اختبارات تفاعلية",
    description:
      "اختبر معلوماتك وتدرّب على الأسئلة باش تكتشف مستوى تقدمك.",
  },
  {
    icon: "🧠",
    title: "حفظني",
    description:
      "طريقة تفاعلية لمراجعة المعلومات وتثبيت المكتسبات.",
  },
  {
    icon: "📈",
    title: "متابعة التقدم",
    description:
      "تابع تقدمك وإنجازاتك وخلي رحلتك الدراسية أكثر تنظيمًا.",
  },
  {
    icon: "🏆",
    title: "التحفيز والإنجازات",
    description:
      "تحديات وإنجازات تشجعك على الاستمرار والتطور.",
  },
  {
    icon: "🪪",
    title: "MARIS ID",
    description:
      "معرّف خاص يساعد على تمييز حسابك داخل المنصة.",
  },
];

function SocialIcon({ icon }: { icon: string }) {
  if (icon === "telegram") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7"
        fill="currentColor"
        role="img"
        aria-label="Telegram"
      >
        <path d="M21.94 4.67a1.5 1.5 0 0 0-1.55-.23L2.8 11.2a1.5 1.5 0 0 0 .13 2.83l4.2 1.38 1.57 4.86a1.5 1.5 0 0 0 2.66.42l2.35-3.2 4.03 2.96a1.5 1.5 0 0 0 2.36-.92l2.05-18.4a1.5 1.5 0 0 0-.21-1.46ZM9.8 15.1l8.1-7.4-6.2 8.5-.3 2.4-1.6-3.5Zm9.1 3.2-5.2-3.8 5.9-10.3-1.7 14.1Z" />
      </svg>
    );
  }

  if (icon === "youtube") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7"
        fill="currentColor"
        role="img"
        aria-label="YouTube"
      >
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Instagram"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle
        cx="17.5"
        cy="6.5"
        r="1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#06111f] text-white"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[420px] w-[420px] rounded-full bg-cyan-400/[0.09] blur-[120px]" />
        <div className="absolute -left-40 top-[38%] h-[400px] w-[400px] rounded-full bg-blue-500/[0.08] blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 h-[300px] w-[300px] rounded-full bg-teal-400/[0.05] blur-[110px]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148, 220, 240, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 220, 240, 0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>
      
      {/* Navigation */}
      <header className="relative z-10 border-b border-white/[0.07] bg-[#06111f]/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 min-[380px]:px-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-4">
          <Link
            href="/"
            className="group flex min-w-0 items-center justify-center gap-2 sm:justify-start sm:gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.09] text-xl transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11 sm:rounded-2xl sm:text-2xl">
              🌊
            </div>

            <div className="min-w-0">
              <p className="whitespace-nowrap text-sm font-black tracking-wide text-white min-[380px]:text-base">
                MARIS <span className="text-cyan-300">ACADEMY</span>
              </p>
              <p className="text-[9px] font-bold tracking-[0.18em] text-white/35 sm:text-[10px] sm:tracking-[0.22em]">
                BAC 2027
              </p>
            </div>
          </Link>

          <nav
            aria-label="التنقل الرئيسي"
            className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:gap-2"
          >
            <Link
              href="/"
              className="flex min-w-0 items-center justify-center rounded-lg border border-white/10 px-1 py-2 text-center text-[10px] font-bold leading-tight text-white/75 transition hover:bg-white/5 hover:text-cyan-200 min-[380px]:px-1.5 min-[380px]:text-[11px] sm:shrink-0 sm:whitespace-nowrap sm:rounded-xl sm:border-transparent sm:px-3 sm:py-2.5 sm:text-sm"
            >
              الصفحة الرئيسية
            </Link>

            <Link
              href="/login"
              className="flex min-w-0 items-center justify-center rounded-lg border border-white/10 px-1 py-2 text-center text-[10px] font-bold leading-tight text-white/75 transition hover:border-cyan-300/30 hover:text-white min-[380px]:px-1.5 min-[380px]:text-[11px] sm:shrink-0 sm:whitespace-nowrap sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm"
            >
              تسجيل الدخول
            </Link>

            <Link
              href="/register"
              className="flex min-w-0 items-center justify-center rounded-lg bg-cyan-300 px-1 py-2 text-center text-[10px] font-black leading-tight text-[#06111f] shadow-[0_0_25px_rgba(103,232,249,0.12)] transition hover:-translate-y-0.5 hover:bg-cyan-200 min-[380px]:px-1.5 min-[380px]:text-[11px] sm:shrink-0 sm:whitespace-nowrap sm:rounded-xl sm:px-5 sm:py-2.5 sm:text-sm"
            >
              انضم إلينا
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-4 py-2 text-xs font-bold text-cyan-200 sm:text-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
              اكتشف عالم MARIS ACADEMY ²⁰²⁷
            </div>

            <h1 className="mt-7 text-4xl font-black leading-[1.35] tracking-tight sm:text-5xl lg:text-6xl">
              رحلتك نحو البكالوريا
              <span className="mt-2 block bg-gradient-to-l from-cyan-200 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                تبدأ بخطوة.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-9 text-slate-300/75 sm:text-lg">
              MARIS ACADEMY ²⁰²⁷ منصة تعليمية رقمية تجمع بين التعلم، المراجعة
              والتنظيم في تجربة واحدة، لمساعدتك على بناء رحلة دراسية أكثر
              وضوحًا وتفاعلية نحو بكالوريا 2027.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-l from-cyan-300 to-cyan-200 px-6 py-4 font-black text-[#06111f] shadow-[0_8px_35px_rgba(34,211,238,0.14)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(34,211,238,0.23)]"
              >
                ابدأ رحلتك الآن
                <span className="transition-transform duration-300 group-hover:-translate-x-1">
                  ←
                </span>
              </Link>

              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] px-6 py-4 font-bold text-white/80 transition hover:border-cyan-300/25 hover:bg-white/[0.06]"
              >
                اكتشف المميزات
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-slate-400 sm:text-sm">
              <span className="flex items-center gap-2">
                <span className="text-cyan-300">✓</span>
                تجربة تعليمية تفاعلية
              </span>
              <span className="flex items-center gap-2">
                <span className="text-cyan-300">✓</span>
                أدوات للمراجعة والتنظيم
              </span>
            </div>
          </div>

          {/* Decorative ocean card */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-5 rounded-[3rem] bg-cyan-300/[0.06] blur-2xl" />

            <div className="relative overflow-hidden rounded-[2.5rem] border border-cyan-200/15 bg-gradient-to-br from-[#102b40] via-[#0a1b2c] to-[#071421] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.3)] sm:p-9">
              <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full border border-cyan-200/[0.08]" />
              <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full border border-cyan-200/[0.08]" />

              <div className="relative flex items-center justify-between">
                <span className="rounded-full border border-cyan-200/15 bg-cyan-200/[0.07] px-3 py-1.5 text-[10px] font-black tracking-widest text-cyan-200">
                  YOUR NEXT CHAPTER
                </span>
                <span className="text-2xl">🐋</span>
              </div>

              <div className="relative py-12 text-center sm:py-14">
                <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border border-cyan-200/20 bg-gradient-to-br from-cyan-300/15 to-blue-500/10 shadow-[0_0_65px_rgba(34,211,238,0.1)] sm:h-44 sm:w-44">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border border-cyan-200/15 bg-[#071421]/70 text-6xl sm:h-36 sm:w-36 sm:text-7xl">
                    🌊
                  </div>
                </div>

                <h2 className="mt-7 text-2xl font-black text-white sm:text-3xl">
                  تعلّم. تقدّم.
                </h2>
                <p className="mt-2 text-sm font-semibold text-cyan-200/75">
                  اصنع مستقبلك.
                </p>
              </div>

              <div className="relative grid grid-cols-3 gap-2">
                {[
                  { icon: "📖", label: "تعلّم" },
                  { icon: "🧠", label: "راجع" },
                  { icon: "🚀", label: "تقدّم" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-2 py-4 text-center transition duration-300 hover:border-cyan-200/20 hover:bg-cyan-200/[0.05]"
                  >
                    <div className="text-2xl">{item.icon}</div>
                    <p className="mt-2 text-xs font-bold text-white/70">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute -right-3 top-1/4 hidden rounded-2xl border border-cyan-200/15 bg-[#0b2030]/95 px-4 py-3 shadow-xl sm:block">
              <p className="text-xs font-bold text-cyan-200">
                كل خطوة تفرق ✨
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="relative z-10 border-y border-white/[0.06] bg-white/[0.018]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-black tracking-widest text-cyan-300">
              ABOUT MARIS
            </span>

            <h2 className="mt-4 text-3xl font-black sm:text-4xl">
              ما هي <span className="text-cyan-300">MARIS</span>؟
            </h2>

            <p className="mt-6 text-base leading-9 text-slate-300/75 sm:text-lg">
              MARIS ACADEMY ²⁰²⁷ هي مساحة تعليمية رقمية صُممت لتجمع أدوات
              الدراسة والمراجعة في مكان واحد. هدفها تسهيل الوصول إلى المحتوى
              التعليمي، تشجيع الاستمرارية، ومساعدة الطالب على متابعة تطوره
              وتنظيم جهده خلال السنة الدراسية.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <article className="group rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.045] to-transparent p-7 transition duration-300 hover:-translate-y-1 hover:border-cyan-200/20 sm:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.07] text-3xl">
                🧭
              </div>
              <h3 className="mt-5 text-xl font-black">رؤيتنا</h3>
              <p className="mt-3 leading-8 text-slate-300/70">
                نطمح إلى جعل التجربة الدراسية أكثر تنظيمًا وتفاعلًا، من خلال
                أدوات تساعد الطالب على المراجعة المنتظمة وفهم تقدمه خطوة بخطوة.
              </p>
            </article>

            <article className="group rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.045] to-transparent p-7 transition duration-300 hover:-translate-y-1 hover:border-cyan-200/20 sm:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.07] text-3xl">
                💙
              </div>
              <h3 className="mt-5 text-xl font-black">هدفنا</h3>
              <p className="mt-3 leading-8 text-slate-300/70">
                توفير بيئة تعليمية تجمع المحتوى والأدوات التحفيزية في تجربة
                واحدة، مع إبقاء الطالب في قلب رحلته التعليمية.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative z-10 mx-auto max-w-7xl scroll-mt-10 px-5 py-20 sm:px-8 sm:py-24"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-sm font-black tracking-widest text-cyan-300">
              THE MARIS EXPERIENCE
            </span>
            <h2 className="mt-4 text-3xl font-black sm:text-4xl">
              أدوات تساعدك في رحلتك
            </h2>
          </div>

          <p className="max-w-xl leading-8 text-slate-400">
            تجربة تجمع بين التعلم والتدريب والمتابعة، حتى تكون خطواتك الدراسية
            أوضح وأكثر تنظيمًا.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <article
              key={feature.title}
              className="group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-200/25 hover:bg-cyan-200/[0.025] sm:p-7"
            >
              <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-cyan-300/[0.035] blur-2xl transition group-hover:bg-cyan-300/[0.08]" />

              <div className="relative flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.06] text-3xl transition duration-300 group-hover:scale-105">
                  {feature.icon}
                </div>

                <span className="text-xs font-black tracking-widest text-white/20">
                  0{index + 1}
                </span>
              </div>

              <h3 className="relative mt-6 text-lg font-black">
                {feature.title}
              </h3>
              <p className="relative mt-3 text-sm leading-7 text-slate-400">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Philosophy */}
      <section className="relative z-10 mx-5 overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-gradient-to-l from-cyan-300/[0.08] via-[#10263a]/70 to-blue-400/[0.04] sm:mx-8 lg:mx-auto lg:max-w-7xl">
        <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-cyan-300/[0.06] blur-3xl" />

        <div className="relative grid gap-8 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center lg:p-14">
          <div>
            <span className="text-sm font-black tracking-widest text-cyan-200">
              OUR PHILOSOPHY
            </span>
            <h2 className="mt-4 text-2xl font-black leading-relaxed sm:text-3xl">
              النجاح رحلة، وليس خطوة واحدة.
            </h2>
            <p className="mt-4 max-w-2xl leading-8 text-slate-300/70">
              كل مراجعة، كل تمرين، وكل خطوة صغيرة تقدر تقربك من هدفك. ابدأ
              بالمتاح، وواصل التقدم بوتيرتك.
            </p>
          </div>

          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-6 py-4 font-black text-[#06111f] transition hover:-translate-y-1 hover:bg-cyan-200"
          >
            اكتشف المنصة
            <span>←</span>
          </Link>
        </div>
      </section>

      {/* Social */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="text-center">
          <span className="text-sm font-black tracking-widest text-cyan-300">
            STAY CONNECTED
          </span>
          <h2 className="mt-4 text-3xl font-black sm:text-4xl">
            خليك قريب من MARIS
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-8 text-slate-400">
            تابع صفحاتنا باش تبقى على اطلاع بالإعلانات والمحتوى الجديد.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`تابع MARIS على ${social.name}`}
              className="group rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-200/25 hover:bg-white/[0.045] sm:p-7"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035] text-cyan-200 transition group-hover:border-cyan-200/20 group-hover:bg-cyan-200/[0.07]">
                  <SocialIcon icon={social.icon} />
                </div>

                <span className="text-xl text-white/30 transition group-hover:-translate-x-1 group-hover:text-cyan-200">
                  ←
                </span>
              </div>

              <h3 className="mt-5 text-lg font-black">{social.name}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                {social.description}
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* Developer contact */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-7 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-9">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">💬</span>
              <h2 className="text-xl font-black">عندك اقتراح؟</h2>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              رأيك وأفكارك يقدروا يساهموا في تطوير تجربة MARIS ACADEMY.
            </p>
          </div>

          <a
            href="https://t.me/mou_ad_vn_o"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-200/[0.06] px-5 py-3.5 text-sm font-black text-cyan-100 transition hover:bg-cyan-200/[0.12] sm:mt-0"
          >
            تواصل عبر Telegram
            <span>↗</span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.07] bg-black/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-center sm:flex-row sm:px-8 sm:text-right">
          <Link href="/" className="text-sm font-black tracking-wide">
            MARIS <span className="text-cyan-300">ACADEMY ²⁰²⁷</span>
          </Link>

          <p className="text-xs leading-6 text-slate-500">
            تعلم. تقدّم. اصنع مستقبلك.
          </p>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
            <Link href="/" className="transition hover:text-cyan-200">
              الرئيسية
            </Link>
            <Link href="/login" className="transition hover:text-cyan-200">
              الدخول
            </Link>
            <Link href="/register" className="transition hover:text-cyan-200">
              التسجيل
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
