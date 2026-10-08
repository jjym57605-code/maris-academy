import type { Metadata } from "next";

const siteUrl = "https://maris-academy-three.vercel.app";

export const metadata: Metadata = {
  title: "من نحن — MARIS ACADEMY ²⁰²⁷",
  description:
    "تعرف على MARIS ACADEMY ²⁰²⁷، منصة تعليمية جزائرية مخصصة لمساعدة طلبة بكالوريا 2027 على التعلم وتنظيم الدراسة وتحسين مستواهم.",

  alternates: {
    canonical: `${siteUrl}/about`,
  },

  openGraph: {
    type: "website",
    locale: "ar_DZ",
    url: `${siteUrl}/about`,
    siteName: "MARIS ACADEMY ²⁰²⁷",
    title: "من نحن — MARIS ACADEMY ²⁰²⁷",
    description:
      "تعرف على MARIS ACADEMY ²⁰²⁷، منصة تعليمية لبكالوريا 2027 في الجزائر.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function AboutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}