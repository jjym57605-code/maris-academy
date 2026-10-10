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

const pageTitle = "MARIS ACADEMY 2027 | منصة بكالوريا الجزائر";

const pageDescription =
  "MARIS ACADEMY 2027 منصة تعليمية جزائرية لطلبة بكالوريا 2027، توفر الدروس والكورسات والاختبارات وأدوات تفاعلية تساعدك على تنظيم الدراسة ومتابعة تقدمك.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: pageTitle,
    template: "%s | MARIS ACADEMY 2027",
  },

  description: pageDescription,

  keywords: [
    "MARIS ACADEMY",
    "MARIS ACADEMY 2027",
    "منصة بكالوريا الجزائر",
    "بكالوريا الجزائر 2027",
    "بكالوريا 2027",
    "BAC 2027",
    "دروس بكالوريا 2027",
    "كورسات بكالوريا 2027",
    "اختبارات بكالوريا 2027",
    "منصة تعليمية جزائرية",
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
    title: pageTitle,
    description: pageDescription,
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "MARIS ACADEMY 2027 | منصة بكالوريا الجزائر",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: [
      {
        url: "/images/og-image.png",
        alt: "MARIS ACADEMY 2027 | منصة بكالوريا الجزائر",
      },
    ],
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
      <head>
        <meta
          name="google-site-verification"
          content="vY8Qs4Coc8ayudp_wgNssXcdXdtsqTG1DWQf_HyLhRs"
        />
      </head>

      <body className={`${tajawal.variable} ${grotesk.variable}`}>
        {children}
      </body>
    </html>
  );
}