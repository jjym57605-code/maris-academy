
import type { Metadata, Viewport } from "next";
import { Tajawal, Space_Grotesk } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

const siteUrl = "https://maris-academy-three.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "MARIS ACADEMY ²⁰²⁷ — منصة بكالوريا 2027",
    template: "%s | MARIS ACADEMY ²⁰²⁷",
  },

  description:
    "MARIS ACADEMY ²⁰²⁷ منصة تعليمية لبكالوريا 2027، توفر دروسًا وكورسات وفيديوهات واختبارات لمساعدة الطلبة على تنظيم الدراسة وتحسين مستواهم.",

  keywords: [
    "MARIS ACADEMY",
    "Maris Academy 2027",
    "بكالوريا 2027",
    "BAC 2027",
    "بكالوريا الجزائر 2027",
    "دروس بكالوريا 2027",
    "كورسات بكالوريا 2027",
    "اختبارات بكالوريا 2027",
    "منصة تعليمية",
    "التعليم في الجزائر",
  ],

  authors: [
    {
      name: "MARIS ACADEMY",
    },
  ],

  creator: "MARIS ACADEMY",

  verification: {
    google: "vY8Qs4Coc8ayudp_wgNssXcdXdtsqTG1DWQf_HyLhRs",
  },

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "ar_DZ",
    url: siteUrl,
    siteName: "MARIS ACADEMY ²⁰²⁷",
    title: "MARIS ACADEMY ²⁰²⁷ — منصة بكالوريا 2027",
    description:
      "منصة تعليمية لبكالوريا 2027 في الجزائر، مع الدروس والكورسات والفيديوهات والاختبارات ومتابعة تقدم الطالب.",
  },

  twitter: {
    card: "summary_large_image",
    title: "MARIS ACADEMY ²⁰²⁷ — منصة بكالوريا 2027",
    description:
      "منصة تعليمية لبكالوريا 2027 تساعد الطلبة على التعلم وتنظيم الدراسة ومتابعة التقدم.",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020b18",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${tajawal.variable} ${grotesk.variable}`}>
        {children}
      </body>
    </html>
  );
}


