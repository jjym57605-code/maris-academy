import Link from "next/link";

// ══════════════════════════════════════════════════════
// الصفحة الرئيسية (الهبوط) — عربية RTL بالكامل
// ══════════════════════════════════════════════════════

const FEATURES = [
  {
    icon: "📚",
    title: "الدروس",
    description: "دروس منظمة حسب الشعبة والمادة، تتقدم فيها خطوة بخطوة.",
  },
  {
    icon: "📝",
    title: "الاختبارات",
    description: "اختبارات تفاعلية تقيس فهمك الحقيقي بعد كل محور.",
  },
  {
    icon: "📊",
    title: "تتبع التقدم",
    description: "تابع تقدمك الدراسي بدقة، واعرف أين وصلت في كل مادة.",
  },
  {
    icon: "⚡",
    title: "التحديات",
    description: "تحديات تُبقيك في إيقاع دراسي ثابت حتى يوم البكالوريا.",
  },
  {
    icon: "⭐",
    title: "نقاط الخبرة",
    description: "اكسب نقاط خبرة حقيقية مع كل درس تكمله وكل اختبار تجتازه.",
  },
  {
    icon: "🏆",
    title: "الإنجازات",
    description: "ارتقِ في المستويات واجعل رحلتك نحو البكالوريا متعة.",
  },
] as const;

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      {/* ═══ الترويسة ═══ */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            🌊
          </span>
          <span className="font-grotesk text-sm font-bold tracking-widest text-white sm:text-base">
            MARIS ACADEMY <span className="text-cyan-400">²⁰²⁷</span>
          </span>
        </div>
        <Link href="/login" className="btn-secondary !px-5 !py-2.5 text-sm">
          تسجيل الدخول
        </Link>
      </header>

      {/* ═══ البطل ═══ */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-14 text-center sm:px-6 sm:pt-20">
        <div
          className="pointer-events-none absolute inset-x-0 -top-10 mx-auto h-72 w-72 animate-float rounded-full bg-cyan-400/15 blur-[100px] sm:h-96 sm:w-96"
          aria-hidden
        />
        <p className="badge mx-auto mb-6 animate-fade-up">
          🇩🇿 منصة جزائرية — بكالوريا 2027
        </p>
        <h1
          className="animate-fade-up text-4xl font-extrabold leading-[1.3] text-white sm:text-5xl lg:text-6xl"
          style={{ animationDelay: "80ms" }}
        >
          ذاكر بذكاء،
          <br />
          <span className="text-gradient">وتقدّم بثبات.</span>
        </h1>
        <p
          className="mx-auto mt-6 max-w-2xl animate-fade-up text-base leading-relaxed text-foam/70 sm:text-lg"
          style={{ animationDelay: "160ms" }}
        >
          منصة تعليمية متكاملة لمساعدة تلاميذ بكالوريا 2027 على تنظيم دراستهم،
          متابعة تقدمهم، والتعلم بطريقة تفاعلية.
        </p>
        <div
          className="mt-10 flex animate-fade-up flex-col items-center justify-center gap-4 sm:flex-row"
          style={{ animationDelay: "240ms" }}
        >
          <Link
            href="/register"
            className="btn-primary w-full text-lg sm:w-auto"
          >
            ابدأ التعلم
          </Link>
          <Link
            href="/login"
            className="btn-secondary w-full text-lg sm:w-auto"
          >
            تسجيل الدخول
          </Link>
        </div>

        {/* موجة زخرفية */}
        <svg
          className="pointer-events-none mx-auto mt-16 w-full max-w-3xl text-cyan-400/20"
          viewBox="0 0 600 60"
          fill="none"
          aria-hidden
        >
          <path
            d="M0 30 Q 75 0 150 30 T 300 30 T 450 30 T 600 30"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M0 45 Q 75 15 150 45 T 300 45 T 450 45 T 600 45"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.6"
          />
        </svg>
      </section>

      {/* ═══ الأقسام ═══ */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <article
              key={feature.title}
              className="glass-card glass-card-hover animate-fade-up p-6"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="text-3xl" aria-hidden>
                {feature.icon}
              </span>
              <h2 className="mt-4 text-xl font-extrabold text-white">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-foam/60">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ═══ الدعوة الأخيرة ═══ */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="glass-card relative overflow-hidden p-8 text-center sm:p-12">
          <div
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-[100px]"
            aria-hidden
          />
          <h2 className="relative text-2xl font-extrabold text-white sm:text-3xl">
            ابدأ رحلتك مع{" "}
            <span className="font-grotesk tracking-wider text-gradient">
              MARIS ACADEMY
            </span>
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-foam/60">
            حساب واحد يفتح لك الدروس، الاختبارات، تتبع التقدم، وبطاقة الطالب
            الخاصة بك.
          </p>
          <Link
            href="/register"
            className="btn-primary relative mt-8 text-lg"
          >
            أنشئ حسابك مجاناً
          </Link>
        </div>
      </section>

      {/* ═══ التذييل ═══ */}
      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-sm text-foam/40">
        <p>
          🌊{" "}
          <span className="font-grotesk tracking-widest">
            MARIS ACADEMY ²⁰²⁷
          </span>{" "}
          — صُنعت لتلاميذ البكالوريا في الجزائر
        </p>
      </footer>
    </main>
  );
}
