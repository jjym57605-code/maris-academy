"use client";

import Link from "next/link";

const SOCIAL_LINKS = [
  {
    name: "Telegram",
    icon: "✈️",
    description: "تابع الإعلانات والمحتوى الجديد",
    href: "https://t.me/bac2027maris",
  },
  {
    name: "YouTube",
    icon: "▶️",
    description: "الدروس والشروحات التعليمية",
    href: "https://www.youtube.com/@academymaris",
  },
  {
    name: "Instagram",
    icon: "📸",
    description: "أخبار MARIS ومحتوى الأكاديمية",
    href: "https://www.instagram.com/_maris_academy__/",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-8 pb-8">
      {/* Back to homepage */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-bold text-foam/70 transition-all duration-300 hover:border-cyan-400/20 hover:bg-cyan-400/5 hover:text-cyan-300"
        >
          <span>→</span>
          العودة إلى الرئيسية
        </Link>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/10 bg-gradient-to-br from-ocean-500/15 via-navy-900/80 to-cyan-400/5 p-6 shadow-glow sm:p-8">
        <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-ocean-500/10 blur-3xl" />

        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300">
            🌊 MARIS ACADEMY ²⁰²⁷
          </div>

          <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            أكثر من مجرد منصة تعليمية
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-8 text-foam/70 sm:text-lg">
            مساحة رقمية تساعدك على التعلم، التنظيم، والمتابعة خلال رحلتك نحو
            بكالوريا 2027.
          </p>
        </div>
      </section>

      {/* About */}
      <section className="glass-card p-6 sm:p-8">
        <div className="mb-6">
          <span className="text-3xl">🌊</span>

          <h2 className="mt-3 text-2xl font-extrabold text-white">
            من نحن؟
          </h2>
        </div>

        <div className="space-y-6 leading-8 text-foam/70">
          <p>
            <strong className="text-white">MARIS ACADEMY ²⁰²⁷</strong> هي منصة
            تعليمية رقمية موجهة لطلبة بكالوريا 2027، صُممت لتجمع بين التعلم،
            التنظيم، والمتابعة في تجربة واحدة.
          </p>

          <p>
            هدفنا هو توفير مساحة تعليمية تساعد الطالب على الوصول إلى الدروس
            والاختبارات، متابعة تقدمه، اكتشاف نقاط قوته ونقاط التحسين، وتنظيم
            رحلته الدراسية بطريقة أبسط وأكثر تفاعلية.
          </p>
        </div>
      </section>

      {/* Vision */}
      <section className="grid gap-5 sm:grid-cols-2">
        <div className="glass-card p-6">
          <div className="mb-4 text-3xl">🎯</div>

          <h2 className="mb-3 text-xl font-extrabold text-white">
            رؤيتنا
          </h2>

          <p className="leading-8 text-foam/65">
            نؤمن أن النجاح الدراسي لا يعتمد على الدراسة لساعات طويلة فقط، بل
            على طريقة الدراسة، الاستمرارية، والتنظيم.
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="mb-4 text-3xl">💙</div>

          <h2 className="mb-3 text-xl font-extrabold text-white">
            هدفنا
          </h2>

          <p className="leading-8 text-foam/65">
            أن تكون MARIS أكثر من مجرد منصة للدروس؛ نريدها أن تكون رفيقًا
            للطالب خلال رحلته نحو بكالوريا 2027.
          </p>
        </div>
      </section>

      {/* What we offer */}
      <section className="glass-card p-6 sm:p-8">
        <div className="mb-6">
          <span className="text-3xl">📚</span>

          <h2 className="mt-3 text-2xl font-extrabold text-white">
            ماذا نقدم؟
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            "دروس ومواد تعليمية منظمة",
            "اختبارات تفاعلية لتقييم المستوى",
            "متابعة للتقدم والإنجازات",
            "نظام MARIS ID لكل طالب",
            "تحديات وتحفيز للاستمرار",
            "محتوى تعليمي متجدد",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm font-bold text-foam/75"
            >
              <span className="me-2 text-cyan-300">✓</span>
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Social links */}
      <section className="glass-card p-6 sm:p-8">
        <div className="mb-6">
          <div className="text-3xl">📱</div>

          <h2 className="mt-3 text-2xl font-extrabold text-white">
            تابع MARIS
          </h2>

          <p className="mt-2 text-sm text-foam/55">
            خليك قريب من الأكاديمية وآخر الأخبار والمحتوى الجديد.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:border-cyan-400/25 hover:bg-white/[0.06] hover:shadow-glow"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl">{social.icon}</span>

                <span className="text-foam/30 transition-transform duration-300 group-hover:-translate-x-1 group-hover:text-cyan-300">
                  ←
                </span>
              </div>

              <h3 className="mt-5 font-extrabold text-white">
                {social.name}
              </h3>

              <p className="mt-2 text-sm leading-6 text-foam/50">
                {social.description}
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* Developer contact */}
      <section className="overflow-hidden rounded-[2rem] border border-ocean-400/10 bg-gradient-to-br from-ocean-500/10 via-navy-900/80 to-cyan-400/5 p-6 sm:p-8">
        <div className="text-3xl">👨‍💻</div>

        <h2 className="mt-3 text-2xl font-extrabold text-white">
          تواصل مع المطوّر
        </h2>

        <p className="mt-3 max-w-2xl leading-8 text-foam/60">
          عندك اقتراح، مشكلة تقنية، أو فكرة تحب تشوفها في MARIS؟ تواصل معنا
          وساهم في تطوير المنصة.
        </p>

        <div className="mt-6">
          <a
            href="https://t.me/mou_ad_vn_o"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary w-full sm:w-auto"
          >
            💬 تواصل عبر Telegram
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="pb-4 pt-4 text-center">
        <p className="text-sm font-bold text-foam/35">
          🌊 MARIS ACADEMY ²⁰²⁷
        </p>

        <p className="mt-1 text-xs text-foam/25">
          تعلم. تقدّم. اصنع مستقبلك.
        </p>
      </footer>
    </div>
  );
}